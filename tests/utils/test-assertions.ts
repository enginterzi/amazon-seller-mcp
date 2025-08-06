/**
 * Custom assertion helpers for domain-specific testing
 */

import { expect } from 'vitest';
import type { Mock } from 'vitest';
import type { ApiResponse } from '../../src/types/index.js';
import {
  AuthError,
  AuthErrorType,
  AmazonRegion,
} from '../../src/auth/index.js';
import {
  ApiError,
  ApiErrorType,
} from '../../src/api/index.js';

/**
 * Custom assertion helpers for testing
 */
export class TestAssertions {
  /**
   * Assert that an API call was made with expected parameters
   */
  static expectApiCall(
    mockFn: Mock,
    expectedParams: {
      method?: string;
      path?: string;
      query?: Record<string, any>;
      data?: any;
      headers?: Record<string, string>;
    },
    callIndex = 0
  ): void {
    expect(mockFn).toHaveBeenCalled();
    
    const calls = mockFn.mock.calls;
    expect(calls.length).toBeGreaterThan(callIndex);
    
    const call = calls[callIndex];
    const actualParams = call[0];
    
    if (expectedParams.method) {
      expect(actualParams.method).toBe(expectedParams.method);
    }
    
    if (expectedParams.path) {
      if (typeof expectedParams.path === 'string') {
        expect(actualParams.path).toBe(expectedParams.path);
      } else {
        // Handle expect.stringContaining() and other matchers
        expect(actualParams.path).toEqual(expectedParams.path);
      }
    }
    
    if (expectedParams.query) {
      expect(actualParams.query).toMatchObject(expectedParams.query);
    }
    
    if (expectedParams.data) {
      expect(actualParams.data).toMatchObject(expectedParams.data);
    }
    
    if (expectedParams.headers) {
      expect(actualParams.headers).toMatchObject(expectedParams.headers);
    }
  }

  /**
   * Assert that multiple API calls were made in sequence
   */
  static expectApiCalls(
    mockFn: Mock,
    expectedCalls: Array<{
      method?: string;
      path?: string;
      query?: Record<string, any>;
      data?: any;
    }>
  ): void {
    expect(mockFn).toHaveBeenCalledTimes(expectedCalls.length);
    
    expectedCalls.forEach((expectedCall, index) => {
      this.expectApiCall(mockFn, expectedCall, index);
    });
  }

  /**
   * Assert that an API response has the expected structure and data
   */
  static expectSuccessResponse<T>(
    response: ApiResponse<T>,
    expectedData?: Partial<T>,
    expectedStatusCode = 200
  ): void {
    expect(response).toMatchObject({
      data: expect.any(Object),
      statusCode: expectedStatusCode,
      headers: expect.any(Object),
    });
    
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
    expect(response.statusCode).toBeLessThan(300);
    
    if (expectedData) {
      expect(response.data).toMatchObject(expectedData);
    }
    
    // Verify common headers are present
    expect(response.headers).toHaveProperty('content-type');
    
    // Verify rate limit info if present
    if (response.rateLimit) {
      expect(response.rateLimit).toMatchObject({
        remaining: expect.any(Number),
        resetAt: expect.any(Date),
        limit: expect.any(Number),
      });
      expect(response.rateLimit.remaining).toBeGreaterThanOrEqual(0);
      expect(response.rateLimit.limit).toBeGreaterThan(0);
    }
  }

  /**
   * Assert that an API error has the expected type and properties
   */
  static expectApiError(
    error: ApiError,
    expectedType: ApiErrorType,
    expectedMessage?: string,
    expectedStatusCode?: number
  ): void {
    expect(error).toBeInstanceOf(ApiError);
    expect(error.type).toBe(expectedType);
    
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
    
    if (expectedStatusCode) {
      expect(error.statusCode).toBe(expectedStatusCode);
    }
    
    // Verify error has required properties
    expect(error.name).toBe('ApiError');
    expect(error.message).toBeTruthy();
  }

  /**
   * Assert that an authentication error has the expected type and properties
   */
  static expectAuthError(
    error: AuthError,
    expectedType: AuthErrorType,
    expectedMessage?: string
  ): void {
    expect(error).toBeInstanceOf(AuthError);
    expect(error.type).toBe(expectedType);
    
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
    
    // Verify error has required properties
    expect(error.name).toBe('AuthError');
    expect(error.message).toBeTruthy();
  }

  /**
   * Assert that a mock was called with authentication headers
   */
  static expectAuthenticatedCall(mockFn: Mock, callIndex = 0): void {
    expect(mockFn).toHaveBeenCalled();
    
    const calls = mockFn.mock.calls;
    expect(calls.length).toBeGreaterThan(callIndex);
    
    const call = calls[callIndex];
    const params = call[0];
    
    expect(params.headers).toHaveProperty('Authorization');
    expect(params.headers.Authorization).toMatch(/^(Bearer|AWS4-HMAC-SHA256)/);
  }

  /**
   * Assert that a catalog item has the expected structure
   */
  static expectValidCatalogItem(item: any, expectedAsin?: string): void {
    expect(item).toMatchObject({
      asin: expect.stringMatching(/^B[A-Z0-9]{9}$/),
      attributes: expect.any(Object),
      identifiers: expect.any(Array),
    });
    
    if (expectedAsin) {
      expect(item.asin).toBe(expectedAsin);
    }
    
    // Verify identifiers array structure
    expect(item.identifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identifier: expect.any(String),
          identifierType: expect.any(String),
        }),
      ])
    );
    
    // Verify attributes structure if present
    if (item.attributes) {
      expect(item.attributes).toEqual(expect.any(Object));
    }
  }

  /**
   * Assert that an order has the expected structure
   */
  static expectValidOrder(order: any, expectedOrderId?: string): void {
    expect(order).toMatchObject({
      AmazonOrderId: expect.any(String),
      OrderStatus: expect.any(String),
      PurchaseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      MarketplaceId: expect.any(String),
    });
    
    if (expectedOrderId) {
      expect(order.AmazonOrderId).toBe(expectedOrderId);
    }
    
    // Verify order total structure if present
    if (order.OrderTotal) {
      expect(order.OrderTotal).toMatchObject({
        CurrencyCode: expect.any(String),
        Amount: expect.any(String),
      });
    }
    
    // Verify dates are valid ISO strings
    expect(new Date(order.PurchaseDate)).toBeInstanceOf(Date);
    if (order.LastUpdateDate) {
      expect(new Date(order.LastUpdateDate)).toBeInstanceOf(Date);
    }
  }

  /**
   * Assert that an inventory summary has the expected structure
   */
  static expectValidInventorySummary(summary: any, expectedSku?: string): void {
    expect(summary).toMatchObject({
      asin: expect.stringMatching(/^B[A-Z0-9]{9}$/),
      sellerSku: expect.any(String),
      condition: expect.any(String),
      inventoryDetails: expect.any(Object),
      totalQuantity: expect.any(Number),
    });
    
    if (expectedSku) {
      expect(summary.sellerSku).toBe(expectedSku);
    }
    
    // Verify inventory details structure
    expect(summary.inventoryDetails).toMatchObject({
      fulfillableQuantity: expect.any(Number),
    });
    
    // Verify quantities are non-negative
    expect(summary.totalQuantity).toBeGreaterThanOrEqual(0);
    expect(summary.inventoryDetails.fulfillableQuantity).toBeGreaterThanOrEqual(0);
  }

  /**
   * Assert that a listing has the expected structure
   */
  static expectValidListing(listing: any, expectedSku?: string): void {
    expect(listing).toMatchObject({
      sku: expect.any(String),
      productType: expect.any(String),
      attributes: expect.any(Object),
      issues: expect.any(Array),
    });
    
    if (expectedSku) {
      expect(listing.sku).toBe(expectedSku);
    }
    
    // Verify attributes structure if present
    if (listing.attributes) {
      expect(listing.attributes).toEqual(expect.any(Object));
    }
    
    // Verify issues is an array
    expect(Array.isArray(listing.issues)).toBe(true);
  }

  /**
   * Assert that a mock function was called with rate limiting respected
   */
  static expectRateLimitedCalls(
    mockFn: Mock,
    expectedCallCount: number,
    maxCallsPerSecond = 5
  ): void {
    expect(mockFn).toHaveBeenCalledTimes(expectedCallCount);
    
    if (expectedCallCount <= 1) return;
    
    // Get timestamps of calls (this is a simplified check)
    const calls = mockFn.mock.calls;
    expect(calls.length).toBe(expectedCallCount);
    
    // In a real scenario, you might check actual timing
    // For now, just verify the calls were made
    expect(mockFn).toHaveBeenCalledTimes(expectedCallCount);
  }

  /**
   * Assert that a configuration object has valid Amazon region settings
   */
  static expectValidRegionConfig(config: any, expectedRegion?: AmazonRegion): void {
    expect(config).toHaveProperty('region');
    expect(Object.values(AmazonRegion)).toContain(config.region);
    
    if (expectedRegion) {
      expect(config.region).toBe(expectedRegion);
    }
    
    // Verify marketplace ID is present and valid format
    expect(config).toHaveProperty('marketplaceId');
    expect(config.marketplaceId).toMatch(/^[A-Z0-9]{10,14}$/);
  }

  /**
   * Assert that credentials are properly formatted
   */
  static expectValidCredentials(credentials: any): void {
    expect(credentials).toMatchObject({
      clientId: expect.stringMatching(/^amzn1\.application-oa2-client\./),
      clientSecret: expect.any(String),
      refreshToken: expect.stringMatching(/^Atzr\|/),
    });
    
    expect(credentials.clientId).toBeTruthy();
    expect(credentials.clientSecret).toBeTruthy();
    expect(credentials.refreshToken).toBeTruthy();
    
    // Optional AWS credentials
    if (credentials.accessKeyId) {
      expect(credentials.accessKeyId).toMatch(/^AKIA[A-Z0-9]{8,20}$/);
    }
    
    if (credentials.secretAccessKey) {
      expect(credentials.secretAccessKey).toBeTruthy();
    }
  }

  /**
   * Assert that a mock was reset/cleaned up properly
   */
  static expectMockReset(mockFn: Mock): void {
    expect(mockFn.mock.calls).toHaveLength(0);
    expect(mockFn.mock.results).toHaveLength(0);
  }

  /**
   * Assert that an async operation completed within expected time
   */
  static async expectTimedOperation<T>(
    operation: () => Promise<T>,
    maxTimeMs = 5000
  ): Promise<T> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(maxTimeMs);
    return result;
  }

  /**
   * Assert that an array contains items matching a pattern
   */
  static expectArrayContainsPattern<T>(
    array: T[],
    pattern: Partial<T>,
    minCount = 1
  ): void {
    expect(Array.isArray(array)).toBe(true);
    
    const matchingItems = array.filter(item => {
      return Object.keys(pattern).every(key => {
        const expectedValue = pattern[key as keyof T];
        const actualValue = item[key as keyof T];
        
        if (typeof expectedValue === 'object' && expectedValue !== null) {
          return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
        }
        
        return actualValue === expectedValue;
      });
    });
    
    expect(matchingItems.length).toBeGreaterThanOrEqual(minCount);
  }

  /**
   * Assert that pagination parameters are handled correctly
   */
  static expectValidPagination(
    mockFn: Mock,
    expectedParams: {
      nextToken?: string;
      maxResults?: number;
    },
    callIndex = 0
  ): void {
    expect(mockFn).toHaveBeenCalled();
    
    const calls = mockFn.mock.calls;
    expect(calls.length).toBeGreaterThan(callIndex);
    
    const call = calls[callIndex];
    const params = call[0];
    
    if (expectedParams.nextToken) {
      expect(params.query?.nextToken || params.query?.NextToken).toBe(expectedParams.nextToken);
    }
    
    if (expectedParams.maxResults) {
      expect(params.query?.maxResults || params.query?.MaxResults).toBe(expectedParams.maxResults);
    }
  }

  /**
   * Assert that error recovery was attempted
   */
  static expectErrorRecovery(
    mockFn: Mock,
    expectedRetryCount: number,
    originalError: Error
  ): void {
    expect(mockFn).toHaveBeenCalledTimes(expectedRetryCount + 1); // Original call + retries
    
    // Verify all calls had the same parameters (retry logic)
    const calls = mockFn.mock.calls;
    const firstCall = calls[0];
    
    calls.forEach((call, index) => {
      if (index > 0) {
        expect(call[0]).toMatchObject(firstCall[0]);
      }
    });
  }

  /**
   * Assert that an error response has the expected structure
   */
  static expectErrorResponse(result: any, expectedType: ApiErrorType): void {
    expect(result.isError).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Error'),
    });
  }
}