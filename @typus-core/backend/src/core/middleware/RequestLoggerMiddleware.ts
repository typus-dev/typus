// src/core/middleware/RequestLoggerMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/core/logger/Logger.js';
import jwt from 'jsonwebtoken';

/**
 * Logs method, url, headers, and body for GET, POST, PUT, DELETE requests,
 * including userId and ipAddress if available.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const logger = (global.logger && global.logger instanceof Logger) ? global.logger : new Logger();

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Start log (DEBUG): Request received
  try {
    const ipAddress = (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) || req.ip || (req.connection?.remoteAddress as string) || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    logger.debug('Request received', {
      className: 'RequestLogger',
      methodName: 'start',
      requestId: (req as any).requestId,
      ipAddress,
      userAgent,
      requestPath: req.originalUrl,
      requestMethod: req.method,
      service: 'backend'
    });
  } catch {}

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ipAddress = (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) || req.ip || (req.connection?.remoteAddress as string) || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const context = (req as any).context;
    const userId = context?.get('userId') ?? null;

    logger.info('HTTP request completed', {
      className: 'RequestLogger',
      methodName: 'complete',
      requestId: (req as any).requestId,
      ipAddress,
      userAgent,
      requestPath: req.originalUrl,
      requestMethod: req.method,
      status: res.statusCode,
      durationMs: duration,
      userId,
      service: 'backend'
    });
  });

  next();
}
