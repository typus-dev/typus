import { Service } from '@/core/decorators/component';
import { Logger } from '@/core/logger/Logger';
import { ISessionStorageAdapter } from './interfaces/ISessionStorageAdapter';
import { SessionStorageFactory } from './adapters/SessionStorageFactory';

/**
 * Agnostic Session Storage Service
 *
 * Unified API for session storage that works with both Redis and Database adapters.
 * Automatically selects appropriate adapter based on SESSION_STORAGE_DRIVER env variable.
 *
 * Use cases:
 * - OAuth tokens (Twitter, Google, etc.)
 * - CSRF tokens
 * - Rate limiting counters
 * - Temporary cache
 * - User sessions
 *
 * @example
 * ```typescript
 * const storage = container.resolve(AgnosticSessionStorageService);
 *
 * // Store OAuth token for 1 hour
 * await storage.set('oauth:twitter:123', { token, secret }, 3600);
 *
 * // Get token
 * const data = await storage.get('oauth:twitter:123');
 *
 * // Rate limiting
 * const count = await storage.increment('rate:ip:192.168.1.1', 60);
 * if (count > 100) throw new Error('Rate limit exceeded');
 * ```
 */
@Service()
export class AgnosticSessionStorageService {
  private adapter: ISessionStorageAdapter;
  private logger: Logger;

  constructor() {
    this.adapter = SessionStorageFactory.getInstance();
    this.logger = new Logger();
  }

  /**
   * Store value with TTL
   *
   * @param key - Storage key (recommended format: "namespace:type:id")
   * @param value - Value to store (will be JSON serialized)
   * @param ttlSeconds - Time to live in seconds
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await this.adapter.set(key, value, ttlSeconds);
    } catch (error) {
      this.logger.error(`[AgnosticSessionStorageService] Failed to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key
   *
   * @param key - Storage key
   * @returns Stored value or null if not found/expired
   */
  async get(key: string): Promise<any | null> {
    try {
      return await this.adapter.get(key);
    } catch (error) {
      this.logger.error(`[AgnosticSessionStorageService] Failed to get ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value by key
   *
   * @param key - Storage key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.adapter.delete(key);
    } catch (error) {
      this.logger.error(`[AgnosticSessionStorageService] Failed to delete ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists and not expired
   *
   * @param key - Storage key
   * @returns True if key exists and valid
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await this.adapter.exists(key);
    } catch (error) {
      this.logger.error(`[AgnosticSessionStorageService] Failed to check ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment counter (useful for rate limiting)
   *
   * @param key - Counter key
   * @param ttlSeconds - Optional TTL for new counter (default: adapter-specific)
   * @returns New counter value
   *
   * @example
   * ```typescript
   * // Rate limit: 100 requests per minute
   * const count = await storage.increment(`rate:${ip}`, 60);
   * if (count > 100) {
   *   throw new TooManyRequestsError();
   * }
   * ```
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      return await this.adapter.increment(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`[AgnosticSessionStorageService] Failed to increment ${key}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup expired entries (only for database adapter)
   * No-op for Redis adapter (Redis handles expiration automatically)
   *
   * Should be called periodically by a scheduled task.
   */
  async cleanupExpired(): Promise<void> {
    try {
      if (this.adapter.cleanupExpired) {
        await this.adapter.cleanupExpired();
      }
    } catch (error) {
      this.logger.error('[AgnosticSessionStorageService] Failed to cleanup expired entries:', error);
      throw error;
    }
  }

  /**
   * Helper: Store OAuth token
   */
  async setOAuthToken(
    provider: string,
    userId: string,
    token: { accessToken: string; refreshToken?: string; expiresAt?: Date },
    ttlSeconds: number = 3600
  ): Promise<void> {
    const key = `oauth:${provider}:${userId}`;
    await this.set(key, token, ttlSeconds);
  }

  /**
   * Helper: Get OAuth token
   */
  async getOAuthToken(provider: string, userId: string): Promise<any | null> {
    const key = `oauth:${provider}:${userId}`;
    return await this.get(key);
  }

  /**
   * Helper: Delete OAuth token
   */
  async deleteOAuthToken(provider: string, userId: string): Promise<void> {
    const key = `oauth:${provider}:${userId}`;
    await this.delete(key);
  }

  /**
   * Helper: Store CSRF token
   */
  async setCsrfToken(sessionId: string, token: string, ttlSeconds: number = 1800): Promise<void> {
    const key = `csrf:${sessionId}`;
    await this.set(key, token, ttlSeconds);
  }

  /**
   * Helper: Verify CSRF token
   */
  async verifyCsrfToken(sessionId: string, token: string): Promise<boolean> {
    const key = `csrf:${sessionId}`;
    const stored = await this.get(key);
    return stored === token;
  }
}
