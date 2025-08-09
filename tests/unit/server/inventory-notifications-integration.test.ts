/**
 * Integration tests for inventory change notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager, NotificationType } from '../../../src/server/notifications.js';
import { setupInventoryChangeNotifications } from '../../../src/server/inventory-notifications.js';
import { InventoryClient } from '../../../src/api/inventory-client.js';
import {
  NotificationServerMockFactory,
  InventoryClientMockFactory,
} from '../../utils/mock-factories/index.js';

// Mock API client modules
vi.mock('../../../src/api/base-client.js');
vi.mock('../../../src/api/inventory-client.js');

describe('Inventory Change Notifications Integration', () => {
  let notificationManager: NotificationManager;
  let inventoryClient: InventoryClient;
  let notificationListener: (notification: any) => void;

  let notificationServerFactory: NotificationServerMockFactory;
  let inventoryClientFactory: InventoryClientMockFactory;

  let mockServer: any;
  let mockInventoryClient: any;
  let mockSendLoggingMessage: any;

  beforeEach(() => {
    // Create mock factories
    notificationServerFactory = new NotificationServerMockFactory();
    inventoryClientFactory = new InventoryClientMockFactory();

    // Create mock instances
    mockServer = notificationServerFactory.create();
    mockInventoryClient = inventoryClientFactory.create();
    mockSendLoggingMessage = mockServer.server.sendLoggingMessage;

    // Setup mocks
    vi.mocked(InventoryClient).mockImplementation(() => mockInventoryClient);

    // Create notification manager with non-debounced notifications for easier testing
    notificationManager = new NotificationManager(mockServer, { debounced: false });

    // Create clients using mocked constructors
    inventoryClient = new InventoryClient({} as any);

    // Mock getInventoryBySku to return test data
    mockInventoryClient.getInventoryBySku = vi.fn().mockResolvedValue({
      sku: 'TEST-SKU-123',
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
    });

    // Mock getConfig to return marketplace ID
    mockInventoryClient.getConfig = vi.fn().mockReturnValue({
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Mock updateInventory to return success
    mockInventoryClient.updateInventory = vi.fn().mockResolvedValue({
      sku: 'TEST-SKU-123',
      fulfillmentChannel: 'AMAZON',
      status: 'SUCCESSFUL',
    });

    // Setup inventory change notifications
    setupInventoryChangeNotifications(inventoryClient, notificationManager);

    // Setup notification listener
    notificationListener = vi.fn();
    notificationManager.addListener('notification', notificationListener);
  });

  afterEach(() => {
    // Clean up
    notificationManager.clearPendingNotifications();
    if (notificationListener) {
      notificationManager.eventEmitter?.removeListener('notification', notificationListener);
    }
    notificationServerFactory.reset();
    inventoryClientFactory.reset();
  });

  it('should send notification when inventory is updated', async () => {
    // Update inventory
    await inventoryClient.updateInventory({
      sku: 'TEST-SKU-123',
      quantity: 5,
      fulfillmentChannel: 'AMAZON',
    });

    // Check that notification was sent through MCP server
    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining('TEST-SKU-123'),
          description: expect.stringContaining('10 to 5'),
          type: 'inventory_change',
        }),
      })
    );

    // Check that notification listener was called
    expect(notificationListener).toHaveBeenCalledTimes(1);
    expect(notificationListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.INVENTORY_CHANGE,
        sku: 'TEST-SKU-123',
        previousQuantity: 10,
        newQuantity: 5,
      })
    );
  });

  it('should handle errors when getting current inventory', async () => {
    // Mock getInventoryBySku to throw an error
    mockInventoryClient.getInventoryBySku.mockRejectedValueOnce(new Error('Test error'));

    // Update inventory
    await inventoryClient.updateInventory({
      sku: 'TEST-SKU-123',
      quantity: 5,
      fulfillmentChannel: 'AMAZON',
    });

    // Check that notification was still sent (with previousQuantity = 0 due to error getting current inventory)
    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(notificationListener).toHaveBeenCalledWith(
      expect.objectContaining({
        previousQuantity: 0,
        newQuantity: 5,
      })
    );
  });
});
