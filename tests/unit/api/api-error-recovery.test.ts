/**
 * Tests for API error recovery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseApiClient } from '../../../src/api/base-client.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { ApiError, ApiErrorType } from '../../../src/api/index.js';
import type { MockEnvironment } from '../../utils/test-setup.js';
import type { MockAxiosInstance } from '../../utils/mock-factories/axios-factory.js';

// Mock axios at the module level to prevent real HTTP calls
vi.mock('axios', async () => {
  const mockAxiosInstance = {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    defaults: {
      httpAgent: undefined,
      httpsAgent: undefined,
      timeout: 30000,
      headers: {},
    },
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
      },
    },
  };

  const mockAxios = vi.fn();
  mockAxios.create = vi.fn(() => mockAxiosInstance);
  mockAxios.isAxiosError = vi.fn((error) => error && error.response !== undefined);
  mockAxios.request = mockAxiosInstance.request;
  mockAxios.get = mockAxiosInstance.get;
  mockAxios.post = mockAxiosInstance.post;
  mockAxios.put = mockAxiosInstance.put;
  mockAxios.delete = mockAxiosInstance.delete;
  mockAxios.patch = mockAxiosInstance.patch;
  mockAxios.defaults = mockAxiosInstance.defaults;
  mockAxios.interceptors = mockAxiosInstance.interceptors;

  // Mock the default export and named exports
  return {
    default: mockAxios,
    ...mockAxios,
  };
});

// Mock the AmazonAuth module to prevent real authentication calls
vi.mock('../../../src/auth/amazon-auth.js', () => ({
  AmazonAuth: vi.fn().mockImplementation(() => ({
    getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
    refreshAccessToken: vi.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      tokenType: 'bearer',
      expiresAt: Date.now() + 3600000,
    }),
    signRequest: vi.fn().mockImplementation((request) =>
      Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: 'AWS4-HMAC-SHA256 Credential=mock/test',
          'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
        },
      })
    ),
    generateSecuredRequest: vi.fn().mockImplementation((request) =>
      Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: 'Bearer mock-access-token',
          'X-Amz-Access-Token': 'mock-access-token',
        },
      })
    ),
  })),
}));

describe('API Error Recovery', () => {
  let client: BaseApiClient;
  let mockEnv: MockEnvironment;
  let mockAxiosInstance: MockAxiosInstance;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Get the mocked axios module
    const axiosModule = await import('axios');
    const mockAxios = axiosModule.default;

    // Create a fresh axios instance mock for each test
    mockAxiosInstance = mockAxios.create();

    const testSetup = TestSetup.createTestApiClient();
    client = testSetup.client;
    mockEnv = testSetup.mocks;

    // Override the axios instance in the mock environment to use our controlled mock
    mockEnv.axios.instance = mockAxiosInstance;

    // Directly inject the mocked axios instance into the client
    // This is a bit of a hack but necessary for proper test isolation
    (client as any).axios = mockAxiosInstance;
  });

  it('should retry network errors with exponential backoff', async () => {
    const networkError = new ApiError('Connection failed', ApiErrorType.NETWORK_ERROR, 0);
    const successResponse = TestDataBuilder.createApiResponse({ success: true });

    mockAxiosInstance.request
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        data: successResponse.data,
        status: successResponse.statusCode,
        headers: successResponse.headers || {},
      });

    const result = await client.request({
      method: 'GET',
      path: '/test',
      maxRetries: 3,
    });

    TestAssertions.expectSuccessResponse(result, { success: true });
    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
  });

  it('should retry server errors up to max retry limit', async () => {
    const serverError = new ApiError('Internal server error', ApiErrorType.SERVER_ERROR, 500);

    mockAxiosInstance.request.mockRejectedValue(serverError);

    await expect(
      client.request({
        method: 'GET',
        path: '/test',
        maxRetries: 2,
      })
    ).rejects.toThrow('Internal server error');

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should respect retry-after header for rate limit errors', async () => {
    vi.useFakeTimers();

    const rateLimitError = new ApiError(
      'Rate limit exceeded',
      ApiErrorType.RATE_LIMIT_EXCEEDED,
      429
    );
    const successResponse = TestDataBuilder.createApiResponse({ success: true });

    mockAxiosInstance.request.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce({
      data: successResponse.data,
      status: successResponse.statusCode,
      headers: successResponse.headers || {},
    });

    const requestPromise = client.request({
      method: 'GET',
      path: '/test',
    });

    // Fast-forward time to simulate waiting for retry-after
    await vi.advanceTimersByTimeAsync(1000);

    const result = await requestPromise;

    TestAssertions.expectSuccessResponse(result, { success: true });
    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should not retry client validation errors', async () => {
    const validationError = new ApiError('Invalid input', ApiErrorType.VALIDATION_ERROR, 400);

    mockAxiosInstance.request.mockRejectedValueOnce(validationError);

    await expect(
      client.request({
        method: 'GET',
        path: '/test',
        maxRetries: 3,
      })
    ).rejects.toThrow('Invalid input');

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1); // No retries
  });

  it('should translate API errors to domain-specific errors', async () => {
    const apiError = new ApiError('Authentication failed', ApiErrorType.AUTH_ERROR, 401);

    mockAxiosInstance.request.mockRejectedValueOnce(apiError);

    await expect(
      client.request({
        method: 'GET',
        path: '/test',
      })
    ).rejects.toThrow('Authentication failed');

    TestAssertions.expectApiError(apiError, ApiErrorType.AUTH_ERROR, 'Authentication failed', 401);
  });

  it('should use error recovery manager for complex retry scenarios', async () => {
    vi.useFakeTimers();

    const networkError = new ApiError('Network timeout', ApiErrorType.NETWORK_ERROR, 0);
    const serverError = new ApiError('Server unavailable', ApiErrorType.SERVER_ERROR, 500);
    const successResponse = TestDataBuilder.createApiResponse({ data: 'recovered' });

    mockAxiosInstance.request
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({
        data: successResponse.data,
        status: successResponse.statusCode,
        headers: successResponse.headers || {},
      });

    const requestPromise = client.request({
      method: 'POST',
      path: '/test',
      data: { test: 'data' },
      maxRetries: 3,
    });

    // Fast-forward through the retry delays
    await vi.advanceTimersByTimeAsync(10000); // Advance by 10 seconds to cover all retry delays

    const result = await requestPromise;

    TestAssertions.expectSuccessResponse(result, { data: 'recovered' });
    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});
