import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import type { ICacheAdapter, CacheSetOptions } from './interfaces';
import { DatabaseCacheAdapter } from './adapters';
import { RedisCacheAdapter } from './adapters';

/**
 * Cache Service
 *
 * Agnostic caching service with pluggable adapters.
 * Works with both Redis and Database backends based on configuration.
 *
 * Usage:
 * ```typescript
 * // Inject in your service/controller
 * constructor(@inject(CacheService) private cacheService: CacheService) {}
 *
 * // Set value with TTL
 * await this.cacheService.set('oauth:token', tokenData, { ttl: 300 });
 *
 * // Get value
 * const token = await this.cacheService.get('oauth:token');
 *
 * // Delete value
 * await this.cacheService.delete('oauth:token');
 * ```
 *
 * Configuration:
 * - CACHE_DRIVER=redis (FULL profile - high performance)
 * - CACHE_DRIVER=database (STARTER profile - no Redis required)
 */
@Service()
export class CacheService extends BaseService {
  private adapter: ICacheAdapter;
  private readonly driver: string;

  constructor() {
    super();

    // Select adapter based on environment
    this.driver = process.env.CACHE_DRIVER || process.env.QUEUE_DRIVER || 'database';

    // Create adapter instance directly
    this.adapter = this.driver === 'redis'
      ? new RedisCacheAdapter()
      : new DatabaseCacheAdapter();

    this.logger.info(`[CacheService] Initialized with ${this.driver} adapter`);
  }

  /**
   * Get value from cache by key
   * Returns null if key doesn't exist or has expired
   */
  async get<T = any>(key: string): Promise<T | null> {
    this.logger.debug(`[CacheService] Get key: ${key}`, { driver: this.driver });
    return await this.adapter.get<T>(key);
  }

  /**
   * Set value in cache with optional TTL and namespace
   *
   * @param key - Cache key
   * @param value - Value to store (will be JSON serialized)
   * @param options - Optional TTL (seconds) and namespace
   */
  async set<T = any>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    this.logger.debug(`[CacheService] Set key: ${key}`, {
      driver: this.driver,
      ttl: options?.ttl,
      namespace: options?.namespace
    });
    await this.adapter.set(key, value, options);
  }

  /**
   * Delete value from cache by key
   * Returns true if key existed and was deleted
   */
  async delete(key: string): Promise<boolean> {
    this.logger.debug(`[CacheService] Delete key: ${key}`, { driver: this.driver });
    return await this.adapter.delete(key);
  }

  /**
   * Check if key exists in cache (and hasn't expired)
   */
  async has(key: string): Promise<boolean> {
    return await this.adapter.has(key);
  }

  /**
   * Clear all cache entries (optionally filtered by namespace)
   *
   * @param namespace - Optional namespace to clear
   * @returns Number of cleared entries
   */
  async clear(namespace?: string): Promise<number> {
    this.logger.info(`[CacheService] Clearing cache`, { driver: this.driver, namespace });
    return await this.adapter.clear(namespace);
  }

  /**
   * Get all cache keys (optionally filtered by namespace)
   */
  async keys(namespace?: string): Promise<string[]> {
    return await this.adapter.keys(namespace);
  }

  /**
   * Get multiple values at once (batch operation)
   */
  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    this.logger.debug(`[CacheService] Get many keys: ${keys.length}`, { driver: this.driver });
    return await this.adapter.getMany<T>(keys);
  }

  /**
   * Set multiple values at once (batch operation)
   */
  async setMany<T = any>(entries: Map<string, T>, options?: CacheSetOptions): Promise<void> {
    this.logger.debug(`[CacheService] Set many entries: ${entries.size}`, {
      driver: this.driver,
      ttl: options?.ttl,
      namespace: options?.namespace
    });
    await this.adapter.setMany(entries, options);
  }

  /**
   * Clean up expired entries (for database adapter)
   * Redis handles this automatically
   *
   * @returns Number of cleaned entries
   */
  async cleanup(): Promise<number> {
    if (this.adapter.cleanup) {
      this.logger.info(`[CacheService] Running cleanup`, { driver: this.driver });
      return await this.adapter.cleanup();
    }
    return 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    driver: string;
    totalEntries: number;
    expiredEntries: number;
    namespaces: string[];
  }> {
    if (this.adapter.getStats) {
      const stats = await this.adapter.getStats();
      return {
        driver: this.driver,
        ...stats
      };
    }

    return {
      driver: this.driver,
      totalEntries: 0,
      expiredEntries: 0,
      namespaces: []
    };
  }

  /**
   * Get current adapter driver name
   */
  getDriver(): string {
    return this.driver;
  }

  /**
   * Helper: Set value with TTL (convenience method)
   */
  async setex(key: string, ttl: number, value: any): Promise<void> {
    await this.set(key, value, { ttl });
  }

  /**
   * Helper: Get value and refresh TTL if exists
   */
  async getAndRefresh<T = any>(key: string, ttl: number): Promise<T | null> {
    const value = await this.get<T>(key);
    if (value !== null) {
      await this.set(key, value, { ttl });
    }
    return value;
  }

  /**
   * Helper: Remember value (get from cache or compute and store)
   */
  async remember<T = any>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await callback();

    // Store in cache
    await this.set(key, value, { ttl });

    return value;
  }
}
