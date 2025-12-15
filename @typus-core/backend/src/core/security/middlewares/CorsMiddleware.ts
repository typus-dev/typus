// CorsMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/core/middleware/BaseMiddleware.js';

export class CorsMiddleware extends BaseMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // CORS logic here
  }
}
