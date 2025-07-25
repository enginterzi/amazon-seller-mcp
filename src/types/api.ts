/**
 * Type definitions for API-related functionality
 */

import { AmazonRegion } from './auth.js';

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /**
   * Base URL for API requests
   */
  baseUrl: string;

  /**
   * Amazon region
   */
  region: AmazonRegion;

  /**
   * Amazon marketplace ID
   */
  marketplaceId: string;

  /**
   * Maximum number of retries for failed requests
   */
  maxRetries?: number;

  /**
   * Request timeout in milliseconds
   */
  timeoutMs?: number;

  /**
   * Rate limit configuration
   */
  rateLimit?: RateLimitConfig;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests per second
   */
  requestsPerSecond: number;

  /**
   * Maximum burst size
   */
  burstSize?: number;

  /**
   * Whether to enable rate limiting
   */
  enabled?: boolean;
}

/**
 * API error types
 */
export enum ApiErrorType {
  /**
   * Request validation error
   */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /**
   * Network error
   */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /**
   * Authentication error
   */
  AUTH_ERROR = 'AUTH_ERROR',

  /**
   * Rate limit exceeded
   */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  /**
   * Server error
   */
  SERVER_ERROR = 'SERVER_ERROR',

  /**
   * Client error
   */
  CLIENT_ERROR = 'CLIENT_ERROR',

  /**
   * Unknown error
   */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * API error
 */
export class ApiError extends Error {
  /**
   * Error type
   */
  type: ApiErrorType;

  /**
   * HTTP status code
   */
  statusCode?: number;

  /**
   * Error details
   */
  details?: any;

  /**
   * Original error
   */
  cause?: Error;

  /**
   * Create a new API error
   *
   * @param message Error message
   * @param type Error type
   * @param statusCode HTTP status code
   * @param details Error details
   * @param cause Original error
   */
  constructor(
    message: string,
    type: ApiErrorType,
    statusCode?: number,
    details?: any,
    cause?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
  }
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  /**
   * Request method
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /**
   * Request path
   */
  path: string;

  /**
   * Query parameters
   */
  query?: Record<string, string | number | boolean | undefined>;

  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Request body
   */
  data?: any;

  /**
   * Request timeout in milliseconds
   */
  timeoutMs?: number;

  /**
   * Whether to retry the request on failure
   */
  retry?: boolean;

  /**
   * Maximum number of retries
   */
  maxRetries?: number;
}

/**
 * API response
 */
export interface ApiResponse<T = any> {
  /**
   * Response data
   */
  data: T;

  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Rate limit information
   */
  rateLimit?: {
    /**
     * Remaining requests
     */
    remaining: number;

    /**
     * Rate limit reset time
     */
    resetAt: Date;

    /**
     * Maximum requests
     */
    limit: number;
  };
}

/**
 * Retry strategy
 */
export interface RetryStrategy {
  /**
   * Maximum number of retries
   */
  maxRetries: number;

  /**
   * Whether to retry the request
   *
   * @param error Error that occurred
   * @param retryCount Current retry count
   * @returns Whether to retry the request
   */
  shouldRetry: (error: ApiError, retryCount: number) => boolean;

  /**
   * Get delay before next retry
   *
   * @param retryCount Current retry count
   * @returns Delay in milliseconds
   */
  getDelayMs: (retryCount: number) => number;
}

/**
 * Default retry strategy
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  shouldRetry: (error: ApiError, retryCount: number) => {
    // Retry on network errors, server errors, and rate limit errors
    return (
      retryCount < 3 &&
      (error.type === ApiErrorType.NETWORK_ERROR ||
        error.type === ApiErrorType.SERVER_ERROR ||
        error.type === ApiErrorType.RATE_LIMIT_EXCEEDED)
    );
  },
  getDelayMs: (retryCount: number) => {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
    // Add jitter (random delay between 0% and 25% of the exponential delay)
    const jitter = Math.random() * 0.25 * exponentialDelay;
    return exponentialDelay + jitter;
  },
};
