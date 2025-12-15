import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware } from '@/core/middleware/ValidationMiddleware.js';
import { ZodSchema } from 'zod';
import { BaseError } from './BaseError';
import { CoreBase } from './CoreBase';
import { Context } from '@/core/context/Context.js';
import { ContextManager } from '@/core/context/ContextManager.js';

import fs from 'fs';
import path from 'path';

// List of methods to exclude from proxy wrapping
const EXCLUDED_METHODS = [
  'validate',
  'getValidatedData',
  'success',
  'error',
  'notFound',
  'badRequest',
  'unauthorized',
  'forbidden',
  'handleControllerError',
  'checkSchemasExist',
  'constructor'
];

export abstract class BaseController extends CoreBase {
  protected hasValidationSchemas: boolean;
  protected prisma: any;

  constructor() {
    super();

    this.prisma = global.prisma;

    this.hasValidationSchemas = this.checkSchemasExist();

    this.logger.info(`[Base:${this.className}] Controller instantiated`);

    if (!this.hasValidationSchemas) {
      this.logger.warn(`[Base:${this.className}] Validation schemas not found, validation will be skipped`);
    }

    // Create proxy to automatically wrap controller methods
    return new Proxy(this, {
      get: (target, prop) => {
        const value = target[prop];
        const propName = String(prop);


        // Only wrap if it's a function and not an excluded method
        if (typeof value === 'function' && !EXCLUDED_METHODS.includes(propName)) {
          return async (req: Request, res: Response, next: NextFunction) => {
            try {
              // Debug middleware context and user state
              const expected = value.length;
              const hasUserBefore = !!(req.user as any)?.id;
              const currentContextUser = this.getCurrentUser()?.id;

              this.logger.debug(`[${this.className}] Proxy method: ${propName}`, {
                expectedParams: expected,
                callArgsLength: expected >= 3 ? 3 : 2,
                userIdBefore: (req.user as any)?.id || null,
                userEmail: (req.user as any)?.email || null,
                contextUserId: currentContextUser || null,
                methodSignature: `(${expected < 3 ? 'req,res' : 'req,res,next'})`
              });

              const callArgs = expected >= 3 ? [req, res, next] : [req, res];

              const result = await Reflect.apply(value as any, target, callArgs);

              if ((result as any)?.headersSent || res.headersSent) return result;

              if (result && (result as any).data !== undefined) {
                return this.success(res, (result as any).data);
              }

              if (result && typeof result === 'object' && !(result as any).data && !(result as any).error) {
                return this.success(res, result);
              }

              if (result && (result as any).error) {
                return this.handleControllerError(res, (result as any).error, `Failed in ${propName}`);
              }

              return result;
            } catch (error) {
              return this.handleControllerError(res, error, `Failed in ${propName}`);
            }
          };
        }

        // Return original value for non-methods
        return value;
      }
    });
  }

  protected getCurrentUser(): any {
    const context = this.getContext();
    return context?.get('user');
  }

  protected getContext(): Context | undefined {
    return ContextManager.getInstance().getCurrentContext();
  }
  /**
   * Check if validation schemas exist for the controller's module
   */
  protected checkSchemasExist(): boolean {
    try {
      this.logger.debug(`[Base:${this.className}] Checking for validation schemas`);

      // Extract module name from controller name (e.g., "UserController" -> "user")
      const moduleName = this.className.replace('Controller', '').toLowerCase();

      // Get module path
      const basePath = path.resolve(process.cwd(), 'src/modules', moduleName);
      const schemasPath = path.join(basePath, 'validation', `${moduleName}Schemas.ts`);

      const exists = fs.existsSync(schemasPath);
      this.logger.debug(`[Base:${this.className}] Validation schemas ${exists ? 'found' : 'not found'} at ${schemasPath}`);

      return exists;
    } catch (error) {
      this.logger.error(`[Base:${this.className}] Error checking for validation schemas`, { error });
      return false;
    }
  }

  protected validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return ValidationMiddleware.validate(schema, source);
  }

  /**
   * Get validated data or fallback to raw data
   */
  protected getValidatedData<T = any>(req: Request): T {
    this.logger.debug(`[Base:${this.className}] Getting validated data`);
    return (req.validatedData || req.body) as T;
  }

  /**
   * Success response
   */
  protected success<T>(res: Response, data: T, status: number = 200): Response {
    this.logger.debug(`[Base:${this.className}] Sending success response with status ${status}`);
    return res.status(status).json(data);
  }

  /**
   * Error response
   */
  protected error(
    res: Response,
    message: string,
    code: string = 'INTERNAL_ERROR',
    status: number = 500
  ): Response {
    this.logger.error(`[Base:${this.className}] Error: ${message}`, { code });

    return res.status(status).json({
      status,
      data: null,
      error: {
        message,
        code
      }
    });
  }

  /**
   * Not found response
   */
  protected notFound(res: Response, message: string = 'Resource not found'): Response {
    this.logger.warn(`[Base:${this.className}] Not found: ${message}`);
    return this.error(res, message, 'NOT_FOUND', 404);
  }

  /**
   * Bad request response
   */
  protected badRequest(
    res: Response,
    message: string = 'Bad request',
    code: string = 'BAD_REQUEST'
  ): Response {
    this.logger.warn(`[Base:${this.className}] Bad request: ${message}`);
    return this.error(res, message, code, 400);
  }

  /**
   * Unauthorized response
   */
  protected unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    code: string = 'UNAUTHORIZED'
  ): Response {
    this.logger.warn(`[Base:${this.className}] Unauthorized: ${message}`);
    return this.error(res, message, code, 401);
  }

  /**
   * Forbidden response
   */
  protected forbidden(
    res: Response,
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN'
  ): Response {
    this.logger.warn(`[Base:${this.className}] Forbidden: ${message}`);
    return this.error(res, message, code, 403);
  }

  /**
   * Handle controller errors
  **/
  protected handleControllerError(res: Response, error: any, defaultMessage: string): Response {
    this.logger.error(`[Base:${this.className}] Controller error:`, {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        stack: error.stack,
        meta: (error as any).meta // Capture Prisma metadata if available
      } : error
    });

    this.logger.warn(`[Base:${this.className}] Error code: ${error}`);


    if (error.code === 'OPERATION_FAILED' && error?.message) {
      return this.badRequest(res, error.message, 'DUPLICATE_ENTRY');
    }

    // Check for known error types
    if (error.status === 400 || error.code === 'BAD_REQUEST') {
      return this.badRequest(res, error.message, error.code || 'BAD_REQUEST');
    }

    if (error.status === 404 || error.code === 'NOT_FOUND') {
      return this.notFound(res, error.message);
    }

    if (error.status === 401 || error.code === 'UNAUTHORIZED') {
      return this.unauthorized(res, error.message, error.code || 'UNAUTHORIZED');
    }

    if (error.status === 403 || error.code === 'FORBIDDEN') {
      return this.forbidden(res, error.message, error.code || 'FORBIDDEN');
    }

    if (error.name === 'ZodError') {
      this.logger.warn(`[Base:${this.className}] Validation error: ${error.message}`);
      return this.badRequest(res, 'Validation failed', 'VALIDATION_ERROR');
    }

    // Handle Prisma-specific errors
    if (error.name === 'PrismaClientKnownRequestError') {
      // P2003: Foreign key constraint failed
      // P2025: Record not found
      // ...other Prisma error codes
      const errorCode = error.code || 'DATABASE_ERROR';
      const errorMessage = this.getPrismaErrorMessage(error) || 'Database operation failed';

      return this.error(res, errorMessage, errorCode, 500);
    }

    return this.error(res, defaultMessage, 'INTERNAL_ERROR');
  }

  /**
   * Get user-friendly message from Prisma error
   */
  private getPrismaErrorMessage(error: any): string | null {
    if (!error) return null;

    // Handle common Prisma error codes
    switch (error.code) {
      case 'P2002':
        return 'A record with this value already exists';
      case 'P2003':
        return 'Foreign key constraint failed';
      case 'P2025':
        return 'Record not found';
      case undefined:
        if (error.message && error.message.includes('does not exist in the current database')) {
          return 'Database schema error: A required table or column is missing';
        }
        break;
    }

    // Return a cleaned up version of the original message if we don't have a specific handler
    return error.message ? error.message.split('\n')[0] : null;
  }
}
