/**
 * Tests for listings resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerListingsResources } from '../../src/resources/listings/listings-resources.js';
import { ListingsClientMockFactory } from '../utils/mock-factories/api-client-factory.js';
import type { AuthConfig } from '../../src/types/auth.js';
import type { AmazonListingsItem } from '../../src/types/amazon-api.js';

// Mock the ListingsClient
vi.mock('../../src/api/listings-client.js', () => ({
  ListingsClient: vi.fn(),
}));

describe('Listings Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: AuthConfig;
  let mockListingsClient: ReturnType<ListingsClientMockFactory['create']>;
  let listingsClientMockFactory: ListingsClientMockFactory;
  let resourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let skuCompletionFunction: (value: string) => Promise<string[]>;

  beforeEach(async () => {
    // Create mock server and resource manager
    const mockServer = {
      registerResource: vi.fn(),
    };
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Create mock factories
    listingsClientMockFactory = new ListingsClientMockFactory();
    mockListingsClient = listingsClientMockFactory.create();

    // Mock the ListingsClient constructor
    const { ListingsClient } = await import('../../src/api/listings-client.js');
    vi.mocked(ListingsClient).mockImplementation(() => mockListingsClient as any);

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

    // Register resources and capture the handler and completion function
    registerListingsResources(resourceManager, authConfig);

    // Extract the resource handler from the registerResource call
    const registerResourceCalls = vi.mocked(resourceManager.registerResource).mock.calls;
    const listingsResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-listings');
    if (listingsResourceCall) {
      resourceHandler = listingsResourceCall[3] as typeof resourceHandler;
    }

    // Extract the SKU completion function from the createResourceTemplate call
    const createResourceTemplateCalls = vi.mocked(resourceManager.createResourceTemplate).mock.calls;
    const listingsTemplateCall = createResourceTemplateCalls.find(call => 
      call[0] === 'amazon-listings://{sku}'
    );
    if (listingsTemplateCall && listingsTemplateCall[2]) {
      skuCompletionFunction = listingsTemplateCall[2].sku as typeof skuCompletionFunction;
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    listingsClientMockFactory.reset();
  });

  describe('Resource Registration', () => {
    it('should register listings resources with correct configuration', () => {
      // Assert
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-listings',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Listings',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-listings://{sku}',
        'amazon-listings://',
        expect.objectContaining({
          sku: expect.any(Function),
        })
      );
    });
  });

  describe('SKU Completion Function', () => {
    it('should return empty array for short input', async () => {
      // Act
      const result = await skuCompletionFunction('a');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return matching SKUs for valid input', async () => {
      // Arrange
      const mockListings: AmazonListingsItem[] = [
        {
          sku: 'TEST-SKU-001',
          status: 'ACTIVE',
          identifiers: {
            marketplaceId: 'ATVPDKIKX0DER',
            sellerId: 'SELLER123',
            asin: 'B07N4M94KL',
          },
        },
        {
          sku: 'TEST-SKU-002',
          status: 'ACTIVE',
          identifiers: {
            marketplaceId: 'ATVPDKIKX0DER',
            sellerId: 'SELLER123',
            asin: 'B07N4M94KM',
          },
        },
        {
          sku: 'OTHER-SKU-001',
          status: 'ACTIVE',
          identifiers: {
            marketplaceId: 'ATVPDKIKX0DER',
            sellerId: 'SELLER123',
            asin: 'B07N4M94KN',
          },
        },
      ];

      listingsClientMockFactory.mockGetListings(mockListingsClient, mockListings);

      // Act
      const result = await skuCompletionFunction('TEST');

      // Assert
      expect(result).toEqual(['TEST-SKU-001', 'TEST-SKU-002']);
      expect(mockListingsClient.getListings).toHaveBeenCalledWith({
        includedData: ['attributes'],
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockListingsClient.getListings.mockRejectedValueOnce(new Error('API Error'));

      // Act
      const result = await skuCompletionFunction('TEST');

      // Assert
      expect(result).toEqual([]);
    });

    it('should limit results to 10 items', async () => {
      // Arrange
      const mockListings: AmazonListingsItem[] = Array.from({ length: 15 }, (_, i) => ({
        sku: `TEST-SKU-${String(i + 1).padStart(3, '0')}`,
        status: 'ACTIVE' as const,
        identifiers: {
          marketplaceId: 'ATVPDKIKX0DER',
          sellerId: 'SELLER123',
          asin: `B07N4M94K${i}`,
        },
      }));

      listingsClientMockFactory.mockGetListings(mockListingsClient, mockListings);

      // Act
      const result = await skuCompletionFunction('TEST');

      // Assert
      expect(result).toHaveLength(10);
    });
  });

  describe('Resource Handler', () => {
    it('should handle specific listing request with SKU', async () => {
      // Arrange
      const mockListing: AmazonListingsItem = {
        sku: 'TEST-SKU-001',
        status: 'ACTIVE',
        identifiers: {
          marketplaceId: 'ATVPDKIKX0DER',
          sellerId: 'SELLER123',
          asin: 'B07N4M94KL',
        },
        attributes: {
          item_name: ['Test Product'],
          brand: ['Test Brand'],
        },
        offers: [
          {
            price: { amount: '29.99', currencyCode: 'USD' },
            quantity: 10,
          },
        ],
        fulfillmentAvailability: [
          {
            fulfillmentChannelCode: 'AMAZON',
            quantity: 5,
          },
        ],
        issues: [
          {
            code: 'TEST_ISSUE',
            severity: 'WARNING',
            message: 'Test issue message',
            attributeNames: ['item_name'],
          },
        ],
      };

      listingsClientMockFactory.mockGetListing(mockListingsClient, 'TEST-SKU-001', mockListing);

      const uri = new URL('amazon-listings://TEST-SKU-001');
      const params = { sku: 'TEST-SKU-001' };

      // Act
      const result = await resourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-listings://TEST-SKU-001',
            text: expect.stringContaining('# Amazon Listing: TEST-SKU-001'),
            mimeType: 'text/markdown',
          },
        ],
      });

      const content = (result as any).contents[0].text;
      expect(content).toContain('**SKU:** TEST-SKU-001');
      expect(content).toContain('**Status:** ACTIVE');
      expect(content).toContain('**ASIN:** [B07N4M94KL](amazon-catalog://B07N4M94KL)');
      expect(content).toContain('**item_name:** ["Test Product"]');
      expect(content).toContain('**Price:** 29.99 USD');
      expect(content).toContain('**AMAZON:** 5 units');
      expect(content).toContain('**Code:** TEST_ISSUE');

      expect(mockListingsClient.getListing).toHaveBeenCalledWith('TEST-SKU-001', [
        'attributes',
        'issues',
        'offers',
        'fulfillmentAvailability',
        'procurement',
      ]);
    });

    it('should handle listings list request without SKU', async () => {
      // Arrange
      const mockListings: AmazonListingsItem[] = [
        {
          sku: 'TEST-SKU-001',
          status: 'ACTIVE',
          identifiers: {
            marketplaceId: 'ATVPDKIKX0DER',
            sellerId: 'SELLER123',
            asin: 'B07N4M94KL',
          },
          offers: [
            {
              price: { amount: '29.99', currencyCode: 'USD' },
              quantity: 10,
            },
          ],
          fulfillmentAvailability: [
            {
              fulfillmentChannelCode: 'AMAZON',
              quantity: 5,
            },
          ],
        },
      ];

      listingsClientMockFactory.mockGetListings(mockListingsClient, mockListings, {
        nextToken: 'next-token-123',
      });

      const uri = new URL('amazon-listings://');
      const params = {};

      // Act
      const result = await resourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-listings://',
            text: expect.stringContaining('# Amazon Listings'),
            mimeType: 'text/markdown',
          },
        ],
      });

      const content = (result as any).contents[0].text;
      expect(content).toContain('Found 1 listings');
      expect(content).toContain('[TEST-SKU-001](amazon-listings://TEST-SKU-001)');
      expect(content).toContain('**Price:** 29.99 USD');
      expect(content).toContain('- AMAZON: 5 units');
      expect(content).toContain('[Next Page](amazon-listings://?nextToken=next-token-123)');

      expect(mockListingsClient.getListings).toHaveBeenCalledWith({
        includedData: ['attributes', 'offers', 'fulfillmentAvailability'],
      });
    });

    it('should handle empty listings list', async () => {
      // Arrange
      listingsClientMockFactory.mockGetListings(mockListingsClient, []);

      const uri = new URL('amazon-listings://');
      const params = {};

      // Act
      const result = await resourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('No listings found.');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockListingsClient.getListing.mockRejectedValueOnce(new Error('API Error'));

      const uri = new URL('amazon-listings://TEST-SKU-001');
      const params = { sku: 'TEST-SKU-001' };

      // Act
      const result = await resourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-listings://TEST-SKU-001',
            text: '# Error\n\nFailed to retrieve listings: API Error',
            mimeType: 'text/markdown',
          },
        ],
      });
    });

    it('should handle listing with procurement information', async () => {
      // Arrange
      const mockListing: AmazonListingsItem = {
        sku: 'TEST-SKU-001',
        status: 'ACTIVE',
        identifiers: {
          marketplaceId: 'ATVPDKIKX0DER',
          sellerId: 'SELLER123',
          asin: 'B07N4M94KL',
        },
        procurement: {
          costPrice: { amount: '15.00', currencyCode: 'USD' },
        },
      };

      listingsClientMockFactory.mockGetListing(mockListingsClient, 'TEST-SKU-001', mockListing);

      const uri = new URL('amazon-listings://TEST-SKU-001');
      const params = { sku: 'TEST-SKU-001' };

      // Act
      const result = await resourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('## Procurement');
      expect(content).toContain('**Cost Price:** 15.00 USD');
    });
  });
});
