/**
 * Tests for catalog resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerCatalogResources } from '../../src/resources/catalog/catalog-resources.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the catalog client
vi.mock('../../src/api/catalog-client.js', () => {
  return {
    CatalogClient: vi.fn().mockImplementation(() => ({
      searchCatalogItems: vi.fn().mockResolvedValue({
        numberOfResults: 2,
        items: [
          {
            asin: 'B01EXAMPLE1',
            summaries: [
              {
                itemName: 'Test Product 1',
                brandName: 'Test Brand',
              },
            ],
          },
          {
            asin: 'B01EXAMPLE2',
            summaries: [
              {
                itemName: 'Test Product 2',
                brandName: 'Test Brand',
              },
            ],
          },
        ],
        pagination: {
          nextToken: 'next-page-token',
        },
        refinements: {
          brands: [
            {
              name: 'Test Brand',
              numberOfResults: 10,
            },
          ],
          classifications: [
            {
              name: 'Test Category',
              numberOfResults: 5,
            },
          ],
        },
      }),
      getCatalogItem: vi.fn().mockResolvedValue({
        asin: 'B01EXAMPLE1',
        summaries: [
          {
            itemName: 'Test Product 1',
            brandName: 'Test Brand',
            manufacturer: 'Test Manufacturer',
            modelNumber: 'TM-123',
            colorName: 'Black',
          },
        ],
        productTypes: {
          AMAZON_US: 'ELECTRONICS',
        },
        identifiers: {
          AMAZON_US: [
            {
              identifierType: 'UPC',
              identifier: '123456789012',
            },
          ],
        },
        images: {
          AMAZON_US: [
            {
              link: 'https://example.com/image.jpg',
              width: 500,
              height: 500,
            },
          ],
        },
      }),
    })),
  };
});

// Mock the MCP server
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerResource: vi.fn(),
    })),
    ResourceTemplate: vi.fn().mockImplementation((template) => ({
      template,
    })),
  };
});

describe('Catalog Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let mockServer: McpServer;

  beforeEach(() => {
    mockServer = new McpServer();
    resourceManager = new ResourceRegistrationManager(mockServer);

    // Spy on registerResource
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register catalog resources', () => {
    // Register catalog resources
    registerCatalogResources(resourceManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: 'NA',
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Verify that registerResource was called twice (for catalog item and search)
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);

    // Verify that the first call was for amazon-catalog
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-catalog',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Catalog Item',
        description: expect.any(String),
      }),
      expect.any(Function)
    );

    // Verify that the second call was for amazon-catalog-search
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

  it('should create resource templates with correct URI patterns', () => {
    // Register catalog resources
    registerCatalogResources(resourceManager, {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: 'NA',
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Verify that createResourceTemplate was called with correct URI patterns
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog://{asin}',
      'amazon-catalog://',
      expect.anything()
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog-search://{query}',
      'amazon-catalog-search://'
    );
  });
});
