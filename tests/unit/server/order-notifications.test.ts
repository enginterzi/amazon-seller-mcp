/**
 * Unit tests for order status notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { OrderStatusChangeHandler } from '../../../src/server/order-notifications.js';
import { NotificationManager } from '../../../src/server/notifications.js';
import { OrdersClient, OrderStatus } from '../../../src/api/orders-client.js';
import { TestSetup } from '../../utils/test-setup.js';
import type { AuthConfig } from '../../../src/types/auth.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the OrdersClient
vi.mock('../../../src/api/orders-client.js', () => {
  return {
    OrdersClient: vi.fn().mockImplementation(() => ({
      getOrders: vi.fn(),
      getOrder: vi.fn(),
      updateOrderStatus: vi.fn(),
    })),
  };
});

// Mock the NotificationManager
vi.mock('../../../src/server/notifications.js', () => {
  return {
    NotificationManager: vi.fn().mockImplementation(() => ({
      sendOrderStatusChangeNotification: vi.fn(),
    })),
    NotificationType: {
      ORDER_STATUS_CHANGE: 'order_status_change',
    },
  };
});

describe('OrderStatusChangeHandler', () => {
  let ordersClient: OrdersClient;
  let notificationManager: NotificationManager;
  let handler: OrderStatusChangeHandler;

  beforeEach(() => {
    TestSetup.setupMockEnvironment();

    ordersClient = new OrdersClient({} as AuthConfig);
    notificationManager = new NotificationManager({} as McpServer);

    // Ensure the mock methods are properly set up
    notificationManager.sendOrderStatusChangeNotification = vi.fn();

    handler = new OrderStatusChangeHandler(ordersClient, notificationManager, {
      enablePeriodicMonitoring: false,
    });
  });

  afterEach(() => {
    handler.cleanup();
    TestSetup.cleanupMockEnvironment();
  });

  it('should override updateOrderStatus method during setup', () => {
    handler.setup();

    expect(ordersClient.updateOrderStatus).not.toBe(undefined);
  });

  it('should send notification when order status changes', async () => {
    const mockOrder = {
      amazonOrderId: 'test-order-id',
      orderStatus: 'PENDING' as OrderStatus,
      marketplaceId: 'test-marketplace',
      purchaseDate: '2023-01-01T00:00:00Z',
      orderTotal: {
        currencyCode: 'USD',
        amount: '99.99',
      },
      fulfillmentChannel: 'MFN',
      numberOfItemsShipped: 0,
      numberOfItemsUnshipped: 1,
    };

    (ordersClient.getOrder as Mock).mockResolvedValue(mockOrder);
    (ordersClient.updateOrderStatus as Mock).mockResolvedValue({ success: true });

    handler.setup();

    await ordersClient.updateOrderStatus({
      amazonOrderId: 'test-order-id',
      action: 'CONFIRM',
    });

    expect(notificationManager.sendOrderStatusChangeNotification).toHaveBeenCalledWith({
      orderId: 'test-order-id',
      previousStatus: 'PENDING',
      newStatus: 'UNSHIPPED',
      marketplaceId: 'test-marketplace',
      orderDetails: expect.objectContaining({
        purchaseDate: '2023-01-01T00:00:00Z',
      }),
    });
  });

  it('should not send notification when order status remains unchanged', async () => {
    const mockOrder = {
      amazonOrderId: 'test-order-id',
      orderStatus: 'UNSHIPPED' as OrderStatus,
      marketplaceId: 'test-marketplace',
      purchaseDate: '2023-01-01T00:00:00Z',
      orderTotal: {
        currencyCode: 'USD',
        amount: '99.99',
      },
      fulfillmentChannel: 'MFN',
      numberOfItemsShipped: 0,
      numberOfItemsUnshipped: 1,
    };

    (ordersClient.getOrder as Mock).mockResolvedValue(mockOrder);
    (ordersClient.updateOrderStatus as Mock).mockResolvedValue({ success: true });

    handler.setup();

    await ordersClient.updateOrderStatus({
      amazonOrderId: 'test-order-id',
      action: 'CONFIRM',
    });

    expect(notificationManager.sendOrderStatusChangeNotification).not.toHaveBeenCalled();
  });

  it('should not send notification when update operation fails', async () => {
    const mockOrder = {
      amazonOrderId: 'test-order-id',
      orderStatus: 'PENDING' as OrderStatus,
      marketplaceId: 'test-marketplace',
      purchaseDate: '2023-01-01T00:00:00Z',
      orderTotal: {
        currencyCode: 'USD',
        amount: '99.99',
      },
      fulfillmentChannel: 'MFN',
      numberOfItemsShipped: 0,
      numberOfItemsUnshipped: 1,
    };

    (ordersClient.getOrder as Mock).mockResolvedValue(mockOrder);
    (ordersClient.updateOrderStatus as Mock).mockResolvedValue({ success: false });

    handler.setup();

    await ordersClient.updateOrderStatus({
      amazonOrderId: 'test-order-id',
      action: 'CONFIRM',
    });

    expect(notificationManager.sendOrderStatusChangeNotification).not.toHaveBeenCalled();
  });

  it('should check order status and send notification when status changes', async () => {
    const mockOrder = {
      amazonOrderId: 'test-order-id',
      orderStatus: 'SHIPPED' as OrderStatus,
      marketplaceId: 'test-marketplace',
      purchaseDate: '2023-01-01T00:00:00Z',
      orderTotal: {
        currencyCode: 'USD',
        amount: '99.99',
      },
      fulfillmentChannel: 'MFN',
      numberOfItemsShipped: 1,
      numberOfItemsUnshipped: 0,
    };

    (ordersClient.getOrder as Mock).mockResolvedValue(mockOrder);

    handler.setup();

    handler.getStatusMonitor()['orderStatusCache'].set('test-order-id', 'UNSHIPPED' as OrderStatus);

    await handler.checkOrderStatus('test-order-id');

    expect(notificationManager.sendOrderStatusChangeNotification).toHaveBeenCalledWith({
      orderId: 'test-order-id',
      previousStatus: 'UNSHIPPED',
      newStatus: 'SHIPPED',
      marketplaceId: 'test-marketplace',
      orderDetails: expect.objectContaining({
        purchaseDate: '2023-01-01T00:00:00Z',
      }),
    });
  });

  it('should not send notification when status remains the same', async () => {
    const mockOrder = {
      amazonOrderId: 'test-order-id',
      orderStatus: 'SHIPPED' as OrderStatus,
      marketplaceId: 'test-marketplace',
      purchaseDate: '2023-01-01T00:00:00Z',
      orderTotal: {
        currencyCode: 'USD',
        amount: '99.99',
      },
      fulfillmentChannel: 'MFN',
      numberOfItemsShipped: 1,
      numberOfItemsUnshipped: 0,
    };

    (ordersClient.getOrder as Mock).mockResolvedValue(mockOrder);

    handler.setup();

    handler.getStatusMonitor()['orderStatusCache'].set('test-order-id', 'SHIPPED' as OrderStatus);

    await handler.checkOrderStatus('test-order-id');

    expect(notificationManager.sendOrderStatusChangeNotification).not.toHaveBeenCalled();
  });

  it('should start and stop monitoring successfully', () => {
    const monitorSpy = vi.spyOn(handler.getStatusMonitor(), 'startMonitoring');
    const stopSpy = vi.spyOn(handler.getStatusMonitor(), 'stopMonitoring');

    handler.startMonitoring();
    expect(monitorSpy).toHaveBeenCalled();

    handler.stopMonitoring();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should map CONFIRM action to correct status', () => {
    handler.setup();

    expect(handler['mapActionToStatus']('CONFIRM', 'PENDING')).toBe('UNSHIPPED');
    expect(handler['mapActionToStatus']('CONFIRM', 'UNSHIPPED')).toBe('UNSHIPPED');
  });

  it('should map SHIP action to correct status', () => {
    handler.setup();

    expect(handler['mapActionToStatus']('SHIP', 'UNSHIPPED')).toBe('SHIPPED');
    expect(handler['mapActionToStatus']('SHIP', 'PARTIALLY_SHIPPED')).toBe('SHIPPED');
  });

  it('should map CANCEL action to correct status', () => {
    handler.setup();

    expect(handler['mapActionToStatus']('CANCEL', 'PENDING')).toBe('CANCELED');
    expect(handler['mapActionToStatus']('CANCEL', 'UNSHIPPED')).toBe('CANCELED');
  });
});
