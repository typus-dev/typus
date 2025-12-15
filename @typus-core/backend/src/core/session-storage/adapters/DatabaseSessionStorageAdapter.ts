import { Service } from '@/core/decorators/component';
import { Logger } from '@/core/logger/Logger';
import { ISessionStorageAdapter } from '../interfaces/ISessionStorageAdapter';

/**
 * Database-based Session Storage Adapter
 *
 * Slower but more reliable storage for sessions without Redis.
 * Used in STARTER profile.
 *
 * Storage format:
 * - key: unique identifier
 * - value: JSON-serialized data
 * - expiresAt: expiration timestamp
 */
@Service()
export class DatabaseSessionStorageAdapter implements ISessionStorageAdapter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Store value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const serialized = JSON.stringify(value);

      await global.prisma.systemSessionStorage.upsert({
        where: { key },
        create: {
          key,
          value: serialized,
          expiresAt
        },
        update: {
          value: serialized,
          expiresAt
        }
      });

      this.logger.debug(`[DatabaseSessionStorageAdapter] Set key: ${key}, expires: ${expiresAt.toISOString()}`);
    } catch (error) {
      this.logger.error(`[DatabaseSessionStorageAdapter] Failed to set key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key (returns null if expired)
   */
  async get(key: string): Promise<any | null> {
    try {
      const record = await global.prisma.systemSessionStorage.findUnique({
        where: { key }
      });

      if (!record) {
        this.logger.debug(`[DatabaseSessionStorageAdapter] Key not found: ${key}`);
        return null;
      }

      // Check expiration
      if (record.expiresAt < new Date()) {
        this.logger.debug(`[DatabaseSessionStorageAdapter] Key expired: ${key}`);
        // Delete expired entry
        await this.delete(key);
        return null;
      }

      const parsed = JSON.parse(record.value);
      this.logger.debug(`[DatabaseSessionStorageAdapter] Retrieved key: ${key}`);
      return parsed;
    } catch (error) {
      this.logger.error(`[DatabaseSessionStorageAdapter] Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value by key
   */
  async delete(key: string): Promise<void> {
    try {
      await global.prisma.systemSessionStorage.delete({
        where: { key }
      }).catch(() => {
        // Ignore error if key doesn't exist
      });

      this.logger.debug(`[DatabaseSessionStorageAdapter] Deleted key: ${key}`);
    } catch (error) {
      this.logger.error(`[DatabaseSessionStorageAdapter] Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists and not expired
   */
  async exists(key: string): Promise<boolean> {
    try {
      const record = await global.prisma.systemSessionStorage.findUnique({
        where: { key },
        select: { expiresAt: true }
      });

      if (!record) {
        return false;
      }

      // Check if expired
      if (record.expiresAt < new Date()) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`[DatabaseSessionStorageAdapter] Failed to check key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const existing = await this.get(key);
      const currentValue = typeof existing === 'number' ? existing : 0;
      const newValue = currentValue + 1;

      // If TTL provided and this is first increment, use it
      const ttl = ttlSeconds && currentValue === 0 ? ttlSeconds : 3600; // Default 1h

      await this.set(key, newValue, ttl);

      this.logger.debug(`[DatabaseSessionStorageAdapter] Incremented ${key}: ${newValue}`);
      return newValue;
    } catch (error) {
      this.logger.error(`[DatabaseSessionStorageAdapter] Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup expired entries
   * Should be called periodically (e.g., every hour)
   */
  async cleanupExpired(): Promise<void> {
    try {
      const result = await global.prisma.systemSessionStorage.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      this.logger.info(`[DatabaseSessionStorageAdapter] Cleaned up ${result.count} expired entries`);
    } catch (error) {
      this.logger.error('[DatabaseSessionStorageAdapter] Failed to cleanup expired entries:', error);
      throw error;
    }
  }
}
