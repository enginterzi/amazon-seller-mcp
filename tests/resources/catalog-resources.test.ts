/**
 * Tests for catalog resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerCatalogResources } from '../../src/resources/catalog/catalog-resources.js';
import { CatalogClient } from '../../src/api/catalog-client.js';
import type { AuthConfig } from '../../src/types/auth.js';

// Mock the CatalogClient
vi.mock('../../src/api/catalog-client.js');
vi.mock('../../src/utils/logger.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    error: vi.fn(),
    info: vi.fn(),
    getLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  };
});

describe('Catalog Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: AuthConfig;
  let mockCatalogClient: {
    getCatalogItem: ReturnType<typeof vi.fn>;
    searchCatalogItems: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock server and resource manager
    const mockServer = {
      registerResource: vi.fn(),
    } as Pick<McpServer, 'registerResource'>;
    resourceManager = new ResourceRegistrationManager(mockServer);

    // Spy on resource manager methods
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');

    // Create test auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: 'NA',
      marketplaceId: 'ATVPDKIKX0DER',
    };

    // Mock CatalogClient methods
    mockCatalogClient = {
      getCatalogItem: vi.fn(),
      searchCatalogItems: vi.fn(),
    };

    vi.mocked(CatalogClient).mockImplementation(() => mockCatalogClient as unknown as CatalogClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register catalog resources with correct configuration', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-catalog',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Catalog Item',
        description: expect.any(String),
      }),
      expect.any(Function)
    );

    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-catalog-search',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Catalog Search',
        description: expect.any(String),
      }),
      expect.any(Function)
    );
  });

  it('should create resource templates with proper URI patterns', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog://{asin}',
      'amazon-catalog://',
      expect.objectContaining({
        asin: expect.any(Function),
      })
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog-search://{query}',
      'amazon-catalog-search://'
    );
  });

  describe('ASIN completion function', () => {
    let asinCompletionFn: (value: string) => Promise<string[]>;

    beforeEach(() => {
      registerCatalogResources(resourceManager, authConfig);
      const createTemplateCall = vi.mocked(resourceManager.createResourceTemplate).mock.calls[0];
      asinCompletionFn = createTemplateCall[2]?.asin as (value: string) => Promise<string[]>;
    });

    it('should return empty array for short values', async () => {
      const result = await asinCompletionFn('a');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty values', async () => {
      const result = await asinCompletionFn('');
      expect(result).toEqual([]);
    });

    it('should return ASINs from search results', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        items: [
          { asin: 'B001' },
          { asin: 'B002' },
        ],
      });

      const result = await asinCompletionFn('test');
      expect(result).toEqual(['B001', 'B002']);
      expect(mockCatalogClient.searchCatalogItems).toHaveBeenCalledWith({
        keywords: 'test',
        pageSize: 10,
        includedData: ['identifiers', 'summaries'],
      });
    });

    it('should handle search errors gracefully', async () => {
      mockCatalogClient.searchCatalogItems.mockRejectedValue(new Error('Search failed'));

      const result = await asinCompletionFn('test');
      expect(result).toEqual([]);
    });
  });

  describe('catalog item resource handler', () => {
    let catalogHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;

    beforeEach(() => {
      registerCatalogResources(resourceManager, authConfig);
      const registerCall = vi.mocked(resourceManager.registerResource).mock.calls[0];
      catalogHandler = registerCall[3] as (uri: URL, params: Record<string, string>) => Promise<unknown>;
    });

    it('should throw error when ASIN is missing', async () => {
      const uri = new URL('amazon-catalog://');
      const params = {};

      const result = await catalogHandler(uri, params);
      expect(result).toEqual({
        contents: [{
          uri: 'amazon-catalog://',
          text: '# Error\n\nFailed to retrieve catalog item: ASIN is required',
          mimeType: 'text/markdown',
        }],
      });
    });

    it('should handle catalog item with minimal data', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      expect(result).toEqual({
        contents: [{
          uri: 'amazon-catalog://B001',
          text: expect.stringContaining('# Amazon Catalog Item: B001'),
          mimeType: 'text/markdown',
        }],
      });
    });

    it('should handle catalog item with complete summary data', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        summaries: [{
          itemName: 'Test Product',
          brandName: 'Test Brand',
          manufacturer: 'Test Manufacturer',
          modelNumber: 'TM001',
          colorName: 'Red',
        }],
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('**Title:** Test Product');
      expect(content).toContain('**Brand:** Test Brand');
      expect(content).toContain('**Manufacturer:** Test Manufacturer');
      expect(content).toContain('**Model:** TM001');
      expect(content).toContain('**Color:** Red');
    });

    it('should handle catalog item with product types', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        productTypes: {
          'ATVPDKIKX0DER': 'PRODUCT',
        },
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Product Types');
      expect(content).toContain('- **ATVPDKIKX0DER:** PRODUCT');
    });

    it('should handle catalog item with identifiers', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        identifiers: {
          'ATVPDKIKX0DER': [{
            marketplaceId: 'ATVPDKIKX0DER',
            asin: 'B001',
            upc: '123456789',
          }],
        },
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Identifiers');
      expect(content).toContain('### ATVPDKIKX0DER');
      expect(content).toContain('- **asin:** B001');
      expect(content).toContain('- **upc:** 123456789');
      expect(content).not.toContain('- **marketplaceId:**');
    });

    it('should handle catalog item with sales ranks', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        salesRanks: {
          'ATVPDKIKX0DER': [{
            rank: 100,
            title: 'Electronics',
          }],
        },
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Sales Ranks');
      expect(content).toContain('- **#100** in Electronics');
    });

    it('should handle catalog item with images', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        images: {
          'ATVPDKIKX0DER': [{
            link: 'https://example.com/image.jpg',
            width: 500,
            height: 500,
          }],
        },
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Images');
      expect(content).toContain('- [Image 1](https://example.com/image.jpg) (500x500)');
    });

    it('should handle catalog item with relationships', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        relationships: {
          'ATVPDKIKX0DER': [{
            type: 'VARIATION',
            identifiers: [{
              identifier: 'B002',
            }],
          }],
        },
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Related Products');
      expect(content).toContain('#### VARIATION');
      expect(content).toContain('- [B002](amazon-catalog://B002)');
    });

    it('should handle catalog item with attributes', async () => {
      mockCatalogClient.getCatalogItem.mockResolvedValue({
        asin: 'B001',
        attributes: {
          'ATVPDKIKX0DER': {
            color: 'Red',
            size: { value: 'Large', unit: 'size' },
          },
        },
      });

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Attributes');
      expect(content).toContain('- **color:** Red');
      expect(content).toContain('- **size:** {"value":"Large","unit":"size"}');
    });

    it('should handle API errors gracefully', async () => {
      mockCatalogClient.getCatalogItem.mockRejectedValue(new Error('API Error'));

      const uri = new URL('amazon-catalog://B001');
      const params = { asin: 'B001' };

      const result = await catalogHandler(uri, params);
      expect(result).toEqual({
        contents: [{
          uri: 'amazon-catalog://B001',
          text: '# Error\n\nFailed to retrieve catalog item: API Error',
          mimeType: 'text/markdown',
        }],
      });
    });
  });

  describe('catalog search resource handler', () => {
    let searchHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;

    beforeEach(() => {
      registerCatalogResources(resourceManager, authConfig);
      const registerCall = vi.mocked(resourceManager.registerResource).mock.calls[1];
      searchHandler = registerCall[3] as (uri: URL, params: Record<string, string>) => Promise<unknown>;
    });

    it('should throw error when query is missing', async () => {
      const uri = new URL('amazon-catalog-search://');
      const params = {};

      const result = await searchHandler(uri, params);
      expect(result).toEqual({
        contents: [{
          uri: 'amazon-catalog-search://',
          text: '# Error\n\nFailed to search catalog: Search query is required',
          mimeType: 'text/markdown',
        }],
      });
    });

    it('should handle empty search results', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        numberOfResults: 0,
        items: [],
      });

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('# Amazon Catalog Search: "test"');
      expect(content).toContain('No results found for "test"');
    });

    it('should handle search results with pagination', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        numberOfResults: 100,
        items: [{ asin: 'B001', summaries: [{ itemName: 'Test Product' }] }],
        pagination: {
          nextToken: 'next123',
        },
      });

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('Found 100 results');
      expect(content).toContain('[Next Page](amazon-catalog-search://test?nextToken=next123)');
    });

    it('should handle search results with brand refinements', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        numberOfResults: 50,
        items: [{ asin: 'B001', summaries: [{ itemName: 'Test Product' }] }],
        refinements: {
          brands: [
            { name: 'Brand A', numberOfResults: 25 },
            { name: 'Brand B', numberOfResults: 15 },
          ],
        },
      });

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Filter by Brand');
      expect(content).toContain('[Brand A](amazon-catalog-search://test?brandName=Brand%20A) (25 products)');
      expect(content).toContain('[Brand B](amazon-catalog-search://test?brandName=Brand%20B) (15 products)');
    });

    it('should handle search results with classification refinements', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        numberOfResults: 50,
        items: [{ asin: 'B001', summaries: [{ itemName: 'Test Product' }] }],
        refinements: {
          classifications: [
            { name: 'Electronics', numberOfResults: 30 },
          ],
        },
      });

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('## Filter by Classification');
      expect(content).toContain('[Electronics](amazon-catalog-search://test?classification=Electronics) (30 products)');
    });

    it('should handle search results with items and images', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        numberOfResults: 1,
        items: [{
          asin: 'B001',
          summaries: [{ itemName: 'Test Product', brandName: 'Test Brand' }],
          images: {
            'ATVPDKIKX0DER': [{ link: 'https://example.com/image.jpg' }],
          },
        }],
      });

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('### 1. [Test Product](amazon-catalog://B001)');
      expect(content).toContain('**Brand:** Test Brand');
      expect(content).toContain('![Product Image](https://example.com/image.jpg)');
      expect(content).toContain('**ASIN:** B001');
      expect(content).toContain('[View Details](amazon-catalog://B001)');
    });

    it('should handle search results with items without summaries', async () => {
      mockCatalogClient.searchCatalogItems.mockResolvedValue({
        numberOfResults: 1,
        items: [{
          asin: 'B001',
        }],
      });

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      const content = (result as { contents: Array<{ text: string }> }).contents[0].text;
      
      expect(content).toContain('### 1. [B001](amazon-catalog://B001)');
      expect(content).toContain('**ASIN:** B001');
    });

    it('should handle API errors gracefully', async () => {
      mockCatalogClient.searchCatalogItems.mockRejectedValue(new Error('Search API Error'));

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await searchHandler(uri, params);
      expect(result).toEqual({
        contents: [{
          uri: 'amazon-catalog-search://test',
          text: '# Error\n\nFailed to search catalog: Search API Error',
          mimeType: 'text/markdown',
        }],
      });
    });
  });
});
