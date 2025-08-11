/**
 * Integration tests for notification delivery formatting and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { NotificationManager } from '../../../src/server/notifications.js';
import {
  NotificationServerMockFactory,
  type MockServerForNotifications,
} from '../../utils/mock-factories/index.js';

describe('Notification Delivery Integration', () => {
  let notificationManager: NotificationManager;
  let notificationServerFactory: NotificationServerMockFactory;
  let mockServer: MockServerForNotifications;
  let mockSendLoggingMessage: Mock;

  beforeEach(() => {
    // Create mock factories
    notificationServerFactory = new NotificationServerMockFactory();

    // Create mock instances
    mockServer = notificationServerFactory.create();
    mockSendLoggingMessage = mockServer.server.sendLoggingMessage;

    // Create notification manager with non-debounced notifications for easier testing
    notificationManager = new NotificationManager(mockServer, { debounced: false });
  });

  afterEach(() => {
    // Clean up
    notificationManager.clearPendingNotifications();
    notificationServerFactory.reset();
  });

  it('should format inventory notifications correctly', () => {
    // Send notification directly
    notificationManager.sendInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      fulfillmentChannel: 'AMAZON',
      previousQuantity: 10,
      newQuantity: 5,
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Check notification format
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: 'Inventory Change: SKU TEST-SKU-123',
          description: 'Inventory quantity changed from 10 to 5',
          type: 'inventory_change',
          content: expect.stringContaining('"sku": "TEST-SKU-123"'),
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it('should format order status notifications correctly', () => {
    // Send notification directly
    notificationManager.sendOrderStatusChangeNotification({
      orderId: 'TEST-ORDER-123',
      previousStatus: 'PENDING',
      newStatus: 'SHIPPED',
      marketplaceId: 'ATVPDKIKX0DER',
      orderDetails: {
        purchaseDate: '2023-01-01T00:00:00Z',
        orderTotal: {
          currencyCode: 'USD',
          amount: 99.99,
        },
      },
    });

    // Check notification format
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: 'Order Status Change: Order TEST-ORDER-123',
          description: 'Order status changed from PENDING to SHIPPED',
          type: 'order_status_change',
          content: expect.stringContaining('"orderId": "TEST-ORDER-123"'),
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it('should handle notification delivery errors gracefully', async () => {
    // Mock logger.error to verify error logging
    const { getLogger } = await import('../../../src/utils/logger.js');
    const loggerErrorSpy = vi.spyOn(getLogger(), 'error').mockImplementation(() => {});

    // Make sendLoggingMessage throw an error
    const originalSendLoggingMessage = mockSendLoggingMessage;
    mockSendLoggingMessage.mockImplementation(() => {
      throw new Error('Delivery error');
    });

    // Send notification
    notificationManager.sendInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      fulfillmentChannel: 'AMAZON',
      previousQuantity: 10,
      newQuantity: 5,
      marketplaceId: 'ATVPDKIKX0DER',
    });

    // Check that error was logged
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error sending notification:',
      expect.objectContaining({
        error: 'Delivery error',
      })
    );

    // Restore logger.error and sendLoggingMessage
    loggerErrorSpy.mockRestore();
    mockSendLoggingMessage.mockImplementation(originalSendLoggingMessage);
  });
});
