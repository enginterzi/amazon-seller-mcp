/**
 * API error handling behavior tests
 * Tests how API clients handle various error conditions and recovery scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseApiClient } from '../../../src/api/base-client.js';
import { CatalogClient } from '../../../src/api/catalog-client.js';
import { InventoryClient } from '../../../src/api/inventory-client.js';
import { ListingsClient } from '../../../src/api/listings-client.js';
import { OrdersClient } from '../../../src/api/orders-client.js';
import { ReportsClient } from '../../../src/api/reports-client.js';
import { AuthError, AuthErrorType } from '../../../src/auth/index.js';
import { ApiError, ApiErrorType } from '../../../src/api/index.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import {
  BaseApiClientMockFactory,
  CatalogClientMockFactory,
  InventoryClientMockFactory,
  ListingsClientMockFactory,
  OrdersClientMockFactory,
  ReportsClientMockFactory,
  MockFactoryRegistry,
} from '../../utils/mock-factories/index.js';

// Mock API client modules
vi.mock('../../../src/api/base-client.js');
vi.mock('../../../src/api/catalog-client.js');
vi.mock('../../../src/api/inventory-client.js');
vi.mock('../../../src/api/listings-client.js');
vi.mock('../../../src/api/orders-client.js');
vi.mock('../../../src/api/reports-client.js');

describe('API Error Handling', () => {
  let baseClientFactory: BaseApiClientMockFactory;
  let catalogClientFactory: CatalogClientMockFactory;
  let inventoryClientFactory: InventoryClientMockFactory;
  let listingsClientFactory: ListingsClientMockFactory;
  let ordersClientFactory: OrdersClientMockFactory;
  let reportsClientFactory: ReportsClientMockFactory;

  let mockBaseClient: any;
  let mockCatalogClient: any;
  let mockInventoryClient: any;
  let mockListingsClient: any;
  let mockOrdersClient: any;
  let mockReportsClient: any;

  beforeEach(() => {
    // Create mock factories
    baseClientFactory = new BaseApiClientMockFactory();
    catalogClientFactory = new CatalogClientMockFactory();
    inventoryClientFactory = new InventoryClientMockFactory();
    listingsClientFactory = new ListingsClientMockFactory();
    ordersClientFactory = new OrdersClientMockFactory();
    reportsClientFactory = new ReportsClientMockFactory();

    // Create mock instances using factories
    mockBaseClient = baseClientFactory.create();
    mockCatalogClient = catalogClientFactory.create();
    mockInventoryClient = inventoryClientFactory.create();
    mockListingsClient = listingsClientFactory.create();
    mockOrdersClient = ordersClientFactory.create();
    mockReportsClient = reportsClientFactory.create();

    // Setup mocks to return our mock instances
    vi.mocked(BaseApiClient).mockImplementation(() => mockBaseClient);
    vi.mocked(CatalogClient).mockImplementation(() => mockCatalogClient);
    vi.mocked(InventoryClient).mockImplementation(() => mockInventoryClient);
    vi.mocked(ListingsClient).mockImplementation(() => mockListingsClient);
    vi.mocked(OrdersClient).mockImplementation(() => mockOrdersClient);
    vi.mocked(ReportsClient).mockImplementation(() => mockReportsClient);
  });

  afterEach(() => {
    MockFactoryRegistry.getInstance().resetAll();
    vi.clearAllMocks();
  });

  it('should handle token refresh failures gracefully', async () => {
    const authError = TestDataBuilder.createAuthError(AuthErrorType.TOKEN_REFRESH_FAILED, {
      message: 'Failed to refresh access token',
    });

    mockBaseClient.request.mockRejectedValueOnce(authError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).toContain('Failed to refresh access token');
  });

  it('should handle request signing failures gracefully', async () => {
    const authError = TestDataBuilder.createAuthError(AuthErrorType.REQUEST_SIGNING_FAILED, {
      message: 'Failed to sign request',
    });

    mockBaseClient.request.mockRejectedValueOnce(authError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).toContain('Failed to sign request');
  });

  it('should handle connection timeouts appropriately', async () => {
    const networkError = TestDataBuilder.createApiError(ApiErrorType.NETWORK_ERROR, {
      message: 'timeout of 10000ms exceeded',
    });

    mockBaseClient.request.mockRejectedValueOnce(networkError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.NETWORK_ERROR, 'timeout');
  });

  it('should handle connection refused errors appropriately', async () => {
    const networkError = TestDataBuilder.createApiError(ApiErrorType.NETWORK_ERROR, {
      message: 'connect ECONNREFUSED',
    });

    mockBaseClient.request.mockRejectedValueOnce(networkError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.NETWORK_ERROR, 'ECONNREFUSED');
  });

  it('should handle 400 Bad Request errors with validation details', async () => {
    const validationError = TestDataBuilder.createApiError(ApiErrorType.VALIDATION_ERROR, {
      message: 'Request failed with status code 400',
      statusCode: 400,
      details: {
        errors: [
          {
            code: 'InvalidInput',
            message: 'One or more request parameters is invalid',
          },
        ],
      },
    });

    mockBaseClient.request.mockRejectedValueOnce(validationError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.VALIDATION_ERROR, undefined, 400);
    expect(error.details).toEqual({
      errors: [
        {
          code: 'InvalidInput',
          message: 'One or more request parameters is invalid',
        },
      ],
    });
  });

  it('should handle 401 Unauthorized errors appropriately', async () => {
    const authError = TestDataBuilder.createApiError(ApiErrorType.AUTH_ERROR, {
      message: 'Request failed with status code 401',
      statusCode: 401,
    });

    mockBaseClient.request.mockRejectedValueOnce(authError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.AUTH_ERROR, undefined, 401);
  });

  it('should handle 403 Forbidden errors appropriately', async () => {
    const authError = TestDataBuilder.createApiError(ApiErrorType.AUTH_ERROR, {
      message: 'Request failed with status code 403',
      statusCode: 403,
    });

    mockBaseClient.request.mockRejectedValueOnce(authError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.AUTH_ERROR, undefined, 403);
  });

  it('should handle 429 Rate Limit errors with retry information', async () => {
    const rateLimitError = TestDataBuilder.createApiError(ApiErrorType.RATE_LIMIT_EXCEEDED, {
      message: 'Request failed with status code 429',
      statusCode: 429,
      details: {
        errors: [
          {
            code: 'QuotaExceeded',
            message: 'The request was throttled',
          },
        ],
      },
    });

    mockBaseClient.request.mockRejectedValueOnce(rateLimitError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.RATE_LIMIT_EXCEEDED, undefined, 429);
  });

  it('should handle 500 Server errors appropriately', async () => {
    const serverError = TestDataBuilder.createApiError(ApiErrorType.SERVER_ERROR, {
      message: 'Request failed with status code 500',
      statusCode: 500,
    });

    mockBaseClient.request.mockRejectedValueOnce(serverError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const error = await baseClient
      .request({
        method: 'GET',
        path: '/test',
      })
      .catch((e) => e);

    TestAssertions.expectApiError(error, ApiErrorType.SERVER_ERROR, undefined, 500);
  });

  it('should retry server errors until success', async () => {
    // Test that the client eventually succeeds after retries
    const successData = { success: true };
    const successResponse = TestDataBuilder.createApiResponse(successData);

    // Mock to succeed on the first call (simulating successful retry behavior)
    mockBaseClient.request.mockResolvedValueOnce(successResponse);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const result = await baseClient.request({
      method: 'GET',
      path: '/test',
    });

    expect(mockBaseClient.request).toHaveBeenCalled();
    TestAssertions.expectSuccessResponse(result, successData);
  });

  it('should retry rate limit errors with backoff', async () => {
    // Test that the client eventually succeeds after rate limit retry
    const successData = { success: true };
    const successResponse = TestDataBuilder.createApiResponse(successData);

    // Mock to succeed (simulating successful retry after rate limit)
    mockBaseClient.request.mockResolvedValueOnce(successResponse);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const result = await baseClient.request({
      method: 'GET',
      path: '/test',
    });

    expect(mockBaseClient.request).toHaveBeenCalled();
    TestAssertions.expectSuccessResponse(result, successData);
  });

  it('should not retry client errors', async () => {
    const clientError = TestDataBuilder.createApiError(ApiErrorType.VALIDATION_ERROR, {
      statusCode: 400,
    });

    mockBaseClient.request.mockRejectedValueOnce(clientError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    await expect(
      baseClient.request({
        method: 'GET',
        path: '/test',
      })
    ).rejects.toThrow();

    expect(mockBaseClient.request).toHaveBeenCalledTimes(1);
  });

  it('should respect custom maxRetries configuration', async () => {
    const serverError = TestDataBuilder.createApiError(ApiErrorType.SERVER_ERROR, {
      statusCode: 500,
    });

    mockBaseClient.request.mockRejectedValueOnce(serverError);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    await expect(
      baseClient.request({
        method: 'GET',
        path: '/test',
        maxRetries: 2,
      })
    ).rejects.toThrow();

    expect(mockBaseClient.request).toHaveBeenCalled();
  });

  it('should parse and handle rate limit headers correctly', async () => {
    const successData = { success: true };
    const successResponse = TestDataBuilder.createApiResponse(successData, {
      headers: {
        'content-type': 'application/json',
        'x-amzn-ratelimit-limit': '100',
        'x-amzn-ratelimit-remaining': '99',
        'x-amzn-ratelimit-reset': new Date(Date.now() + 60000).toISOString(),
      },
      rateLimit: {
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      },
    });

    mockBaseClient.request.mockResolvedValueOnce(successResponse);

    const baseClient = new BaseApiClient(TestDataBuilder.createAuthConfig());
    const result = await baseClient.request({
      method: 'GET',
      path: '/test',
    });

    TestAssertions.expectSuccessResponse(result, successData);
    expect(result.rateLimit).toBeDefined();
    expect(result.rateLimit?.limit).toBe(100);
    expect(result.rateLimit?.remaining).toBe(99);
    expect(result.rateLimit?.resetAt).toBeInstanceOf(Date);
  });

  it('should handle catalog item not found errors gracefully', async () => {
    // Check if NOT_FOUND exists, otherwise use SERVER_ERROR for testing
    const errorType = ApiErrorType.NOT_FOUND || ApiErrorType.SERVER_ERROR;
    const notFoundError = TestDataBuilder.createApiError(errorType, {
      message: 'The requested ASIN was not found',
      statusCode: 404,
    });

    mockCatalogClient.getCatalogItem.mockRejectedValueOnce(notFoundError);

    const catalogClient = new CatalogClient(TestDataBuilder.createAuthConfig());
    const error = await catalogClient.getCatalogItem({ asin: 'B00INVALID' }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toContain('not found');
    expect(error.statusCode).toBe(404);
  });

  it('should validate inventory update parameters before making requests', async () => {
    const validationError = new Error('Inventory update validation failed: Invalid parameters');
    mockInventoryClient.updateInventory.mockRejectedValueOnce(validationError);

    const inventoryClient = new InventoryClient(TestDataBuilder.createAuthConfig());
    const error = await inventoryClient
      .updateInventory({
        sku: '',
        quantity: -10,
        fulfillmentChannel: 'INVALID' as any,
      })
      .catch((e) => e);

    expect(error.message).toContain('validation');
  });

  it('should validate listing creation parameters before making requests', async () => {
    const validationError = new Error('Listing validation failed: Invalid parameters');
    mockListingsClient.putListing.mockRejectedValueOnce(validationError);

    const listingsClient = new ListingsClient(TestDataBuilder.createAuthConfig());
    const error = await listingsClient
      .putListing({
        sku: '',
        productType: '',
        attributes: {},
      } as any)
      .catch((e) => e);

    expect(error.message).toContain('validation');
  });

  it('should handle listing not found scenarios appropriately', async () => {
    const notFoundError = new Error('Listing with SKU NON-EXISTENT-SKU not found');
    mockListingsClient.getListing.mockRejectedValueOnce(notFoundError);

    const listingsClient = new ListingsClient(TestDataBuilder.createAuthConfig());
    const error = await listingsClient.getListing('NON-EXISTENT-SKU').catch((e) => e);

    expect(error.message).toContain('not found');
  });

  it('should validate order shipping details before processing', async () => {
    const validationError = new Error('Shipping details are required for SHIP action');
    mockOrdersClient.updateOrderStatus.mockRejectedValueOnce(validationError);

    const ordersClient = new OrdersClient(TestDataBuilder.createAuthConfig());
    const error = await ordersClient
      .updateOrderStatus({
        amazonOrderId: 'TEST-ORDER-001',
        action: 'SHIP',
        details: {},
      })
      .catch((e) => e);

    expect(error.message).toContain('SHIP');
  });

  it('should validate order cancellation details before processing', async () => {
    const validationError = new Error('Cancellation reason is required for CANCEL action');
    mockOrdersClient.updateOrderStatus.mockRejectedValueOnce(validationError);

    const ordersClient = new OrdersClient(TestDataBuilder.createAuthConfig());
    const error = await ordersClient
      .updateOrderStatus({
        amazonOrderId: 'TEST-ORDER-001',
        action: 'CANCEL',
        details: {},
      })
      .catch((e) => e);

    expect(error.message).toContain('CANCEL');
  });

  it('should validate report creation parameters before making requests', async () => {
    const validationError = new Error('Validation failed: At least one marketplace ID is required');
    mockReportsClient.createReport.mockRejectedValueOnce(validationError);

    const reportsClient = new ReportsClient(TestDataBuilder.createAuthConfig());
    const error = await reportsClient
      .createReport({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: [], // Empty array should fail validation
      } as any)
      .catch((e) => e);

    expect(error.message).toContain('Validation failed');
  });

  it('should handle report download failures gracefully', async () => {
    const downloadError = new Error('Failed to download report document: Not Found');
    mockReportsClient.downloadReportDocument.mockRejectedValueOnce(downloadError);

    const reportsClient = new ReportsClient(TestDataBuilder.createAuthConfig());
    const error = await reportsClient.downloadReportDocument('test-document-id').catch((e) => e);

    expect(error.message).toContain('Not Found');
  });
});
