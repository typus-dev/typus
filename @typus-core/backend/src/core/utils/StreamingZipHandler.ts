import { Transform, Readable, pipeline } from 'stream';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { LoggerFactory } from '@/core/logger/LoggerFactory';

const pipelineAsync = promisify(pipeline);

/**
 * Base64 Decode Stream
 * Transforms base64 string chunks into binary data
 * Prevents loading entire base64 string into memory
 */
export class Base64DecodeStream extends Transform {
  private buffer: string = '';
  private logger = LoggerFactory.getGlobalLogger();

  constructor() {
    super();
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    try {
      // Accumulate incoming base64 data
      this.buffer += chunk.toString('utf8');

      // Process complete 4-character blocks (base64 uses 4 chars per block)
      const completeLength = Math.floor(this.buffer.length / 4) * 4;

      if (completeLength > 0) {
        const completeData = this.buffer.slice(0, completeLength);
        this.buffer = this.buffer.slice(completeLength);

        // Decode and push to next stream
        const decoded = Buffer.from(completeData, 'base64');
        this.push(decoded);
      }

      callback();
    } catch (error) {
      this.logger.error('[Base64DecodeStream] Transform error', { error });
      callback(error);
    }
  }

  _flush(callback: Function) {
    try {
      // Process remaining data
      if (this.buffer.length > 0) {
        const decoded = Buffer.from(this.buffer, 'base64');
        this.push(decoded);
        this.buffer = '';
      }
      callback();
    } catch (error) {
      this.logger.error('[Base64DecodeStream] Flush error', { error });
      callback(error);
    }
  }
}

/**
 * Stream base64 data to file without loading entire string into memory
 * Uses streaming to prevent memory exhaustion on large files
 *
 * @param base64Data - Base64-encoded data
 * @param targetPath - Path where file should be written
 */
export async function streamBase64ToFile(
  base64Data: string,
  targetPath: string
): Promise<void> {
  const logger = LoggerFactory.getGlobalLogger();

  try {
    logger.info('[StreamingZipHandler] Starting base64 stream', {
      targetPath,
      dataLength: base64Data.length
    });

    // Create readable stream from base64 string
    const readStream = Readable.from([base64Data]);

    // Create decode stream
    const decodeStream = new Base64DecodeStream();

    // Create write stream
    const writeStream = fsSync.createWriteStream(targetPath);

    // Pipe: read -> decode -> write
    await pipelineAsync(readStream, decodeStream, writeStream);

    logger.info('[StreamingZipHandler] Stream completed successfully', {
      targetPath
    });
  } catch (error) {
    logger.error('[StreamingZipHandler] Streaming failed', {
      targetPath,
      error
    });
    throw new Error(`Failed to stream base64 to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check available disk space before extracting archive
 *
 * @param requiredBytes - Number of bytes needed
 * @param targetPath - Path where files will be extracted
 * @returns True if enough space available
 */
export async function checkDiskSpace(
  requiredBytes: number,
  targetPath: string
): Promise<boolean> {
  const logger = LoggerFactory.getGlobalLogger();

  try {
    // Get filesystem stats
    const stats = await fs.statfs(targetPath);

    // Available space = block size * available blocks
    const availableBytes = stats.bavail * stats.bsize;

    // Add 10% safety margin
    const requiredWithMargin = requiredBytes * 1.1;

    logger.debug('[StreamingZipHandler] Disk space check', {
      availableBytes,
      requiredBytes,
      requiredWithMargin,
      hasSpace: availableBytes >= requiredWithMargin
    });

    return availableBytes >= requiredWithMargin;
  } catch (error) {
    logger.warn('[StreamingZipHandler] Disk space check failed, proceeding anyway', {
      error
    });
    // If we can't check, proceed anyway (better than blocking)
    return true;
  }
}

/**
 * Get size of base64-encoded data in bytes (decoded size)
 *
 * @param base64String - Base64 string
 * @returns Estimated size in bytes after decoding
 */
export function getBase64Size(base64String: string): number {
  // Remove padding
  const withoutPadding = base64String.replace(/=/g, '');

  // Base64 encodes 3 bytes as 4 characters
  // So decoded size = (length * 3) / 4
  return Math.floor((withoutPadding.length * 3) / 4);
}

/**
 * ZIP Bomb Protection
 *
 * Validates extracted size against compressed size to prevent ZIP bomb attacks
 *
 * ZIP bomb: A small compressed file that expands to enormous size
 * Example: 42.zip (42 KB) expands to 4.5 petabytes
 *
 * @param compressedSize - Size of compressed archive in bytes
 * @param extractedSize - Size after extraction in bytes
 * @param maxCompressionRatio - Maximum allowed compression ratio (default: 100)
 * @returns True if safe, throws error if ZIP bomb detected
 */
export function validateZipSafety(
  compressedSize: number,
  extractedSize: number,
  maxCompressionRatio: number = 100
): void {
  const logger = LoggerFactory.getGlobalLogger();

  // Calculate compression ratio
  const compressionRatio = extractedSize / compressedSize;

  logger.debug('[StreamingZipHandler] ZIP safety check', {
    compressedSize,
    extractedSize,
    compressionRatio,
    maxCompressionRatio,
    isSafe: compressionRatio <= maxCompressionRatio
  });

  // Check if compression ratio exceeds threshold
  if (compressionRatio > maxCompressionRatio) {
    const error = new Error(
      `ZIP bomb detected: Compression ratio ${compressionRatio.toFixed(2)}:1 exceeds maximum ${maxCompressionRatio}:1`
    );
    logger.error('[StreamingZipHandler] ZIP bomb detected', {
      compressedSize,
      extractedSize,
      compressionRatio
    });
    throw error;
  }

  // Additional check: Absolute max size (500 MB uncompressed)
  const maxExtractedSize = 500 * 1024 * 1024; // 500 MB
  if (extractedSize > maxExtractedSize) {
    const error = new Error(
      `Extracted size ${(extractedSize / 1024 / 1024).toFixed(2)} MB exceeds maximum ${maxExtractedSize / 1024 / 1024} MB`
    );
    logger.error('[StreamingZipHandler] Extracted size too large', {
      extractedSize,
      maxExtractedSize
    });
    throw error;
  }

  logger.info('[StreamingZipHandler] ZIP safety check passed', {
    compressionRatio: compressionRatio.toFixed(2),
    extractedSizeMB: (extractedSize / 1024 / 1024).toFixed(2)
  });
}

/**
 * Get total size of extracted files from directory
 *
 * @param dirPath - Path to directory
 * @returns Total size in bytes
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
  const logger = LoggerFactory.getGlobalLogger();
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`;

      if (entry.isDirectory()) {
        // Recursive for subdirectories
        totalSize += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  } catch (error) {
    logger.error('[StreamingZipHandler] Failed to calculate directory size', {
      dirPath,
      error
    });
    throw error;
  }
}
