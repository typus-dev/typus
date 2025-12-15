import { Service } from '../decorators/component.js';
import { BaseService } from '../base/BaseService.js';

/**
 * Redis Service Stub (for LITE profile)
 *
 * Provides empty implementations when Redis is disabled.
 * All methods are no-ops to prevent crashes.
 */
@Service()
export class RedisServiceStub extends BaseService {
  constructor() {
    super();
    this.logger.info('[RedisServiceStub] Using stub (LITE profile - Redis disabled)');
  }

  /**
   * Get Redis connection - returns null stub
   */
  public static async getConnection(): Promise<any> {
    return null;
  }

  /**
   * Get Redis for instance methods - returns null
   */
  public async getRedis(): Promise<any> {
    return null;
  }

  /**
   * Check if Redis is connected - always false
   */
  public static isConnected(): boolean {
    return false;
  }

  /**
   * Disconnect - no-op
   */
  public static async disconnect(): Promise<void> {
    // No-op
  }

  /**
   * Get health status - returns disconnected
   */
  public async getHealthStatus(): Promise<{
    connected: boolean;
    status: string;
    uptime?: number;
    memory?: any;
    clients?: number;
  }> {
    return {
      connected: false,
      status: 'disabled',
    };
  }
}
