// src/core/middleware/ErrorHandlerMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { BaseError } from '@/core/base/BaseError.js';
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

      // Handle BaseError instances.
      // WHY the structural check: `instanceof` is per module instance, and this file and the code that
      // throws (AuthMiddleware, services) import BaseError through different specifiers, so under
      // tsx/ESM they can end up holding two different class objects. When that happens `instanceof`
      // is false and a ForbiddenError (403) is reported to the client as a generic 500
      // INTERNAL_ERROR -- which is exactly what "any user can mint tokens" looked like once the role
      // check was added: the check worked, the status lied. Trust the shape, not the identity.
      const typed = err as any;
      const isTypedError =
        err instanceof BaseError ||
        (typed && typeof typed.status === 'number' && typeof typed.code === 'string' && typeof typed.toJSON === 'function');

      if (isTypedError) {
        return res.status(typed.status).json({
          success: false,
          error: typed.toJSON()
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
