import { BaseService } from '@/core/base/BaseService';
import { RedisService } from '@/core/redis/RedisService';
import { inject } from 'tsyringe';
import type { ICacheAdapter, CacheSetOptions } from '../interfaces';

/**
 * Redis Cache Adapter
 *
 * Stores cache entries in Redis
 * Suitable for FULL profile with high-performance requirements
 *
 * Features:
 * - Native TTL support (automatic expiration)
 * - Namespace support using key prefixes
 * - JSON serialization for complex objects
 * - High performance with in-memory storage
 */
export class RedisCacheAdapter extends BaseService implements ICacheAdapter {
  private redis: any | null = null;
  private redisService: RedisService | null = null;

  constructor() {
    super();
  }

  private async ensureRedisConnection(): Promise<any> {
    if (!this.redis) {
      // Lazy-load RedisService from DI container
      if (!this.redisService) {
        const { container } = require('tsyringe');
        this.redisService = container.resolve(RedisService);
      }
      this.redis = await this.redisService.getRedis();
    }
    return this.redis;
  }

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const redis = await this.ensureRedisConnection();
      const value = await redis.get(key);

      if (value === null) {
        return null;
      }

      // Try to parse JSON
      try {
        return JSON.parse(value) as T;
      } catch {
        // Return as string if not JSON
        return value as T;
      }
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to get key "${key}":`, error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const redis = await this.ensureRedisConnection();
      const fullKey = this.buildKey(key, options?.namespace);

      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      if (options?.ttl) {
        // Set with expiration
        await redis.setex(fullKey, options.ttl, serialized);
        this.logger.debug(`[RedisCacheAdapter] Set key "${fullKey}" with TTL ${options.ttl}s`);
      } else {
        // Set without expiration
        await redis.set(fullKey, serialized);
        this.logger.debug(`[RedisCacheAdapter] Set key "${fullKey}" (no TTL)`);
      }
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to set key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const redis = await this.ensureRedisConnection();
      const result = await redis.del(key);

      this.logger.debug(`[RedisCacheAdapter] Deleted key "${key}"`, { result });
      return result > 0;
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to delete key "${key}":`, error);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const redis = await this.ensureRedisConnection();
      const result = await redis.exists(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to check key "${key}":`, error);
      return false;
    }
  }

  async clear(namespace?: string): Promise<number> {
    try {
      const redis = await this.ensureRedisConnection();

      if (namespace) {
        // Delete all keys with namespace prefix
        const pattern = `${namespace}:*`;
        const keys = await redis.keys(pattern);

        if (keys.length === 0) {
          return 0;
        }

        const result = await redis.del(...keys);
        this.logger.info(`[RedisCacheAdapter] Cleared ${result} entries in namespace "${namespace}"`);
        return result;
      } else {
        // WARNING: This flushes the entire Redis database
        // Only use if Redis is dedicated to cache
        await redis.flushdb();
        this.logger.warn(`[RedisCacheAdapter] Cleared entire Redis database`);
        return 0; // Can't count easily after flush
      }
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to clear cache:`, error);
      return 0;
    }
  }

  async keys(namespace?: string): Promise<string[]> {
    try {
      const redis = await this.ensureRedisConnection();
      const pattern = namespace ? `${namespace}:*` : '*';
      const keys = await redis.keys(pattern);

      this.logger.debug(`[RedisCacheAdapter] Found ${keys.length} keys with pattern "${pattern}"`);
      return keys;
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to get keys:`, error);
      return [];
    }
  }

  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (keys.length === 0) {
      return result;
    }

    try {
      const redis = await this.ensureRedisConnection();
      const values = await redis.mget(...keys);

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value !== null) {
          try {
            result.set(keys[i], JSON.parse(value) as T);
          } catch {
            result.set(keys[i], value as T);
          }
        }
      }

      this.logger.debug(`[RedisCacheAdapter] Got ${result.size}/${keys.length} entries`);
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to get many keys:`, error);
    }

    return result;
  }

  async setMany<T = any>(entries: Map<string, T>, options?: CacheSetOptions): Promise<void> {
    if (entries.size === 0) {
      return;
    }

    try {
      const redis = await this.ensureRedisConnection();
      const pipeline = redis.pipeline();

      for (const [key, value] of entries) {
        const fullKey = this.buildKey(key, options?.namespace);
        const serialized = typeof value === 'string'
          ? value
          : JSON.stringify(value);

        if (options?.ttl) {
          pipeline.setex(fullKey, options.ttl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }
      }

      await pipeline.exec();

      this.logger.debug(`[RedisCacheAdapter] Set ${entries.size} entries`, {
        ttl: options?.ttl,
        namespace: options?.namespace
      });
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to set many entries:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * Note: Redis manages TTL automatically, so expiredEntries is always 0
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    namespaces: string[];
  }> {
    try {
      const redis = await this.ensureRedisConnection();
      const dbsize = await redis.dbsize();
      const allKeys = await redis.keys('*');

      // Extract unique namespaces
      const namespaces = Array.from(
        new Set(
          allKeys
            .filter(key => key.includes(':'))
            .map(key => key.split(':')[0])
        )
      );

      return {
        totalEntries: dbsize,
        expiredEntries: 0, // Redis handles expiration automatically
        namespaces
      };
    } catch (error) {
      this.logger.error(`[RedisCacheAdapter] Failed to get stats:`, error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        namespaces: []
      };
    }
  }
}
