import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from './BaseMiddleware';
import { ZodSchema } from 'zod';
import { ILogger } from '@/core/logger/ILogger.js';
import { LoggerFactory } from '@/core/logger/LoggerFactory.js';



declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

/**
 * Middleware for request validation using Zod schemas
 */
export class ValidationMiddleware extends BaseMiddleware {
  private schema: ZodSchema;
  private source: 'body' | 'query' | 'params' | 'all';
  private logger: ILogger;

  constructor(schema: ZodSchema, source: 'body' | 'query' | 'params' | 'all' = 'body') {
    super();
    this.schema = schema;
    this.source = source;
    this.logger = LoggerFactory.getGlobalLogger();

    this.logger.info('[ValidationMiddleware] initialized');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Debug: log params for diagnostics
      this.logger.info('[ValidationMiddleware] req.params:', req.params);

      // Support multi-source validation
      let dataToValidate: any;
      if (this.source === 'all') {
        dataToValidate = {
          body: req.body,
          params: req.params,
          query: req.query,
        };
        this.logger.info('[ValidationMiddleware] Validating all sources:', dataToValidate);
      } else {
        dataToValidate = { [this.source]: req[this.source] };
        this.logger.info(
          `[ValidationMiddleware] Validating ${this.source}:`,
          req[this.source]
        );
      }

      const result = this.schema.parse(dataToValidate);

      // Save validated data to the request object
      req.validatedData = result;

      next();
    } catch (error) {
      next(error); // Pass error to ErrorHandlerMiddleware
    }
  }

  /**
   * Factory method for easier middleware creation
   */
  static validate(schema: ZodSchema, source: 'body' | 'query' | 'params' | 'all' = 'body') {
    const middleware = new ValidationMiddleware(schema, source);
    return middleware.use.bind(middleware);
  }
}
