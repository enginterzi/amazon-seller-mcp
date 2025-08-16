/**
 * Tests for inventory tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerInventoryTools } from '../../../src/tools/inventory-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  InventoryClientMockFactory,
  type MockInventoryClient,
} from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import type { AuthConfig } from '../../../src/types/auth.js';

describe('Inventory Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockInventoryClient: MockInventoryClient;
  let inventoryFactory: InventoryClientMockFactory;
  let authConfig: AuthConfig;

  beforeEach(() => {
    TestSetup.setupTestEnvironment();

    // Create mock server with registerTool method
    const mockServer = {
      registerTool: vi.fn(),
    };

    // Create tool manager and spy on registerTool
    toolManager = new ToolRegistrationManager(mockServer as any);
    vi.spyOn(toolManager, 'registerTool');

    // Create inventory client mock factory
    inventoryFactory = new InventoryClientMockFactory();
    mockInventoryClient = inventoryFactory.create();

    // Add missing method for inventory replenishment
    mockInventoryClient.setInventoryReplenishment = vi.fn();

    // Create auth config
    authConfig = TestDataBuilder.createAuthConfig();
  });

  it('should register inventory tools', () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

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

  it('should handle get inventory tool execution', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    const inventoryData = {
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
    };

    inventoryFactory.mockGetInventory(mockInventoryClient, inventoryData.items, {
      nextToken: 'next-page-token',
    });

    const getInventoryHandler = (toolManager.registerTool as any).mock.calls[0][2];
    const result = await getInventoryHandler({
      sellerSkus: ['TEST-SKU-1', 'TEST-SKU-2'],
      fulfillmentChannels: ['AMAZON', 'SELLER'],
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Found 2 inventory items');
    expect(result.content[0].text).toContain('Next page token: next-page-token');
    expect(result.content[0].text).toContain('TEST-SKU-1');
    expect(result.content[0].text).toContain('**ASIN:** B00TEST123');
    expect(result.content[0].text).toContain('**Condition:** New');
    expect(result.content[0].text).toContain('**AMAZON:** 10 units (2 reserved)');
    expect(result.content[0].text).toContain('**SELLER:** 5 units');
    expect(result.content[0].text).toContain('TEST-SKU-2');

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
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    inventoryFactory.mockGetInventory(mockInventoryClient, []);

    const getInventoryHandler = (toolManager.registerTool as any).mock.calls[0][2];
    const result = await getInventoryHandler({});

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('No inventory items found matching the criteria');

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
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    mockInventoryClient.getInventory.mockRejectedValue(new Error('API error'));

    const getInventoryHandler = (toolManager.registerTool as any).mock.calls[0][2];
    const result = await getInventoryHandler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error retrieving inventory: API error');
  });

  it('should handle update inventory tool execution', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    inventoryFactory.mockUpdateInventory(mockInventoryClient, 'TEST-SKU-1', {
      fulfillmentChannel: 'AMAZON',
      status: 'SUCCESSFUL',
    });

    const updateInventoryHandler = (toolManager.registerTool as any).mock.calls[1][2];
    const result = await updateInventoryHandler({
      sku: 'TEST-SKU-1',
      quantity: 15,
      fulfillmentChannel: 'AMAZON',
      restockDate: '2025-08-15',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
    expect(result.content[0].text).toContain('**Fulfillment Channel:** AMAZON');
    expect(result.content[0].text).toContain('**Status:** SUCCESSFUL');
    expect(result.content[0].text).toContain(
      'Successfully updated inventory for SKU TEST-SKU-1 to 15 units'
    );

    expect(mockInventoryClient.updateInventory).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      quantity: 15,
      fulfillmentChannel: 'AMAZON',
      restockDate: expect.any(Date),
    });
  });

  it('should handle failed inventory update', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    mockInventoryClient.updateInventory.mockResolvedValue({
      sku: 'TEST-SKU-1',
      fulfillmentChannel: 'AMAZON',
      status: 'FAILED',
      errorCode: 'INVALID_INPUT',
      errorMessage: 'Invalid quantity',
    });

    const updateInventoryHandler = (toolManager.registerTool as any).mock.calls[1][2];
    const result = await updateInventoryHandler({
      sku: 'TEST-SKU-1',
      quantity: 5,
      fulfillmentChannel: 'AMAZON',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
    expect(result.content[0].text).toContain('**Fulfillment Channel:** AMAZON');
    expect(result.content[0].text).toContain('**Status:** FAILED');
    expect(result.content[0].text).toContain('**Error Code:** INVALID_INPUT');
    expect(result.content[0].text).toContain('**Error Message:** Invalid quantity');

    expect(mockInventoryClient.updateInventory).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      quantity: 5,
      fulfillmentChannel: 'AMAZON',
      restockDate: undefined,
    });
  });

  it('should handle errors when updating inventory', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    mockInventoryClient.updateInventory.mockRejectedValue(new Error('API error'));

    const updateInventoryHandler = (toolManager.registerTool as any).mock.calls[1][2];
    const result = await updateInventoryHandler({
      sku: 'TEST-SKU-1',
      quantity: 15,
      fulfillmentChannel: 'AMAZON',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error updating inventory: API error');
  });

  it('should handle set inventory replenishment tool execution', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    mockInventoryClient.setInventoryReplenishment.mockResolvedValue({
      sku: 'TEST-SKU-1',
      status: 'SUCCESS',
    });

    const setReplenishmentHandler = (toolManager.registerTool as any).mock.calls[2][2];
    const result = await setReplenishmentHandler({
      sku: 'TEST-SKU-1',
      restockLevel: 5,
      targetLevel: 15,
      maximumLevel: 20,
      leadTimeDays: 7,
    });

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

    expect(mockInventoryClient.setInventoryReplenishment).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      restockLevel: 5,
      targetLevel: 15,
      maximumLevel: 20,
      leadTimeDays: 7,
    });
  });

  it('should handle failed inventory replenishment setting', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    mockInventoryClient.setInventoryReplenishment.mockResolvedValue({
      sku: 'TEST-SKU-1',
      status: 'FAILED',
      errorCode: 'INVALID_INPUT',
      errorMessage: 'Invalid replenishment settings',
    });

    const setReplenishmentHandler = (toolManager.registerTool as any).mock.calls[2][2];
    const result = await setReplenishmentHandler({
      sku: 'TEST-SKU-1',
      restockLevel: 10,
      targetLevel: 5,
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**SKU:** TEST-SKU-1');
    expect(result.content[0].text).toContain('**Status:** FAILED');
    expect(result.content[0].text).toContain('**Error Code:** INVALID_INPUT');
    expect(result.content[0].text).toContain('**Error Message:** Invalid replenishment settings');

    expect(mockInventoryClient.setInventoryReplenishment).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      restockLevel: 10,
      targetLevel: 5,
      maximumLevel: undefined,
      leadTimeDays: undefined,
    });
  });

  it('should handle errors when setting inventory replenishment', async () => {
    registerInventoryTools(toolManager, authConfig, mockInventoryClient);

    mockInventoryClient.setInventoryReplenishment.mockRejectedValue(new Error('API error'));

    const setReplenishmentHandler = (toolManager.registerTool as any).mock.calls[2][2];
    const result = await setReplenishmentHandler({
      sku: 'TEST-SKU-1',
      restockLevel: 5,
      targetLevel: 15,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error setting inventory replenishment: API error');
  });
});
