/**
 * Cache Adapter Interface
 *
 * Defines the contract that all cache adapters must implement.
 * Supports both Redis and Database storage backends.
 */

export interface CacheSetOptions {
  /**
   * Time to live in seconds
   * After this time, the cache entry will be automatically deleted
   */
  ttl?: number;

  /**
   * Namespace/prefix for the key
   * Useful for grouping related cache entries
   */
  namespace?: string;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date | null;
  createdAt: Date;
  namespace?: string;
}

export interface ICacheAdapter {
  /**
   * Get value from cache by key
   * Returns null if key doesn't exist or has expired
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL
   */
  set<T = any>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete value from cache by key
   * Returns true if key existed and was deleted, false otherwise
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists in cache (and hasn't expired)
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cache entries (optionally filtered by namespace)
   */
  clear(namespace?: string): Promise<number>;

  /**
   * Get all keys (optionally filtered by namespace)
   */
  keys(namespace?: string): Promise<string[]>;

  /**
   * Get multiple values at once
   */
  getMany<T = any>(keys: string[]): Promise<Map<string, T>>;

  /**
   * Set multiple values at once
   */
  setMany<T = any>(entries: Map<string, T>, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete expired entries (for database adapter cleanup)
   * Redis handles this automatically with TTL
   */
  cleanup?(): Promise<number>;

  /**
   * Get cache statistics
   */
  getStats?(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    namespaces: string[];
  }>;
}
