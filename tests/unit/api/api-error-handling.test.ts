/**
 * Comprehensive error handling tests for all API clients
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { BaseApiClient } from '../../../src/api/base-client.js';
import { CatalogClient } from '../../../src/api/catalog-client.js';
import { InventoryClient } from '../../../src/api/inventory-client.js';
import { ListingsClient } from '../../../src/api/listings-client.js';
import { OrdersClient } from '../../../src/api/orders-client.js';
import { ReportsClient } from '../../../src/api/reports-client.js';
import { ApiError, ApiErrorType } from '../../../src/types/api.js';
import { AmazonRegion, AuthError, AuthErrorType } from '../../../src/types/auth.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  create: vi.Mock;
  isAxiosError: vi.Mock;
};

// Mock AmazonAuth
const mockGetAccessToken = vi.fn();
const mockGenerateSecuredRequest = vi.fn();

vi.mock('../../../src/auth/amazon-auth.js', () => {
  return {
    AmazonAuth: class MockAmazonAuth {
      getAccessToken = mockGetAccessToken;
      generateSecuredRequest = mockGenerateSecuredRequest;
    },
  };
});

describe('API Client Error Handling', () => {
  // Test auth config
  const authConfig = {
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    region: AmazonRegion.NA,
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  // Mock axios instance
  const mockAxiosInstance = {
    request: vi.fn(),
  };

  // Client instances
  let baseClient: BaseApiClient;
  let catalogClient: CatalogClient;
  let inventoryClient: InventoryClient;
  let listingsClient: ListingsClient;
  let ordersClient: OrdersClient;
  let reportsClient: ReportsClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockGetAccessToken.mockReset();
    mockGenerateSecuredRequest.mockReset();

    // Setup default mock return values
    mockGetAccessToken.mockResolvedValue('mock-access-token');
    mockGenerateSecuredRequest.mockImplementation((request) => Promise.resolve(request));

    // Setup axios mock
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError.mockReturnValue(true);

    // Mock setTimeout to avoid long delays in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as any;
    });

    // Create client instances
    baseClient = new BaseApiClient(authConfig);
    catalogClient = new CatalogClient(authConfig);
    inventoryClient = new InventoryClient(authConfig);
    listingsClient = new ListingsClient(authConfig);
    ordersClient = new OrdersClient(authConfig);
    reportsClient = new ReportsClient(authConfig);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication Errors', () => {
    it('should handle token refresh failures', async () => {
      // Mock AmazonAuth.getAccessToken to throw an AuthError
      const authError = new AuthError(
        'Failed to refresh access token',
        AuthErrorType.TOKEN_REFRESH_FAILED
      );

      mockGetAccessToken.mockRejectedValueOnce(authError);

      // Attempt to make a request
      await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow('Failed to refresh access token');
    });

    it('should handle request signing failures', async () => {
      // Mock AmazonAuth.getAccessToken to succeed but generateSecuredRequest to fail
      mockGetAccessToken.mockResolvedValueOnce('test-token');

      const authError = new AuthError(
        'Failed to sign request',
        AuthErrorType.REQUEST_SIGNING_FAILED
      );

      mockGenerateSecuredRequest.mockRejectedValueOnce(authError);

      // Attempt to make a request
      await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow('Failed to sign request');
    });
  });

  describe('Network Errors', () => {
    it('should handle connection timeouts', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to throw a timeout error
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'Error';
      (timeoutError as any).code = 'ECONNABORTED';

      mockAxiosInstance.request.mockRejectedValueOnce(timeoutError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.NETWORK_ERROR);
    });

    it('should handle connection refused errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to throw a connection refused error
      const connectionError = new Error('connect ECONNREFUSED');
      connectionError.name = 'Error';
      (connectionError as any).code = 'ECONNREFUSED';

      mockAxiosInstance.request.mockRejectedValueOnce(connectionError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.NETWORK_ERROR);
    });
  });

  describe('HTTP Status Errors', () => {
    it('should handle 400 Bad Request errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 400 error
      const badRequestError = {
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

      mockAxiosInstance.request.mockRejectedValueOnce(badRequestError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.VALIDATION_ERROR);
      expect(result.statusCode).toBe(400);
      expect(result.details).toEqual({
        errors: [
          {
            code: 'InvalidInput',
            message: 'One or more request parameters is invalid',
          },
        ],
      });
    });

    it('should handle 401 Unauthorized errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 401 error
      const unauthorizedError = {
        response: {
          status: 401,
          data: {
            errors: [
              {
                code: 'Unauthorized',
                message: 'The request is not authorized',
              },
            ],
          },
          headers: {},
        },
        message: 'Request failed with status code 401',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(unauthorizedError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.AUTH_ERROR);
      expect(result.statusCode).toBe(401);
    });

    it('should handle 403 Forbidden errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 403 error
      const forbiddenError = {
        response: {
          status: 403,
          data: {
            errors: [
              {
                code: 'Forbidden',
                message: 'Access to the requested resource is forbidden',
              },
            ],
          },
          headers: {},
        },
        message: 'Request failed with status code 403',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(forbiddenError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.AUTH_ERROR);
      expect(result.statusCode).toBe(403);
    });

    it('should handle 429 Too Many Requests errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 429 error
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            errors: [
              {
                code: 'QuotaExceeded',
                message: 'The request was throttled',
              },
            ],
          },
          headers: {
            'x-amzn-ratelimit-limit': '1',
            'x-amzn-ratelimit-remaining': '0',
            'x-amzn-ratelimit-reset': new Date(Date.now() + 1000).toISOString(),
          },
        },
        message: 'Request failed with status code 429',
      };

      mockAxiosInstance.request.mockRejectedValueOnce(rateLimitError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.RATE_LIMIT_EXCEEDED);
      expect(result.statusCode).toBe(429);
    });

    it('should handle 500 Server Error', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 500 error
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

      mockAxiosInstance.request.mockRejectedValueOnce(serverError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      const result = await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the error is an ApiError with the correct type
      expect(result).toBeInstanceOf(ApiError);
      expect(result.type).toBe(ApiErrorType.SERVER_ERROR);
      expect(result.statusCode).toBe(500);
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry on server errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValue('test-token');
      mockGenerateSecuredRequest.mockResolvedValue({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
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

      mockedAxios.isAxiosError.mockReturnValue(true);

      // Attempt to make a request
      const result = await baseClient.request({
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

    it('should retry on rate limit errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValue('test-token');
      mockGenerateSecuredRequest.mockResolvedValue({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 429 error once, then succeed
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            errors: [
              {
                code: 'QuotaExceeded',
                message: 'The request was throttled',
              },
            ],
          },
          headers: {
            'x-amzn-ratelimit-limit': '1',
            'x-amzn-ratelimit-remaining': '0',
            'x-amzn-ratelimit-reset': new Date(Date.now() + 1000).toISOString(),
          },
        },
        message: 'Request failed with status code 429',
      };

      const successResponse = {
        data: { success: true },
        status: 200,
        headers: {},
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      mockedAxios.isAxiosError.mockReturnValue(true);

      // Attempt to make a request
      const result = await baseClient.request({
        method: 'GET',
        path: '/test',
      });

      // Verify the request was retried and eventually succeeded
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        data: { success: true },
        statusCode: 200,
        headers: {},
        rateLimit: undefined,
      });
    });

    it('should not retry on client errors', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a 400 error
      const clientError = {
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

      mockAxiosInstance.request.mockRejectedValueOnce(clientError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Attempt to make a request
      await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
        })
      ).rejects.toThrow();

      // Verify the request was not retried
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries parameter', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValue('test-token');
      mockGenerateSecuredRequest.mockResolvedValue({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
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
      mockedAxios.isAxiosError.mockReturnValue(true);

      // Attempt to make a request with custom maxRetries
      await expect(
        baseClient.request({
          method: 'GET',
          path: '/test',
          maxRetries: 2,
        })
      ).rejects.toThrow();

      // Verify the request was retried exactly maxRetries times
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3); // Initial request + 2 retries
    });
  });

  describe('Rate Limiting', () => {
    it('should parse rate limit headers', async () => {
      // Mock AmazonAuth methods to succeed
      mockGetAccessToken.mockResolvedValueOnce('test-token');
      mockGenerateSecuredRequest.mockResolvedValueOnce({
        method: 'GET',
        url: 'https://example.com/test',
        headers: { Authorization: 'Bearer test-token' },
      });

      // Mock axios to return a successful response with rate limit headers
      const successResponse = {
        data: { success: true },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '100',
          'x-amzn-ratelimit-remaining': '99',
          'x-amzn-ratelimit-reset': new Date(Date.now() + 1000).toISOString(),
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(successResponse);

      // Make a request
      const result = await baseClient.request({
        method: 'GET',
        path: '/test',
      });

      // Verify rate limit info was parsed correctly
      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit?.limit).toBe(100);
      expect(result.rateLimit?.remaining).toBe(99);
      expect(result.rateLimit?.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('Specific API Client Error Handling', () => {
    describe('CatalogClient', () => {
      it('should handle errors in getCatalogItem', async () => {
        // Mock AmazonAuth methods to succeed
        mockGetAccessToken.mockResolvedValueOnce('test-token');
        mockGenerateSecuredRequest.mockResolvedValueOnce({
          method: 'GET',
          url: 'https://example.com/test',
          headers: { Authorization: 'Bearer test-token' },
        });

        // Mock axios to return a 404 error
        const notFoundError = {
          response: {
            status: 404,
            data: {
              errors: [
                {
                  code: 'NotFound',
                  message: 'The requested ASIN was not found',
                },
              ],
            },
            headers: {},
          },
          message: 'Request failed with status code 404',
        };

        mockAxiosInstance.request.mockRejectedValueOnce(notFoundError);
        mockedAxios.isAxiosError.mockReturnValueOnce(true);

        // Attempt to get a catalog item
        await expect(catalogClient.getCatalogItem({ asin: 'B00INVALID' })).rejects.toThrow();
      });
    });

    describe('InventoryClient', () => {
      it('should handle validation errors in updateInventory', async () => {
        // Attempt to update inventory with invalid data
        await expect(
          inventoryClient.updateInventory({
            sku: '',
            quantity: -10,
            fulfillmentChannel: 'INVALID' as any,
          })
        ).rejects.toThrow('Inventory update validation failed');
      });
    });

    describe('ListingsClient', () => {
      it('should handle validation errors in putListing', async () => {
        // Attempt to create a listing with invalid data
        await expect(
          listingsClient.putListing({
            sku: '',
            productType: '',
            attributes: {},
          } as any)
        ).rejects.toThrow('Listing validation failed');
      });

      it('should handle not found errors in getListing', async () => {
        // Mock AmazonAuth methods to succeed
        mockGetAccessToken.mockResolvedValueOnce('test-token');
        mockGenerateSecuredRequest.mockResolvedValueOnce({
          method: 'GET',
          url: 'https://example.com/test',
          headers: { Authorization: 'Bearer test-token' },
        });

        // Mock axios to return an empty listings array
        const emptyResponse = {
          data: {
            payload: {
              listings: [],
            },
          },
          status: 200,
          headers: {},
        };

        mockAxiosInstance.request.mockResolvedValueOnce(emptyResponse);

        // Attempt to get a non-existent listing
        await expect(listingsClient.getListing('NON-EXISTENT-SKU')).rejects.toThrow(
          'Listing with SKU NON-EXISTENT-SKU not found'
        );
      });
    });

    describe('OrdersClient', () => {
      it('should handle validation errors in updateOrderStatus for SHIP action', async () => {
        // Attempt to ship an order without shipping details
        await expect(
          ordersClient.updateOrderStatus({
            amazonOrderId: 'TEST-ORDER-001',
            action: 'SHIP',
            details: {},
          })
        ).rejects.toThrow('Shipping details are required for SHIP action');
      });

      it('should handle validation errors in updateOrderStatus for CANCEL action', async () => {
        // Attempt to cancel an order without cancellation reason
        await expect(
          ordersClient.updateOrderStatus({
            amazonOrderId: 'TEST-ORDER-001',
            action: 'CANCEL',
            details: {},
          })
        ).rejects.toThrow('Cancellation reason is required for CANCEL action');
      });
    });

    describe('ReportsClient', () => {
      it('should handle validation errors in createReport', async () => {
        // Attempt to create a report with invalid data
        await expect(
          reportsClient.createReport({
            reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
            marketplaceIds: [], // Empty array, should fail validation
          } as any)
        ).rejects.toThrow('Validation failed');
      });

      it('should handle download errors in downloadReportDocument', async () => {
        // Mock getReportDocument to succeed
        reportsClient.getReportDocument = vi.fn().mockResolvedValueOnce({
          reportDocumentId: 'test-document-id',
          url: 'https://example.com/report.csv',
        });

        // Mock fetch to fail
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          statusText: 'Not Found',
        });

        // Attempt to download a report document
        await expect(reportsClient.downloadReportDocument('test-document-id')).rejects.toThrow(
          'Failed to download report document: Not Found'
        );
      });
    });
  });
});
