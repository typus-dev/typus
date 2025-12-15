import { Logger } from './Logger.js';
import { ILogger } from './ILogger.js';
import { LoggerConfig } from './LoggerConfig.js';

/**
 * Logger factory for consistent logger creation
 * Ensures proper typing and fallback behavior
 */
export class LoggerFactory {
  /**
   * Create logger instance with proper typing
   * Returns ILogger interface for consistent usage
   */
  static createLogger(): ILogger {
    return new Logger();
  }

  /**
   * Get global logger or create new one
   * Ensures proper typing for global logger access
   */
  static getGlobalLogger(): ILogger {
    if (global.logger) {
      return global.logger as ILogger;
    }

    const logger = LoggerFactory.createLogger();
    global.logger = logger;
    return logger;
  }

  /**
   * Reconfigure global logger with database settings
   * Should be called after database is connected
   */
  static async reconfigureFromDatabase(prisma: any): Promise<void> {
    try {
      const logger = LoggerFactory.getGlobalLogger() as Logger;

      if (typeof logger.reconfigure !== 'function') {
        console.warn('[LoggerFactory] Logger does not support reconfiguration');
        return;
      }

      const config = await LoggerConfig.getConfigurationFromDB(prisma);
      LoggerConfig.validateConfiguration(config);

      const { standardTransports, databaseTransports } = LoggerConfig.createTransports(config);
      const allTransports = [...standardTransports, ...databaseTransports];

      await logger.reconfigure({
        level: config.level,
        transports: allTransports
      });

      console.log('[LoggerFactory] Logger reconfigured from database:', {
        level: config.level,
        modes: config.modes,
        prismaQueries: config.prismaQueries
      });
    } catch (error) {
      console.error('[LoggerFactory] Failed to reconfigure logger from database:', error);
    }
  }
}
