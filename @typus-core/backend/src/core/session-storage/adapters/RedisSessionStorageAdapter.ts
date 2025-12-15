import { Service } from '@/core/decorators/component';
import { Logger } from '@/core/logger/Logger';
import { RedisService } from '@/core/redis/RedisService';
import { ISessionStorageAdapter } from '../interfaces/ISessionStorageAdapter';

/**
 * Redis-based Session Storage Adapter
 *
 * Fast in-memory storage for sessions, OAuth tokens, rate limiting.
 * Used in FULL profile with Redis available.
 */
@Service()
export class RedisSessionStorageAdapter implements ISessionStorageAdapter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Store value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const redis = await RedisService.getConnection();
      const serialized = JSON.stringify(value);

      await redis.setex(key, ttlSeconds, serialized);

      this.logger.debug(`[RedisSessionStorageAdapter] Set key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(`[RedisSessionStorageAdapter] Failed to set key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<any | null> {
    try {
      const redis = await RedisService.getConnection();
      const data = await redis.get(key);

      if (!data) {
        this.logger.debug(`[RedisSessionStorageAdapter] Key not found: ${key}`);
        return null;
      }

      const parsed = JSON.parse(data);
      this.logger.debug(`[RedisSessionStorageAdapter] Retrieved key: ${key}`);
      return parsed;
    } catch (error) {
      this.logger.error(`[RedisSessionStorageAdapter] Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value by key
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = await RedisService.getConnection();
      await redis.del(key);

      this.logger.debug(`[RedisSessionStorageAdapter] Deleted key: ${key}`);
    } catch (error) {
      this.logger.error(`[RedisSessionStorageAdapter] Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const redis = await RedisService.getConnection();
      const result = await redis.exists(key);

      return result === 1;
    } catch (error) {
      this.logger.error(`[RedisSessionStorageAdapter] Failed to check key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const redis = await RedisService.getConnection();

      // Increment counter
      const newValue = await redis.incr(key);

      // Set TTL if this is the first increment
      if (newValue === 1 && ttlSeconds) {
        await redis.expire(key, ttlSeconds);
      }

      this.logger.debug(`[RedisSessionStorageAdapter] Incremented ${key}: ${newValue}`);
      return newValue;
    } catch (error) {
      this.logger.error(`[RedisSessionStorageAdapter] Failed to increment key ${key}:`, error);
      throw error;
    }
  }
}
