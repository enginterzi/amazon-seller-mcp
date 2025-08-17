/**
 * Tests for the Catalog API client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogClient } from '../../../src/api/catalog-client.js';
import {
  BaseApiClientMockFactory,
  type MockBaseApiClient,
} from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

// Type for accessing private methods in tests
type CatalogClientWithPrivates = CatalogClient & {
  request: MockBaseApiClient['request'];
  withCache: <T>(key: string, fn: () => Promise<T>, ttl?: number) => Promise<T>;
  clearCache: (key?: string) => void;
};

describe('CatalogClient', () => {
  let catalogClient: CatalogClient;
  let mockFactory: BaseApiClientMockFactory;
  let mockBaseClient: MockBaseApiClient;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();

    mockFactory = new BaseApiClientMockFactory();
    mockBaseClient = mockFactory.create();

    // Create the client and replace the request method with our mock
    catalogClient = new CatalogClient(authConfig);
    (catalogClient as CatalogClientWithPrivates).request = mockBaseClient.request;
    (catalogClient as CatalogClientWithPrivates).clearCache = mockBaseClient.clearCache;
  });

  it('should retrieve catalog item by ASIN successfully', async () => {
    const expectedItem = TestDataBuilder.createCatalogItem({
      asin: 'B01EXAMPLE',
      attributes: { item_name: ['Example Product'] },
    });

    // Mock the request method to return the proper API response structure
    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedItem,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await catalogClient.getCatalogItem({ asin: 'B01EXAMPLE' });

    TestAssertions.expectValidCatalogItem(result, 'B01EXAMPLE');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/catalog/2022-04-01/items/B01EXAMPLE'),
      query: expect.objectContaining({
        marketplaceIds: 'ATVPDKIKX0DER',
      }),
    });
  });

  it('should retrieve catalog item with included data successfully', async () => {
    const expectedItem = TestDataBuilder.createCatalogItem({
      asin: 'B01EXAMPLE',
      attributes: { item_name: ['Example Product'] },
      identifiers: { gtin: ['1234567890123'] },
    });

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedItem,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await catalogClient.getCatalogItem({
      asin: 'B01EXAMPLE',
      includedData: ['attributes', 'identifiers'],
      locale: 'en_US',
    });

    expect(result.asin).toBe('B01EXAMPLE');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/catalog/2022-04-01/items/B01EXAMPLE'),
      query: expect.objectContaining({
        marketplaceIds: 'ATVPDKIKX0DER',
        includedData: ['attributes', 'identifiers'],
        locale: 'en_US',
      }),
    });
  });

  it('should search catalog items by keywords successfully', async () => {
    const expectedResults = {
      numberOfResults: 2,
      items: [
        TestDataBuilder.createCatalogItem({ asin: 'B01EXAMPLE1' }),
        TestDataBuilder.createCatalogItem({ asin: 'B01EXAMPLE2' }),
      ],
      pagination: { nextToken: null },
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedResults,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await catalogClient.searchCatalogItems({ keywords: 'example' });

    expect(result.items).toHaveLength(2);
    expect(result.numberOfResults).toBe(2);
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/catalog/2022-04-01/items'),
      query: expect.objectContaining({
        keywords: 'example',
        marketplaceIds: 'ATVPDKIKX0DER',
      }),
    });
  });

  it('should search catalog items with all parameters', async () => {
    const expectedResults = {
      numberOfResults: 1,
      items: [TestDataBuilder.createCatalogItem({ asin: 'B01EXAMPLE' })],
      pagination: { nextToken: 'next-token' },
      refinements: {
        brands: [{ name: 'TestBrand', numberOfResults: 1 }],
        classifications: [{ id: 'test-class', name: 'Test Classification', numberOfResults: 1 }],
      },
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedResults,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await catalogClient.searchCatalogItems({
      keywords: 'example',
      brandNames: ['TestBrand'],
      classificationIds: ['test-class'],
      pageSize: 10,
      pageToken: 'page-token',
      includedData: ['attributes', 'summaries'],
      locale: 'en_US',
    });

    expect(result.items).toHaveLength(1);
    expect(result.refinements?.brands).toHaveLength(1);
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/catalog/2022-04-01/items'),
      query: expect.objectContaining({
        keywords: 'example',
        brandNames: ['TestBrand'],
        classificationIds: ['test-class'],
        pageSize: 10,
        pageToken: 'page-token',
        includedData: ['attributes', 'summaries'],
        locale: 'en_US',
        marketplaceIds: 'ATVPDKIKX0DER',
      }),
    });
  });

  it('should enforce pageSize limits in search', async () => {
    const expectedResults = {
      numberOfResults: 0,
      items: [],
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedResults,
      },
      statusCode: 200,
      headers: {},
    });

    // Test pageSize too large (should be capped at 20)
    await catalogClient.searchCatalogItems({
      keywords: 'example-large',
      pageSize: 50,
    });

    // Get the first call (pageSize 50 -> 20)
    const firstCall = mockBaseClient.request.mock.calls[0];
    expect(firstCall[0].query.pageSize).toBe(20);

    // Test pageSize 0 (should be omitted from query since it's falsy)
    await catalogClient.searchCatalogItems({
      keywords: 'example-small',
      pageSize: 0,
    });

    // Get the second call (pageSize 0 -> undefined/omitted)
    const secondCall = mockBaseClient.request.mock.calls[1];
    expect(secondCall[0].query.pageSize).toBeUndefined();

    // Test pageSize negative (should be set to 1)
    await catalogClient.searchCatalogItems({
      keywords: 'example-negative',
      pageSize: -5,
    });

    // Get the third call (pageSize -5 -> 1)
    const thirdCall = mockBaseClient.request.mock.calls[2];
    expect(thirdCall[0].query.pageSize).toBe(1);
  });

  it('should handle catalog item not found error', async () => {
    const notFoundError = TestDataBuilder.createApiError('NOT_FOUND', {
      message: 'Catalog item not found',
      statusCode: 404,
    });

    mockBaseClient.request.mockRejectedValue(notFoundError);

    await expect(catalogClient.getCatalogItem({ asin: 'B01INVALID' })).rejects.toThrow(
      'Catalog item not found'
    );

    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/catalog/2022-04-01/items/B01INVALID'),
    });
  });

  it('should handle search with pagination', async () => {
    const firstPageResults = {
      numberOfResults: 2,
      items: [TestDataBuilder.createCatalogItem()],
      pagination: { nextToken: 'next-page-token' },
    };
    const secondPageResults = {
      numberOfResults: 2,
      items: [TestDataBuilder.createCatalogItem({ asin: 'B01PAGE2' })],
      pagination: { nextToken: null },
    };

    mockBaseClient.request
      .mockResolvedValueOnce({
        data: { payload: firstPageResults },
        statusCode: 200,
        headers: {},
      })
      .mockResolvedValueOnce({
        data: { payload: secondPageResults },
        statusCode: 200,
        headers: {},
      });

    const firstResult = await catalogClient.searchCatalogItems({
      keywords: 'example',
      pageSize: 1,
    });

    expect(firstResult.pagination?.nextToken).toBe('next-page-token');

    const secondResult = await catalogClient.searchCatalogItems({
      keywords: 'example',
      pageToken: 'next-page-token',
    });

    expect(secondResult.items).toHaveLength(1);
    expect(mockBaseClient.request).toHaveBeenCalledTimes(2);
  });

  it('should handle rate limiting errors', async () => {
    const rateLimitError = TestDataBuilder.createApiError('RATE_LIMIT_EXCEEDED', {
      message: 'Rate limit exceeded',
      statusCode: 429,
    });

    // Mock withCache to reject with the error
    const withCacheSpy = vi.fn().mockRejectedValue(rateLimitError);
    (catalogClient as CatalogClientWithPrivates).withCache = withCacheSpy;

    await expect(catalogClient.getCatalogItem({ asin: 'B01EXAMPLE' })).rejects.toThrow(
      'Rate limit exceeded'
    );

    expect(withCacheSpy).toHaveBeenCalled();
  });

  it('should use cache for catalog items', async () => {
    const expectedItem = TestDataBuilder.createCatalogItem({
      asin: 'B01EXAMPLE',
    });

    // Mock withCache to verify it's called
    const withCacheSpy = vi.fn().mockResolvedValue(expectedItem);
    (catalogClient as CatalogClientWithPrivates).withCache = withCacheSpy;

    const result = await catalogClient.getCatalogItem({ asin: 'B01EXAMPLE' });

    expect(result).toEqual(expectedItem);
    expect(withCacheSpy).toHaveBeenCalledWith(
      expect.stringContaining('catalog:item:B01EXAMPLE'),
      expect.any(Function),
      300 // 5 minutes TTL
    );
  });

  it('should not cache search results', async () => {
    const expectedResults = {
      numberOfResults: 1,
      items: [TestDataBuilder.createCatalogItem()],
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedResults,
      },
      statusCode: 200,
      headers: {},
    });

    // Mock withCache to verify it's NOT called for search
    const withCacheSpy = vi.fn();
    (catalogClient as CatalogClientWithPrivates).withCache = withCacheSpy;

    await catalogClient.searchCatalogItems({ keywords: 'example' });

    expect(withCacheSpy).not.toHaveBeenCalled();
    expect(mockBaseClient.request).toHaveBeenCalledTimes(1);
  });
});
