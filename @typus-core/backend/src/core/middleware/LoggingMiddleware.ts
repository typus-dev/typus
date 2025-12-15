// LoggingMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from './BaseMiddleware';

export class LoggingMiddleware extends BaseMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Logging logic here
  }
}
