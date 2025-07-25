/**
 * Tests for inventory tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerInventoryTools } from '../../../src/tools/inventory-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { InventoryClient } from '../../../src/api/inventory-client.js';

// Mock the inventory client
vi.mock('../../../src/api/inventory-client.js', () => {
  return {
    InventoryClient: vi.fn().mockImplementation(() => ({
      getInventory: vi.fn(),
      updateInventory: vi.fn(),
      setInventoryReplenishment: vi.fn(),
    })),
  };
});

describe('Inventory Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockInventoryClient: any;
  let authConfig: any;

  beforeEach(() => {
    // Create a mock MCP server
    const mockServer = {
      registerTool: vi.fn(),
    };

    // Create a new tool manager
    toolManager = new ToolRegistrationManager(mockServer as any);

    // Create a spy for the tool registration
    vi.spyOn(toolManager, 'registerTool');

    // Reset the mock inventory client
    mockInventoryClient = {
      getInventory: vi.fn(),
      updateInventory: vi.fn(),
      setInventoryReplenishment: vi.fn(),
    };

    // Reset the InventoryClient mock
    (InventoryClient as any).mockImplementation(() => mockInventoryClient);

    // Create mock auth config
    authConfig = {
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

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should register inventory tools', () => {
    // Register inventory tools
    registerInventoryTools(toolManager, authConfig);

    // Verify that the tools were registered
    expect(toolManager.registerTool).toHaveBeenCalledTimes(3);
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'get-inventory',
      expect.objectContaining({
        title: 'Get Amazon Inventory',
        description: 'Retrieve inventory levels for your Amazon products',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'update-inventory',
      expect.objectContaining({
        title: 'Update Amazon Inventory',
        description: 'Update inventory quantity for a product',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'set-inventory-replenishment',
      expect.objectContaining({
        title: 'Set Inventory Replenishment Settings',
        description: 'Configure inventory replenishment settings for a product',
      }),
      expect.any(Function)
    );
  });

  describe('get-inventory tool', () => {
    it('should handle get inventory tool execution', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the get inventory response
      mockInventoryClient.getInventory.mockResolvedValue({
        items: [
          {
            sku: 'TEST-SKU-1',
            asin: 'B00TEST123',
            condition: 'New',
            inventoryDetails: [
              {
                fulfillmentChannelCode: 'AMAZON',
                quantity: 10,
                reservedQuantity: 2,
                restockDate: '2025-08-01T00:00:00Z',
                replenishmentSettings: {
                  restockLevel: 5,
                  targetLevel: 15,
                  maximumLevel: 20,
                  leadTimeDays: 7,
                },
              },
              {
                fulfillmentChannelCode: 'SELLER',
                quantity: 5,
              },
            ],
            lastUpdatedTime: '2025-07-15T12:00:00Z',
          },
          {
            sku: 'TEST-SKU-2',
            asin: 'B00TEST456',
            condition: 'Used',
            inventoryDetails: [
              {
                fulfillmentChannelCode: 'SELLER',
                quantity: 3,
              },
            ],
            lastUpdatedTime: '2025-07-15T12:00:00Z',
          },
        ],
        nextToken: 'next-page-token',
      });

      // Get the get inventory tool handler
      const getInventoryHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await getInventoryHandler({
        sellerSkus: ['TEST-SKU-1', 'TEST-SKU-2'],
        fulfillmentChannels: ['AMAZON', 'SELLER'],
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 inventory items');
      expect(result.content[0].text).toContain('Next page token: next-page-token');
      expect(result.content[0].text).toContain('TEST-SKU-1');
      expect(result.content[0].text).toContain('**ASIN:** B00TEST123');
      expect(result.content[0].text).toContain('**Condition:** New');
      expect(result.content[0].text).toContain('**AMAZON:** 10 units (2 reserved)');
      expect(result.content[0].text).toContain('**Restock Date:**');
      expect(result.content[0].text).toContain('Restock Level: 5');
      expect(result.content[0].text).toContain('Target Level: 15');
      expect(result.content[0].text).toContain('Maximum Level: 20');
      expect(result.content[0].text).toContain('Lead Time: 7 days');
      expect(result.content[0].text).toContain('**SELLER:** 5 units');
      expect(result.content[0].text).toContain('TEST-SKU-2');
      expect(result.content[0].text).toContain('**ASIN:** B00TEST456');
      expect(result.content[0].text).toContain('**Condition:** Used');
      expect(result.content[0].text).toContain('**SELLER:** 3 units');

      // Verify that the inventory client was called with the correct parameters
      expect(mockInventoryClient.getInventory).toHaveBeenCalledWith({
        sellerSkus: ['TEST-SKU-1', 'TEST-SKU-2'],
        asins: undefined,
        fulfillmentChannels: ['AMAZON', 'SELLER'],
        startDateTime: undefined,
        endDateTime: undefined,
        pageSize: undefined,
        nextToken: undefined,
      });
    });

    it('should handle empty inventory response', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the get inventory response with empty items
      mockInventoryClient.getInventory.mockResolvedValue({
        items: [],
      });

      // Get the get inventory tool handler
      const getInventoryHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await getInventoryHandler({});

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No inventory items found matching the criteria');

      // Verify that the inventory client was called with the correct parameters
      expect(mockInventoryClient.getInventory).toHaveBeenCalledWith({
        sellerSkus: undefined,
        asins: undefined,
        fulfillmentChannels: undefined,
        startDateTime: undefined,
        endDateTime: undefined,
        pageSize: undefined,
        nextToken: undefined,
      });
    });

    it('should handle errors when getting inventory', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the get inventory error
      mockInventoryClient.getInventory.mockRejectedValue(new Error('API error'));

      // Get the get inventory tool handler
      const getInventoryHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await getInventoryHandler({});

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving inventory: API error');
    });
  });

  describe('update-inventory tool', () => {
    it('should handle update inventory tool execution', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the update inventory response
      mockInventoryClient.updateInventory.mockResolvedValue({
        sku: 'TEST-SKU-1',
        fulfillmentChannel: 'AMAZON',
        status: 'SUCCESS',
      });

      // Get the update inventory tool handler
      const updateInventoryHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateInventoryHandler({
        sku: 'TEST-SKU-1',
        quantity: 15,
        fulfillmentChannel: 'AMAZON',
        restockDate: '2025-08-15',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
      expect(result.content[0].text).toContain('**Fulfillment Channel:** AMAZON');
      expect(result.content[0].text).toContain('**Status:** SUCCESS');
      expect(result.content[0].text).toContain(
        'Successfully updated inventory for SKU TEST-SKU-1 to 15 units'
      );

      // Verify that the inventory client was called with the correct parameters
      expect(mockInventoryClient.updateInventory).toHaveBeenCalledWith({
        sku: 'TEST-SKU-1',
        quantity: 15,
        fulfillmentChannel: 'AMAZON',
        restockDate: expect.any(Date),
      });
    });

    it('should handle failed inventory update', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the update inventory response with failure
      mockInventoryClient.updateInventory.mockResolvedValue({
        sku: 'TEST-SKU-1',
        fulfillmentChannel: 'AMAZON',
        status: 'FAILED',
        errorCode: 'INVALID_INPUT',
        errorMessage: 'Invalid quantity',
      });

      // Get the update inventory tool handler
      const updateInventoryHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateInventoryHandler({
        sku: 'TEST-SKU-1',
        quantity: -1, // Invalid quantity
        fulfillmentChannel: 'AMAZON',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
      expect(result.content[0].text).toContain('**Fulfillment Channel:** AMAZON');
      expect(result.content[0].text).toContain('**Status:** FAILED');
      expect(result.content[0].text).toContain('**Error Code:** INVALID_INPUT');
      expect(result.content[0].text).toContain('**Error Message:** Invalid quantity');

      // Verify that the inventory client was called with the correct parameters
      expect(mockInventoryClient.updateInventory).toHaveBeenCalledWith({
        sku: 'TEST-SKU-1',
        quantity: -1,
        fulfillmentChannel: 'AMAZON',
        restockDate: undefined,
      });
    });

    it('should handle errors when updating inventory', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the update inventory error
      mockInventoryClient.updateInventory.mockRejectedValue(new Error('API error'));

      // Get the update inventory tool handler
      const updateInventoryHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateInventoryHandler({
        sku: 'TEST-SKU-1',
        quantity: 15,
        fulfillmentChannel: 'AMAZON',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error updating inventory: API error');
    });
  });

  describe('set-inventory-replenishment tool', () => {
    it('should handle set inventory replenishment tool execution', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the set inventory replenishment response
      mockInventoryClient.setInventoryReplenishment.mockResolvedValue({
        sku: 'TEST-SKU-1',
        status: 'SUCCESS',
      });

      // Get the set inventory replenishment tool handler
      const setReplenishmentHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await setReplenishmentHandler({
        sku: 'TEST-SKU-1',
        restockLevel: 5,
        targetLevel: 15,
        maximumLevel: 20,
        leadTimeDays: 7,
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
      expect(result.content[0].text).toContain('**Status:** SUCCESS');
      expect(result.content[0].text).toContain(
        'Successfully updated replenishment settings for SKU TEST-SKU-1'
      );
      expect(result.content[0].text).toContain('**Restock Level:** 5');
      expect(result.content[0].text).toContain('**Target Level:** 15');
      expect(result.content[0].text).toContain('**Maximum Level:** 20');
      expect(result.content[0].text).toContain('**Lead Time:** 7 days');

      // Verify that the inventory client was called with the correct parameters
      expect(mockInventoryClient.setInventoryReplenishment).toHaveBeenCalledWith({
        sku: 'TEST-SKU-1',
        restockLevel: 5,
        targetLevel: 15,
        maximumLevel: 20,
        leadTimeDays: 7,
      });
    });

    it('should handle failed inventory replenishment setting', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the set inventory replenishment response with failure
      mockInventoryClient.setInventoryReplenishment.mockResolvedValue({
        sku: 'TEST-SKU-1',
        status: 'FAILED',
        errorCode: 'INVALID_INPUT',
        errorMessage: 'Invalid replenishment settings',
      });

      // Get the set inventory replenishment tool handler
      const setReplenishmentHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await setReplenishmentHandler({
        sku: 'TEST-SKU-1',
        restockLevel: 10,
        targetLevel: 5, // Invalid: target level less than restock level
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
      expect(result.content[0].text).toContain('**Status:** FAILED');
      expect(result.content[0].text).toContain('**Error Code:** INVALID_INPUT');
      expect(result.content[0].text).toContain('**Error Message:** Invalid replenishment settings');

      // Verify that the inventory client was called with the correct parameters
      expect(mockInventoryClient.setInventoryReplenishment).toHaveBeenCalledWith({
        sku: 'TEST-SKU-1',
        restockLevel: 10,
        targetLevel: 5,
        maximumLevel: undefined,
        leadTimeDays: undefined,
      });
    });

    it('should handle errors when setting inventory replenishment', async () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Mock the set inventory replenishment error
      mockInventoryClient.setInventoryReplenishment.mockRejectedValue(new Error('API error'));

      // Get the set inventory replenishment tool handler
      const setReplenishmentHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await setReplenishmentHandler({
        sku: 'TEST-SKU-1',
        restockLevel: 5,
        targetLevel: 15,
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error setting inventory replenishment: API error');
    });
  });
});
