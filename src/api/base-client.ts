/**
 * Base API client for Amazon Selling Partner API
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AmazonAuth } from '../auth/amazon-auth.js';
import {
  ApiClientConfig,
  ApiError,
  ApiErrorType,
  ApiRequestOptions,
  ApiResponse,
  DEFAULT_RETRY_STRATEGY,
  RetryStrategy,
} from '../types/api.js';
import { AuthConfig, REGION_ENDPOINTS, SignableRequest } from '../types/auth.js';
import {
  translateApiError,
  ErrorRecoveryManager,
  createDefaultErrorRecoveryManager,
} from '../utils/error-handler.js';
import { CacheManager, getCacheManager } from '../utils/cache-manager.js';
import { getConnectionPool } from '../utils/connection-pool.js';

/**
 * Default request timeout (10 seconds)
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Default maximum number of retries
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * Default rate limit (5 requests per second)
 */
const DEFAULT_RATE_LIMIT = 5;

/**
 * Base API client for Amazon Selling Partner API
 */
export class BaseApiClient {
  /**
   * Axios instance for making HTTP requests
   */
  protected axios: AxiosInstance;

  /**
   * Authentication client
   */
  protected auth: AmazonAuth;

  /**
   * API client configuration
   */
  protected config: ApiClientConfig;

  /**
   * Retry strategy
   */
  protected retryStrategy: RetryStrategy;

  /**
   * Cache manager for API responses
   */
  protected cache: CacheManager;

  /**
   * Rate limiting state
   */
  protected rateLimitState: {
    /**
     * Timestamp of the last request
     */
    lastRequestTime: number;

    /**
     * Number of requests in the current time window
     */
    requestCount: number;

    /**
     * Queue of pending requests
     */
    queue: Array<{
      resolve: (value: any) => void;
      reject: (error: any) => void;
      fn: () => Promise<any>;
    }>;

    /**
     * Whether a queue processor is running
     */
    processingQueue: boolean;
  };

  /**
   * Error recovery manager
   */
  protected errorRecoveryManager: ErrorRecoveryManager;

  /**
   * Request batch manager for combining similar requests
   */
  protected batchManager: Map<
    string,
    {
      promise: Promise<any>;
      timestamp: number;
    }
  > = new Map();

  /**
   * Create a new BaseApiClient instance
   *
   * @param authConfig Authentication configuration
   * @param apiConfig API client configuration
   */
  constructor(authConfig: AuthConfig, apiConfig?: Partial<ApiClientConfig>) {
    // Create authentication client
    this.auth = new AmazonAuth(authConfig);

    // Set up API client configuration
    const regionEndpoint = REGION_ENDPOINTS[authConfig.region];
    this.config = {
      baseUrl: apiConfig?.baseUrl || regionEndpoint.endpoint,
      region: authConfig.region,
      marketplaceId: authConfig.marketplaceId,
      maxRetries: apiConfig?.maxRetries || DEFAULT_MAX_RETRIES,
      timeoutMs: apiConfig?.timeoutMs || DEFAULT_TIMEOUT_MS,
      rateLimit: {
        requestsPerSecond: apiConfig?.rateLimit?.requestsPerSecond || DEFAULT_RATE_LIMIT,
        burstSize:
          apiConfig?.rateLimit?.burstSize ||
          apiConfig?.rateLimit?.requestsPerSecond ||
          DEFAULT_RATE_LIMIT,
        enabled: apiConfig?.rateLimit?.enabled !== false,
      },
    };

    // Set up retry strategy
    this.retryStrategy = DEFAULT_RETRY_STRATEGY;

    // Create axios instance
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'amazon-seller-mcp-client/1.0.0',
      },
    });

    // Set up response cache
    this.cache = getCacheManager();

    // Initialize rate limiting state
    this.rateLimitState = {
      lastRequestTime: 0,
      requestCount: 0,
      queue: [],
      processingQueue: false,
    };

    // Initialize error recovery manager
    this.errorRecoveryManager = createDefaultErrorRecoveryManager();

    // Configure axios to use connection pooling
    const connectionPool = getConnectionPool();
    this.axios.defaults.httpAgent = connectionPool.getHttpAgent();
    this.axios.defaults.httpsAgent = connectionPool.getHttpsAgent();
  }

  /**
   * Make an API request
   *
   * @param options Request options
   * @returns Promise resolving to the API response
   */
  public async request<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    // Apply rate limiting if enabled
    if (this.config.rateLimit?.enabled) {
      return this.rateLimit(() => this.executeRequest<T>(options));
    }

    return this.executeRequest<T>(options);
  }

  /**
   * Execute an API request with retries
   *
   * @param options Request options
   * @returns Promise resolving to the API response
   */
  private async executeRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const maxRetries = options.maxRetries ?? this.config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const shouldRetry = options.retry !== false;

    // Use error recovery manager to execute the request with recovery strategies
    return this.errorRecoveryManager.executeWithRecovery(
      async () => {
        try {
          return await this.makeRequest<T>(options);
        } catch (error) {
          if (error instanceof ApiError) {
            // Translate API error to a more specific error type
            throw translateApiError(error);
          }

          // Rethrow unexpected errors
          throw error;
        }
      },
      {
        retryCount: 0,
        maxRetries,
        shouldRetry,
        options,
      }
    );
  }

  /**
   * Make a single API request
   *
   * @param options Request options
   * @returns Promise resolving to the API response
   */
  private async makeRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      // Track the request in the connection pool
      getConnectionPool().trackRequest();

      // Build request URL
      const url = this.buildUrl(options.path, options.query);

      // Build request config
      const requestConfig: AxiosRequestConfig = {
        method: options.method,
        url,
        headers: {
          ...options.headers,
          'x-amz-access-token': await this.auth.getAccessToken(),
        },
        data: options.data,
        timeout: options.timeoutMs || this.config.timeoutMs,
        // Enable compression
        decompress: true,
      };

      // Sign the request
      const signableRequest: SignableRequest = {
        method: requestConfig.method || 'GET',
        url: `${this.config.baseUrl}${url}`,
        headers: requestConfig.headers as Record<string, string>,
        data: requestConfig.data,
      };

      const signedRequest = await this.auth.generateSecuredRequest(signableRequest);

      // Update request config with signed headers
      requestConfig.headers = signedRequest.headers;

      // Make the request
      const response = await this.axios.request<T>(requestConfig);

      // Parse rate limit headers
      const rateLimitInfo = this.parseRateLimitHeaders(response);

      // Return API response
      return {
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        rateLimit: rateLimitInfo,
      };
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Determine error type based on status code
        let errorType = ApiErrorType.UNKNOWN_ERROR;
        const statusCode = axiosError.response?.status;

        if (statusCode) {
          if (statusCode === 400) {
            errorType = ApiErrorType.VALIDATION_ERROR;
          } else if (statusCode === 401 || statusCode === 403) {
            errorType = ApiErrorType.AUTH_ERROR;
          } else if (statusCode === 429) {
            errorType = ApiErrorType.RATE_LIMIT_EXCEEDED;
          } else if (statusCode >= 500) {
            errorType = ApiErrorType.SERVER_ERROR;
          } else if (statusCode >= 400) {
            errorType = ApiErrorType.CLIENT_ERROR;
          }
        } else if (
          axiosError.code === 'ECONNABORTED' ||
          axiosError.code === 'ECONNREFUSED' ||
          axiosError.code === 'ENOTFOUND' ||
          axiosError.message.includes('timeout') ||
          axiosError.message.includes('network')
        ) {
          errorType = ApiErrorType.NETWORK_ERROR;
        }

        // Extract error details from response
        const errorDetails = axiosError.response?.data;

        // Create API error
        throw new ApiError(
          `API request failed: ${axiosError.message}`,
          errorType,
          statusCode,
          errorDetails,
          axiosError
        );
      }

      // Handle other errors
      throw new ApiError(
        `API request failed: ${error instanceof Error ? error.message : String(error)}`,
        ApiErrorType.UNKNOWN_ERROR,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build a URL from a path and query parameters
   *
   * @param path URL path
   * @param query Query parameters
   * @returns URL string
   */
  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    // Ensure path starts with a slash
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // If no query parameters, return the path
    if (!query) {
      return path;
    }

    // Build query string
    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    }

    const queryString = queryParams.toString();

    // If no query string, return the path
    if (!queryString) {
      return path;
    }

    // Return path with query string
    return `${path}?${queryString}`;
  }

  /**
   * Parse rate limit headers from a response
   *
   * @param response Axios response
   * @returns Rate limit information
   */
  private parseRateLimitHeaders(response: AxiosResponse): ApiResponse['rateLimit'] | undefined {
    const headers = response.headers;

    // Check if rate limit headers are present
    const remaining = headers['x-amzn-ratelimit-remaining'];
    const limit = headers['x-amzn-ratelimit-limit'];
    const resetAt = headers['x-amzn-ratelimit-reset'];

    if (!remaining && !limit && !resetAt) {
      return undefined;
    }

    // Parse rate limit information
    return {
      remaining: remaining ? parseInt(remaining, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 0,
      resetAt: resetAt ? new Date(resetAt) : new Date(Date.now() + 1000), // Default to 1 second from now
    };
  }

  /**
   * Apply rate limiting to a function
   *
   * @param fn Function to rate limit
   * @returns Promise resolving to the function result
   */
  private async rateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // If rate limiting is disabled, execute the function immediately
    if (!this.config.rateLimit?.enabled) {
      return fn();
    }

    // Calculate time since last request
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimitState.lastRequestTime;
    const requestsPerSecond = this.config.rateLimit.requestsPerSecond;
    const burstSize = this.config.rateLimit.burstSize || requestsPerSecond;

    // Reset request count if more than 1 second has passed
    if (timeSinceLastRequest > 1000) {
      this.rateLimitState.requestCount = 0;
    }

    // Check if we've exceeded the rate limit
    if (this.rateLimitState.requestCount >= burstSize) {
      // Add to queue
      return new Promise<T>((resolve, reject) => {
        this.rateLimitState.queue.push({
          resolve,
          reject,
          fn: fn as () => Promise<any>,
        });

        // Start processing the queue if not already processing
        if (!this.rateLimitState.processingQueue) {
          this.processRateLimitQueue();
        }
      });
    }

    // Update rate limit state
    this.rateLimitState.lastRequestTime = now;
    this.rateLimitState.requestCount++;

    // Execute the function
    return fn();
  }

  /**
   * Process the rate limit queue
   */
  private async processRateLimitQueue(): Promise<void> {
    // Set processing flag
    this.rateLimitState.processingQueue = true;

    // Process queue until empty
    while (this.rateLimitState.queue.length > 0) {
      // Calculate time to wait
      const now = Date.now();
      const timeSinceLastRequest = now - this.rateLimitState.lastRequestTime;
      const requestsPerSecond = this.config.rateLimit!.requestsPerSecond;

      // If less than 1 second has passed and we've exceeded the rate limit, wait
      if (timeSinceLastRequest < 1000 && this.rateLimitState.requestCount >= requestsPerSecond) {
        const timeToWait = 1000 - timeSinceLastRequest;
        await new Promise((resolve) => setTimeout(resolve, timeToWait));
        continue;
      }

      // Reset request count if more than 1 second has passed
      if (timeSinceLastRequest > 1000) {
        this.rateLimitState.requestCount = 0;
      }

      // Get next item from queue
      const item = this.rateLimitState.queue.shift();

      if (item) {
        // Update rate limit state
        this.rateLimitState.lastRequestTime = Date.now();
        this.rateLimitState.requestCount++;

        // Execute the function
        try {
          const result = await item.fn();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    }

    // Clear processing flag
    this.rateLimitState.processingQueue = false;
  }

  /**
   * Get a cached response or execute a function and cache the result
   *
   * @param cacheKey Cache key
   * @param fn Function to execute if cache miss
   * @param ttl Time to live in seconds
   * @returns Promise resolving to the function result
   */
  protected async withCache<T>(cacheKey: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return this.cache.withCache(cacheKey, fn, ttl);
  }

  /**
   * Clear the cache
   *
   * @param cacheKey Optional cache key to clear
   */
  public async clearCache(cacheKey?: string): Promise<void> {
    if (cacheKey) {
      await this.cache.del(cacheKey);
    } else {
      await this.cache.clear();
    }
  }

  /**
   * Batch similar requests together to reduce API calls
   *
   * @param key Batch key
   * @param fn Function to execute
   * @param maxAge Maximum age of a batch in milliseconds
   * @returns Promise resolving to the function result
   */
  protected async batchRequest<T>(
    key: string,
    fn: () => Promise<T>,
    maxAge: number = 50
  ): Promise<T> {
    const now = Date.now();
    const existingBatch = this.batchManager.get(key);

    // If there's an existing batch that's still fresh, use it
    if (existingBatch && now - existingBatch.timestamp < maxAge) {
      return existingBatch.promise as Promise<T>;
    }

    // Create a new batch
    const promise = fn();

    // Store the batch
    this.batchManager.set(key, {
      promise,
      timestamp: now,
    });

    // Clean up old batches periodically
    if (this.batchManager.size > 100) {
      this.cleanupBatches(maxAge);
    }

    return promise;
  }

  /**
   * Clean up old batches
   *
   * @param maxAge Maximum age of a batch in milliseconds
   */
  private cleanupBatches(maxAge: number): void {
    const now = Date.now();

    for (const [key, batch] of this.batchManager.entries()) {
      if (now - batch.timestamp > maxAge) {
        this.batchManager.delete(key);
      }
    }
  }
}
