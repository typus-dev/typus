import { Context } from '@/core/context/Context.js';
import { ContextManager } from '@/core/context/ContextManager.js';
import { BaseError } from './BaseError.js';
import { CoreBase } from './CoreBase.js';

// Service result interface
export interface ServiceResult<T> {
  data?: T;
  error?: BaseError;
}

// List of methods to exclude from proxy wrapping
const EXCLUDED_METHODS = [
  'getContext',
  'withTransaction',
  'constructor',
  'middleware',  // Exclude middleware methods from async wrapping (needed for Express compatibility)
  'extractOperationDetails',  // Private helper methods that don't need proxy wrapping
  'checkAnonymousAccess',
  'delegateToAuth',
  'getAuthMiddleware',
  'getSchema',    // Task handler schema method (must be synchronous)
  'execute',      // Task handler execution method (already async, no need to wrap)
  'validate',     // Task handler validation method (already async, no need to wrap)
  'normalize',    // Task handler normalization method (synchronous data transformation)
  'formatTimestamp',  // Utility method (synchronous string formatting)
  'maskPassword',     // Utility method (synchronous string masking)
  'generateSessionId', // Web-analytics utility (synchronous SHA256 hashing)
  'hashIpAddress'      // Web-analytics utility (synchronous SHA256 hashing)
];

export abstract class BaseService extends CoreBase {
  protected prisma: any;

  constructor() {
    super();
    this.prisma = global.prisma;
    
    // Create proxy to automatically wrap service methods
    return new Proxy(this, {
      get: (target, prop) => {
        const value = target[prop];
        const propName = String(prop);
        
        // Only wrap if it's a function and not an excluded method
        if (typeof value === 'function' && !EXCLUDED_METHODS.includes(propName)) {
          
          // Return wrapped function with error handling
          return async (...args: any[]) => {
            try {
              // Log method call
              this.logger.info(`[${this.className}] Method called: ${propName}`);
              
              // Execute original method
              const result = await value.apply(target, args);
              
              // Return result as is
              return result;
            } catch (error) {
              // Log error details
              this.logger.error(`[${this.className}] Error in ${propName}:`, { 
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                args: args
              });
              
              // Return structured error
              if (error instanceof BaseError) {
                //return { error };
                throw error;
              }
              
              // Convert unknown errors to BaseError
              return { 
                error: new BaseError(
                  `Operation failed in ${this.className}.${propName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  'OPERATION_FAILED', 
                  500
                ) 
              };
            }
          };
        }
        
        // Return original value for non-methods
        return value;
      }
    });
  }
  /**
   * Get the current operation context
   */
  protected getContext(): Context | undefined {
    return ContextManager.getInstance().getCurrentContext();
  }

  
  protected getCurrentUser(): any {
  const context = this.getContext();
  return context?.get('user');
}


  /**
   * Run an operation in a transaction
   */
  protected async withTransaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx);
    });
  }
}
