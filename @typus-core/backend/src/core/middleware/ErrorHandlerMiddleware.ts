// src/core/middleware/ErrorHandlerMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../base/BaseError';
import { ILogger } from '../logger/ILogger.js';
import { LoggerFactory } from '../logger/LoggerFactory.js';
import { ZodError } from 'zod';

export class ErrorHandlerMiddleware {
  private logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getGlobalLogger();
  }

  handle() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Application error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });

      // Handle BaseError instances
      if (err instanceof BaseError) {
        return res.status(err.status).json({
          success: false,
          error: err.toJSON()
        });
      }

      // Handle Zod validation errors
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            status: 400,
            errors: err.errors
          }
        });
      }

      // Handle generic errors
      return res.status(500).json({
        success: false,
        error: {
          message: global.env.NODE_ENV === 'production' 
            ? 'Internal server error'
            : err.message,
          code: 'INTERNAL_ERROR',
          status: 500
        }
      });
    };
  }
}
