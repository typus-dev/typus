import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/core/middleware/BaseMiddleware.js';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env.config.js';

export class RateLimitMiddleware extends BaseMiddleware {
  private defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: {
      trustProxy: false,
    },
    keyGenerator: (req, res) => {
      // Get the client IP address from the `X-Forwarded-For` header
      if (req.headers['x-forwarded-for']) {
        const forwarded = Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for'].split(',')[0].trim();
        return forwarded;
      }
      
      // Or return the remote address
      return req.socket.remoteAddress || '127.0.0.1';
    }
  });

  private logLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // higher limit for log endpoints
    message: 'Too many log requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      trustProxy: false,
    },
    keyGenerator: (req, res) => {
      if (req.headers['x-forwarded-for']) {
        const forwarded = Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for'].split(',')[0].trim();
        return forwarded;
      }
      
      return req.socket.remoteAddress || '127.0.0.1';
    }
  });

  use(req: Request, res: Response, next: NextFunction): void {
    // Safer bypass: only if Authorization is a valid JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        jwt.verify(token, env.JWT_SECRET);
        return next();
      } catch {
        // fall through to limiter for invalid/expired tokens
      }
    }

    // Use separate limiter for log endpoints
    if (req.path === '/api/logs' || req.path.startsWith('/logs')) {
      this.logLimiter(req, res, next);
    } else {
      this.defaultLimiter(req, res, next);
    }
  }
}
