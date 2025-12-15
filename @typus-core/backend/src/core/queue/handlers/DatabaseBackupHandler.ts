import { Service } from '@/core/decorators/component';
import { BaseTaskHandler } from './BaseTaskHandler';
import { TaskSchema } from '../interfaces';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { inject } from 'tsyringe';
import { ConfigService } from '@/modules/system/services/ConfigService';

const execAsync = promisify(exec);

/**
 * Database Backup Handler for LITE-SINGLE profile
 * Ports DatabaseBackupPlugin from old dispatcher
 * Handles database_backup task type
 *
 * Contract Compatibility: 100% compatible with production Task ID=1 (2,445 runs)
 */
@Service()
export class DatabaseBackupHandler extends BaseTaskHandler {
  constructor(
    @inject(ConfigService) private configService: ConfigService
  ) {
    super();
  }

  /**
   * Get schema for database backup tasks
   * Must match DatabaseBackupPlugin.getTaskSchema() exactly
   */
  getSchema(): TaskSchema {
    return {
      type: 'database_backup',
      fields: ['databases', 'storage', 'options', 'retention', 'naming', 'notifications'],
      validate: (data) => {
        // Note: databases can be empty (auto-detect), but if provided must be valid array
        if (data.databases !== undefined) {
          if (!Array.isArray(data.databases)) {
            throw new Error('databases must be an array');
          }
        }

        if (!data.storage?.type) {
          throw new Error('storage.type required');
        }

        // Note: storage.path is optional for local storage
        // If not provided, handler auto-detects via process.cwd() + '/storage/backups'

        if (data.retention?.days !== undefined && data.retention.days < 1) {
          throw new Error('retention.days must be >= 1');
        }

        if (data.retention?.maxFiles !== undefined && data.retention.maxFiles < 1) {
          throw new Error('retention.maxFiles must be >= 1');
        }
      }
    };
  }

  /**
   * Normalize task data - apply defaults and auto-detect database
   * Must match old plugin normalize logic exactly
   */
  private async normalize(data: any): Promise<any> {
    // Auto-detect current database if not specified
    if (!data.databases || data.databases.length === 0) {
      try {
        // Detect database provider from DATABASE_URL
        const databaseUrl = process.env.DATABASE_URL || '';

        if (databaseUrl.startsWith('file:')) {
          // SQLite: extract database name from file path
          const match = databaseUrl.match(/file:(.+\.sqlite)/);
          const dbName = match ? path.basename(match[1], '.sqlite') : 'database';
          data.databases = [dbName];
          this.logger.info('[DatabaseBackupHandler] Auto-detected SQLite database', {
            database: dbName
          });
        } else if (databaseUrl.startsWith('mysql:')) {
          // MySQL: use SELECT DATABASE()
          const result = await this.prisma.$queryRaw<[{ db: string }]>`SELECT DATABASE() as db`;
          data.databases = [result[0].db];
          this.logger.info('[DatabaseBackupHandler] Auto-detected MySQL database', {
            database: result[0].db
          });
        } else {
          throw new Error('Unsupported database provider (only MySQL and SQLite supported)');
        }
      } catch (error) {
        throw new Error(`Failed to auto-detect database: ${error.message}`);
      }
    }

    // Apply defaults for options
    data.options = data.options || {};
    if (data.options.compress === undefined) data.options.compress = true;
    if (data.options.singleTransaction === undefined) data.options.singleTransaction = true;
    if (data.options.includeData === undefined) data.options.includeData = true;
    if (data.options.includeStructure === undefined) data.options.includeStructure = true;

    // Apply defaults for retention
    data.retention = data.retention || {};
    if (data.retention.days === undefined) data.retention.days = 30;
    if (data.retention.maxFiles === undefined) data.retention.maxFiles = 50;

    // Apply defaults for naming
    data.naming = data.naming || {};
    data.naming.pattern = data.naming.pattern || '{database}_{timestamp}.sql';
    data.naming.timestampFormat = data.naming.timestampFormat || 'YYYY-MM-DD_HH-mm-ss';

    return data;
  }

  /**
   * Execute database backup task
   * Ports execute logic from DatabaseBackupPlugin
   */
  async execute(data: any): Promise<any> {
    try {
      // Normalize data (includes auto-detect database)
      const payload = await this.normalize(data);

      // Validate
      await this.validate(payload);

      const results = [];

      const backupTimestamp = this.formatTimestamp(payload.naming.timestampFormat);

      // Get backup directory with priority chain:
      // 1. ENV: BACKUP_STORAGE_PATH (if set - explicit backup path override)
      // 2. system.config: backup.storage.path (if set - admin configured path)
      // 3. task.data: storage.path (if set - task-specific path)
      // 4. AUTO: STORAGE_PATH + '/backups' (standard location, consistent with UPLOADS_PATH)
      const envBackupPath = process.env.BACKUP_STORAGE_PATH;
      const configPath = await this.configService.get('backup.storage.path');
      const taskPath = payload.storage?.path;
      const storagePath = process.env.STORAGE_PATH || path.join(process.cwd(), '../../storage');
      const autoPath = path.join(storagePath, 'backups');

      const backupDir = envBackupPath || configPath || taskPath || autoPath;

      this.logger.info('[DatabaseBackupHandler] Backup path resolved', {
        envBackupPath,
        configPath,
        taskPath,
        storagePath,
        autoPath,
        finalPath: backupDir
      });

      this.logger.info('[DatabaseBackupHandler] Starting database backup', {
        databases: payload.databases,
        backupTimestamp,
        backupDir,
        storage: payload.storage
      });

      // Ensure backup directory exists
      await this.ensureDirectory(backupDir);

      // Backup each database
      for (const database of payload.databases) {
        try {
          const backupResult = await this.backupDatabase(
            database,
            backupDir,
            backupTimestamp,
            payload
          );
          results.push(backupResult);

          this.logger.info('[DatabaseBackupHandler] Database backup completed', {
            database,
            file: backupResult.filename,
            size: backupResult.size,
            verified: backupResult.verified
          });
        } catch (error) {
          this.logger.error('[DatabaseBackupHandler] Database backup failed', {
            database,
            error: error.message
          });
          results.push({
            database,
            status: 'error',
            error: error.message
          });
        }
      }

      // Count successes and errors
      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      // Apply retention policy (don't fail task if cleanup fails)
      if (payload.retention) {
        try {
          await this.applyRetention(backupDir, payload.retention);
        } catch (error) {
          this.logger.error('[DatabaseBackupHandler] Retention policy failed', {
            error: error.message
          });
        }
      }

      // Determine task status
      const taskStatus = successCount > 0 ? 'completed' : 'failed';

      // If all backups failed, throw error
      if (successCount === 0) {
        const errorMessages = results
          .filter((r) => r.status === 'error')
          .map((r) => `${r.database}: ${r.error}`)
          .join('; ');

        throw new Error(`All database backups failed: ${errorMessages}`);
      }

      return {
        status: taskStatus,
        backupTimestamp,
        backups: results,
        totalBackups: results.length,
        successfulBackups: successCount,
        failedBackups: errorCount
      };
    } catch (error) {
      this.logger.error('[DatabaseBackupHandler] Backup execution failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Backup single database
   * Ports backupDatabase logic from old plugin
   */
  private async backupDatabase(
    database: string,
    backupDir: string,
    timestamp: string,
    data: any
  ): Promise<any> {
    const pattern = data.naming.pattern;
    let filename = pattern
      .replace('{database}', database)
      .replace('{timestamp}', timestamp);

    const filepath = path.join(backupDir, filename);

    // Get database credentials from DATABASE_URL (same connection as Prisma)
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    const options = data.options;
    let command: string;

    // Build backup command based on database provider
    if (databaseUrl.startsWith('file:')) {
      // SQLite backup: copy the database file
      const match = databaseUrl.match(/file:(.+)/);
      if (!match) {
        throw new Error('Failed to parse SQLite DATABASE_URL');
      }

      const dbPath = match[1];

      // For SQLite, we just copy the file (simpler and safer than .dump)
      if (options.compress) {
        command = `gzip -c "${dbPath}" > "${filepath}.gz"`;
        filename += '.gz';
      } else {
        command = `cp "${dbPath}" "${filepath}"`;
      }
    } else if (databaseUrl.startsWith('mysql:')) {
      // MySQL backup using mysqldump
      const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\//);
      if (!urlMatch) {
        throw new Error('Failed to parse MySQL DATABASE_URL');
      }

      const [, user, password, host, port] = urlMatch;

      // Build mysqldump command
      command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password}`;

      if (options.singleTransaction) {
        command += ' --single-transaction --routines --triggers';
      }

      if (!options.includeData) {
        command += ' --no-data';
      }

      if (!options.includeStructure) {
        command += ' --no-create-info';
      }

      command += ` ${database}`;

      // Add compression if enabled
      if (options.compress) {
        command += ` | gzip > ${filepath}.gz`;
        filename += '.gz';
      } else {
        command += ` > ${filepath}`;
      }
    } else {
      throw new Error('Unsupported database provider (only MySQL and SQLite supported)');
    }

    try {
      // Execute backup command
      const { stdout, stderr } = await execAsync(command);

      // Check for errors (ignore warnings)
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Backup command stderr: ${this.maskPassword(stderr)}`);
      }

      // Get final file path
      const finalPath = options.compress ? `${filepath}.gz` : filepath;

      // Verify backup file
      const verification = await this.verifyBackup(finalPath);

      if (!verification.valid) {
        throw new Error(`Backup verification failed: ${verification.error}`);
      }

      return {
        database,
        status: 'success',
        filename: filename,
        filepath: finalPath,
        size: verification.size,
        compressed: !!options.compress,
        verified: true,
        checksum: verification.checksum
      };
    } catch (error) {
      throw new Error(
        `Failed to backup database ${database}: ${this.maskPassword(error.message)}`
      );
    }
  }

  /**
   * Verify backup file integrity
   * Architect enhancement: checksum + size + SQL header validation
   */
  private async verifyBackup(filepath: string): Promise<{
    valid: boolean;
    size?: number;
    checksum?: string;
    error?: string;
  }> {
    try {
      // Check file exists and get size
      const stats = await fs.stat(filepath);

      if (stats.size === 0) {
        return { valid: false, error: 'Backup file is empty' };
      }

      // Calculate MD5 checksum
      const fileBuffer = await fs.readFile(filepath);
      const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

      // For compressed files, verify gzip header
      if (filepath.endsWith('.gz')) {
        // Check gzip magic number (0x1f 0x8b)
        if (fileBuffer[0] !== 0x1f || fileBuffer[1] !== 0x8b) {
          return { valid: false, error: 'Invalid gzip file format' };
        }
      } else {
        // For uncompressed files, verify SQL content
        const content = fileBuffer.toString('utf8', 0, Math.min(1000, fileBuffer.length));
        if (!content.includes('--') && !content.includes('CREATE') && !content.includes('INSERT')) {
          return { valid: false, error: 'File does not appear to be valid SQL' };
        }
      }

      return {
        valid: true,
        size: stats.size,
        checksum
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Format timestamp according to pattern
   * Ports formatTimestamp from old plugin
   */
  private formatTimestamp(format: string): string {
    const now = new Date();
    return format
      .replace('YYYY', String(now.getFullYear()))
      .replace('MM', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(now.getDate()).padStart(2, '0'))
      .replace('HH', String(now.getHours()).padStart(2, '0'))
      .replace('mm', String(now.getMinutes()).padStart(2, '0'))
      .replace('ss', String(now.getSeconds()).padStart(2, '0'));
  }

  /**
   * Apply retention policy - delete old backups
   * Ports applyRetention from old plugin
   */
  private async applyRetention(backupDir: string, retention: any): Promise<void> {
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter((f) => f.endsWith('.sql') || f.endsWith('.sql.gz'))
        .map((f) => ({
          name: f,
          path: path.join(backupDir, f),
          stat: null as any
        }));

      // Get file stats
      for (const file of backupFiles) {
        file.stat = await fs.stat(file.path);
      }

      // Sort by modification time (oldest first)
      backupFiles.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());

      const now = new Date();
      const filesToDelete = [];

      // Apply days retention
      if (retention.days) {
        const cutoffDate = new Date(now.getTime() - retention.days * 24 * 60 * 60 * 1000);
        backupFiles.forEach((file) => {
          if (file.stat.mtime < cutoffDate) {
            filesToDelete.push(file);
          }
        });
      }

      // Apply maxFiles retention
      if (retention.maxFiles && backupFiles.length > retention.maxFiles) {
        const filesToKeep = backupFiles.slice(-retention.maxFiles);
        backupFiles.forEach((file) => {
          if (!filesToKeep.includes(file) && !filesToDelete.includes(file)) {
            filesToDelete.push(file);
          }
        });
      }

      // Delete old files
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        this.logger.info('[DatabaseBackupHandler] Deleted old backup file', {
          file: file.name
        });
      }

      this.logger.info('[DatabaseBackupHandler] Retention policy applied', {
        deletedFiles: filesToDelete.length,
        remainingFiles: backupFiles.length - filesToDelete.length
      });
    } catch (error) {
      this.logger.error('[DatabaseBackupHandler] Failed to apply retention policy', {
        error: error.message
      });
      // Don't throw - retention failure should not fail the backup task
    }
  }

  /**
   * Ensure directory exists, create if needed
   * Ports ensureDirectory from old plugin
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        this.logger.info('[DatabaseBackupHandler] Created backup directory', {
          path: dirPath
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Mask passwords in error messages for security
   * Ports maskPassword from old plugin
   */
  private maskPassword(errorMessage: string): string {
    if (!errorMessage) return errorMessage;

    return errorMessage
      .replace(/-p[^\s]+/g, '-p***')
      .replace(/password=[^\s&]+/gi, 'password=***')
      .replace(/pwd=[^\s&]+/gi, 'pwd=***');
  }
}
