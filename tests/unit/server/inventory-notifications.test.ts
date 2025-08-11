/**
 * Tests for inventory change notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { InventoryClient } from '../../../src/api/inventory-client.js';
import { NotificationManager } from '../../../src/server/notifications.js';
import { setupInventoryChangeNotifications } from '../../../src/server/inventory-notifications.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import type { AuthConfig } from '../../../src/types/auth.js';
import type { MockMcpServer } from '../../utils/mock-factories/server-factory.js';

// Mock dependencies
vi.mock('../../../src/api/base-client.js', () => {
  return {
    BaseApiClient: class MockBaseApiClient {
      config: AuthConfig;
      constructor(config: AuthConfig) {
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

describe('Inventory Change Notifications', () => {
  let inventoryClient: InventoryClient;
  let notificationManager: NotificationManager;
  let mockSendLoggingMessage: Mock;
  let mockMcpServer: MockMcpServer;

  beforeEach(() => {
    TestSetup.setupMockEnvironment();
    mockSendLoggingMessage = vi.fn();
    mockMcpServer = {
      server: {
        sendLoggingMessage: mockSendLoggingMessage,
      },
    };

    const testConfig = TestSetup.createTestApiClientConfig();
    inventoryClient = new InventoryClient(testConfig);

    vi.spyOn(inventoryClient, 'getInventoryBySku').mockImplementation(async (sku) => {
      return TestDataBuilder.createInventorySummary({ sellerSku: sku });
    });

    notificationManager = new NotificationManager(mockMcpServer as any);
    setupInventoryChangeNotifications(inventoryClient, notificationManager);
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should send notification when inventory is updated', async () => {
    await inventoryClient.updateInventory({
      sku: 'TEST-SKU-123',
      quantity: 5,
      fulfillmentChannel: 'AMAZON',
    });

    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining('TEST-SKU-123'),
          description: expect.stringContaining('to 5'),
          content: expect.stringContaining('TEST-SKU-123'),
        }),
      })
    );
  });

  it('should not send notification when emitNotification is disabled', async () => {
    await inventoryClient.updateInventory(
      {
        sku: 'TEST-SKU-123',
        quantity: 5,
        fulfillmentChannel: 'AMAZON',
      },
      false
    );

    expect(mockSendLoggingMessage).not.toHaveBeenCalled();
  });
});
