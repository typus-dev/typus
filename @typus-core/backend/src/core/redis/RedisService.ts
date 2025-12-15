import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';

@Service()
export class RedisService extends BaseService {
  private static instance: any | null = null;
  private static isConnecting: boolean = false;

  constructor() {
    super();
  }

  /**
   * Get the Redis connection instance (singleton pattern)
   */
  public static async getConnection(): Promise<any> {
    if (RedisService.instance && RedisService.instance.status === 'ready') {
      return RedisService.instance;
    }

    if (RedisService.isConnecting) {
      // Wait for existing connection attempt
      while (RedisService.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (RedisService.instance && RedisService.instance.status === 'ready') {
        return RedisService.instance;
      }
    }

    return RedisService.createConnection();
  }

  /**
   * Create a new Redis connection (dynamic import to avoid loading in LITE mode)
   */
  private static async createConnection(): Promise<any> {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (!redisEnabled) {
      throw new Error('Redis is disabled (REDIS_ENABLED=false)');
    }

    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }

    RedisService.isConnecting = true;

    try {
      // Dynamic import - only load ioredis if actually needed
      const { default: Redis } = await import('ioredis');

      RedisService.instance = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      // Setup event handlers
      RedisService.instance.on('connect', () => {
        console.log('[RedisService] Connected to Redis');
      });

      RedisService.instance.on('error', (error) => {
        console.error('[RedisService] Redis connection error:', error);
      });

      RedisService.instance.on('close', () => {
        console.log('[RedisService] Redis connection closed');
      });

      RedisService.instance.on('reconnecting', () => {
        console.log('[RedisService] Reconnecting to Redis...');
      });

      // Connect to Redis
      await RedisService.instance.connect();

      RedisService.isConnecting = false;
      // Mask credentials in log output
      const redisUrl = process.env.REDIS_URL || '';
      const maskedUrl = redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      console.log(`[RedisService] Successfully connected to Redis: ${maskedUrl}`);
      
      return RedisService.instance;
    } catch (error) {
      RedisService.isConnecting = false;
      RedisService.instance = null;
      console.error('[RedisService] Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis connection for instance methods
   */
  public async getRedis(): Promise<any> {
    return RedisService.getConnection();
  }

  /**
   * Check if Redis is connected
   */
  public static isConnected(): boolean {
    return RedisService.instance !== null && RedisService.instance.status === 'ready';
  }

  /**
   * Disconnect from Redis
   */
  public static async disconnect(): Promise<void> {
    if (RedisService.instance) {
      await RedisService.instance.disconnect();
      RedisService.instance = null;
      console.log('[RedisService] Disconnected from Redis');
    }
  }

  /**
   * Get Redis health status
   */
  public async getHealthStatus(): Promise<{
    connected: boolean;
    status: string;
    uptime?: number;
    memory?: any;
    clients?: number;
  }> {
    try {
      const redis = await this.getRedis();
      const info = await redis.info();
      const lines = info.split('\r\n');
      
      const serverSection = lines.find(line => line.startsWith('# Server'));
      const memorySection = lines.find(line => line.startsWith('# Memory'));
      const clientsSection = lines.find(line => line.startsWith('# Clients'));
      
      const uptimeLine = lines.find(line => line.startsWith('uptime_in_seconds:'));
      const memoryUsedLine = lines.find(line => line.startsWith('used_memory_human:'));
      const connectedClientsLine = lines.find(line => line.startsWith('connected_clients:'));
      
      return {
        connected: RedisService.isConnected(),
        status: redis.status,
        uptime: uptimeLine ? parseInt(uptimeLine.split(':')[1]) : undefined,
        memory: memoryUsedLine ? memoryUsedLine.split(':')[1] : undefined,
        clients: connectedClientsLine ? parseInt(connectedClientsLine.split(':')[1]) : undefined,
      };
    } catch (error) {
      return {
        connected: false,
        status: 'error',
      };
    }
  }
}
