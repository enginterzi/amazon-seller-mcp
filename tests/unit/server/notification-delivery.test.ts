/**
 * Tests for notification delivery mechanisms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotificationManager,
  NotificationType,
  Notification,
} from '../../../src/server/notifications.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Notification Delivery', () => {
  let notificationManager: NotificationManager;
  let mockMcpServer: any;

  beforeEach(() => {
    // Create a mock MCP server with the correct interface
    mockMcpServer = {
      server: {
        sendLoggingMessage: vi.fn(),
      },
    };
    notificationManager = new NotificationManager(mockMcpServer, { debounced: false });
  });

  it('should deliver inventory change notifications immediately when debouncing is disabled', () => {
    const inventoryChange = TestDataBuilder.createInventoryChangeNotification();

    notificationManager.sendInventoryChangeNotification(inventoryChange);

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining(inventoryChange.sku),
          description: expect.stringContaining(
            `${inventoryChange.previousQuantity} to ${inventoryChange.newQuantity}`
          ),
        }),
      })
    );
  });

  it('should deliver order status change notifications immediately when debouncing is disabled', () => {
    const orderChange = TestDataBuilder.createOrderStatusChangeNotification();

    notificationManager.sendOrderStatusChangeNotification(orderChange);

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining(orderChange.orderId),
          description: expect.stringContaining(
            `${orderChange.previousStatus} to ${orderChange.newStatus}`
          ),
        }),
      })
    );
  });

  it('should debounce inventory change notifications for the same SKU', async () => {
    const debouncedManager = new NotificationManager(mockMcpServer, {
      debounced: true,
      debounceTime: 100,
    });

    const firstChange = TestDataBuilder.createInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      newQuantity: 8,
    });
    const secondChange = TestDataBuilder.createInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      newQuantity: 5,
    });

    debouncedManager.sendInventoryChangeNotification(firstChange);
    debouncedManager.sendInventoryChangeNotification(secondChange);

    expect(mockMcpServer.server.sendLoggingMessage).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          content: expect.stringContaining('"newQuantity": 5'),
          type: 'inventory_change',
        }),
      })
    );

    debouncedManager.clearPendingNotifications();
  });

  it('should debounce order status change notifications for the same order', async () => {
    const debouncedManager = new NotificationManager(mockMcpServer, {
      debounced: true,
      debounceTime: 100,
    });

    const firstChange = TestDataBuilder.createOrderStatusChangeNotification({
      orderId: 'TEST-ORDER-123',
      newStatus: 'UNSHIPPED',
    });
    const secondChange = TestDataBuilder.createOrderStatusChangeNotification({
      orderId: 'TEST-ORDER-123',
      newStatus: 'SHIPPED',
    });

    debouncedManager.sendOrderStatusChangeNotification(firstChange);
    debouncedManager.sendOrderStatusChangeNotification(secondChange);

    expect(mockMcpServer.server.sendLoggingMessage).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          content: expect.stringContaining('"newStatus": "SHIPPED"'),
          type: 'order_status_change',
        }),
      })
    );

    debouncedManager.clearPendingNotifications();
  });

  it('should not debounce notifications for different entities', async () => {
    const debouncedManager = new NotificationManager(mockMcpServer, {
      debounced: true,
      debounceTime: 100,
    });

    const firstChange = TestDataBuilder.createInventoryChangeNotification({ sku: 'TEST-SKU-123' });
    const secondChange = TestDataBuilder.createInventoryChangeNotification({ sku: 'TEST-SKU-456' });

    debouncedManager.sendInventoryChangeNotification(firstChange);
    debouncedManager.sendInventoryChangeNotification(secondChange);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledTimes(2);

    debouncedManager.clearPendingNotifications();
  });

  it('should not debounce notifications of different types', async () => {
    const debouncedManager = new NotificationManager(mockMcpServer, {
      debounced: true,
      debounceTime: 100,
    });

    const inventoryChange = TestDataBuilder.createInventoryChangeNotification();
    const orderChange = TestDataBuilder.createOrderStatusChangeNotification();

    debouncedManager.sendInventoryChangeNotification(inventoryChange);
    debouncedManager.sendOrderStatusChangeNotification(orderChange);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledTimes(2);

    debouncedManager.clearPendingNotifications();
  });

  it('should format inventory change notifications correctly', () => {
    const inventoryChange = TestDataBuilder.createInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      previousQuantity: 10,
      newQuantity: 5,
    });

    notificationManager.sendInventoryChangeNotification(inventoryChange);

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: 'Inventory Change: SKU TEST-SKU-123',
          description: 'Inventory quantity changed from 10 to 5',
          content: expect.stringContaining('"sku": "TEST-SKU-123"'),
          type: 'inventory_change',
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it('should format order status change notifications correctly', () => {
    const orderChange = TestDataBuilder.createOrderStatusChangeNotification({
      orderId: 'TEST-ORDER-123',
      previousStatus: 'PENDING',
      newStatus: 'SHIPPED',
    });

    notificationManager.sendOrderStatusChangeNotification(orderChange);

    expect(mockMcpServer.server.sendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: 'Order Status Change: Order TEST-ORDER-123',
          description: 'Order status changed from PENDING to SHIPPED',
          content: expect.stringContaining('"orderId": "TEST-ORDER-123"'),
          type: 'order_status_change',
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it('should handle errors when sending notifications gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockMcpServer.server.sendLoggingMessage.mockImplementation(() => {
      throw new Error('Delivery failed');
    });

    const inventoryChange = TestDataBuilder.createInventoryChangeNotification();

    expect(() => {
      notificationManager.sendInventoryChangeNotification(inventoryChange);
    }).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending notification:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should send events for all notifications to registered listeners', async () => {
    const testNotificationManager = new NotificationManager(mockMcpServer, { debounced: false });
    const genericListener = vi.fn();
    const inventoryListener = vi.fn();
    const orderListener = vi.fn();

    const inventoryHandler = (notification: Notification) => {
      if (notification.type === NotificationType.INVENTORY_CHANGE) {
        inventoryListener(notification);
      }
    };

    const orderHandler = (notification: Notification) => {
      if (notification.type === NotificationType.ORDER_STATUS_CHANGE) {
        orderListener(notification);
      }
    };

    testNotificationManager.onNotification(genericListener);
    testNotificationManager.onNotification(inventoryHandler);
    testNotificationManager.onNotification(orderHandler);

    const inventoryChange = TestDataBuilder.createInventoryChangeNotification();
    const orderChange = TestDataBuilder.createOrderStatusChangeNotification();

    testNotificationManager.sendInventoryChangeNotification(inventoryChange);
    testNotificationManager.sendOrderStatusChangeNotification(orderChange);

    // Wait for async notification processing
    await TestSetup.waitForAsyncOperations(10);

    expect(genericListener).toHaveBeenCalledTimes(2);
    expect(inventoryListener).toHaveBeenCalledTimes(1);
    expect(orderListener).toHaveBeenCalledTimes(1);

    testNotificationManager.removeListener(genericListener);
    testNotificationManager.removeListener(inventoryHandler);
    testNotificationManager.removeListener(orderHandler);
  });

  it('should allow removing specific listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    notificationManager.onNotification(listener1);
    notificationManager.onNotification(listener2);

    const firstChange = TestDataBuilder.createInventoryChangeNotification();
    notificationManager.sendInventoryChangeNotification(firstChange);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    listener1.mockClear();
    listener2.mockClear();

    notificationManager.removeListener(listener1);

    const secondChange = TestDataBuilder.createInventoryChangeNotification({ sku: 'TEST-SKU-456' });
    notificationManager.sendInventoryChangeNotification(secondChange);

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);

    notificationManager.removeListener(listener2);
  });
});
