// src/core/context/ContextManager.ts
import { AsyncLocalStorage } from 'async_hooks';
import { Context } from './Context';
import jwt from 'jsonwebtoken';

export class ContextManager {
  private static instance: ContextManager;
  private storage: AsyncLocalStorage<Context>;

  private constructor() {
    this.storage = new AsyncLocalStorage<Context>();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Run a callback with a new context
   */
  run<T>(callback: () => T): T {
    const context = new Context();
    return this.storage.run(context, callback);
  }

  /**
   * Run async callback with a new context
   */
  async runAsync<T>(callback: () => Promise<T>): Promise<T> {
    const context = new Context();
    return this.storage.run(context, callback);
  }

  /**
   * Get the current context
   */
  getCurrentContext(): Context | undefined {
    return this.storage.getStore();
  }

  /**
   * Extract user ID from JWT token
   */
  private extractUserIdFromToken(req: any): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, global.env.JWT_SECRET);
      return decoded.id ? String(decoded.id) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract real IP address considering CloudFlare headers
   */
  private extractRealIpAddress(req: any): string {
    let ipAddress = req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.ip || 'unknown';

    // Handle array or comma-separated values
    if (Array.isArray(ipAddress)) {
      ipAddress = ipAddress[0];
    } else if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }

    return ipAddress;
  }

  /**
   * Get logging metadata from current context
   */
  getLoggingMetadata(): Record<string, any> {
    const context = this.getCurrentContext();
    if (!context) {
      return {};
    }

    return {
      contextId: context.id,
      requestId: context.get('requestId'),
      userId: context.get('userId'),
      ipAddress: context.get('ipAddress'),
      requestPath: context.get('path'),
      requestMethod: context.get('method'),
      userAgent: context.get('userAgent')
    };
  }

 /**
   * Create middleware for Express
   */
  middleware() {
    return (req: any, res: any, next: any) => {
      const context = new Context();

      // Helper: anonymous user factory (kept inline to stay minimal)
      const getAnonymousUser = () => ({
        id: null,                  // anonymous has no id
        email: null,
        roles: ['anonymous'],
        abilityRules: [],          // no permissions by default
        isAnonymous: true          // handy flag if you need it later
      });

      // Try to extract user from JWT
      let userSet = false;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded: any = jwt.verify(token, global.env.JWT_SECRET);
          if (decoded?.id) {
            context.set('userId', String(decoded.id));
            const user = {
              id: decoded.id,
              email: decoded.email ?? null,
              abilityRules: [],     // Auth middleware may populate later
              roles: decoded.roles ?? [],
              isAnonymous: false
            };
            context.set('user', user);
            userSet = true;
          }
        } catch {
          // invalid token -> fall through to anonymous
        }
      }

      // If no valid user - set anonymous user
      if (!userSet) {
        context.set('user', getAnonymousUser());
        context.set('userId', null);
      }

      // Extract and store real IP address
      let ipAddress = req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.ip || 'unknown';

      if (Array.isArray(ipAddress)) {
        ipAddress = ipAddress[0];
      } else if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }

      context.set('ipAddress', ipAddress);

      // Store request info
      context.set('method', req.method);
      context.set('path', req.path);
      context.set('userAgent', req.headers['user-agent'] || 'unknown');
      context.set('ip', req.ip);

      // Attach requestId if middleware set it earlier
      if (req.requestId) {
        context.set('requestId', req.requestId);
      } else if (req.headers['x-request-id']) {
        context.set('requestId', req.headers['x-request-id']);
      }

      // Attach context to request
      req.context = context;

      // Run in AsyncLocalStorage context
      this.storage.run(context, next);
    };
  }
}
