/**
 * Tests for the base API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { BaseApiClient } from '../../../src/api/base-client.js';
import { AmazonAuth } from '../../../src/auth/amazon-auth.js';
import {
  AmazonRegion,
  ApiError,
  ApiErrorType,
  AuthError,
  AuthErrorType,
} from '../../../src/types/index.js';

// Mock axios
vi.mock('axios');

// Mock AmazonAuth
vi.mock('../../../src/auth/amazon-auth.js');

// Mock cache manager
vi.mock('../../../src/utils/cache-manager.js', () => ({
  getCacheManager: vi.fn(() => ({
    withCache: vi.fn(),
    del: vi.fn(),
    clear: vi.fn(),
  })),
}));

// Mock connection pool
vi.mock('../../../src/utils/connection-pool.js', () => ({
  getConnectionPool: vi.fn(() => ({
    getHttpAgent: vi.fn(() => null),
    getHttpsAgent: vi.fn(() => null),
    trackRequest: vi.fn(),
  })),
}));

// Mock error handler
vi.mock('../../../src/utils/error-handler.js', () => ({
  translateApiError: vi.fn(),
  createDefaultErrorRecoveryManager: vi.fn(() => ({
    shouldRetry: vi.fn(() => false),
    getRetryDelay: vi.fn(() => 1000),
    executeWithRecovery: vi.fn(),
  })),
}));

describe('BaseApiClient', () => {
  // Test client
  let client: BaseApiClient;

  // Mock axios instance
  const mockAxiosInstance = {
    request: vi.fn(),
  };

  // Mock cache manager
  const mockCacheManager = {
    withCache: vi.fn(),
    del: vi.fn(),
    clear: vi.fn(),
  };

  // Mock error recovery manager
  const mockErrorRecoveryManager = {
    shouldRetry: vi.fn(() => false),
    getRetryDelay: vi.fn(() => 1000),
    executeWithRecovery: vi.fn(),
  };

  // Setup before each test
  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup axios mock
    (axios.create as vi.Mock).mockReturnValue(mockAxiosInstance);
    (axios.isAxiosError as vi.Mock).mockReturnValue(false);

    // Setup cache manager mock
    const { getCacheManager } = await import('../../../src/utils/cache-manager.js');
    vi.mocked(getCacheManager).mockReturnValue(mockCacheManager);

    // Setup error recovery manager mock
    const { createDefaultErrorRecoveryManager } = await import('../../../src/utils/error-handler.js');
    vi.mocked(createDefaultErrorRecoveryManager).mockReturnValue(mockErrorRecoveryManager);

    // Setup connection pool mock
    const { getConnectionPool } = await import('../../../src/utils/connection-pool.js');
    vi.mocked(getConnectionPool).mockReturnValue({
      getHttpAgent: vi.fn(() => null),
      getHttpsAgent: vi.fn(() => null),
      trackRequest: vi.fn(),
    });

    // Make executeWithRecovery pass through to the function by default
    mockErrorRecoveryManager.executeWithRecovery.mockImplementation(async (fn) => {
      try {
        return await fn();
      } catch (error) {
        throw error;
      }
    });

    // Setup AmazonAuth mock
    vi.mocked(AmazonAuth.prototype.getAccessToken).mockResolvedValue('test-access-token');
    vi.mocked(AmazonAuth.prototype.generateSecuredRequest).mockImplementation((request) =>
      Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: 'AWS4-HMAC-SHA256 Credential=test/test',
        },
      })
    );

    // Create test client
    client = new BaseApiClient(
      {
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          refreshToken: 'test-refresh-token',
        },
        region: AmazonRegion.NA,
        marketplaceId: 'test-marketplace-id',
      },
      {
        rateLimit: {
          requestsPerSecond: 5,
          enabled: false, // Disable rate limiting for tests
        },
      }
    );
  });

  // Cleanup after each test
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('request', () => {
    it('should make a successful GET request', async () => {
      // Setup mock response
      const mockResponse = {
        data: { success: true },
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Make request
      const response = await client.request({
        method: 'GET',
        path: '/test',
      });

      // Verify response
      expect(response).toEqual({
        data: { success: true },
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
        rateLimit: undefined,
      });

      // Verify axios request
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          headers: expect.objectContaining({
            Authorization: 'AWS4-HMAC-SHA256 Credential=test/test',
          }),
        })
      );

      // Verify auth calls
      expect(AmazonAuth.prototype.getAccessToken).toHaveBeenCalledTimes(1);
      expect(AmazonAuth.prototype.generateSecuredRequest).toHaveBeenCalledTimes(1);
    });

    it('should make a successful POST request with data', async () => {
      // Setup mock response
      const mockResponse = {
        data: { id: '123' },
        status: 201,
        headers: {
          'content-type': 'application/json',
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Make request
      const response = await client.request({
        method: 'POST',
        path: '/test',
        data: { name: 'Test' },
      });

      // Verify response
      expect(response).toEqual({
        data: { id: '123' },
        statusCode: 201,
        headers: {
          'content-type': 'application/json',
        },
        rateLimit: undefined,
      });

      // Verify axios request
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          data: { name: 'Test' },
          headers: expect.objectContaining({
            Authorization: 'AWS4-HMAC-SHA256 Credential=test/test',
          }),
        })
      );
    });

    it('should handle query parameters correctly', async () => {
      // Setup mock response
      const mockResponse = {
        data: { results: [] },
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Make request
      await client.request({
        method: 'GET',
        path: '/test',
        query: {
          page: 1,
          limit: 10,
          filter: 'active',
          include_deleted: false,
          empty: undefined,
        },
      });

      // Verify axios request
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test?page=1&limit=10&filter=active&include_deleted=false',
        })
      );
    });

    it('should handle rate limit headers', async () => {
      // Setup mock response with rate limit headers
      const mockResponse = {
        data: { success: true },
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-amzn-ratelimit-limit': '100',
          'x-amzn-ratelimit-remaining': '99',
          'x-amzn-ratelimit-reset': new Date(Date.now() + 1000).toISOString(),
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Make request
      const response = await client.request({
        method: 'GET',
        path: '/test',
      });

      // Verify rate limit info
      expect(response.rateLimit).toBeDefined();
      expect(response.rateLimit?.limit).toBe(100);
      expect(response.rateLimit?.remaining).toBe(99);
      expect(response.rateLimit?.resetAt).toBeInstanceOf(Date);
    });

    it('should handle authentication errors', async () => {
      // Mock AmazonAuth.getAccessToken to throw an error
      const authError = new AuthError(
        'Failed to refresh access token',
        AuthErrorType.TOKEN_REFRESH_FAILED
      );

      (AmazonAuth.prototype.getAccessToken as vi.Mock).mockRejectedValueOnce(authError);

      // Make request and expect error
      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow('Failed to refresh access token');
    });

    it('should handle network errors', async () => {
      // Mock AmazonAuth methods to succeed
      vi.mocked(AmazonAuth.prototype.getAccessToken).mockResolvedValueOnce('test-access-token');
      vi.mocked(AmazonAuth.prototype.generateSecuredRequest).mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-access-token' },
      });

      // Mock axios to throw a network error
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNRESET';

      mockAxiosInstance.request.mockRejectedValueOnce(networkError);
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

      // Make request and expect error
      const error = await expect(
        client.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify error type
      expect(error).toBeInstanceOf(ApiError);
      expect(error.type).toBe(ApiErrorType.NETWORK_ERROR);
    });

    it('should handle HTTP error responses', async () => {
      // Mock AmazonAuth methods to succeed
      vi.mocked(AmazonAuth.prototype.getAccessToken).mockResolvedValueOnce('test-access-token');
      vi.mocked(AmazonAuth.prototype.generateSecuredRequest).mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-access-token' },
      });

      // Mock axios to throw an HTTP error
      const httpError = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                code: 'InvalidInput',
                message: 'One or more request parameters is invalid',
              },
            ],
          },
          headers: {},
        },
        message: 'Request failed with status code 400',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(httpError);
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

      // Make request and expect error
      const error = await expect(
        client.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify error type
      expect(error).toBeInstanceOf(ApiError);
      expect(error.type).toBe(ApiErrorType.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        errors: [
          {
            code: 'InvalidInput',
            message: 'One or more request parameters is invalid',
          },
        ],
      });
    });

    it('should retry on server errors', async () => {
      // Mock AmazonAuth methods to succeed
      vi.mocked(AmazonAuth.prototype.getAccessToken).mockResolvedValue('test-access-token');
      vi.mocked(AmazonAuth.prototype.generateSecuredRequest).mockResolvedValue({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-access-token' },
      });

      // Mock axios to return a 500 error twice, then succeed
      const serverError = {
        response: {
          status: 500,
          data: {
            errors: [
              {
                code: 'InternalServerError',
                message: 'An internal server error occurred',
              },
            ],
          },
          headers: {},
        },
        message: 'Request failed with status code 500',
      };

      const successResponse = {
        data: { success: true },
        status: 200,
        headers: {},
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse);

      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      // Make request
      const result = await client.request({
        method: 'GET',
        path: '/test',
      });

      // Verify the request was retried and eventually succeeded
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        data: { success: true },
        statusCode: 200,
        headers: {},
        rateLimit: undefined,
      });
    });

    it('should respect maxRetries parameter', async () => {
      // Mock AmazonAuth methods to succeed
      vi.mocked(AmazonAuth.prototype.getAccessToken).mockResolvedValue('test-access-token');
      vi.mocked(AmazonAuth.prototype.generateSecuredRequest).mockResolvedValue({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-access-token' },
      });

      // Mock axios to always return a 500 error
      const serverError = {
        response: {
          status: 500,
          data: {
            errors: [
              {
                code: 'InternalServerError',
                message: 'An internal server error occurred',
              },
            ],
          },
          headers: {},
        },
        message: 'Request failed with status code 500',
      };

      mockAxiosInstance.request.mockRejectedValue(serverError);
      vi.mocked(axios.isAxiosError).mockReturnValue(true);

      // Make request with custom maxRetries
      await expect(
        client.request({
          method: 'GET',
          path: '/test',
          maxRetries: 2,
        })
      ).rejects.toThrow();

      // Verify the request was retried exactly maxRetries times
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3); // Initial request + 2 retries
    });
  });

  describe('withCache', () => {
    it('should cache responses and return cached values', async () => {
      // Create a test function that returns a value
      const testFn = vi.fn().mockResolvedValue({ data: 'test' });

      // Mock cache manager to simulate caching behavior
      mockCacheManager.withCache
        .mockResolvedValueOnce({ data: 'test' }) // First call
        .mockResolvedValueOnce({ data: 'test' }) // Second call (cached)
        .mockResolvedValueOnce({ data: 'test' }); // Third call (different key)

      // Call withCache with the test function
      const result1 = await (client as any).withCache('test-key', testFn);

      // Verify result
      expect(result1).toEqual({ data: 'test' });
      expect(mockCacheManager.withCache).toHaveBeenCalledWith('test-key', testFn, undefined);

      // Call again with the same key
      const result2 = await (client as any).withCache('test-key', testFn);

      // Verify cached result is returned
      expect(result2).toEqual({ data: 'test' });

      // Call with a different key
      const result3 = await (client as any).withCache('different-key', testFn);

      // Verify function is called again
      expect(result3).toEqual({ data: 'test' });
      expect(mockCacheManager.withCache).toHaveBeenCalledTimes(3);
    });

    it('should clear specific cache keys', async () => {
      // Clear specific cache key
      await client.clearCache('key1');

      // Verify cache manager del method was called
      expect(mockCacheManager.del).toHaveBeenCalledWith('key1');
    });

    it('should clear all cache', async () => {
      // Clear all cache
      await client.clearCache();

      // Verify cache manager clear method was called
      expect(mockCacheManager.clear).toHaveBeenCalled();
    });

    it('should handle errors in cached function', async () => {
      // Create a test function that throws an error
      const testError = new Error('Test error');
      const testFn = vi.fn().mockRejectedValue(testError);

      // Mock cache manager to throw error
      mockCacheManager.withCache.mockRejectedValue(testError);

      // Call withCache with the test function
      await expect((client as any).withCache('error-key', testFn)).rejects.toThrow('Test error');

      // Verify cache manager was called
      expect(mockCacheManager.withCache).toHaveBeenCalledWith('error-key', testFn, undefined);
    });
  });

  describe('buildUrl', () => {
    it('should build URL with path only', async () => {
      // Call buildUrl with path only
      const url = await (client as any).buildUrl('/test');

      // Verify URL
      expect(url).toBe('/test');
    });

    it('should build URL with path and query parameters', async () => {
      // Call buildUrl with path and query parameters
      const url = await (client as any).buildUrl('/test', {
        page: 1,
        limit: 10,
        filter: 'active',
      });

      // Verify URL
      expect(url).toBe('/test?page=1&limit=10&filter=active');
    });

    it('should handle undefined query parameters', async () => {
      // Call buildUrl with path and query parameters including undefined
      const url = await (client as any).buildUrl('/test', {
        page: 1,
        limit: undefined,
        filter: 'active',
      });

      // Verify URL
      expect(url).toBe('/test?page=1&filter=active');
    });

    it('should ensure path starts with a slash', async () => {
      // Call buildUrl with path that doesn't start with a slash
      const url = await (client as any).buildUrl('test');

      // Verify URL
      expect(url).toBe('/test');
    });
  });
});
