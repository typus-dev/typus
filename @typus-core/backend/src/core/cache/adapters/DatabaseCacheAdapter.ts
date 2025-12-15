import { BaseService } from '@/core/base/BaseService';
import type { ICacheAdapter, CacheSetOptions, CacheEntry } from '../interfaces';

/**
 * Database Cache Adapter
 *
 * Stores cache entries in system.cache table
 * Suitable for STARTER profile or when Redis is not available
 *
 * Features:
 * - TTL support with automatic expiration checking
 * - Namespace support for grouping entries
 * - JSON serialization for complex objects
 * - Manual cleanup of expired entries
 */
export class DatabaseCacheAdapter extends BaseService implements ICacheAdapter {
  constructor() {
    super();
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const entry = await global.prisma.systemCache.findUnique({
        where: { key }
      });

      if (!entry) {
        return null;
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        await this.delete(key);
        return null;
      }

      return JSON.parse(entry.value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache key "${key}":`, error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const fullKey = options?.namespace ? `${options.namespace}:${key}` : key;
      const expiresAt = options?.ttl
        ? new Date(Date.now() + options.ttl * 1000)
        : null;

      await global.prisma.systemCache.upsert({
        where: { key: fullKey },
        create: {
          key: fullKey,
          value: JSON.stringify(value),
          namespace: options?.namespace,
          expiresAt,
          createdAt: new Date()
        },
        update: {
          value: JSON.stringify(value),
          namespace: options?.namespace,
          expiresAt,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Failed to set cache key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await global.prisma.systemCache.delete({
        where: { key }
      });
      return !!result;
    } catch (error) {
      // Key doesn't exist
      if (error.code === 'P2025') {
        return false;
      }
      this.logger.error(`Failed to delete cache key "${key}":`, error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  async clear(namespace?: string): Promise<number> {
    try {
      const where = namespace ? { namespace } : {};
      const result = await global.prisma.systemCache.deleteMany({ where });
      return result.count;
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  async keys(namespace?: string): Promise<string[]> {
    try {
      const where = namespace ? { namespace } : {};
      const entries = await global.prisma.systemCache.findMany({
        where,
        select: { key: true }
      });
      return entries.map(e => e.key);
    } catch (error) {
      this.logger.error('Failed to get cache keys:', error);
      return [];
    }
  }

  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    try {
      const entries = await global.prisma.systemCache.findMany({
        where: { key: { in: keys } }
      });

      for (const entry of entries) {
        // Check expiration
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          await this.delete(entry.key);
          continue;
        }

        try {
          result.set(entry.key, JSON.parse(entry.value) as T);
        } catch (error) {
          this.logger.error(`Failed to parse cache value for key "${entry.key}":`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to get many cache entries:', error);
    }

    return result;
  }

  async setMany<T = any>(entries: Map<string, T>, options?: CacheSetOptions): Promise<void> {
    const expiresAt = options?.ttl
      ? new Date(Date.now() + options.ttl * 1000)
      : null;

    try {
      const operations = Array.from(entries.entries()).map(([key, value]) => {
        const fullKey = options?.namespace ? `${options.namespace}:${key}` : key;

        return global.prisma.systemCache.upsert({
          where: { key: fullKey },
          create: {
            key: fullKey,
            value: JSON.stringify(value),
            namespace: options?.namespace,
            expiresAt,
            createdAt: new Date()
          },
          update: {
            value: JSON.stringify(value),
            namespace: options?.namespace,
            expiresAt,
            updatedAt: new Date()
          }
        });
      });

      await global.prisma.$transaction(operations);
    } catch (error) {
      this.logger.error('Failed to set many cache entries:', error);
      throw error;
    }
  }

  /**
   * Clean up expired entries
   * Should be called periodically by a cron job
   */
  async cleanup(): Promise<number> {
    try {
      const result = await global.prisma.systemCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        this.logger.info(`Cleaned up ${result.count} expired cache entries`);
      }

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired cache entries:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    namespaces: string[];
  }> {
    try {
      const [total, expired, namespaces] = await Promise.all([
        global.prisma.systemCache.count(),
        global.prisma.systemCache.count({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        }),
        global.prisma.systemCache.findMany({
          where: {
            namespace: {
              not: null
            }
          },
          select: {
            namespace: true
          },
          distinct: ['namespace']
        })
      ]);

      return {
        totalEntries: total,
        expiredEntries: expired,
        namespaces: namespaces
          .map(n => n.namespace)
          .filter((n): n is string => n !== null)
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        namespaces: []
      };
    }
  }
}
