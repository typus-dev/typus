// src/core/base/BaseError.ts
export class BaseError extends Error {
  readonly status: number;
  readonly code: string;
  readonly context: Record<string, any>;

  constructor(
    message: string, 
    code: string = 'INTERNAL_ERROR', 
    status: number = 500,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.context = context;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get the error details as a serializable object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      context: this.context
    };
  }
}

// Common error types

export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', context: Record<string, any> = {}) {
    super(message, 'NOT_FOUND', 404, context);
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string = 'Bad request', context: Record<string, any> = {}) {
    super(message, 'BAD_REQUEST', 400, context);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', context: Record<string, any> = {}) {
    super(message, 'UNAUTHORIZED', 401, context);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden', context: Record<string, any> = {}) {
    super(message, 'FORBIDDEN', 403, context);
  }
}

export class ValidationError extends BaseError {
  readonly errors: any[];

  constructor(message: string = 'Validation failed', errors: any[] = [], context: Record<string, any> = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.errors = errors;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}