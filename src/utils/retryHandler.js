/**
 * Retry Handler with Exponential Backoff
 * Handles automatic retries for transient email failures
 */

import logger from './logger.js';
import { isRetryable, ErrorCategory, categorizeError } from './errors.js';

export class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitter = options.jitter !== false; // Add randomness by default
  }

  /**
   * Calculate delay for next retry with exponential backoff
   */
  calculateDelay(attempt) {
    let delay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt);
    delay = Math.min(delay, this.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, context = {}) {
    let lastError;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        logger.debug(`Attempt ${attempt + 1}/${this.maxRetries + 1}`, context);

        const result = await fn();

        // Success - log if we had previous failures
        if (attempt > 0) {
          logger.info(`Operation succeeded after ${attempt} retries`, context);
        }

        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        const category = categorizeError(error);
        const retryable = isRetryable(error);

        logger.warn(`Attempt ${attempt} failed`, {
          error: error.message,
          errorCode: error.code,
          category,
          retryable,
          ...context,
        });

        // Don't retry if error is not retryable
        if (!retryable) {
          logger.error('Error is not retryable, failing immediately', {
            error: error.message,
            category,
            ...context,
          });
          throw error;
        }

        // Don't retry if we've exhausted all attempts
        if (attempt > this.maxRetries) {
          logger.error(`Max retries (${this.maxRetries}) exceeded`, {
            error: error.message,
            attempts: attempt,
            ...context,
          });
          throw error;
        }

        // Calculate delay and wait before retry
        const delay = this.calculateDelay(attempt - 1);
        logger.info(`Retrying in ${delay}ms`, { attempt, maxRetries: this.maxRetries, ...context });
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute with custom retry count for this operation
   */
  async executeWithRetries(fn, retries, context = {}) {
    const originalMaxRetries = this.maxRetries;
    this.maxRetries = retries;

    try {
      return await this.execute(fn, context);
    } finally {
      this.maxRetries = originalMaxRetries;
    }
  }
}

/**
 * Circuit Breaker Pattern
 * Prevents overwhelming a failing service with repeated requests
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen() {
    return this.state === 'OPEN' && Date.now() < this.nextAttempt;
  }

  /**
   * Execute function through circuit breaker
   */
  async execute(fn, context = {}) {
    // If circuit is open and timeout hasn't passed, fail fast
    if (this.isOpen()) {
      const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
      logger.warn(`Circuit breaker is OPEN, failing fast`, {
        waitTime: `${waitTime}s`,
        failureCount: this.failureCount,
        ...context,
      });
      throw new Error(`Circuit breaker is OPEN. Try again in ${waitTime}s`);
    }

    // If timeout passed, try half-open
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      logger.info('Circuit breaker entering HALF_OPEN state', context);
    }

    try {
      const result = await fn();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(context);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess(context = {}) {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      logger.debug(`Circuit breaker success count: ${this.successCount}/${this.successThreshold}`, context);

      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info('Circuit breaker CLOSED (recovered)', context);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(context = {}) {
    this.failureCount++;
    logger.debug(`Circuit breaker failure count: ${this.failureCount}/${this.failureThreshold}`, context);

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(`Circuit breaker OPENED`, {
        failureCount: this.failureCount,
        timeout: `${this.timeout}ms`,
        ...context,
      });
    }
  }

  /**
   * Manually reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    logger.info('Circuit breaker manually reset to CLOSED');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      isOpen: this.isOpen(),
    };
  }
}

/**
 * Bulk Retry Handler
 * Specialized handler for bulk email operations
 */
export class BulkRetryHandler {
  constructor(options = {}) {
    this.retryHandler = new RetryHandler(options);
    this.concurrencyLimit = options.concurrencyLimit || 5;
  }

  /**
   * Execute bulk operations with retry and concurrency control
   */
  async executeBulk(operations, context = {}) {
    const results = [];
    const chunks = this.chunkArray(operations, this.concurrencyLimit);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.debug(`Processing chunk ${i + 1}/${chunks.length}`, {
        chunkSize: chunk.length,
        ...context,
      });

      const chunkResults = await Promise.allSettled(
        chunk.map((operation, index) =>
          this.retryHandler.execute(
            () => operation.fn(),
            {
              operationIndex: i * this.concurrencyLimit + index,
              ...operation.context,
              ...context,
            }
          )
        )
      );

      results.push(...chunkResults);
    }

    return this.processResults(results);
  }

  /**
   * Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Process settled promise results
   */
  processResults(results) {
    const processed = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          success: true,
          data: result.value,
          index,
        };
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          errorCode: result.reason?.code,
          index,
        };
      }
    });

    const successful = processed.filter(r => r.success).length;
    const failed = processed.filter(r => !r.success).length;

    return {
      results: processed,
      summary: {
        total: results.length,
        successful,
        failed,
        successRate: ((successful / results.length) * 100).toFixed(2) + '%',
      },
    };
  }
}

// Default export
export default new RetryHandler();
