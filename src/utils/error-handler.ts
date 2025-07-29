/**
 * Error handling utilities for Amazon Seller MCP Client
 *
 * This file contains error classes, error translation functions, and error recovery strategies
 * for handling errors from the Amazon Selling Partner API and translating them to MCP errors.
 */

import { ApiError, ApiErrorType } from '../types/api.js';
import * as logger from './logger.js';

/**
 * Base error class for Amazon Seller MCP Client
 */
export class AmazonSellerMcpError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Error details
   */
  details?: any;

  /**
   * Original error
   */
  cause?: Error;

  /**
   * Create a new Amazon Seller MCP error
   *
   * @param message Error message
   * @param code Error code
   * @param details Error details
   * @param cause Original error
   */
  constructor(message: string, code: string, details?: any, cause?: Error) {
    super(message);
    this.name = 'AmazonSellerMcpError';
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'AUTHENTICATION_ERROR', details, cause);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'AUTHORIZATION_ERROR', details, cause);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'VALIDATION_ERROR', details, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'RESOURCE_NOT_FOUND', details, cause);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends AmazonSellerMcpError {
  /**
   * Time to wait before retrying
   */
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number, details?: any, cause?: Error) {
    super(message, 'RATE_LIMIT_EXCEEDED', details, cause);
    this.name = 'RateLimitExceededError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Server error
 */
export class ServerError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'SERVER_ERROR', details, cause);
    this.name = 'ServerError';
  }
}

/**
 * Network error
 */
export class NetworkError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'NETWORK_ERROR', details, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Throttling error
 */
export class ThrottlingError extends AmazonSellerMcpError {
  /**
   * Time to wait before retrying
   */
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number, details?: any, cause?: Error) {
    super(message, 'THROTTLING_ERROR', details, cause);
    this.name = 'ThrottlingError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Marketplace error
 */
export class MarketplaceError extends AmazonSellerMcpError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'MARKETPLACE_ERROR', details, cause);
    this.name = 'MarketplaceError';
  }
}

/**
 * Translate an API error to a specific Amazon Seller MCP error
 *
 * @param error API error
 * @returns Amazon Seller MCP error
 */
export function translateApiError(error: ApiError): AmazonSellerMcpError {
  // Extract error details from the API error
  const { message, type, statusCode, details, cause } = error;

  let translatedError: AmazonSellerMcpError;

  // Translate based on error type
  switch (type) {
    case ApiErrorType.AUTH_ERROR:
      // Check if it's an authentication or authorization error
      if (statusCode === 401) {
        translatedError = new AuthenticationError(
          `Authentication failed: ${message}`,
          details,
          cause
        );
        logger.error('Authentication error', {
          statusCode,
          errorType: type,
          errorCode: translatedError.code,
          errorDetails: details,
        });
      } else {
        translatedError = new AuthorizationError(
          `Authorization failed: ${message}`,
          details,
          cause
        );
        logger.error('Authorization error', {
          statusCode,
          errorType: type,
          errorCode: translatedError.code,
          errorDetails: details,
        });
      }
      break;

    case ApiErrorType.VALIDATION_ERROR:
      translatedError = new ValidationError(`Validation error: ${message}`, details, cause);
      logger.error('Validation error', {
        errorType: type,
        errorCode: translatedError.code,
        errorDetails: details,
      });
      break;

    case ApiErrorType.RATE_LIMIT_EXCEEDED:
      // Extract retry-after header if available
      let retryAfterMs = 1000; // Default to 1 second

      if (details?.headers?.['retry-after']) {
        const retryAfter = parseInt(details.headers['retry-after'], 10);
        if (!isNaN(retryAfter)) {
          retryAfterMs = retryAfter * 1000; // Convert to milliseconds
        }
      }

      translatedError = new RateLimitExceededError(
        `Rate limit exceeded: ${message}`,
        retryAfterMs,
        details,
        cause
      );
      logger.warn('Rate limit exceeded', {
        errorType: type,
        errorCode: translatedError.code,
        retryAfterMs,
        errorDetails: details,
      });
      break;

    case ApiErrorType.SERVER_ERROR:
      translatedError = new ServerError(`Server error: ${message}`, details, cause);
      logger.error('Server error', {
        statusCode,
        errorType: type,
        errorCode: translatedError.code,
        errorDetails: details,
      });
      break;

    case ApiErrorType.NETWORK_ERROR:
      translatedError = new NetworkError(`Network error: ${message}`, details, cause);
      logger.error('Network error', {
        errorType: type,
        errorCode: translatedError.code,
        errorDetails: details,
      });
      break;

    case ApiErrorType.CLIENT_ERROR:
      // Check if it's a resource not found error
      if (statusCode === 404) {
        translatedError = new ResourceNotFoundError(
          `Resource not found: ${message}`,
          details,
          cause
        );
        logger.warn('Resource not found', {
          statusCode,
          errorType: type,
          errorCode: translatedError.code,
          errorDetails: details,
        });
      }
      // Check if it's a throttling error
      else if (statusCode === 429 || details?.code === 'QuotaExceeded') {
        // Extract retry-after header if available
        let retryAfterMs = 1000; // Default to 1 second

        if (details?.headers?.['retry-after']) {
          const retryAfter = parseInt(details.headers['retry-after'], 10);
          if (!isNaN(retryAfter)) {
            retryAfterMs = retryAfter * 1000; // Convert to milliseconds
          }
        }

        translatedError = new ThrottlingError(
          `Throttling error: ${message}`,
          retryAfterMs,
          details,
          cause
        );
        logger.warn('Throttling error', {
          statusCode,
          errorType: type,
          errorCode: translatedError.code,
          retryAfterMs,
          errorDetails: details,
        });
      }
      // Default to a generic error
      else {
        translatedError = new AmazonSellerMcpError(
          `Client error: ${message}`,
          'CLIENT_ERROR',
          details,
          cause
        );
        logger.error('Client error', {
          statusCode,
          errorType: type,
          errorCode: translatedError.code,
          errorDetails: details,
        });
      }
      break;

    default:
      // Default to a generic error
      translatedError = new AmazonSellerMcpError(
        `Unknown error: ${message}`,
        'UNKNOWN_ERROR',
        details,
        cause
      );
      logger.error('Unknown error', {
        errorType: type,
        errorCode: translatedError.code,
        errorDetails: details,
      });
      break;
  }

  return translatedError;
}

/**
 * Translate an Amazon Seller MCP error to an MCP error response
 *
 * @param error Amazon Seller MCP error
 * @returns MCP error response
 */
export function translateToMcpErrorResponse(error: AmazonSellerMcpError | Error): {
  content: Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'resource_link';
        uri: string;
        name: string;
        mimeType?: string;
        description?: string;
      }
  >;
  isError: boolean;
  errorDetails?: {
    code: string;
    message: string;
    details?: any;
  };
} {
  // If it's an Amazon Seller MCP error, use its properties
  if (error instanceof AmazonSellerMcpError) {
    return {
      content: [
        {
          type: 'text',
          text: error.message,
        },
      ],
      isError: true,
      errorDetails: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  // For other errors, create a generic error response
  return {
    content: [
      {
        type: 'text',
        text: error.message || 'An unknown error occurred',
      },
    ],
    isError: true,
    errorDetails: {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
    },
  };
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /**
   * Whether the error can be recovered from
   *
   * @param error Error to check
   * @returns Whether the error can be recovered from
   */
  canRecover: (error: AmazonSellerMcpError | Error) => boolean;

  /**
   * Recover from the error
   *
   * @param error Error to recover from
   * @param context Recovery context
   * @returns Promise resolving to the recovery result
   */
  recover: <T>(error: AmazonSellerMcpError | Error, context: any) => Promise<T>;
}

/**
 * Retry recovery strategy
 */
export class RetryRecoveryStrategy implements ErrorRecoveryStrategy {
  /**
   * Maximum number of retries
   */
  private maxRetries: number;

  /**
   * Base delay in milliseconds
   */
  private baseDelayMs: number;

  /**
   * Maximum delay in milliseconds
   */
  private maxDelayMs: number;

  /**
   * Create a new retry recovery strategy
   *
   * @param maxRetries Maximum number of retries
   * @param baseDelayMs Base delay in milliseconds
   * @param maxDelayMs Maximum delay in milliseconds
   */
  constructor(maxRetries: number = 3, baseDelayMs: number = 1000, maxDelayMs: number = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  /**
   * Whether the error can be recovered from
   *
   * @param error Error to check
   * @returns Whether the error can be recovered from
   */
  canRecover(error: AmazonSellerMcpError | Error): boolean {
    // Can recover from network errors, server errors, rate limit errors, and throttling errors
    return (
      error instanceof NetworkError ||
      error instanceof ServerError ||
      error instanceof RateLimitExceededError ||
      error instanceof ThrottlingError
    );
  }

  /**
   * Recover from the error
   *
   * @param error Error to recover from
   * @param context Recovery context
   * @returns Promise resolving to the recovery result
   */
  async recover<T>(
    error: AmazonSellerMcpError | Error,
    context: {
      retryCount: number;
      operation: () => Promise<T>;
    }
  ): Promise<T> {
    const { retryCount, operation } = context;

    // Check if we've exceeded the maximum number of retries
    if (retryCount >= this.maxRetries) {
      logger.error(`Retry failed after ${retryCount} attempts`, {
        errorMessage: error.message,
        errorName: error.name,
        maxRetries: this.maxRetries,
      });
      throw error;
    }

    // Calculate delay
    let delayMs: number;

    if (error instanceof RateLimitExceededError || error instanceof ThrottlingError) {
      // Use the retry-after value if available
      delayMs = error.retryAfterMs;
    } else {
      // Use exponential backoff with jitter
      const exponentialDelay = Math.min(
        this.maxDelayMs,
        this.baseDelayMs * Math.pow(2, retryCount)
      );

      // Add jitter (random delay between 0% and 25% of the exponential delay)
      const jitter = Math.random() * 0.25 * exponentialDelay;
      delayMs = exponentialDelay + jitter;
    }

    logger.info(`Retrying operation after error (attempt ${retryCount + 1}/${this.maxRetries})`, {
      errorMessage: error.message,
      errorName: error.name,
      delayMs,
      retryCount: retryCount + 1,
      maxRetries: this.maxRetries,
    });

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Retry the operation
    return operation();
  }
}

/**
 * Fallback recovery strategy
 */
export class FallbackRecoveryStrategy implements ErrorRecoveryStrategy {
  /**
   * Fallback function
   */
  private fallbackFn: (error: AmazonSellerMcpError | Error, context: any) => Promise<any>;

  /**
   * Error types that can be recovered from
   */
  private recoverableErrors: Array<new (...args: any[]) => AmazonSellerMcpError>;

  /**
   * Create a new fallback recovery strategy
   *
   * @param fallbackFn Fallback function
   * @param recoverableErrors Error types that can be recovered from
   */
  constructor(
    fallbackFn: (error: AmazonSellerMcpError | Error, context: any) => Promise<any>,
    recoverableErrors: Array<new (...args: any[]) => AmazonSellerMcpError> = []
  ) {
    this.fallbackFn = fallbackFn;
    this.recoverableErrors = recoverableErrors;
  }

  /**
   * Whether the error can be recovered from
   *
   * @param error Error to check
   * @returns Whether the error can be recovered from
   */
  canRecover(error: AmazonSellerMcpError | Error): boolean {
    // Check if the error is one of the recoverable error types
    return this.recoverableErrors.some((errorType) => error instanceof errorType);
  }

  /**
   * Recover from the error
   *
   * @param error Error to recover from
   * @param context Recovery context
   * @returns Promise resolving to the recovery result
   */
  async recover<T>(error: AmazonSellerMcpError | Error, context: any): Promise<T> {
    return this.fallbackFn(error, context);
  }
}

/**
 * Circuit breaker state
 */
enum CircuitBreakerState {
  /**
   * Circuit is closed (normal operation)
   */
  CLOSED,

  /**
   * Circuit is open (failing fast)
   */
  OPEN,

  /**
   * Circuit is half-open (testing if it can be closed)
   */
  HALF_OPEN,
}

/**
 * Circuit breaker recovery strategy
 */
export class CircuitBreakerRecoveryStrategy implements ErrorRecoveryStrategy {
  /**
   * Circuit breaker state
   */
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;

  /**
   * Failure count
   */
  private failureCount: number = 0;

  /**
   * Last failure time
   */
  private lastFailureTime: number = 0;

  /**
   * Failure threshold
   */
  private failureThreshold: number;

  /**
   * Reset timeout in milliseconds
   */
  private resetTimeoutMs: number;

  /**
   * Error types that can trip the circuit breaker
   */
  private tripErrors: Array<new (...args: any[]) => AmazonSellerMcpError>;

  /**
   * Create a new circuit breaker recovery strategy
   *
   * @param failureThreshold Failure threshold
   * @param resetTimeoutMs Reset timeout in milliseconds
   * @param tripErrors Error types that can trip the circuit breaker
   */
  constructor(
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000,
    tripErrors: Array<new (...args: any[]) => AmazonSellerMcpError> = [ServerError, NetworkError]
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.tripErrors = tripErrors;
  }

  /**
   * Whether the error can be recovered from
   *
   * @param error Error to check
   * @returns Whether the error can be recovered from
   */
  canRecover(error: AmazonSellerMcpError | Error): boolean {
    // Check if the error is one of the trip error types
    const isRecoverableError = this.tripErrors.some((errorType) => error instanceof errorType);

    // If the error is not recoverable, don't try to recover
    if (!isRecoverableError) {
      return false;
    }

    // Update circuit breaker state
    this.updateState(error);

    // Can recover if the circuit is closed or half-open
    return this.state !== CircuitBreakerState.OPEN;
  }

  /**
   * Recover from the error
   *
   * @param error Error to recover from
   * @param context Recovery context
   * @returns Promise resolving to the recovery result
   */
  async recover<T>(
    error: AmazonSellerMcpError | Error,
    context: {
      operation: () => Promise<T>;
    }
  ): Promise<T> {
    const { operation } = context;

    // If the circuit is open, fail fast
    if (this.state === CircuitBreakerState.OPEN) {
      const resetAfterMs = this.resetTimeoutMs - (Date.now() - this.lastFailureTime);

      logger.warn('Operation rejected by circuit breaker (circuit is open)', {
        circuitState: 'OPEN',
        resetAfterMs,
        errorMessage: error.message,
        errorName: error.name,
      });

      throw new AmazonSellerMcpError(
        'Circuit breaker is open',
        'CIRCUIT_BREAKER_OPEN',
        {
          resetAfterMs,
        },
        error
      );
    }

    try {
      // Try the operation
      const result = await operation();

      // If successful and the circuit is half-open, close it
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;

        logger.info('Circuit breaker closed after successful test request', {
          previousState: 'HALF_OPEN',
          newState: 'CLOSED',
        });
      }

      return result;
    } catch (operationError) {
      // If the operation failed, update the circuit breaker state
      // Convert unknown error to Error or AmazonSellerMcpError
      const error =
        operationError instanceof Error ? operationError : new Error(String(operationError));

      this.updateState(error);

      // Rethrow the error
      throw operationError;
    }
  }

  /**
   * Update the circuit breaker state
   *
   * @param error Error that occurred
   */
  private updateState(error: AmazonSellerMcpError | Error): void {
    // Check if the error is one of the trip error types
    const isRecoverableError = this.tripErrors.some((errorType) => error instanceof errorType);

    // If the error is not recoverable, don't update the state
    if (!isRecoverableError) {
      return;
    }

    // Update state based on current state
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        // Increment failure count
        this.failureCount++;
        this.lastFailureTime = Date.now();

        logger.debug(
          `Circuit breaker failure count increased to ${this.failureCount}/${this.failureThreshold}`,
          {
            circuitState: 'CLOSED',
            failureCount: this.failureCount,
            failureThreshold: this.failureThreshold,
            errorMessage: error.message,
            errorName: error.name,
          }
        );

        // If failure count exceeds threshold, open the circuit
        if (this.failureCount >= this.failureThreshold) {
          this.state = CircuitBreakerState.OPEN;

          logger.warn(`Circuit breaker opened after ${this.failureCount} failures`, {
            previousState: 'CLOSED',
            newState: 'OPEN',
            failureCount: this.failureCount,
            failureThreshold: this.failureThreshold,
            resetTimeoutMs: this.resetTimeoutMs,
            errorMessage: error.message,
            errorName: error.name,
          });

          // Schedule reset to half-open
          setTimeout(() => {
            this.state = CircuitBreakerState.HALF_OPEN;
            logger.info('Circuit breaker state changed to half-open', {
              previousState: 'OPEN',
              newState: 'HALF_OPEN',
              resetTimeoutMs: this.resetTimeoutMs,
            });
          }, this.resetTimeoutMs);
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // If a failure occurs in half-open state, open the circuit again
        this.state = CircuitBreakerState.OPEN;
        this.lastFailureTime = Date.now();

        logger.warn('Circuit breaker reopened after test request failed', {
          previousState: 'HALF_OPEN',
          newState: 'OPEN',
          resetTimeoutMs: this.resetTimeoutMs,
          errorMessage: error.message,
          errorName: error.name,
        });

        // Schedule reset to half-open
        setTimeout(() => {
          this.state = CircuitBreakerState.HALF_OPEN;
          logger.info('Circuit breaker state changed to half-open', {
            previousState: 'OPEN',
            newState: 'HALF_OPEN',
            resetTimeoutMs: this.resetTimeoutMs,
          });
        }, this.resetTimeoutMs);
        break;

      case CircuitBreakerState.OPEN:
        // Update last failure time
        this.lastFailureTime = Date.now();

        logger.debug('Circuit breaker received error while open', {
          circuitState: 'OPEN',
          errorMessage: error.message,
          errorName: error.name,
        });
        break;
    }
  }
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
  /**
   * Recovery strategies
   */
  private strategies: ErrorRecoveryStrategy[] = [];

  /**
   * Create a new error recovery manager
   *
   * @param strategies Recovery strategies
   */
  constructor(strategies: ErrorRecoveryStrategy[] = []) {
    this.strategies = strategies;
  }

  /**
   * Add a recovery strategy
   *
   * @param strategy Recovery strategy
   */
  addStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Execute an operation with error recovery
   *
   * @param operation Operation to execute
   * @param context Recovery context
   * @returns Promise resolving to the operation result
   */
  async executeWithRecovery<T>(operation: () => Promise<T>, context: any = {}): Promise<T> {
    try {
      // Try the operation
      return await operation();
    } catch (error) {
      // Try to recover from the error
      for (const strategy of this.strategies) {
        if (strategy.canRecover(error as Error)) {
          return strategy.recover<T>(error as Error, {
            ...context,
            operation,
          });
        }
      }

      // If no strategy can recover, rethrow the error
      throw error;
    }
  }
}

/**
 * Create a default error recovery manager
 *
 * @returns Default error recovery manager
 */
export function createDefaultErrorRecoveryManager(): ErrorRecoveryManager {
  const manager = new ErrorRecoveryManager();

  // Add retry strategy
  manager.addStrategy(new RetryRecoveryStrategy());

  // Add circuit breaker strategy
  manager.addStrategy(new CircuitBreakerRecoveryStrategy());

  return manager;
}
