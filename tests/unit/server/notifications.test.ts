/**
 * Unit tests for the notification system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationManager,
  NotificationType,
  Notification,
} from '../../../src/server/notifications.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock MCP server
const mockSendNotification = vi.fn();
const mockMcpServer = {
  sendNotification: mockSendNotification,
} as unknown as McpServer;

describe('NotificationManager', () => {
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

  describe('sendInventoryChangeNotification', () => {
    it('should send inventory change notification through MCP server', () => {
      // Send notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
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
              text: expect.stringContaining('"sku": "TEST-SKU-123"'),
            }),
          ]),
        })
      );
    });
  });

  describe('sendOrderStatusChangeNotification', () => {
    it('should send order status change notification through MCP server', () => {
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

      // Check that notification was sent
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('TEST-ORDER-123'),
          description: expect.stringContaining('PENDING to SHIPPED'),
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.stringContaining('"orderId": "TEST-ORDER-123"'),
            }),
          ]),
        })
      );
    });
  });

  describe('event listeners', () => {
    it('should notify listeners when a notification is sent', () => {
      // Create listener
      const listener = vi.fn();

      // Register listener
      notificationManager.onNotification(listener);

      // Send notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Check that listener was called
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INVENTORY_CHANGE,
          sku: 'TEST-SKU-123',
        })
      );

      // Remove listener
      notificationManager.removeListener(listener);

      // Send another notification
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-456',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 20,
        newQuantity: 15,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Check that listener was not called again
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounced notifications', () => {
    it('should debounce notifications when enabled', async () => {
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
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      debouncedManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 5,
        newQuantity: 3,
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // No notifications should be sent immediately
      expect(mockSendNotification).not.toHaveBeenCalled();

      // Wait for debounce time
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Only the last notification should be sent
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining('"newQuantity": 3'),
            }),
          ]),
        })
      );

      // Clean up
      debouncedManager.clearPendingNotifications();
    });

    it('should send different notifications separately even when debounced', async () => {
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
      expect(mockSendNotification).toHaveBeenCalledTimes(2);

      // Clean up
      debouncedManager.clearPendingNotifications();
    });
  });

  describe('error handling', () => {
    it('should handle errors when sending notifications', () => {
      // Mock console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make sendNotification throw an error
      mockSendNotification.mockImplementation(() => {
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

      // Check that error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending notification:',
        expect.any(Error)
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });
});
