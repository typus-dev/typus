import { Logger } from '@/core/logger/Logger';
import { ISessionStorageAdapter } from '../interfaces/ISessionStorageAdapter';
import { RedisSessionStorageAdapter } from './RedisSessionStorageAdapter';
import { DatabaseSessionStorageAdapter } from './DatabaseSessionStorageAdapter';

/**
 * Session Storage Factory
 *
 * Selects appropriate session storage adapter based on SESSION_STORAGE_DRIVER env variable.
 * Falls back to database if Redis is unavailable.
 *
 * Environment variables:
 * - SESSION_STORAGE_DRIVER: 'redis' | 'database' (default: same as QUEUE_DRIVER)
 * - REDIS_URL: Redis connection URL (required for redis driver)
 */
export class SessionStorageFactory {
  private static logger = new Logger();
  private static instance: ISessionStorageAdapter | null = null;

  /**
   * Get session storage adapter instance (singleton)
   */
  static getInstance(): ISessionStorageAdapter {
    if (this.instance) {
      return this.instance;
    }

    const driver = this._getDriver();

    this.logger.info(`[SessionStorageFactory] Initializing session storage with driver: ${driver}`);

    if (driver === 'redis') {
      this.instance = new RedisSessionStorageAdapter();
      this.logger.info('[SessionStorageFactory] Using Redis session storage (FULL profile)');
    } else {
      this.instance = new DatabaseSessionStorageAdapter();
      this.logger.info('[SessionStorageFactory] Using Database session storage (STARTER profile)');
    }

    return this.instance;
  }

  /**
   * Determine which driver to use
   */
  private static _getDriver(): 'redis' | 'database' {
    // Check explicit SESSION_STORAGE_DRIVER
    const explicitDriver = process.env.SESSION_STORAGE_DRIVER;
    if (explicitDriver === 'redis' || explicitDriver === 'database') {
      return explicitDriver;
    }

    // Fallback to QUEUE_DRIVER (same logic)
    const queueDriver = process.env.QUEUE_DRIVER;
    if (queueDriver === 'database') {
      return 'database';
    }

    // Default: redis (for backward compatibility)
    return 'redis';
  }

  /**
   * Reset instance (for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}
