/**
 * Tests for API types and classes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  ApiErrorType,
  DEFAULT_RETRY_STRATEGY,
  type ApiClientConfig,
  type RateLimitConfig,
  type ApiRequestOptions,
  type ApiResponse,
  type RetryStrategy,
} from '../../../src/types/api.js';
import { TestSetup } from '../../utils/test-setup.js';

describe('API Types', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  describe('ApiError', () => {
    it('should create ApiError with all properties', () => {
      const details = { error: 'test error' };
      const cause = new Error('Original error');
      const error = new ApiError(
        'Test message',
        ApiErrorType.VALIDATION_ERROR,
        400,
        details,
        cause
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test message');
      expect(error.type).toBe(ApiErrorType.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.cause).toBe(cause);
    });

    it('should create ApiError with minimal properties', () => {
      const error = new ApiError('Test message', ApiErrorType.NETWORK_ERROR);

      expect(error.message).toBe('Test message');
      expect(error.type).toBe(ApiErrorType.NETWORK_ERROR);
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should handle all error types', () => {
      const errorTypes = [
        ApiErrorType.VALIDATION_ERROR,
        ApiErrorType.NETWORK_ERROR,
        ApiErrorType.AUTH_ERROR,
        ApiErrorType.RATE_LIMIT_EXCEEDED,
        ApiErrorType.SERVER_ERROR,
        ApiErrorType.CLIENT_ERROR,
        ApiErrorType.UNKNOWN_ERROR,
      ];

      errorTypes.forEach((type) => {
        const error = new ApiError('Test message', type);
        expect(error.type).toBe(type);
      });
    });
  });

  describe('ApiClientConfig', () => {
    it('should define proper configuration structure', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        region: 'us-east-1',
        marketplaceId: 'ATVPDKIKX0DER',
        maxRetries: 3,
        timeoutMs: 5000,
        rateLimit: {
          requestsPerSecond: 10,
          burstSize: 20,
          enabled: true,
        },
      };

      expect(config.baseUrl).toBe('https://api.example.com');
      expect(config.region).toBe('us-east-1');
      expect(config.marketplaceId).toBe('ATVPDKIKX0DER');
      expect(config.maxRetries).toBe(3);
      expect(config.timeoutMs).toBe(5000);
      expect(config.rateLimit?.requestsPerSecond).toBe(10);
    });

    it('should work with minimal configuration', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        region: 'us-east-1',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      expect(config.baseUrl).toBe('https://api.example.com');
      expect(config.maxRetries).toBeUndefined();
      expect(config.timeoutMs).toBeUndefined();
      expect(config.rateLimit).toBeUndefined();
    });
  });

  describe('RateLimitConfig', () => {
    it('should define proper rate limit structure', () => {
      const rateLimit: RateLimitConfig = {
        requestsPerSecond: 5,
        burstSize: 10,
        enabled: true,
      };

      expect(rateLimit.requestsPerSecond).toBe(5);
      expect(rateLimit.burstSize).toBe(10);
      expect(rateLimit.enabled).toBe(true);
    });

    it('should work with minimal configuration', () => {
      const rateLimit: RateLimitConfig = {
        requestsPerSecond: 5,
      };

      expect(rateLimit.requestsPerSecond).toBe(5);
      expect(rateLimit.burstSize).toBeUndefined();
      expect(rateLimit.enabled).toBeUndefined();
    });
  });

  describe('ApiRequestOptions', () => {
    it('should define proper request options structure', () => {
      const options: ApiRequestOptions = {
        method: 'POST',
        path: '/api/test',
        query: { param1: 'value1', param2: 123, param3: true },
        headers: { 'Content-Type': 'application/json' },
        data: { test: 'data' },
        timeoutMs: 3000,
        retry: true,
        maxRetries: 2,
      };

      expect(options.method).toBe('POST');
      expect(options.path).toBe('/api/test');
      expect(options.query?.param1).toBe('value1');
      expect(options.query?.param2).toBe(123);
      expect(options.query?.param3).toBe(true);
      expect(options.headers?.['Content-Type']).toBe('application/json');
      expect(options.data).toEqual({ test: 'data' });
      expect(options.timeoutMs).toBe(3000);
      expect(options.retry).toBe(true);
      expect(options.maxRetries).toBe(2);
    });

    it('should work with minimal options', () => {
      const options: ApiRequestOptions = {
        method: 'GET',
        path: '/api/test',
      };

      expect(options.method).toBe('GET');
      expect(options.path).toBe('/api/test');
      expect(options.query).toBeUndefined();
      expect(options.headers).toBeUndefined();
      expect(options.data).toBeUndefined();
    });

    it('should support all HTTP methods', () => {
      const methods: ApiRequestOptions['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        const options: ApiRequestOptions = {
          method,
          path: '/api/test',
        };
        expect(options.method).toBe(method);
      });
    });

    it('should handle undefined query parameters', () => {
      const options: ApiRequestOptions = {
        method: 'GET',
        path: '/api/test',
        query: {
          param1: 'value1',
          param2: undefined,
          param3: 'value3',
        },
      };

      expect(options.query?.param1).toBe('value1');
      expect(options.query?.param2).toBeUndefined();
      expect(options.query?.param3).toBe('value3');
    });
  });

  describe('ApiResponse', () => {
    it('should define proper response structure', () => {
      const response: ApiResponse<{ id: string; name: string }> = {
        data: { id: '123', name: 'Test' },
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        rateLimit: {
          remaining: 95,
          resetAt: new Date('2023-01-01T12:00:00Z'),
          limit: 100,
        },
      };

      expect(response.data.id).toBe('123');
      expect(response.data.name).toBe('Test');
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.rateLimit?.remaining).toBe(95);
      expect(response.rateLimit?.limit).toBe(100);
    });

    it('should work without rate limit information', () => {
      const response: ApiResponse<string> = {
        data: 'test response',
        statusCode: 200,
        headers: {},
      };

      expect(response.data).toBe('test response');
      expect(response.statusCode).toBe(200);
      expect(response.rateLimit).toBeUndefined();
    });

    it('should handle different data types', () => {
      const stringResponse: ApiResponse<string> = {
        data: 'string data',
        statusCode: 200,
        headers: {},
      };

      const numberResponse: ApiResponse<number> = {
        data: 42,
        statusCode: 200,
        headers: {},
      };

      const arrayResponse: ApiResponse<string[]> = {
        data: ['item1', 'item2'],
        statusCode: 200,
        headers: {},
      };

      expect(stringResponse.data).toBe('string data');
      expect(numberResponse.data).toBe(42);
      expect(arrayResponse.data).toEqual(['item1', 'item2']);
    });
  });

  describe('RetryStrategy', () => {
    it('should define proper retry strategy structure', () => {
      const strategy: RetryStrategy = {
        maxRetries: 3,
        shouldRetry: (error, retryCount) => {
          return retryCount < 3 && error.type === ApiErrorType.NETWORK_ERROR;
        },
        getDelayMs: (retryCount) => {
          return 1000 * Math.pow(2, retryCount);
        },
      };

      expect(strategy.maxRetries).toBe(3);
      expect(typeof strategy.shouldRetry).toBe('function');
      expect(typeof strategy.getDelayMs).toBe('function');

      // Test shouldRetry function
      const networkError = new ApiError('Network error', ApiErrorType.NETWORK_ERROR);
      const validationError = new ApiError('Validation error', ApiErrorType.VALIDATION_ERROR);

      expect(strategy.shouldRetry(networkError, 1)).toBe(true);
      expect(strategy.shouldRetry(networkError, 3)).toBe(false);
      expect(strategy.shouldRetry(validationError, 1)).toBe(false);

      // Test getDelayMs function
      expect(strategy.getDelayMs(0)).toBe(1000);
      expect(strategy.getDelayMs(1)).toBe(2000);
      expect(strategy.getDelayMs(2)).toBe(4000);
    });
  });

  describe('DEFAULT_RETRY_STRATEGY', () => {
    it('should have correct default configuration', () => {
      expect(DEFAULT_RETRY_STRATEGY.maxRetries).toBe(3);
      expect(typeof DEFAULT_RETRY_STRATEGY.shouldRetry).toBe('function');
      expect(typeof DEFAULT_RETRY_STRATEGY.getDelayMs).toBe('function');
    });

    it('should retry on recoverable errors', () => {
      const recoverableErrors = [
        new ApiError('Network error', ApiErrorType.NETWORK_ERROR),
        new ApiError('Server error', ApiErrorType.SERVER_ERROR),
        new ApiError('Rate limit', ApiErrorType.RATE_LIMIT_EXCEEDED),
      ];

      recoverableErrors.forEach((error) => {
        expect(DEFAULT_RETRY_STRATEGY.shouldRetry(error, 1)).toBe(true);
        expect(DEFAULT_RETRY_STRATEGY.shouldRetry(error, 2)).toBe(true);
        expect(DEFAULT_RETRY_STRATEGY.shouldRetry(error, 3)).toBe(false); // Exceeds maxRetries
      });
    });

    it('should not retry on non-recoverable errors', () => {
      const nonRecoverableErrors = [
        new ApiError('Validation error', ApiErrorType.VALIDATION_ERROR),
        new ApiError('Auth error', ApiErrorType.AUTH_ERROR),
        new ApiError('Client error', ApiErrorType.CLIENT_ERROR),
        new ApiError('Unknown error', ApiErrorType.UNKNOWN_ERROR),
      ];

      nonRecoverableErrors.forEach((error) => {
        expect(DEFAULT_RETRY_STRATEGY.shouldRetry(error, 1)).toBe(false);
      });
    });

    it('should calculate exponential backoff with jitter', () => {
      const delay0 = DEFAULT_RETRY_STRATEGY.getDelayMs(0);
      const delay1 = DEFAULT_RETRY_STRATEGY.getDelayMs(1);
      const delay2 = DEFAULT_RETRY_STRATEGY.getDelayMs(2);

      // Base delay is 1000ms, so delays should be approximately:
      // delay0: ~1000ms + jitter
      // delay1: ~2000ms + jitter
      // delay2: ~4000ms + jitter

      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1250); // 1000 + 25% jitter

      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2500); // 2000 + 25% jitter

      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(5000); // 4000 + 25% jitter
    });

    it('should respect maximum delay', () => {
      // Test with a high retry count to ensure max delay is respected
      const delay = DEFAULT_RETRY_STRATEGY.getDelayMs(10);
      expect(delay).toBeLessThanOrEqual(30000 * 1.25); // maxDelay + jitter
    });

    it('should handle edge cases', () => {
      // Test with retry count 0
      expect(DEFAULT_RETRY_STRATEGY.getDelayMs(0)).toBeGreaterThan(0);

      // Test with negative retry count (edge case)
      expect(DEFAULT_RETRY_STRATEGY.getDelayMs(-1)).toBeGreaterThan(0);
    });
  });

  describe('Type compatibility', () => {
    it('should allow proper type inference', () => {
      // Test that TypeScript can properly infer types
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        region: 'us-east-1',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      const options: ApiRequestOptions = {
        method: 'GET',
        path: '/test',
      };

      const response: ApiResponse<{ success: boolean }> = {
        data: { success: true },
        statusCode: 200,
        headers: {},
      };

      // These should compile without errors
      expect(config.baseUrl).toBeDefined();
      expect(options.method).toBeDefined();
      expect(response.data.success).toBe(true);
    });

    it('should handle generic response types', () => {
      interface TestData {
        id: number;
        name: string;
        active: boolean;
      }

      const response: ApiResponse<TestData> = {
        data: {
          id: 1,
          name: 'Test Item',
          active: true,
        },
        statusCode: 200,
        headers: {},
      };

      expect(response.data.id).toBe(1);
      expect(response.data.name).toBe('Test Item');
      expect(response.data.active).toBe(true);
    });

    it('should handle array response types', () => {
      const response: ApiResponse<string[]> = {
        data: ['item1', 'item2', 'item3'],
        statusCode: 200,
        headers: {},
      };

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(3);
      expect(response.data[0]).toBe('item1');
    });
  });
});
