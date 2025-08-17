/**
 * Unit tests for the notification system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { NotificationManager, NotificationType } from '../../../src/server/notifications.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TestSetup } from '../../utils/test-setup.js';
import type { MockMcpServer } from '../../utils/mock-factories/server-factory.js';

describe('NotificationManager', () => {
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
    } as unknown as McpServer;

    notificationManager = new NotificationManager(mockMcpServer, { debounced: false });
  });

  afterEach(() => {
    notificationManager.clearPendingNotifications();
    TestSetup.cleanupMockEnvironment();
  });

  it('should send inventory change notification through MCP server', () => {
    notificationManager.sendInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      fulfillmentChannel: 'AMAZON',
      previousQuantity: 10,
      newQuantity: 5,
      marketplaceId: 'ATVPDKIKX0DER',
    });

    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining('TEST-SKU-123'),
          description: expect.stringContaining('10 to 5'),
          content: expect.stringContaining('"sku": "TEST-SKU-123"'),
        }),
      })
    );
  });

  it('should send order status change notification through MCP server', () => {
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

    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining('TEST-ORDER-123'),
          description: expect.stringContaining('PENDING to SHIPPED'),
          content: expect.stringContaining('"orderId": "TEST-ORDER-123"'),
        }),
      })
    );
  });

  it('should notify event listeners when notifications are sent', async () => {
    const listener = vi.fn();

    notificationManager.onNotification(listener);

    notificationManager.sendInventoryChangeNotification({
      sku: 'TEST-SKU-123',
      fulfillmentChannel: 'AMAZON',
      previousQuantity: 10,
      newQuantity: 5,
      marketplaceId: 'ATVPDKIKX0DER',
    });

    await TestSetup.waitForAsyncOperations(10);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.INVENTORY_CHANGE,
        sku: 'TEST-SKU-123',
      })
    );

    notificationManager.removeListener(listener);

    notificationManager.sendInventoryChangeNotification({
      sku: 'TEST-SKU-456',
      fulfillmentChannel: 'AMAZON',
      previousQuantity: 20,
      newQuantity: 15,
      marketplaceId: 'ATVPDKIKX0DER',
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should debounce notifications when enabled', async () => {
    const debouncedManager = new NotificationManager(mockMcpServer, {
      debounced: true,
      debounceTime: 100,
    });

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

    expect(mockSendLoggingMessage).not.toHaveBeenCalled();

    await TestSetup.waitForAsyncOperations(150);

    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          content: expect.stringContaining('"newQuantity": 3'),
        }),
      })
    );

    debouncedManager.clearPendingNotifications();
  });

  it('should send different notifications separately when debounced', async () => {
    const debouncedManager = new NotificationManager(mockMcpServer, {
      debounced: true,
      debounceTime: 100,
    });

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

    await TestSetup.waitForAsyncOperations(150);

    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(2);

    debouncedManager.clearPendingNotifications();
  });

  it('should handle notification sending errors gracefully', () => {
    mockSendLoggingMessage.mockImplementation(() => {
      throw new Error('Test error');
    });

    // The main purpose of this test is to verify that errors don't crash the notification system
    // The error logging is now handled by Winston logger instead of console.error
    expect(() => {
      notificationManager.sendInventoryChangeNotification({
        sku: 'TEST-SKU-123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      });
    }).not.toThrow();

    // Verify that the MCP server method was called (and failed)
    expect(mockSendLoggingMessage).toHaveBeenCalled();
  });
});
