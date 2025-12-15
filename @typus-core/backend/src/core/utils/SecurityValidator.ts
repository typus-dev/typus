import { normalize, resolve, relative } from 'path';

/**
 * Security Error
 * Thrown when security validation fails
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validate cache path to prevent path traversal attacks
 *
 * @param sitePath - User-provided site path (e.g., "/blog/post-1")
 * @param basePath - Base directory where cache files should be stored
 * @returns Validated absolute path
 * @throws SecurityError if path traversal detected
 */
export function validateCachePath(sitePath: string, basePath: string): string {
  // Normalize the site path to resolve any ".." or "." segments
  const normalizedSitePath = normalize(sitePath);

  // Resolve to absolute path
  const resolvedPath = resolve(basePath, normalizedSitePath);

  // Get relative path from base
  const relativePath = relative(basePath, resolvedPath);

  // CRITICAL: Prevent path traversal
  // If relative path starts with ".." or contains "..", it's trying to escape
  if (relativePath.startsWith('..') || relativePath.includes('..')) {
    throw new SecurityError(`Path traversal attempt detected: ${sitePath}`);
  }

  // Ensure resolved path is inside base directory
  if (!resolvedPath.startsWith(basePath)) {
    throw new SecurityError(`Path outside base directory: ${sitePath}`);
  }

  return resolvedPath;
}

/**
 * Sanitize path for safe usage
 * Removes dangerous characters and sequences
 *
 * @param path - Path to sanitize
 * @returns Sanitized path
 */
export function sanitizePath(path: string): string {
  return path
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove leading/trailing whitespace
    .trim()
    // Normalize slashes
    .replace(/\\/g, '/')
    // Remove duplicate slashes
    .replace(/\/+/g, '/')
    // Remove leading slash if present (for safety)
    .replace(/^\//, '');
}

/**
 * Validate file name to prevent malicious names
 *
 * @param filename - File name to validate
 * @throws SecurityError if filename is invalid
 */
export function validateFileName(filename: string): void {
  // Check for null bytes
  if (filename.includes('\0')) {
    throw new SecurityError('Filename contains null bytes');
  }

  // Check for path traversal in filename
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new SecurityError('Filename contains path separators or traversal sequences');
  }

  // Check for empty filename
  if (!filename || filename.trim().length === 0) {
    throw new SecurityError('Filename is empty');
  }

  // Check for excessively long filenames (max 255 chars)
  if (filename.length > 255) {
    throw new SecurityError('Filename exceeds maximum length');
  }
}
