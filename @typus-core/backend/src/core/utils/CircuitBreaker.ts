import { LoggerFactory } from '@/core/logger/LoggerFactory';

/**
 * Circuit Breaker State
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit Breaker Error
 * Thrown when circuit is open
 */
export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Number of failures before opening (default: 5)
  successThreshold?: number;      // Number of successes to close from half-open (default: 2)
  timeout?: number;               // Timeout before trying half-open (default: 60000ms)
  monitoringPeriod?: number;      // Period for failure counting (default: 120000ms)
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures when a service is down by:
 * 1. CLOSED: Normal operation, counts failures
 * 2. OPEN: After N failures, reject immediately without calling service
 * 3. HALF_OPEN: After timeout, try again with limited requests
 * 4. Back to CLOSED: After M successes in half-open state
 *
 * Example:
 * ```typescript
 * const breaker = new CircuitBreaker('cache-generator', {
 *   failureThreshold: 5,
 *   timeout: 60000
 * });
 *
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await axios.post(url, data);
 *   });
 * } catch (error) {
 *   if (error instanceof CircuitBreakerError) {
 *     // Circuit is open, use fallback
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number = 0;
  private failureTimestamps: number[] = [];

  // Statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly monitoringPeriod: number;
  private readonly logger = LoggerFactory.getGlobalLogger();

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutes

    this.logger.info('[CircuitBreaker] Initialized', {
      name: this.name,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      timeout: this.timeout
    });
  }

  /**
   * Execute function with circuit breaker protection
   *
   * @param fn - Async function to execute
   * @returns Result of function execution
   * @throws CircuitBreakerError if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() < this.nextAttemptTime) {
        const waitTime = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
        this.logger.warn('[CircuitBreaker] Circuit is OPEN, rejecting request', {
          name: this.name,
          waitTimeSeconds: waitTime
        });
        throw new CircuitBreakerError(
          `Circuit breaker "${this.name}" is OPEN. Service unavailable. Retry in ${waitTime}s.`
        );
      }

      // Timeout passed, try half-open
      this.transitionToHalfOpen();
    }

    try {
      // Execute function
      const result = await fn();

      // Success
      this.onSuccess();

      return result;
    } catch (error) {
      // Failure
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;

      this.logger.debug('[CircuitBreaker] Success in HALF_OPEN', {
        name: this.name,
        successes: this.successes,
        successThreshold: this.successThreshold
      });

      // Check if enough successes to close circuit
      if (this.successes >= this.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    // Track failure timestamps for monitoring period
    this.failureTimestamps.push(this.lastFailureTime);
    this.cleanOldFailures();

    this.logger.warn('[CircuitBreaker] Request failed', {
      name: this.name,
      state: this.state,
      failures: this.failures,
      recentFailures: this.failureTimestamps.length
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open immediately opens circuit
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if recent failures exceed threshold
      if (this.failureTimestamps.length >= this.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transition to CLOSED state (normal operation)
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];

    this.logger.info('[CircuitBreaker] Transitioned to CLOSED', {
      name: this.name
    });
  }

  /**
   * Transition to OPEN state (failing, reject immediately)
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.timeout;
    this.successes = 0;

    this.logger.error('[CircuitBreaker] Transitioned to OPEN', {
      name: this.name,
      failures: this.failureTimestamps.length,
      nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
    });
  }

  /**
   * Transition to HALF_OPEN state (testing recovery)
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successes = 0;

    this.logger.info('[CircuitBreaker] Transitioned to HALF_OPEN', {
      name: this.name
    });
  }

  /**
   * Remove failure timestamps older than monitoring period
   */
  private cleanOldFailures(): void {
    const cutoffTime = Date.now() - this.monitoringPeriod;
    this.failureTimestamps = this.failureTimestamps.filter(
      timestamp => timestamp > cutoffTime
    );
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Force reset to CLOSED state
   * Use for manual recovery or testing
   */
  reset(): void {
    this.logger.info('[CircuitBreaker] Manual reset', { name: this.name });
    this.transitionToClosed();
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is accepting requests
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    // Check if timeout passed for OPEN state
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime) {
      return true;
    }

    return false;
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers by name
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker
   */
  static getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get circuit breaker by name
   */
  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers stats
   */
  static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}
