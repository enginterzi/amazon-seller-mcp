/**
 * Tests for catalog tools - behavior-focused testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerCatalogTools } from '../../../src/tools/catalog-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  CatalogClientMockFactory,
  type MockCatalogClient,
} from '../../utils/mock-factories/api-client-factory.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { TestSetup } from '../../utils/test-setup.js';
import { AmazonRegion } from '../../../src/auth/index.js';
import type { AuthConfig } from '../../../src/types/auth.js';

// Mock the catalog client
vi.mock('../../../src/api/catalog-client.js');

describe('Catalog Tools', () => {
  let toolManager: ToolRegistrationManager;
  let catalogMockFactory: CatalogClientMockFactory;
  let mockCatalogClient: MockCatalogClient;
  let testConfig: AuthConfig;

  beforeEach(async () => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup test environment
    const { mockEnv } = TestSetup.setupTestEnvironment();

    // Create mock factory
    catalogMockFactory = new CatalogClientMockFactory();
    mockCatalogClient = catalogMockFactory.create();

    // Create tool manager with proper MCP server mock
    toolManager = new ToolRegistrationManager(mockEnv.server.mcpServer);
    vi.spyOn(toolManager, 'registerTool');

    // Mock the CatalogClient constructor
    const { CatalogClient } = await import('../../../src/api/catalog-client.js');
    vi.mocked(CatalogClient).mockImplementation(() => mockCatalogClient as any);

    // Create test configuration
    testConfig = {
      credentials: TestDataBuilder.createCredentials(),
      region: AmazonRegion.NA,
      marketplaceId: 'ATVPDKIKX0DER',
    };
  });

  afterEach(() => {
    catalogMockFactory.reset();
    vi.resetAllMocks();
  });

  it('should register catalog search and item retrieval tools', () => {
    // Act
    registerCatalogTools(toolManager, testConfig);

    // Assert
    expect(toolManager.registerTool).toHaveBeenCalledTimes(2);
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'search-catalog',
      expect.objectContaining({
        title: 'Search Amazon Catalog',
        description: 'Search for products in the Amazon catalog',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'get-catalog-item',
      expect.objectContaining({
        title: 'Get Amazon Catalog Item',
        description: 'Retrieve detailed information about a product in the Amazon catalog',
      }),
      expect.any(Function)
    );
  });

  it('should return formatted search results when searching catalog with keywords', async () => {
    // Arrange
    registerCatalogTools(toolManager, testConfig);

    const searchResults = {
      numberOfResults: 2,
      pagination: { nextToken: 'next-page-token' },
      refinements: {
        brands: [
          { name: 'Brand A', numberOfResults: 1 },
          { name: 'Brand B', numberOfResults: 1 },
        ],
      },
      items: [
        {
          asin: 'B00TEST123',
          summaries: [
            {
              marketplaceId: 'ATVPDKIKX0DER',
              itemName: 'Test Product 1',
              brandName: 'Brand A',
            },
          ],
        },
        {
          asin: 'B00TEST456',
          summaries: [
            {
              marketplaceId: 'ATVPDKIKX0DER',
              itemName: 'Test Product 2',
              brandName: 'Brand B',
            },
          ],
        },
      ],
    };

    catalogMockFactory.mockSearchCatalogItems(mockCatalogClient, searchResults.items);
    mockCatalogClient.searchCatalogItems.mockResolvedValue(searchResults);

    // Act
    const searchToolHandler = (toolManager.registerTool as any).mock.calls[0][2];
    const result = await searchToolHandler({ keywords: 'test product' });

    // Assert
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Found 2 products matching "test product"');
    expect(result.content[0].text).toContain('Next page token: next-page-token');
    expect(result.content[0].text).toContain('Brand A (1 products)');
    expect(result.content[0].text).toContain('ASIN: B00TEST123');
    expect(result.content[0].text).toContain('Title: Test Product 1');
    expect(mockCatalogClient.searchCatalogItems).toHaveBeenCalledWith({
      keywords: 'test product',
      brandNames: undefined,
      pageSize: undefined,
      pageToken: undefined,
      includedData: undefined,
      locale: undefined,
    });
  });

  it('should return detailed product information when retrieving catalog item by ASIN', async () => {
    // Arrange
    registerCatalogTools(toolManager, testConfig);

    const catalogItem = {
      asin: 'B00TEST123',
      summaries: [
        {
          marketplaceId: 'ATVPDKIKX0DER',
          itemName: 'Test Product',
          brandName: 'Test Brand',
          manufacturer: 'Test Manufacturer',
          modelNumber: 'TEST-123',
          colorName: 'Black',
        },
      ],
      productTypes: { ATVPDKIKX0DER: 'ELECTRONICS' },
      salesRanks: {
        Electronics: [
          {
            title: 'Electronics',
            link: 'https://www.amazon.com/gp/bestsellers/electronics',
            rank: 100,
          },
        ],
      },
      images: {
        ATVPDKIKX0DER: [
          {
            link: 'https://images-na.ssl-images-amazon.com/images/I/test.jpg',
            height: 500,
            width: 500,
          },
        ],
      },
    };

    catalogMockFactory.mockGetCatalogItem(mockCatalogClient, 'B00TEST123', catalogItem);

    // Act
    const getItemToolHandler = (toolManager.registerTool as any).mock.calls[1][2];
    const result = await getItemToolHandler({ asin: 'B00TEST123' });

    // Assert
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Catalog Item: B00TEST123');
    expect(result.content[0].text).toContain('Title: Test Product');
    expect(result.content[0].text).toContain('Brand: Test Brand');
    expect(result.content[0].text).toContain('Manufacturer: Test Manufacturer');
    expect(result.content[0].text).toContain('Model: TEST-123');
    expect(result.content[0].text).toContain('Color: Black');
    expect(result.content[0].text).toContain('ATVPDKIKX0DER: ELECTRONICS');
    expect(result.content[0].text).toContain('#100 in Electronics');
    expect(mockCatalogClient.getCatalogItem).toHaveBeenCalledWith({
      asin: 'B00TEST123',
      includedData: undefined,
      locale: undefined,
    });
  });

  it('should handle catalog search errors gracefully', async () => {
    // Arrange
    registerCatalogTools(toolManager, testConfig);
    mockCatalogClient.searchCatalogItems.mockRejectedValue(new Error('API error'));

    // Act
    const searchToolHandler = (toolManager.registerTool as any).mock.calls[0][2];
    const result = await searchToolHandler({ keywords: 'test product' });

    // Assert
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error searching catalog: API error');
  });

  it('should handle catalog item retrieval errors gracefully', async () => {
    // Arrange
    registerCatalogTools(toolManager, testConfig);
    mockCatalogClient.getCatalogItem.mockRejectedValue(new Error('API error'));

    // Act
    const getItemToolHandler = (toolManager.registerTool as any).mock.calls[1][2];
    const result = await getItemToolHandler({ asin: 'B00TEST123' });

    // Assert
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error retrieving catalog item: API error');
  });
});
