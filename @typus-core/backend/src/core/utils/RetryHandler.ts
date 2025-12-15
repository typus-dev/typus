import { LoggerFactory } from '@/core/logger/LoggerFactory';

/**
 * Retryable Error
 * Indicates that operation can be retried
 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Max Retries Exceeded Error
 * Thrown when all retry attempts have been exhausted
 */
export class MaxRetriesExceededError extends Error {
  public readonly lastError: Error;
  public readonly attempts: number;

  constructor(lastError: Error, attempts: number) {
    super(`Maximum retries (${attempts}) exceeded. Last error: ${lastError.message}`);
    this.name = 'MaxRetriesExceededError';
    this.lastError = lastError;
    this.attempts = attempts;
  }
}

/**
 * Retry Options
 */
export interface RetryOptions {
  maxRetries?: number;      // Maximum number of retry attempts (default: 3)
  initialDelay?: number;    // Initial delay in milliseconds (default: 1000)
  maxDelay?: number;        // Maximum delay in milliseconds (default: 10000)
  backoffMultiplier?: number; // Multiplier for exponential backoff (default: 2)
}

/**
 * Check if error is retryable
 *
 * @param error - Error to check
 * @returns True if error should be retried
 */
export function isRetryable(error: Error): boolean {
  // Explicit retryable errors
  if (error instanceof RetryableError) {
    return true;
  }

  // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
  const networkErrors = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EHOSTUNREACH'
  ];

  if ('code' in error && typeof error.code === 'string') {
    if (networkErrors.includes(error.code)) {
      return true;
    }
  }

  // HTTP errors (5xx server errors, 429 rate limit)
  if ('response' in error && typeof error.response === 'object' && error.response !== null) {
    const response = error.response as any;
    if (response.status >= 500 || response.status === 429) {
      return true;
    }
  }

  // Temporary filesystem errors
  const tempFsErrors = ['EMFILE', 'ENFILE', 'EAGAIN'];
  if ('code' in error && typeof error.code === 'string') {
    if (tempFsErrors.includes(error.code)) {
      return true;
    }
  }

  return false;
}

/**
 * Execute function with exponential backoff retry
 *
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Result of successful execution
 * @throws MaxRetriesExceededError if all retries exhausted
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  const logger = LoggerFactory.getGlobalLogger();
  let lastError: Error = new Error('No error');
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug('[RetryHandler] Attempt', { attempt, maxRetries });
      const result = await fn();

      if (attempt > 1) {
        logger.info('[RetryHandler] Retry succeeded', { attempt });
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryable(error as Error)) {
        logger.warn('[RetryHandler] Non-retryable error, failing immediately', {
          error: lastError.message
        });
        throw error;
      }

      // If this was the last attempt, don't log "retrying"
      if (attempt === maxRetries) {
        logger.error('[RetryHandler] All retry attempts exhausted', {
          attempt,
          maxRetries,
          error: lastError.message
        });
        break;
      }

      logger.warn('[RetryHandler] Attempt failed, retrying', {
        attempt,
        maxRetries,
        error: lastError.message,
        nextDelay: delay
      });

      // Wait before next attempt
      await sleep(delay);

      // Exponential backoff with max cap
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw new MaxRetriesExceededError(lastError, maxRetries);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function with custom predicate
 *
 * @param fn - Async function to execute
 * @param shouldRetry - Function to determine if retry should happen
 * @param options - Retry options
 */
export async function retryWithPredicate<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  const logger = LoggerFactory.getGlobalLogger();
  let lastError: Error = new Error('No error');
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(lastError, attempt) || attempt === maxRetries) {
        throw error;
      }

      logger.warn('[RetryHandler] Retrying with custom predicate', {
        attempt,
        delay
      });

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw new MaxRetriesExceededError(lastError, maxRetries);
}
