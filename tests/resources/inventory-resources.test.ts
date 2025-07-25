/**
 * Tests for inventory resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources';
import { registerInventoryResources } from '../../src/resources/inventory/inventory-resources';
import { InventoryClient } from '../../src/api/inventory-client';

// Mock the inventory client
vi.mock('../../src/api/inventory-client');

describe('Inventory Resources', () => {
  // Mock MCP server
  const mockServer = {
    registerResource: vi.fn(),
  };

  // Mock resource manager
  let resourceManager: ResourceRegistrationManager;

  // Mock auth config
  const mockAuthConfig = {
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
  };

  // Sample inventory data
  const sampleInventoryItem = {
    sku: 'TEST-SKU-123',
    asin: 'B0123456789',
    condition: 'New',
    inventoryDetails: [
      {
        fulfillmentChannelCode: 'AMAZON',
        quantity: 100,
        reservedQuantity: 5,
        replenishmentSettings: {
          restockLevel: 20,
          targetLevel: 100,
          maximumLevel: 150,
          leadTimeDays: 7,
        },
      },
      {
        fulfillmentChannelCode: 'SELLER',
        quantity: 50,
      },
    ],
    lastUpdatedTime: '2023-01-01T12:00:00Z',
  };

  const sampleInventoryResponse = {
    items: [
      sampleInventoryItem,
      {
        sku: 'TEST-SKU-456',
        asin: 'B0987654321',
        inventoryDetails: [
          {
            fulfillmentChannelCode: 'SELLER',
            quantity: 25,
          },
        ],
        lastUpdatedTime: '2023-01-02T12:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create resource manager with mock server
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Mock resource template creation
    resourceManager.createResourceTemplate = vi
      .fn()
      .mockImplementation((uriTemplate, listTemplate, completions) => {
        return { uriTemplate, listTemplate, completions };
      });

    // Mock resource registration
    resourceManager.registerResource = vi.fn().mockReturnValue(true);

    // Mock inventory client methods
    (InventoryClient as any).mockImplementation(() => ({
      getInventory: vi.fn().mockResolvedValue(sampleInventoryResponse),
      getInventoryBySku: vi.fn().mockResolvedValue(sampleInventoryItem),
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should register inventory resources', () => {
    // Register inventory resources
    registerInventoryResources(resourceManager, mockAuthConfig);

    // Verify resource registration
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);

    // Check first resource registration (amazon-inventory)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-inventory',
      expect.anything(),
      {
        title: 'Amazon Inventory',
        description: 'Manage and view your Amazon inventory levels',
      },
      expect.any(Function)
    );

    // Check second resource registration (amazon-inventory-filter)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-inventory-filter',
      expect.anything(),
      {
        title: 'Amazon Inventory Filter',
        description: 'Filter and view your Amazon inventory by various criteria',
      },
      expect.any(Function)
    );
  });

  it('should create resource templates with correct URI patterns', () => {
    // Register inventory resources
    registerInventoryResources(resourceManager, mockAuthConfig);

    // Verify resource template creation
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledTimes(2);

    // Check first template (amazon-inventory)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-inventory://{sku}',
      'amazon-inventory://',
      expect.objectContaining({
        sku: expect.any(Function),
      })
    );

    // Check second template (amazon-inventory-filter)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-inventory-filter://{filter}',
      'amazon-inventory-filter://'
    );
  });

  it('should handle inventory resource requests', async () => {
    // Register inventory resources
    registerInventoryResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const inventoryResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-inventory'
    )[3];

    // Test handler with SKU parameter
    const skuUri = new URL('amazon-inventory://TEST-SKU-123');
    const skuResult = await inventoryResourceHandler(skuUri, { sku: 'TEST-SKU-123' });

    // Verify result structure
    expect(skuResult).toHaveProperty('contents');
    expect(skuResult.contents).toBeInstanceOf(Array);
    expect(skuResult.contents[0]).toHaveProperty('uri', 'amazon-inventory://TEST-SKU-123');
    expect(skuResult.contents[0]).toHaveProperty('text');
    expect(skuResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes key inventory information
    expect(skuResult.contents[0].text).toContain('# Amazon Inventory: TEST-SKU-123');
    expect(skuResult.contents[0].text).toContain('**SKU:** TEST-SKU-123');
    expect(skuResult.contents[0].text).toContain('**ASIN:** [B0123456789]');
    expect(skuResult.contents[0].text).toContain('**Available Quantity:** 100');

    // Test handler without SKU parameter (list all inventory)
    const listUri = new URL('amazon-inventory://');
    const listResult = await inventoryResourceHandler(listUri, {});

    // Verify result structure
    expect(listResult).toHaveProperty('contents');
    expect(listResult.contents).toBeInstanceOf(Array);
    expect(listResult.contents[0]).toHaveProperty('uri', 'amazon-inventory://');
    expect(listResult.contents[0]).toHaveProperty('text');
    expect(listResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes inventory list
    expect(listResult.contents[0].text).toContain('# Amazon Inventory');
    expect(listResult.contents[0].text).toContain('Found 2 inventory items');
    expect(listResult.contents[0].text).toContain('TEST-SKU-123');
    expect(listResult.contents[0].text).toContain('TEST-SKU-456');
  });

  it('should handle inventory filter resource requests', async () => {
    // Register inventory resources
    registerInventoryResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const filterResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-inventory-filter'
    )[3];

    // Test handler without filter parameter (show filter options)
    const optionsUri = new URL('amazon-inventory-filter://');
    const optionsResult = await filterResourceHandler(optionsUri, {});

    // Verify result structure
    expect(optionsResult).toHaveProperty('contents');
    expect(optionsResult.contents).toBeInstanceOf(Array);
    expect(optionsResult.contents[0]).toHaveProperty('uri', 'amazon-inventory-filter://');
    expect(optionsResult.contents[0]).toHaveProperty('text');
    expect(optionsResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes filter options
    expect(optionsResult.contents[0].text).toContain('# Amazon Inventory Filters');
    expect(optionsResult.contents[0].text).toContain('Filter by SKU');
    expect(optionsResult.contents[0].text).toContain('Filter by ASIN');
    expect(optionsResult.contents[0].text).toContain('Filter by Fulfillment Channel');

    // Test handler with filter parameter
    // Need to encode the URL properly since it contains a colon
    const filterUri = new URL('amazon-inventory-filter://sku%3ATEST-SKU');
    const filterResult = await filterResourceHandler(filterUri, { filter: 'sku:TEST-SKU' });

    // Verify result structure
    expect(filterResult).toHaveProperty('contents');
    expect(filterResult.contents).toBeInstanceOf(Array);
    expect(filterResult.contents[0]).toHaveProperty('uri', filterUri.toString());
    expect(filterResult.contents[0]).toHaveProperty('text');
    expect(filterResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');
  });

  it('should handle errors gracefully', async () => {
    // Mock inventory client to throw an error
    (InventoryClient as any).mockImplementation(() => ({
      getInventory: vi.fn().mockRejectedValue(new Error('API Error')),
      getInventoryBySku: vi.fn().mockRejectedValue(new Error('API Error')),
    }));

    // Register inventory resources
    registerInventoryResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const inventoryResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-inventory'
    )[3];

    // Test handler with SKU parameter
    const skuUri = new URL('amazon-inventory://TEST-SKU-123');
    const skuResult = await inventoryResourceHandler(skuUri, { sku: 'TEST-SKU-123' });

    // Verify error response
    expect(skuResult).toHaveProperty('contents');
    expect(skuResult.contents).toBeInstanceOf(Array);
    expect(skuResult.contents[0]).toHaveProperty('text');
    expect(skuResult.contents[0].text).toContain('# Error');
    expect(skuResult.contents[0].text).toContain('Failed to retrieve inventory: API Error');
  });
});
