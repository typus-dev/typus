// src/core/logger/LoggerConfig.ts
import winston from 'winston';
import path from 'path';
import { createDatabaseTransport } from './transports/PrismaTransport.js';
import {
  createColorizeTagsFormat,
  parseSize,
  parseDays
} from './utils/LoggerUtils.js';

export interface LoggerConfiguration {
  level: string;
  modes: string[];
  maxSize: string;
  maxDays: string;
  prismaQueries: boolean;
  maxRecords: number;
  cleanupInterval: number;
  cleanupOnStart: boolean;
}

export class LoggerConfig {
  /**
   * Get current logging configuration from env (fallback)
   * Used for initial logger creation before ConfigService is available
   */
  static getConfiguration(): LoggerConfiguration {
    return {
      level: process.env.LOG_LEVEL || 'info',
      modes: process.env.LOG_MODE
        ? process.env.LOG_MODE.split(',').map(mode => mode.trim())
        : ['console'],
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxDays: process.env.LOG_MAX_DAYS || '14d',
      prismaQueries: process.env.LOG_PRISMA_QUERIES === 'true',
      maxRecords: parseInt(process.env.LOG_MAX_RECORDS || '10000', 10),
      cleanupInterval: parseInt(process.env.LOG_CLEANUP_INTERVAL_MINUTES || '60', 10),
      cleanupOnStart: process.env.LOG_CLEANUP_ON_START !== 'false'
    };
  }

  /**
   * Get logging configuration from database (direct Prisma query)
   * This is called after database is connected but before user context is available
   * We use direct Prisma query to bypass DSL permission checks
   */
  static async getConfigurationFromDB(prisma: any): Promise<LoggerConfiguration> {
    try {
      // Direct Prisma query - bypasses DSL permission system
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: [
              'logging.level',
              'logging.mode',
              'logging.prisma_queries',
              'logging.max_records',
              'logging.cleanup_interval',
              'logging.cleanup_on_start'
            ]
          }
        }
      });

      // Convert array to map
      const configMap = new Map(configs.map((c: any) => [c.key, c.value]));

      const level = configMap.get('logging.level') || 'info';
      const mode = configMap.get('logging.mode') || 'console';
      const prismaQueries = configMap.get('logging.prisma_queries') || 'false';
      const maxRecords = configMap.get('logging.max_records') || '10000';
      const cleanupInterval = configMap.get('logging.cleanup_interval') || '60';
      const cleanupOnStart = configMap.get('logging.cleanup_on_start') || 'true';

      console.log('[LoggerConfig] Loaded from database:', { level, mode, prismaQueries });

      return {
        level,
        modes: mode.split(',').map((m: string) => m.trim()),
        maxSize: process.env.LOG_MAX_SIZE || '20m',  // Infrastructure - stays in .env
        maxDays: process.env.LOG_MAX_DAYS || '14d',  // Infrastructure - stays in .env
        prismaQueries: prismaQueries === 'true' || prismaQueries === true,
        maxRecords: parseInt(maxRecords, 10),
        cleanupInterval: parseInt(cleanupInterval, 10),
        cleanupOnStart: cleanupOnStart === 'true' || cleanupOnStart === true
      };
    } catch (error) {
      // Fallback to env if database is not available
      console.warn('[LoggerConfig] Failed to load config from database, using env fallback:', error);
      return LoggerConfig.getConfiguration();
    }
  }

  /**
   * Create transports based on configuration
   */
  static createTransports(config: LoggerConfiguration): {
    standardTransports: winston.transport[];
    databaseTransports: winston.transport[];
  } {
    const standardTransports: winston.transport[] = [];
    const databaseTransports: winston.transport[] = [];

    // Console transport
    if (config.modes.includes('console')) {
      standardTransports.push(this.createConsoleTransport());
    }

    // File transports (always added for compatibility)
    if (config.modes.includes('file')) {
      standardTransports.push(...this.createFileTransports(config));
    }

    // Database transport
    if (config.modes.includes('database')) {
      databaseTransports.push(this.createDatabaseTransport());
    }

    return { standardTransports, databaseTransports };
  }

  /**
   * Create console transport
   */
  private static createConsoleTransport(): winston.transport {
    const consoleFormat = winston.format.combine(
      createColorizeTagsFormat()(),
      winston.format.colorize({ all: false, message: false, level: true }),
      winston.format.printf(info => {
        const splat = (info[Symbol.for('splat')] as any[]) || [];
        const meta = splat
          .map(value => typeof value === 'string' ? value : JSON.stringify(value))
          .join(' ');
        const message = typeof info.message === 'string' ? info.message : String(info.message);
        return meta ? `${message} ${meta}` : message;
      })
    );

    return new winston.transports.Console({
      format: consoleFormat,
    });
  }

  /**
   * Create file transports
   */
  private static createFileTransports(config: LoggerConfiguration): winston.transport[] {
    const logsDir = path.join(process.cwd(), 'logs');

    return [
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: parseSize(config.maxSize),
        maxFiles: parseDays(config.maxDays)
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: parseSize(config.maxSize),
        maxFiles: parseDays(config.maxDays)
      })
    ];
  }

  /**
   * Create database transport
   */
  private static createDatabaseTransport(): winston.transport {
    return createDatabaseTransport();
  }

  /**
   * Validate configuration
   */
  static validateConfiguration(config: LoggerConfiguration): void {
    // Check log level
    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(config.level)) {
      throw new Error(`Invalid log level: ${config.level}. Valid levels: ${validLevels.join(', ')}`);
    }

    // Check modes
    const validModes = ['console', 'file', 'database'];
    for (const mode of config.modes) {
      if (!validModes.includes(mode)) {
        throw new Error(`Invalid log mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
      }
    }
    // Check numeric values
    if (config.maxRecords < 1000) {
      throw new Error('LOG_MAX_RECORDS must be at least 1000');
    }

    if (config.cleanupInterval < 1) {
      throw new Error('LOG_CLEANUP_INTERVAL_MINUTES must be at least 1 minute');
    }
  }

  /**
   * Get recommended settings for different environments
   */
  static getEnvironmentDefaults(env: string): Partial<LoggerConfiguration> {
    switch (env) {
      case 'development':
        return {
          level: 'debug',
          modes: ['console', 'file'],
          prismaQueries: false
        };

      case 'production':
        return {
          level: 'info',
          modes: ['file', 'database'],
          prismaQueries: false,
          maxRecords: 50000,
          cleanupInterval: 30
        };

      case 'test':
        return {
          level: 'warn',
          modes: ['console'],
          prismaQueries: false
        };

      default:
        return {};
    }
  }
}
