/**
 * Integration tests for order status monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationManager,
  NotificationType,
  type NotificationData,
} from '../../../src/server/notifications.js';
import {
  setupOrderStatusChangeNotifications,
  OrderStatusChangeHandler,
} from '../../../src/server/order-notifications.js';
import { OrdersClient, Order, OrderStatus } from '../../../src/api/orders-client.js';
import {
  NotificationServerMockFactory,
  OrdersClientMockFactory,
  type MockServerForNotifications,
  type MockOrdersClient,
} from '../../utils/mock-factories/index.js';

// Mock API client modules
vi.mock('../../../src/api/base-client.js');
vi.mock('../../../src/api/orders-client.js');

describe('Order Status Monitoring Integration', () => {
  let notificationManager: NotificationManager;
  let ordersClient: OrdersClient;
  let orderHandler: OrderStatusChangeHandler;
  let notificationListener: (notification: NotificationData) => void;

  let notificationServerFactory: NotificationServerMockFactory;
  let ordersClientFactory: OrdersClientMockFactory;

  let mockServer: MockServerForNotifications;
  let mockOrdersClient: MockOrdersClient;
  let mockSendLoggingMessage: Mock;

  beforeEach(() => {
    // Create mock factories
    notificationServerFactory = new NotificationServerMockFactory();
    ordersClientFactory = new OrdersClientMockFactory();

    // Create mock instances
    mockServer = notificationServerFactory.create();
    mockOrdersClient = ordersClientFactory.create();
    mockSendLoggingMessage = mockServer.server.sendLoggingMessage;

    // Setup mocks
    vi.mocked(OrdersClient).mockImplementation(() => mockOrdersClient);

    // Create notification manager with non-debounced notifications for easier testing
    notificationManager = new NotificationManager(mockServer, { debounced: false });

    // Create clients using mocked constructors
    ordersClient = new OrdersClient({} as any);

    // Mock getOrders to return test data
    mockOrdersClient.getOrders = vi.fn().mockResolvedValue({
      orders: [],
      nextToken: null,
    });

    // Setup order status change notifications
    orderHandler = setupOrderStatusChangeNotifications(ordersClient, notificationManager);

    // Setup notification listener
    notificationListener = vi.fn();
    notificationManager.addListener('notification', notificationListener);
  });

  afterEach(() => {
    // Clean up
    notificationManager.clearPendingNotifications();
    if (orderHandler) {
      orderHandler.cleanup();
    }
    if (notificationListener) {
      notificationManager.eventEmitter?.removeListener('notification', notificationListener);
    }
    notificationServerFactory.reset();
    ordersClientFactory.reset();
  });

  it('should detect order status changes during monitoring', async () => {
    // Set up the cache with initial statuses
    const monitor = orderHandler.getStatusMonitor();
    monitor['orderStatusCache'].set('test-order-1', 'PENDING' as OrderStatus);
    monitor['orderStatusCache'].set('test-order-2', 'PENDING' as OrderStatus);

    // Mock getOrders to return updated statuses
    mockOrdersClient.getOrders.mockResolvedValueOnce({
      orders: [
        {
          amazonOrderId: 'test-order-1',
          orderStatus: 'PENDING' as OrderStatus, // Unchanged
          marketplaceId: 'ATVPDKIKX0DER',
          purchaseDate: '2023-01-01T00:00:00Z',
          lastUpdateDate: '2023-01-01T00:00:00Z',
        },
        {
          amazonOrderId: 'test-order-2',
          orderStatus: 'SHIPPED' as OrderStatus, // Changed from PENDING
          marketplaceId: 'ATVPDKIKX0DER',
          purchaseDate: '2023-01-02T00:00:00Z',
          lastUpdateDate: '2023-01-02T00:00:00Z',
        },
      ] as Order[],
      nextToken: null,
    });

    // Trigger monitoring check
    await monitor['checkOrderStatusChanges']();

    // Check that notification was sent for the changed order only
    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining('test-order-2'),
          description: expect.stringContaining('PENDING to SHIPPED'),
          type: 'order_status_change',
        }),
      })
    );

    // Check that notification listener was called
    expect(notificationListener).toHaveBeenCalledTimes(1);
    expect(notificationListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.ORDER_STATUS_CHANGE,
        orderId: 'test-order-2',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
      })
    );
  });

  it('should handle errors during monitoring', async () => {
    // Mock getOrders to throw an error
    mockOrdersClient.getOrders.mockRejectedValueOnce(new Error('Test error'));

    // Trigger monitoring check
    const monitor = orderHandler.getStatusMonitor();
    await monitor['checkOrderStatusChanges']();

    // Check that no notification was sent (due to error)
    expect(mockSendLoggingMessage).not.toHaveBeenCalled();
    expect(notificationListener).not.toHaveBeenCalled();
  });
});
