/**
 * Session Storage Adapter Interface
 *
 * Provides abstraction over Redis and Database-based session storage.
 * Used for OAuth tokens, CSRF tokens, rate limiting, temporary caching.
 */
export interface ISessionStorageAdapter {
  /**
   * Store value with TTL in seconds
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON serialized)
   * @param ttlSeconds - Time to live in seconds
   */
  set(key: string, value: any, ttlSeconds: number): Promise<void>;

  /**
   * Get value by key (returns null if expired or not found)
   *
   * @param key - Storage key
   * @returns Stored value or null
   */
  get(key: string): Promise<any | null>;

  /**
   * Delete value by key
   *
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if key exists and not expired
   *
   * @param key - Storage key
   * @returns True if key exists and valid
   */
  exists(key: string): Promise<boolean>;

  /**
   * Increment counter (for rate limiting)
   *
   * @param key - Counter key
   * @param ttlSeconds - Optional TTL for new counter
   * @returns New counter value
   */
  increment(key: string, ttlSeconds?: number): Promise<number>;

  /**
   * Cleanup expired entries (for database adapter)
   */
  cleanupExpired?(): Promise<void>;
}
