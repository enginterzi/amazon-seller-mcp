/**
 * Tests for inventory change notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryClient } from '../../../src/api/inventory-client.js';
import { NotificationManager, NotificationType } from '../../../src/server/notifications.js';
import { setupInventoryChangeNotifications } from '../../../src/server/inventory-notifications.js';

// Mock dependencies
vi.mock('../../../src/api/base-client.js', () => {
  return {
    BaseApiClient: class MockBaseApiClient {
      config: any;
      constructor(config: any) {
        this.config = config;
      }

      async request() {
        return { data: { payload: { status: 'SUCCESSFUL' } } };
      }

      withCache(key: string, fn: () => any) {
        return fn();
      }

      clearCache() {}
    },
  };
});

// Mock MCP server
const mockSendNotification = vi.fn();
const mockMcpServer = {
  sendNotification: mockSendNotification,
};

describe('Inventory Change Notifications', () => {
  let inventoryClient: InventoryClient;
  let notificationManager: NotificationManager;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create inventory client
    inventoryClient = new InventoryClient({
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

    // Mock getInventoryBySku to return test data
    vi.spyOn(inventoryClient, 'getInventoryBySku').mockImplementation(async (sku) => {
      return {
        sku,
        inventoryDetails: [
          {
            fulfillmentChannelCode: 'AMAZON',
            quantity: 10,
          },
          {
            fulfillmentChannelCode: 'SELLER',
            quantity: 20,
          },
        ],
        lastUpdatedTime: new Date().toISOString(),
      };
    });

    // Create notification manager
    notificationManager = new NotificationManager(mockMcpServer as any);

    // Set up inventory change notifications
    setupInventoryChangeNotifications(inventoryClient, notificationManager);
  });

  it('should send notification when inventory is updated', async () => {
    // Update inventory
    await inventoryClient.updateInventory({
      sku: 'TEST-SKU-123',
      quantity: 5,
      fulfillmentChannel: 'AMAZON',
    });

    // Check that notification was sent
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('TEST-SKU-123'),
        description: expect.stringContaining('10 to 5'),
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('TEST-SKU-123'),
          }),
        ]),
      })
    );
  });

  it('should not send notification when emitNotification is false', async () => {
    // Update inventory with emitNotification set to false
    await inventoryClient.updateInventory(
      {
        sku: 'TEST-SKU-123',
        quantity: 5,
        fulfillmentChannel: 'AMAZON',
      },
      false
    );

    // Check that notification was not sent
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
