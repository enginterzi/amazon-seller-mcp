/**
 * Tests for the Catalog API client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogClient } from '../../../src/api/catalog-client.js';
import { CatalogClientMockFactory } from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('CatalogClient', () => {
  let catalogClient: CatalogClient;
  let mockFactory: CatalogClientMockFactory;
  let mockClient: any;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();
    
    mockFactory = new CatalogClientMockFactory();
    mockClient = mockFactory.create();
    
    // Create the client and replace its methods with mocks
    catalogClient = new CatalogClient(authConfig);
    catalogClient.getCatalogItem = mockClient.getCatalogItem;
    catalogClient.searchCatalogItems = mockClient.searchCatalogItems;
  });

  it('should retrieve catalog item by ASIN successfully', async () => {
    const expectedItem = TestDataBuilder.createCatalogItem({
      asin: 'B01EXAMPLE',
      attributes: { item_name: ['Example Product'] },
    });

    mockClient.getCatalogItem.mockResolvedValue(expectedItem);

    const result = await catalogClient.getCatalogItem({ asin: 'B01EXAMPLE' });

    TestAssertions.expectValidCatalogItem(result, 'B01EXAMPLE');
    expect(mockClient.getCatalogItem).toHaveBeenCalledWith({ asin: 'B01EXAMPLE' });
  });

  it('should search catalog items by keywords successfully', async () => {
    const expectedResults = {
      items: [
        TestDataBuilder.createCatalogItem({ asin: 'B01EXAMPLE1' }),
        TestDataBuilder.createCatalogItem({ asin: 'B01EXAMPLE2' }),
      ],
      pagination: { nextToken: null },
    };

    mockClient.searchCatalogItems.mockResolvedValue(expectedResults);

    const result = await catalogClient.searchCatalogItems({ keywords: 'example' });

    expect(result.items).toHaveLength(2);
    expect(mockClient.searchCatalogItems).toHaveBeenCalledWith({ keywords: 'example' });
  });

  it('should handle catalog item not found error', async () => {
    const notFoundError = TestDataBuilder.createApiError('NOT_FOUND', {
      message: 'Catalog item not found',
      statusCode: 404,
    });

    mockClient.getCatalogItem.mockRejectedValue(notFoundError);

    await expect(catalogClient.getCatalogItem({ asin: 'B01INVALID' }))
      .rejects.toThrow('Catalog item not found');

    expect(mockClient.getCatalogItem).toHaveBeenCalledWith({ asin: 'B01INVALID' });
  });

  it('should handle search with pagination', async () => {
    const firstPageResults = {
      items: [TestDataBuilder.createCatalogItem()],
      pagination: { nextToken: 'next-page-token' },
    };
    const secondPageResults = {
      items: [TestDataBuilder.createCatalogItem({ asin: 'B01PAGE2' })],
      pagination: { nextToken: null },
    };

    mockClient.searchCatalogItems
      .mockResolvedValueOnce(firstPageResults)
      .mockResolvedValueOnce(secondPageResults);

    const firstResult = await catalogClient.searchCatalogItems({ 
      keywords: 'example',
      pageSize: 1 
    });

    expect(firstResult.pagination.nextToken).toBe('next-page-token');
    
    const secondResult = await catalogClient.searchCatalogItems({ 
      keywords: 'example',
      nextToken: 'next-page-token' 
    });

    expect(secondResult.items).toHaveLength(1);
    expect(mockClient.searchCatalogItems).toHaveBeenCalledTimes(2);
  });

  it('should handle rate limiting errors', async () => {
    const rateLimitError = TestDataBuilder.createApiError('RATE_LIMIT_EXCEEDED', {
      message: 'Rate limit exceeded',
      statusCode: 429,
    });

    mockClient.getCatalogItem.mockRejectedValue(rateLimitError);

    await expect(catalogClient.getCatalogItem({ asin: 'B01EXAMPLE' }))
      .rejects.toThrow('Rate limit exceeded');

    expect(mockClient.getCatalogItem).toHaveBeenCalledWith({ asin: 'B01EXAMPLE' });
  });
});
