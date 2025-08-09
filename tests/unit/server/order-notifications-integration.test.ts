/**
 * Integration tests for order status change notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager, NotificationType } from '../../../src/server/notifications.js';
import {
  setupOrderStatusChangeNotifications,
  OrderStatusChangeHandler,
} from '../../../src/server/order-notifications.js';
import { OrdersClient, Order, OrderStatus } from '../../../src/api/orders-client.js';
import {
  NotificationServerMockFactory,
  OrdersClientMockFactory,
} from '../../utils/mock-factories/index.js';

// Mock API client modules
vi.mock('../../../src/api/base-client.js');
vi.mock('../../../src/api/orders-client.js');

describe('Order Status Change Notifications Integration', () => {
  let notificationManager: NotificationManager;
  let ordersClient: OrdersClient;
  let orderHandler: OrderStatusChangeHandler;
  let notificationListener: (notification: any) => void;

  let notificationServerFactory: NotificationServerMockFactory;
  let ordersClientFactory: OrdersClientMockFactory;

  let mockServer: any;
  let mockOrdersClient: any;
  let mockSendLoggingMessage: any;

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

    // Mock getOrder to return test data
    mockOrdersClient.getOrder = vi.fn().mockResolvedValue({
      amazonOrderId: 'test-order-id',
      orderStatus: 'PENDING' as OrderStatus,
      marketplaceId: 'ATVPDKIKX0DER',
      purchaseDate: '2023-01-01T00:00:00Z',
      lastUpdateDate: '2023-01-01T00:00:00Z',
      orderTotal: {
        currencyCode: 'USD',
        amount: 99.99,
      },
      fulfillmentChannel: 'AFN',
      numberOfItemsShipped: 0,
      numberOfItemsUnshipped: 2,
    } as Order);

    // Mock updateOrderStatus to return success
    mockOrdersClient.updateOrderStatus = vi.fn().mockResolvedValue({
      success: true,
      amazonOrderId: 'test-order-id',
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

  it('should send notification when order status is updated', async () => {
    // Update order status
    await ordersClient.updateOrderStatus({
      amazonOrderId: 'test-order-id',
      action: 'SHIP',
    });

    // Check that notification was sent through MCP server
    expect(mockSendLoggingMessage).toHaveBeenCalledTimes(1);
    expect(mockSendLoggingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        data: expect.objectContaining({
          title: expect.stringContaining('test-order-id'),
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
        orderId: 'test-order-id',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
      })
    );
  });

  it('should handle errors when getting current order', async () => {
    // Mock getOrder to throw an error
    mockOrdersClient.getOrder.mockRejectedValueOnce(new Error('Test error'));

    // Update order status
    await ordersClient.updateOrderStatus({
      amazonOrderId: 'test-order-id',
      action: 'SHIP',
    });

    // Check that no notification was sent (since we couldn't determine previous status due to error)
    expect(mockSendLoggingMessage).not.toHaveBeenCalled();
    expect(notificationListener).not.toHaveBeenCalled();
  });

  it('should not send notification when order status does not change', async () => {
    // Mock getOrder to return SHIPPED status
    mockOrdersClient.getOrder.mockResolvedValueOnce({
      amazonOrderId: 'test-order-id',
      orderStatus: 'SHIPPED' as OrderStatus,
      marketplaceId: 'ATVPDKIKX0DER',
      purchaseDate: '2023-01-01T00:00:00Z',
      lastUpdateDate: '2023-01-01T00:00:00Z',
    } as Order);

    // Update order status with SHIP action (which won't change SHIPPED status)
    await ordersClient.updateOrderStatus({
      amazonOrderId: 'test-order-id',
      action: 'SHIP',
    });

    // Check that no notification was sent
    expect(mockSendLoggingMessage).not.toHaveBeenCalled();
    expect(notificationListener).not.toHaveBeenCalled();
  });
});
