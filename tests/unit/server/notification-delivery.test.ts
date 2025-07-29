/**
 * Tests for notification delivery mechanisms
 *
 * This file tests the notification delivery mechanisms in the MCP server
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationManager,
  NotificationType,
  Notification,
} from '../../../src/server/notifications.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock MCP server
const mockSendLoggingMessage = vi.fn();
const mockMcpServer = {
  server: {
    sendLoggingMessage: mockSendLoggingMessage,
  },
} as unknown as McpServer;

describe('Notification Delivery', () => {
  let notificationManager: NotificationManager;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create notification manager with non-debounced notifications for easier testing
    notificationManager = new NotificationManager(mockMcpServer, { debounced: false });
  });

  afterEach(() => {
    // Clean up
    notificationManager.clearPendingNotifications();
  });

  describe('Immediate Delivery', () => {
    it('should deliver inventory change notifications immediately when debouncing is disabled', () => {
      // Send notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Check that notification was sent immediately
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
    });

    it('should deliver order status change notifications immediately when debouncing is disabled', () => {
      // Send notification
      notificationManager.sendOrderStatusChangeNotification({
        orderId: 'TEST-ORDER-123',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        marketplaceId: 'ATVPDKIKX0DER',
        orderDetails: {
          purchaseDate: '2023-01-01T00:00:00Z',
        },
      });

      // Check that notification was sent immediately
      expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
      expect(mockSendLoggingMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          data: expect.objectContaining({
            title: expect.stringContaining('TEST-ORDER-123'),
            description: expect.stringContaining('PENDING to SHIPPED'),
            type: 'order_status_change',
          }),
        })
      );
    });
  });

  describe('Debounced Delivery', () => {
    it('should debounce inventory change notifications for the same SKU', async () => {
      // Create notification manager with debounced notifications
      const debouncedManager = new NotificationManager(mockMcpServer, {
        debounced: true,
        debounceTime: 100, // Short time for testing
      });

      // Send multiple notifications for the same SKU
      debouncedManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 8,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      debouncedManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 8,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // No notifications should be sent immediately
      expect(mockSendLoggingMessage).not.toHaveBeenCalled();

      // Wait for debounce time
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Only the last notification should be sent
      expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
      expect(mockSendLoggingMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          data: expect.objectContaining({
            content: expect.stringContaining('"newQuantity": 5'),
            type: 'inventory_change',
          }),
        })
      );

      // Clean up
      debouncedManager.clearPendingNotifications();
    });

    it('should debounce order status change notifications for the same order', async () => {
      // Create notification manager with debounced notifications
      const debouncedManager = new NotificationManager(mockMcpServer, {
        debounced: true,
        debounceTime: 100, // Short time for testing
      });

      // Send multiple notifications for the same order
      debouncedManager.sendOrderStatusChangeNotification({
        orderId: 'TEST-ORDER-123',
        previousStatus: 'PENDING',
        newStatus: 'UNSHIPPED',
        marketplaceId: 'ATVPDKIKX0DER',
      });

      debouncedManager.sendOrderStatusChangeNotification({
        orderId: 'TEST-ORDER-123',
        previousStatus: 'UNSHIPPED',
        newStatus: 'SHIPPED',
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // No notifications should be sent immediately
      expect(mockSendLoggingMessage).not.toHaveBeenCalled();

      // Wait for debounce time
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Only the last notification should be sent
      expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
      expect(mockSendLoggingMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          data: expect.objectContaining({
            content: expect.stringContaining('"newStatus": "SHIPPED"'),
            type: 'order_status_change',
          }),
        })
      );

      // Clean up
      debouncedManager.clearPendingNotifications();
    });

    it('should not debounce notifications for different entities', async () => {
      // Create notification manager with debounced notifications
      const debouncedManager = new NotificationManager(mockMcpServer, {
        debounced: true,
        debounceTime: 100, // Short time for testing
      });

      // Send notifications for different SKUs
      debouncedManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      debouncedManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-456',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 20,
        newQuantity: 15,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Wait for debounce time
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Both notifications should be sent
      expect(mockSendLoggingMessage).toHaveBeenCalledTimes(2);

      // Clean up
      debouncedManager.clearPendingNotifications();
    });

    it('should not debounce notifications of different types', async () => {
      // Create notification manager with debounced notifications
      const debouncedManager = new NotificationManager(mockMcpServer, {
        debounced: true,
        debounceTime: 100, // Short time for testing
      });

      // Send notifications of different types
      debouncedManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      debouncedManager.sendOrderStatusChangeNotification({
        orderId: 'TEST-ORDER-123',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Wait for debounce time
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Both notifications should be sent
      expect(mockSendLoggingMessage).toHaveBeenCalledTimes(2);

      // Clean up
      debouncedManager.clearPendingNotifications();
    });
  });

  describe('Notification Formatting', () => {
    it('should format inventory change notifications correctly', () => {
      // Send notification
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
            content: expect.stringContaining('"sku": "TEST-SKU-123"'),
            type: 'inventory_change',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should format order status change notifications correctly', () => {
      // Send notification
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
            content: expect.stringContaining('"orderId": "TEST-ORDER-123"'),
            type: 'order_status_change',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when sending notifications', async () => {
      // Mock console.error to verify error logging
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a mock implementation of sendLoggingMessage that throws an error
      const originalSendLoggingMessage = mockSendLoggingMessage;
      mockSendLoggingMessage.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Send notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Wait a bit for async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check that error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending notification:',
        expect.any(Error)
      );

      // Restore console.error and sendLoggingMessage
      consoleErrorSpy.mockRestore();
      mockSendLoggingMessage.mockImplementation(originalSendLoggingMessage);
    });
  });

  describe('Notification Events', () => {
    it('should emit events for all notifications', async () => {
      // Create a new notification manager for this test to avoid affecting other tests
      const testNotificationManager = new NotificationManager(mockMcpServer, { debounced: false });

      // Create listeners
      const genericListener = vi.fn();

      // Create type-specific listeners without recursive calls
      const inventoryListener = vi.fn();
      const inventoryHandler = (notification: Notification) => {
        if (notification.type === NotificationType.INVENTORY_CHANGE) {
          inventoryListener(notification);
        }
      };

      const orderListener = vi.fn();
      const orderHandler = (notification: Notification) => {
        if (notification.type === NotificationType.ORDER_STATUS_CHANGE) {
          orderListener(notification);
        }
      };

      // Register listeners
      testNotificationManager.onNotification(genericListener);
      testNotificationManager.onNotification(inventoryHandler);
      testNotificationManager.onNotification(orderHandler);

      // Send inventory notification
      testNotificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Send order notification
      testNotificationManager.sendOrderStatusChangeNotification({
        orderId: 'TEST-ORDER-123',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check that listeners were called
      expect(genericListener).toHaveBeenCalledTimes(2);
      expect(inventoryListener).toHaveBeenCalledTimes(1);
      expect(orderListener).toHaveBeenCalledTimes(1);

      // Clean up
      testNotificationManager.removeListener(genericListener);
      testNotificationManager.removeListener(inventoryHandler);
      testNotificationManager.removeListener(orderHandler);
    });

    it('should allow removing specific listeners', async () => {
      // Create listeners
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Register listeners
      notificationManager.onNotification(listener1);
      notificationManager.onNotification(listener2);

      // Send notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check that both listeners were called
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Reset mocks
      listener1.mockClear();
      listener2.mockClear();

      // Remove first listener
      notificationManager.removeListener(listener1);

      // Send another notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-456',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 20,
        newQuantity: 15,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check that only second listener was called
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);

      // Clean up
      notificationManager.removeListener(listener2);
    });
  });
});
