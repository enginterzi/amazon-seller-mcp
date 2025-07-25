/**
 * Unit tests for order status notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OrderStatusChangeHandler,
  OrderMonitoringConfig,
} from '../../../src/server/order-notifications.js';
import { NotificationManager, NotificationType } from '../../../src/server/notifications.js';
import { OrdersClient, Order, OrderStatus } from '../../../src/api/orders-client.js';

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
    // Reset mocks
    vi.clearAllMocks();

    // Create mocked instances
    ordersClient = new OrdersClient({} as any);
    notificationManager = new NotificationManager({} as any);

    // Create handler
    handler = new OrderStatusChangeHandler(ordersClient, notificationManager, {
      enablePeriodicMonitoring: false,
    });
  });

  afterEach(() => {
    handler.cleanup();
  });

  describe('setup', () => {
    it('should override updateOrderStatus method', () => {
      // Setup
      handler.setup();

      // Verify
      expect(ordersClient.updateOrderStatus).not.toBe(undefined);
    });
  });

  describe('updateOrderStatus', () => {
    it('should send notification when order status changes', async () => {
      // Setup
      const mockOrder: Partial<Order> = {
        amazonOrderId: 'test-order-id',
        orderStatus: 'PENDING' as OrderStatus,
        marketplaceId: 'test-marketplace',
        purchaseDate: '2023-01-01T00:00:00Z',
      };

      (ordersClient.getOrder as any).mockResolvedValue(mockOrder);
      (ordersClient.updateOrderStatus as any).mockResolvedValue({ success: true });

      handler.setup();

      // Execute
      await ordersClient.updateOrderStatus({
        amazonOrderId: 'test-order-id',
        action: 'CONFIRM',
      });

      // Verify
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

    it('should not send notification when order status does not change', async () => {
      // Setup
      const mockOrder: Partial<Order> = {
        amazonOrderId: 'test-order-id',
        orderStatus: 'UNSHIPPED' as OrderStatus,
        marketplaceId: 'test-marketplace',
        purchaseDate: '2023-01-01T00:00:00Z',
      };

      (ordersClient.getOrder as any).mockResolvedValue(mockOrder);
      (ordersClient.updateOrderStatus as any).mockResolvedValue({ success: true });

      handler.setup();

      // Execute
      await ordersClient.updateOrderStatus({
        amazonOrderId: 'test-order-id',
        action: 'CONFIRM', // This won't change the status from UNSHIPPED
      });

      // Verify
      expect(notificationManager.sendOrderStatusChangeNotification).not.toHaveBeenCalled();
    });

    it('should not send notification when update fails', async () => {
      // Setup
      const mockOrder: Partial<Order> = {
        amazonOrderId: 'test-order-id',
        orderStatus: 'PENDING' as OrderStatus,
        marketplaceId: 'test-marketplace',
        purchaseDate: '2023-01-01T00:00:00Z',
      };

      (ordersClient.getOrder as any).mockResolvedValue(mockOrder);
      (ordersClient.updateOrderStatus as any).mockResolvedValue({ success: false });

      handler.setup();

      // Execute
      await ordersClient.updateOrderStatus({
        amazonOrderId: 'test-order-id',
        action: 'CONFIRM',
      });

      // Verify
      expect(notificationManager.sendOrderStatusChangeNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkOrderStatus', () => {
    it('should check order status and send notification if changed', async () => {
      // Setup
      const mockOrder: Partial<Order> = {
        amazonOrderId: 'test-order-id',
        orderStatus: 'SHIPPED' as OrderStatus,
        marketplaceId: 'test-marketplace',
        purchaseDate: '2023-01-01T00:00:00Z',
      };

      (ordersClient.getOrder as any).mockResolvedValue(mockOrder);

      handler.setup();

      // Set up the cache with a different status
      handler
        .getStatusMonitor()
        ['orderStatusCache'].set('test-order-id', 'UNSHIPPED' as OrderStatus);

      // Execute
      await handler.checkOrderStatus('test-order-id');

      // Verify
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

    it('should not send notification if status has not changed', async () => {
      // Setup
      const mockOrder: Partial<Order> = {
        amazonOrderId: 'test-order-id',
        orderStatus: 'SHIPPED' as OrderStatus,
        marketplaceId: 'test-marketplace',
        purchaseDate: '2023-01-01T00:00:00Z',
      };

      (ordersClient.getOrder as any).mockResolvedValue(mockOrder);

      handler.setup();

      // Set up the cache with the same status
      handler.getStatusMonitor()['orderStatusCache'].set('test-order-id', 'SHIPPED' as OrderStatus);

      // Execute
      await handler.checkOrderStatus('test-order-id');

      // Verify
      expect(notificationManager.sendOrderStatusChangeNotification).not.toHaveBeenCalled();
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      // Setup
      const monitorSpy = vi.spyOn(handler.getStatusMonitor(), 'startMonitoring');
      const stopSpy = vi.spyOn(handler.getStatusMonitor(), 'stopMonitoring');

      // Execute
      handler.startMonitoring();

      // Verify
      expect(monitorSpy).toHaveBeenCalled();

      // Execute
      handler.stopMonitoring();

      // Verify
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('mapActionToStatus', () => {
    it('should map CONFIRM action correctly', () => {
      // Setup
      handler.setup();

      // Execute & Verify
      expect(handler['mapActionToStatus']('CONFIRM', 'PENDING')).toBe('UNSHIPPED');
      expect(handler['mapActionToStatus']('CONFIRM', 'UNSHIPPED')).toBe('UNSHIPPED');
    });

    it('should map SHIP action correctly', () => {
      // Setup
      handler.setup();

      // Execute & Verify
      expect(handler['mapActionToStatus']('SHIP', 'UNSHIPPED')).toBe('SHIPPED');
      expect(handler['mapActionToStatus']('SHIP', 'PARTIALLY_SHIPPED')).toBe('SHIPPED');
    });

    it('should map CANCEL action correctly', () => {
      // Setup
      handler.setup();

      // Execute & Verify
      expect(handler['mapActionToStatus']('CANCEL', 'PENDING')).toBe('CANCELED');
      expect(handler['mapActionToStatus']('CANCEL', 'UNSHIPPED')).toBe('CANCELED');
    });
  });
});
