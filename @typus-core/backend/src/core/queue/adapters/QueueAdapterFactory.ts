import { container } from 'tsyringe';
import { IQueueAdapter } from '../interfaces';
import { RedisQueueAdapter } from './RedisQueueAdapter';
import { DatabaseQueueAdapter } from './DatabaseQueueAdapter';
import { ConfigService } from '../../../modules/system/services/ConfigService';

/**
 * Factory for creating queue adapters based on configuration
 * Supports queue.driver config: 'redis' | 'database'
 * Falls back to QUEUE_DRIVER environment variable if config not available
 */
export class QueueAdapterFactory {
  private static instance: IQueueAdapter | null = null;

  /**
   * Get queue adapter instance (singleton)
   *
   * @returns Queue adapter based on queue.driver config or QUEUE_DRIVER env variable
   */
  static async getInstance(): Promise<IQueueAdapter> {
    if (!QueueAdapterFactory.instance) {
      // Try to read from database config first, fallback to env variable
      let driver: string;

      try {
        const configService = container.resolve(ConfigService);
        driver = await configService.get('queue.driver') || process.env.QUEUE_DRIVER || 'database';
      } catch (error) {
        // If config service not available yet (e.g., during startup), use env variable
        console.log('[QueueAdapterFactory] Config service not available, using QUEUE_DRIVER env variable');
        driver = process.env.QUEUE_DRIVER || 'database';
      }

      const validDrivers = ['redis', 'database'];

      // Validate driver value
      if (!validDrivers.includes(driver)) {
        throw new Error(
          `Invalid queue.driver value: "${driver}". ` +
          `Expected one of: ${validDrivers.join(', ')}. ` +
          `Please check system_config.queue.driver in database or QUEUE_DRIVER in .env file.`
        );
      }

      try {
        if (driver === 'database') {
          console.log('[QueueAdapterFactory] Using DatabaseQueueAdapter (STARTER profile)');
          QueueAdapterFactory.instance = container.resolve(DatabaseQueueAdapter);
        } else {
          console.log('[QueueAdapterFactory] Using RedisQueueAdapter (FULL profile)');
          QueueAdapterFactory.instance = container.resolve(RedisQueueAdapter);
        }
      } catch (error) {
        console.error('[QueueAdapterFactory] Failed to create queue adapter:', error);
        throw new Error(`Failed to initialize queue adapter for driver: ${driver}`);
      }
    }

    return QueueAdapterFactory.instance;
  }

  /**
   * Reset instance (mainly for testing)
   */
  static reset(): void {
    QueueAdapterFactory.instance = null;
  }
}
