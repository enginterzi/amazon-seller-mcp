/**
 * Tests for catalog tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCatalogTools } from '../../../src/tools/catalog-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { CatalogClient } from '../../../src/api/catalog-client.js';

// Mock the catalog client
vi.mock('../../../src/api/catalog-client.js', () => {
  return {
    CatalogClient: vi.fn().mockImplementation(() => ({
      searchCatalogItems: vi.fn(),
      getCatalogItem: vi.fn(),
    })),
  };
});

describe('Catalog Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockCatalogClient: any;

  beforeEach(() => {
    // Create a mock MCP server
    const mockServer = {
      registerTool: vi.fn(),
    };

    // Create a new tool manager
    toolManager = new ToolRegistrationManager(mockServer as any);

    // Create a spy for the tool registration
    vi.spyOn(toolManager, 'registerTool');

    // Reset the mock catalog client
    mockCatalogClient = {
      searchCatalogItems: vi.fn(),
      getCatalogItem: vi.fn(),
    };

    // Reset the CatalogClient mock
    (CatalogClient as any).mockImplementation(() => mockCatalogClient);

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should register catalog tools', () => {
    // Register catalog tools
    registerCatalogTools(toolManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Verify that the tools were registered
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

  it('should handle search catalog tool execution', async () => {
    // Register catalog tools
    registerCatalogTools(toolManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Mock the search catalog response
    mockCatalogClient.searchCatalogItems.mockResolvedValue({
      numberOfResults: 2,
      pagination: {
        nextToken: 'next-page-token',
      },
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
    });

    // Get the search catalog tool handler
    const searchToolHandler = (toolManager.registerTool as any).mock.calls[0][2];

    // Execute the tool
    const result = await searchToolHandler({
      keywords: 'test product',
    });

    // Verify the result
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Found 2 products matching "test product"');
    expect(result.content[0].text).toContain('Next page token: next-page-token');
    expect(result.content[0].text).toContain('Brand A (1 products)');
    expect(result.content[0].text).toContain('Brand B (1 products)');
    expect(result.content[0].text).toContain('ASIN: B00TEST123');
    expect(result.content[0].text).toContain('Title: Test Product 1');
    expect(result.content[0].text).toContain('Brand: Brand A');
    expect(result.content[0].text).toContain('ASIN: B00TEST456');
    expect(result.content[0].text).toContain('Title: Test Product 2');
    expect(result.content[0].text).toContain('Brand: Brand B');

    // Verify that the catalog client was called with the correct parameters
    expect(mockCatalogClient.searchCatalogItems).toHaveBeenCalledWith({
      keywords: 'test product',
      brandNames: undefined,
      pageSize: undefined,
      pageToken: undefined,
      includedData: undefined,
      locale: undefined,
    });
  });

  it('should handle get catalog item tool execution', async () => {
    // Register catalog tools
    registerCatalogTools(toolManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Mock the get catalog item response
    mockCatalogClient.getCatalogItem.mockResolvedValue({
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
      productTypes: {
        ATVPDKIKX0DER: 'ELECTRONICS',
      },
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
    });

    // Get the get catalog item tool handler
    const getItemToolHandler = (toolManager.registerTool as any).mock.calls[1][2];

    // Execute the tool
    const result = await getItemToolHandler({
      asin: 'B00TEST123',
    });

    // Verify the result
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Catalog Item: B00TEST123');
    expect(result.content[0].text).toContain('Title: Test Product');
    expect(result.content[0].text).toContain('Brand: Test Brand');
    expect(result.content[0].text).toContain('Manufacturer: Test Manufacturer');
    expect(result.content[0].text).toContain('Model: TEST-123');
    expect(result.content[0].text).toContain('Color: Black');
    expect(result.content[0].text).toContain('Product Types:');
    expect(result.content[0].text).toContain('ATVPDKIKX0DER: ELECTRONICS');
    expect(result.content[0].text).toContain('Sales Ranks:');
    expect(result.content[0].text).toContain('#100 in Electronics');
    expect(result.content[0].text).toContain('Images:');
    expect(result.content[0].text).toContain('500x500');
    expect(result.content[0].text).toContain(
      'https://images-na.ssl-images-amazon.com/images/I/test.jpg'
    );

    // Verify that the catalog client was called with the correct parameters
    expect(mockCatalogClient.getCatalogItem).toHaveBeenCalledWith({
      asin: 'B00TEST123',
      includedData: undefined,
      locale: undefined,
    });
  });

  it('should handle search catalog tool errors', async () => {
    // Register catalog tools
    registerCatalogTools(toolManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Mock the search catalog error
    mockCatalogClient.searchCatalogItems.mockRejectedValue(new Error('API error'));

    // Get the search catalog tool handler
    const searchToolHandler = (toolManager.registerTool as any).mock.calls[0][2];

    // Execute the tool
    const result = await searchToolHandler({
      keywords: 'test product',
    });

    // Verify the result
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error searching catalog: API error');
  });

  it('should handle get catalog item tool errors', async () => {
    // Register catalog tools
    registerCatalogTools(toolManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Mock the get catalog item error
    mockCatalogClient.getCatalogItem.mockRejectedValue(new Error('API error'));

    // Get the get catalog item tool handler
    const getItemToolHandler = (toolManager.registerTool as any).mock.calls[1][2];

    // Execute the tool
    const result = await getItemToolHandler({
      asin: 'B00TEST123',
    });

    // Verify the result
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error retrieving catalog item: API error');
  });
});
