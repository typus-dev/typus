import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { container } from 'tsyringe';
import { Service } from '@/core/decorators/component.js';
import jwt from 'jsonwebtoken';

interface UserConnection {
  userId: number;
  ws: WebSocket;
  lastPing: number;
}

@Service()
export class WebSocketService {
  private wss: WebSocketServer;
  private redis: any | null = null;
  private connections = new Map<string, UserConnection>();
  private redisAvailable: boolean = false;

  constructor() {
    this._initializeRedis();
  }

  /**
   * Initialize Redis connection (graceful degradation if unavailable)
   * Uses dynamic import to avoid loading ioredis in LITE mode
   */
  private async _initializeRedis(): Promise<void> {
    const redisEnabled = (global.env?.REDIS_ENABLED || process.env.REDIS_ENABLED) !== 'false';
    const redisUrl = global.env?.REDIS_URL || process.env.REDIS_URL;

    if (!redisEnabled || !redisUrl) {
      global.logger.warn('Redis disabled or not configured - running without Pub/Sub (LITE mode)', { source: 'system', what: 'WS:status' });
      this.redisAvailable = false;
      return;
    }

    try {
      // Dynamic import - only load ioredis if actually needed
      const { Redis } = await import('ioredis');
      this.redis = new Redis(redisUrl);
      this.redisAvailable = true;
      this.subscribeToNotifications();
      global.logger.info('Redis Pub/Sub initialized successfully (FULL mode)', { source: 'system', what: 'WS:status' });
    } catch (error) {
      global.logger.error('Failed to initialize Redis - running without Pub/Sub', { source: 'system', what: 'WS:error', error });
      this.redisAvailable = false;
    }
  }

  init(server: Server) {
    global.logger.info('Creating WebSocket server with path: /ws', { source: 'system', what: 'WS:status' });
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    global.logger.info('WebSocket server created, setting up connection handler', { source: 'system', what: 'WS:status' });
    this.wss.on('connection', this.onConnection.bind(this));

    // Ping interval
    setInterval(() => {
      this.pingConnections();
    }, 30000);

    global.logger.info('WebSocket server initialized', { source: 'system', what: 'WS:status' });
    global.logger.debug(`JWT_SECRET available: ${global.env?.JWT_SECRET ? 'YES' : 'NO'}`, { source: 'system' });
  }
  
  private onConnection(ws: WebSocket, request: any) {
    global.logger.info('New WS connection attempt detected', { source: 'system', what: 'WS:connect', className: 'WebSocketServer', methodName: 'onConnection' });
    this.handleConnection(ws, request);
  }

  private handleConnection(ws: WebSocket, request: any) {
    global.logger.info('Processing new WS connection', { source: 'system', what: 'WS:connect' });
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    global.logger.debug(`Connection URL: ${url.toString()}`, { source: 'system' });
    global.logger.debug(`Token provided: ${token ? 'YES' : 'NO'}`, { source: 'system' });

    if (!token) {
      global.logger.warn('Connection rejected: No token provided', { source: 'system', what: 'WS:reject' });
      ws.close(1008, 'No token provided');
      return;
    }

    try {
      global.logger.debug('Verifying JWT token...', { source: 'system' });
      const jwtSecret = global.env?.JWT_SECRET;
      global.logger.debug(`JWT_SECRET available: ${jwtSecret ? 'YES' : 'NO'}`, { source: 'system' });
      
      const decoded = jwt.verify(token, jwtSecret) as any;
      const userId = decoded.id || decoded.userId;
      global.logger.info(`Token verified`, { source: 'system', what: 'WS:auth', userId, email: decoded.email });

      if (!userId) {
        global.logger.warn('Connection rejected: No userId in token', { source: 'system', what: 'WS:reject' });
        ws.close(1008, 'Invalid token structure');
        return;
      }

      const connectionId = `${userId}_${Date.now()}`;

      this.connections.set(connectionId, {
        userId,
        ws,
        lastPing: Date.now()
      });

      const ip = (request.headers['cf-connecting-ip'] as string) || (request.headers['x-forwarded-for'] as string) || (request.headers['x-real-ip'] as string);
      global.logger.info(`Connection established`, { what: 'WS:connected', userId, ipAddress: ip, email: decoded.email });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to WebSocket server',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            const conn = this.connections.get(connectionId);
            if (conn) {
              conn.lastPing = Date.now();
            }
          }
        } catch (error) {
          global.logger.warn('Invalid WS message format', { source: 'system', error });
        }
      });

      ws.on('close', () => {
        this.connections.delete(connectionId);
        global.logger.info(`Connection closed`, { what: 'WS:disconnect', who: `user#${userId}`, userId, email: decoded.email });
      });

      ws.on('error', (error) => {
        global.logger.error('WS connection error', { error, userId });
        this.connections.delete(connectionId);
      });

    } catch (error) {
      global.logger.warn('Invalid token - connection rejected', { 
        error: error.message,
        tokenLength: token?.length,
        stack: error.stack
      });
      ws.close(1008, 'Invalid token');
    }
  }

  private subscribeToNotifications() {
    if (!this.redis) {
      global.logger.warn('Cannot subscribe to notifications - Redis not available', { source: 'system' });
      return;
    }

    // Subscribe to notification patterns
    this.redis.psubscribe('notification:*');

    // Subscribe to websocket broadcast channel for worker notifications
    this.redis.subscribe('websocket:broadcast');

    this.redis.on('pmessage', (pattern, channel, message) => {
      try {
        const notification = JSON.parse(message);

        if (channel.startsWith('notification:user:')) {
          const userId = parseInt(channel.split(':')[2]);
          this.sendToUser(userId, notification);
        } else if (channel === 'notification:broadcast') {
          this.broadcast(notification);
        }
      } catch (error) {
        global.logger.error('Error processing notification', { error });
      }
    });

    this.redis.on('message', (channel, message) => {
      try {
        if (channel === 'websocket:broadcast') {
          const notification = JSON.parse(message);
          global.logger.debug('Broadcasting worker notification', { what: 'WS:broadcast', type: notification.type, taskId: notification.data?.taskId });
          this.broadcast(notification);
        }
      } catch (error) {
        global.logger.error('Error processing worker notification', { error });
      }
    });

    global.logger.info('Subscribed to Redis Pub/Sub channels', { source: 'system' });
  }

  sendToUser(userId: number, data: any) {
    let sent = 0;
    this.connections.forEach((conn, connectionId) => {
      if (conn.userId === userId && conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(JSON.stringify({
            type: 'notification',
            data
          }));
          sent++;
        } catch (error) {
          global.logger.error('[WebSocket] Error sending to user', { error, userId });
          this.connections.delete(connectionId);
        }
      }
    });
    return sent;
  }

  broadcast(data: any) {
    let sent = 0;
    this.connections.forEach((conn, connectionId) => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(JSON.stringify({
            type: 'notification',
            data
          }));
          sent++;
        } catch (error) {
          global.logger.error('[WebSocket] Error broadcasting', { error });
          this.connections.delete(connectionId);
        }
      }
    });
    return sent;
  }

  private pingConnections() {
    const now = Date.now();
    this.connections.forEach((conn, connectionId) => {
      if (now - conn.lastPing > 60000) { // 1 minute timeout
        conn.ws.close();
        this.connections.delete(connectionId);
      } else if (conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          this.connections.delete(connectionId);
        }
      }
    });
  }

  getStats() {
    return {
      connections: this.connections.size,
      users: new Set([...this.connections.values()].map(c => c.userId)).size,
      redisAvailable: this.redisAvailable
    };
  }
}
