/**
 * Tests for catalog resources registration and functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { CatalogClientMockFactory } from '../../utils/mock-factories/api-client-factory.js';
import { registerCatalogResources } from '../../../src/resources/catalog/catalog-resources.js';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

// Mock the CatalogClient at the module level
vi.mock('../../../src/api/catalog-client.js', () => ({
  CatalogClient: vi.fn(),
}));

describe('Catalog Resources', () => {
  let mockEnv: MockEnvironment;
  let resourceManager: ResourceRegistrationManager;
  let catalogFactory: CatalogClientMockFactory;
  let authConfig: any;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
    resourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
    catalogFactory = new CatalogClientMockFactory();
    authConfig = TestSetup.createTestAuthConfig();
    
    // Setup spy for resource registration
    vi.spyOn(resourceManager, 'registerResource');
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  describe('registerCatalogResources', () => {
    it('should register catalog resources without errors', () => {
      expect(() => {
        registerCatalogResources(resourceManager, authConfig);
      }).not.toThrow();
    });

    it('should register amazon-catalog resource', () => {
      registerCatalogResources(resourceManager, authConfig);
      
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-catalog',
        expect.any(Object),
        expect.objectContaining({
          title: 'Amazon Catalog Item',
          description: 'Retrieve detailed information about a product in the Amazon catalog',
        }),
        expect.any(Function)
      );
    });

    it('should register amazon-catalog-search resource', () => {
      registerCatalogResources(resourceManager, authConfig);
      
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-catalog-search',
        expect.any(Object),
        expect.objectContaining({
          title: 'Amazon Catalog Search',
          description: 'Search for products in the Amazon catalog',
        }),
        expect.any(Function)
      );
    });

    it('should register exactly two resources', () => {
      registerCatalogResources(resourceManager, authConfig);
      
      expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);
    });
  });

  describe('amazon-catalog resource handler', () => {
    let resourceHandler: Function;

    beforeEach(() => {
      registerCatalogResources(resourceManager, authConfig);
      
      // Get the resource handler for amazon-catalog
      const catalogResourceCall = (resourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-catalog');
      resourceHandler = catalogResourceCall[3];
    });

    it('should handle catalog item retrieval successfully', async () => {
      const mockCatalogItem = {
        asin: 'B08TEST123',
        summaries: [{
          itemName: 'Test Product',
          brandName: 'Test Brand',
          manufacturer: 'Test Manufacturer',
          modelNumber: 'TEST-001',
          colorName: 'Black',
        }],
        productTypes: {
          'ATVPDKIKX0DER': 'PRODUCT_TYPE_TEST',
        },
        identifiers: {
          'ATVPDKIKX0DER': [{
            identifier: 'B08TEST123',
            identifierType: 'ASIN',
          }],
        },
      };

      // Mock the CatalogClient constructor and methods
      const mockGetCatalogItem = vi.fn().mockResolvedValue(mockCatalogItem);
      const { CatalogClient } = await import('../../../src/api/catalog-client.js');
      (CatalogClient as any).mockImplementation(() => ({
        getCatalogItem: mockGetCatalogItem,
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const catalogResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-catalog');
      const testResourceHandler = catalogResourceCall[3];

      const uri = new URL('amazon-catalog://B08TEST123');
      const params = { asin: 'B08TEST123' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog://B08TEST123',
          text: expect.stringContaining('# Amazon Catalog Item: B08TEST123'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Test Product');
      expect(result.contents[0].text).toContain('Test Brand');
      expect(mockGetCatalogItem).toHaveBeenCalledWith({
        asin: 'B08TEST123',
        includedData: [
          'attributes',
          'identifiers',
          'images',
          'productTypes',
          'relationships',
          'salesRanks',
          'summaries',
          'variations',
        ],
      });
    });

    it('should handle missing ASIN parameter', async () => {
      const uri = new URL('amazon-catalog://');
      const params = {};

      const result = await resourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog://',
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('ASIN is required');
    });

    it('should handle API errors gracefully', async () => {
      // Mock the CatalogClient to throw an error
      const mockGetCatalogItem = vi.fn().mockRejectedValue(new Error('API Error'));
      const { CatalogClient } = await import('../../../src/api/catalog-client.js');
      (CatalogClient as any).mockImplementation(() => ({
        getCatalogItem: mockGetCatalogItem,
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const catalogResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-catalog');
      const testResourceHandler = catalogResourceCall[3];

      const uri = new URL('amazon-catalog://B08TEST123');
      const params = { asin: 'B08TEST123' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog://B08TEST123',
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Failed to retrieve catalog item');
    });
  });

  describe('amazon-catalog-search resource handler', () => {
    let resourceHandler: Function;

    beforeEach(() => {
      registerCatalogResources(resourceManager, authConfig);
      
      // Get the resource handler for amazon-catalog-search
      const searchResourceCall = (resourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-catalog-search');
      resourceHandler = searchResourceCall[3];
    });

    it('should handle catalog search successfully', async () => {
      const mockSearchResult = {
        numberOfResults: 2,
        items: [
          {
            asin: 'B08TEST123',
            summaries: [{
              itemName: 'Test Product 1',
              brandName: 'Test Brand',
            }],
            images: {
              'ATVPDKIKX0DER': [{
                link: 'https://example.com/image1.jpg',
                width: 500,
                height: 500,
              }],
            },
          },
          {
            asin: 'B08TEST456',
            summaries: [{
              itemName: 'Test Product 2',
              brandName: 'Another Brand',
            }],
          },
        ],
        pagination: {
          nextToken: 'next-page-token',
        },
        refinements: {
          brands: [{
            name: 'Test Brand',
            numberOfResults: 1,
          }],
          classifications: [{
            name: 'Electronics',
            numberOfResults: 2,
          }],
        },
      };

      // Mock the CatalogClient constructor and methods
      const mockSearchCatalogItems = vi.fn().mockResolvedValue(mockSearchResult);
      const { CatalogClient } = await import('../../../src/api/catalog-client.js');
      (CatalogClient as any).mockImplementation(() => ({
        searchCatalogItems: mockSearchCatalogItems,
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const searchResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-catalog-search');
      const testResourceHandler = searchResourceCall[3];

      const uri = new URL('amazon-catalog-search://wireless%20headphones');
      const params = { query: 'wireless headphones' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog-search://wireless%20headphones',
          text: expect.stringContaining('# Amazon Catalog Search: "wireless headphones"'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Found 2 results');
      expect(result.contents[0].text).toContain('Test Product 1');
      expect(result.contents[0].text).toContain('Test Product 2');
      expect(result.contents[0].text).toContain('Next Page');
      expect(result.contents[0].text).toContain('Filter by Brand');
      expect(mockSearchCatalogItems).toHaveBeenCalledWith({
        keywords: 'wireless headphones',
        includedData: ['identifiers', 'summaries', 'images'],
        pageSize: 20,
      });
    });

    it('should handle empty search results', async () => {
      const mockSearchResult = {
        numberOfResults: 0,
        items: [],
      };

      // Mock the CatalogClient constructor and methods
      const mockSearchCatalogItems = vi.fn().mockResolvedValue(mockSearchResult);
      const { CatalogClient } = await import('../../../src/api/catalog-client.js');
      (CatalogClient as any).mockImplementation(() => ({
        searchCatalogItems: mockSearchCatalogItems,
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const searchResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-catalog-search');
      const testResourceHandler = searchResourceCall[3];

      const uri = new URL('amazon-catalog-search://nonexistent');
      const params = { query: 'nonexistent' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog-search://nonexistent',
          text: expect.stringContaining('No results found for "nonexistent"'),
          mimeType: 'text/markdown',
        }],
      });
    });

    it('should handle missing query parameter', async () => {
      const uri = new URL('amazon-catalog-search://');
      const params = {};

      const result = await resourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog-search://',
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Search query is required');
    });

    it('should handle API errors gracefully', async () => {
      // Mock the CatalogClient to throw an error
      const mockSearchCatalogItems = vi.fn().mockRejectedValue(new Error('Search API Error'));
      const { CatalogClient } = await import('../../../src/api/catalog-client.js');
      (CatalogClient as any).mockImplementation(() => ({
        searchCatalogItems: mockSearchCatalogItems,
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const searchResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-catalog-search');
      const testResourceHandler = searchResourceCall[3];

      const uri = new URL('amazon-catalog-search://test');
      const params = { query: 'test' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-catalog-search://test',
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Failed to search catalog');
    });
  });

  describe('resource template completion', () => {
    it('should provide ASIN completion for catalog resource', async () => {
      // Create a mock catalog client with the expected data
      const mockClient = catalogFactory.create();
      catalogFactory.mockSearchCatalogItems(mockClient, [
        { asin: 'B08TEST123' },
        { asin: 'B08TEST456' },
      ]);

      // Reset modules to clear cache
      vi.resetModules();

      // Mock the CatalogClient constructor to return our mock
      vi.doMock('../../../src/api/catalog-client.js', () => ({
        CatalogClient: vi.fn(() => mockClient),
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      vi.spyOn(testResourceManager, 'registerResource');
      
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource template for amazon-catalog
      const catalogResourceCall = (testResourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-catalog');
      const resourceTemplate = catalogResourceCall[1];

      // Test ASIN completion
      const completions = await resourceTemplate.asin('B08');

      expect(completions).toEqual(['B08TEST123', 'B08TEST456']);
    });

    it('should handle completion errors gracefully', async () => {
      // Create a mock catalog client that throws an error
      const mockClient = catalogFactory.create();
      mockClient.searchCatalogItems.mockRejectedValue(new Error('Completion Error'));

      // Reset modules to clear cache
      vi.resetModules();

      // Mock the CatalogClient constructor to return our mock
      vi.doMock('../../../src/api/catalog-client.js', () => ({
        CatalogClient: vi.fn(() => mockClient),
      }));

      // Re-import and register resources with the mocked client
      const { registerCatalogResources: registerWithMock } = await import('../../../src/resources/catalog/catalog-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      vi.spyOn(testResourceManager, 'registerResource');
      
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource template for amazon-catalog
      const catalogResourceCall = (testResourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-catalog');
      const resourceTemplate = catalogResourceCall[1];

      // Test ASIN completion with error
      const completions = await resourceTemplate.asin('B08');

      expect(completions).toEqual([]);
    });

    it('should return empty array for short completion values', async () => {
      registerCatalogResources(resourceManager, authConfig);
      
      // Get the resource template for amazon-catalog
      const catalogResourceCall = (resourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-catalog');
      const resourceTemplate = catalogResourceCall[1];

      // Test ASIN completion with short value
      const completions = await resourceTemplate.asin('B');

      expect(completions).toEqual([]);
    });
  });
});