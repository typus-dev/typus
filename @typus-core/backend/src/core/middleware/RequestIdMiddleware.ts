import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Attaches a correlation ID to every incoming request and response.
 * - Header: X-Request-ID (preserved if provided by proxy)
 * - Property: (req as any).requestId
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = (req.headers['x-request-id'] as string) || '';
  const id = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();

  (req as any).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

