/**
 * Tests for the test assertions helpers
 */

import { describe, it, expect, vi } from 'vitest';
import { TestAssertions } from './test-assertions.js';
import { TestDataBuilder } from './test-data-builder.js';
import { AuthErrorType, AmazonRegion } from '../../src/auth/index.js';
import { ApiErrorType } from '../../src/api/index.js';

describe('TestAssertions', () => {
  describe('expectApiCall', () => {
    it('should verify API call parameters', () => {
      const mockFn = vi.fn();
      mockFn({
        method: 'GET',
        path: '/test',
        query: { param1: 'value1' },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(() => {
        TestAssertions.expectApiCall(mockFn, {
          method: 'GET',
          path: '/test',
          query: { param1: 'value1' },
        });
      }).not.toThrow();
    });

    it('should throw when API call parameters do not match', () => {
      const mockFn = vi.fn();
      mockFn({
        method: 'POST',
        path: '/different',
      });

      expect(() => {
        TestAssertions.expectApiCall(mockFn, {
          method: 'GET',
          path: '/test',
        });
      }).toThrow();
    });

    it('should handle multiple calls with call index', () => {
      const mockFn = vi.fn();
      mockFn({ method: 'GET', path: '/first' });
      mockFn({ method: 'POST', path: '/second' });

      expect(() => {
        TestAssertions.expectApiCall(mockFn, { method: 'POST', path: '/second' }, 1);
      }).not.toThrow();
    });
  });

  describe('expectApiCalls', () => {
    it('should verify multiple API calls in sequence', () => {
      const mockFn = vi.fn();
      mockFn({ method: 'GET', path: '/first' });
      mockFn({ method: 'POST', path: '/second' });
      mockFn({ method: 'PUT', path: '/third' });

      expect(() => {
        TestAssertions.expectApiCalls(mockFn, [
          { method: 'GET', path: '/first' },
          { method: 'POST', path: '/second' },
          { method: 'PUT', path: '/third' },
        ]);
      }).not.toThrow();
    });

    it('should throw when call count does not match', () => {
      const mockFn = vi.fn();
      mockFn({ method: 'GET', path: '/test' });

      expect(() => {
        TestAssertions.expectApiCalls(mockFn, [
          { method: 'GET', path: '/test' },
          { method: 'POST', path: '/another' },
        ]);
      }).toThrow();
    });
  });

  describe('expectSuccessResponse', () => {
    it('should verify successful API response structure', () => {
      const testData = { message: 'success' };
      const response = TestDataBuilder.createApiResponse(testData);

      expect(() => {
        TestAssertions.expectSuccessResponse(response, testData);
      }).not.toThrow();
    });

    it('should verify response with custom status code', () => {
      const testData = { created: true };
      const response = TestDataBuilder.createApiResponse(testData, { statusCode: 201 });

      expect(() => {
        TestAssertions.expectSuccessResponse(response, testData, 201);
      }).not.toThrow();
    });

    it('should throw for error status codes', () => {
      const response = TestDataBuilder.createApiResponse({}, { statusCode: 400 });

      expect(() => {
        TestAssertions.expectSuccessResponse(response);
      }).toThrow();
    });
  });

  describe('expectApiError', () => {
    it('should verify API error structure and type', () => {
      const error = TestDataBuilder.createApiError(ApiErrorType.AUTH_ERROR, {
        message: 'Authentication failed',
        statusCode: 401,
      });

      expect(() => {
        TestAssertions.expectApiError(error, ApiErrorType.AUTH_ERROR, 'Authentication failed', 401);
      }).not.toThrow();
    });

    it('should throw when error type does not match', () => {
      const error = TestDataBuilder.createApiError(ApiErrorType.SERVER_ERROR);

      expect(() => {
        TestAssertions.expectApiError(error, ApiErrorType.AUTH_ERROR);
      }).toThrow();
    });
  });

  describe('expectAuthError', () => {
    it('should verify authentication error structure and type', () => {
      const error = TestDataBuilder.createAuthError(AuthErrorType.INVALID_CREDENTIALS, {
        message: 'Invalid credentials',
      });

      expect(() => {
        TestAssertions.expectAuthError(
          error,
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid credentials'
        );
      }).not.toThrow();
    });

    it('should throw when auth error type does not match', () => {
      const error = TestDataBuilder.createAuthError(AuthErrorType.TOKEN_REFRESH_FAILED);

      expect(() => {
        TestAssertions.expectAuthError(error, AuthErrorType.INVALID_CREDENTIALS);
      }).toThrow();
    });
  });

  describe('expectAuthenticatedCall', () => {
    it('should verify call has authentication headers', () => {
      const mockFn = vi.fn();
      mockFn({
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });

      expect(() => {
        TestAssertions.expectAuthenticatedCall(mockFn);
      }).not.toThrow();
    });

    it('should verify AWS signature authentication', () => {
      const mockFn = vi.fn();
      mockFn({
        headers: {
          Authorization: 'AWS4-HMAC-SHA256 Credential=test/test',
        },
      });

      expect(() => {
        TestAssertions.expectAuthenticatedCall(mockFn);
      }).not.toThrow();
    });

    it('should throw when no authorization header present', () => {
      const mockFn = vi.fn();
      mockFn({
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(() => {
        TestAssertions.expectAuthenticatedCall(mockFn);
      }).toThrow();
    });
  });

  describe('expectValidCatalogItem', () => {
    it('should verify catalog item structure', () => {
      const item = TestDataBuilder.createCatalogItem();

      expect(() => {
        TestAssertions.expectValidCatalogItem(item);
      }).not.toThrow();
    });

    it('should verify specific ASIN when provided', () => {
      const expectedAsin = 'B08TEST123';
      const item = TestDataBuilder.createCatalogItem({ asin: expectedAsin });

      expect(() => {
        TestAssertions.expectValidCatalogItem(item, expectedAsin);
      }).not.toThrow();
    });

    it('should throw for invalid ASIN format', () => {
      const item = TestDataBuilder.createCatalogItem({ asin: 'INVALID' });

      expect(() => {
        TestAssertions.expectValidCatalogItem(item);
      }).toThrow();
    });
  });

  describe('expectValidOrder', () => {
    it('should verify order structure', () => {
      const order = TestDataBuilder.createOrder();

      expect(() => {
        TestAssertions.expectValidOrder(order);
      }).not.toThrow();
    });

    it('should verify specific order ID when provided', () => {
      const expectedOrderId = 'TEST-ORDER-123';
      const order = TestDataBuilder.createOrder({ AmazonOrderId: expectedOrderId });

      expect(() => {
        TestAssertions.expectValidOrder(order, expectedOrderId);
      }).not.toThrow();
    });
  });

  describe('expectValidInventorySummary', () => {
    it('should verify inventory summary structure', () => {
      const summary = TestDataBuilder.createInventorySummary();

      expect(() => {
        TestAssertions.expectValidInventorySummary(summary);
      }).not.toThrow();
    });

    it('should verify specific SKU when provided', () => {
      const expectedSku = 'TEST-SKU-123';
      const summary = TestDataBuilder.createInventorySummary({ sellerSku: expectedSku });

      expect(() => {
        TestAssertions.expectValidInventorySummary(summary, expectedSku);
      }).not.toThrow();
    });
  });

  describe('expectValidListing', () => {
    it('should verify listing structure', () => {
      const listing = TestDataBuilder.createListing();

      expect(() => {
        TestAssertions.expectValidListing(listing);
      }).not.toThrow();
    });

    it('should verify specific SKU when provided', () => {
      const expectedSku = 'TEST-SKU-123';
      const listing = TestDataBuilder.createListing({ sku: expectedSku });

      expect(() => {
        TestAssertions.expectValidListing(listing, expectedSku);
      }).not.toThrow();
    });
  });

  describe('expectValidRegionConfig', () => {
    it('should verify region configuration', () => {
      const config = {
        region: AmazonRegion.NA,
        marketplaceId: 'ATVPDKIKX0DER',
      };

      expect(() => {
        TestAssertions.expectValidRegionConfig(config);
      }).not.toThrow();
    });

    it('should verify specific region when provided', () => {
      const config = {
        region: AmazonRegion.EU,
        marketplaceId: 'A2EUQ1WTGCTBG2',
      };

      expect(() => {
        TestAssertions.expectValidRegionConfig(config, AmazonRegion.EU);
      }).not.toThrow();
    });

    it('should throw for invalid marketplace ID format', () => {
      const config = {
        region: AmazonRegion.NA,
        marketplaceId: 'INVALID',
      };

      expect(() => {
        TestAssertions.expectValidRegionConfig(config);
      }).toThrow();
    });
  });

  describe('expectValidCredentials', () => {
    it('should verify credentials structure', () => {
      const credentials = TestDataBuilder.createCredentials();

      expect(() => {
        TestAssertions.expectValidCredentials(credentials);
      }).not.toThrow();
    });

    it('should throw for invalid client ID format', () => {
      const credentials = TestDataBuilder.createCredentials({
        clientId: 'invalid-client-id',
      });

      expect(() => {
        TestAssertions.expectValidCredentials(credentials);
      }).toThrow();
    });

    it('should throw for invalid refresh token format', () => {
      const credentials = TestDataBuilder.createCredentials({
        refreshToken: 'invalid-refresh-token',
      });

      expect(() => {
        TestAssertions.expectValidCredentials(credentials);
      }).toThrow();
    });
  });

  describe('expectMockReset', () => {
    it('should verify mock was reset', () => {
      const mockFn = vi.fn();

      expect(() => {
        TestAssertions.expectMockReset(mockFn);
      }).not.toThrow();
    });

    it('should throw when mock has calls', () => {
      const mockFn = vi.fn();
      mockFn('test');

      expect(() => {
        TestAssertions.expectMockReset(mockFn);
      }).toThrow();
    });
  });

  describe('expectTimedOperation', () => {
    it('should verify operation completes within time limit', async () => {
      const fastOperation = () => Promise.resolve('result');

      const result = await TestAssertions.expectTimedOperation(fastOperation, 1000);
      expect(result).toBe('result');
    });

    it('should throw when operation takes too long', async () => {
      const slowOperation = () =>
        new Promise((resolve) => setTimeout(() => resolve('result'), 100));

      await expect(TestAssertions.expectTimedOperation(slowOperation, 50)).rejects.toThrow();
    });
  });

  describe('expectArrayContainsPattern', () => {
    it('should verify array contains items matching pattern', () => {
      const array = [
        { id: 1, name: 'test1', type: 'A' },
        { id: 2, name: 'test2', type: 'B' },
        { id: 3, name: 'test3', type: 'A' },
      ];

      expect(() => {
        TestAssertions.expectArrayContainsPattern(array, { type: 'A' }, 2);
      }).not.toThrow();
    });

    it('should throw when not enough items match pattern', () => {
      const array = [
        { id: 1, name: 'test1', type: 'A' },
        { id: 2, name: 'test2', type: 'B' },
      ];

      expect(() => {
        TestAssertions.expectArrayContainsPattern(array, { type: 'A' }, 2);
      }).toThrow();
    });
  });

  describe('expectValidPagination', () => {
    it('should verify pagination parameters', () => {
      const mockFn = vi.fn();
      mockFn({
        query: {
          nextToken: 'token123',
          maxResults: 50,
        },
      });

      expect(() => {
        TestAssertions.expectValidPagination(mockFn, {
          nextToken: 'token123',
          maxResults: 50,
        });
      }).not.toThrow();
    });

    it('should handle different parameter naming conventions', () => {
      const mockFn = vi.fn();
      mockFn({
        query: {
          NextToken: 'token123',
          MaxResults: 50,
        },
      });

      expect(() => {
        TestAssertions.expectValidPagination(mockFn, {
          nextToken: 'token123',
          maxResults: 50,
        });
      }).not.toThrow();
    });
  });

  describe('expectErrorRecovery', () => {
    it('should verify retry attempts were made', () => {
      const mockFn = vi.fn();
      const originalError = new Error('Network error');

      // Simulate original call + 2 retries
      mockFn({ method: 'GET', path: '/test' });
      mockFn({ method: 'GET', path: '/test' });
      mockFn({ method: 'GET', path: '/test' });

      expect(() => {
        TestAssertions.expectErrorRecovery(mockFn, 2, originalError);
      }).not.toThrow();
    });

    it('should throw when retry count does not match', () => {
      const mockFn = vi.fn();
      const originalError = new Error('Network error');

      mockFn({ method: 'GET', path: '/test' });

      expect(() => {
        TestAssertions.expectErrorRecovery(mockFn, 2, originalError);
      }).toThrow();
    });
  });
});
