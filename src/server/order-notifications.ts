/**
 * Order notifications handler
 *
 * This file implements the order status change notification handler
 */

import { NotificationManager } from './notifications.js';
import { OrdersClient, Order, OrderStatus } from '../api/orders-client.js';
import { getLogger } from '../utils/logger.js';

/**
 * Order status change event data
 */
export interface OrderStatusChangeEvent {
  /**
   * Order ID
   */
  orderId: string;

  /**
   * Previous status
   */
  previousStatus: string;

  /**
   * New status
   */
  newStatus: string;

  /**
   * Marketplace ID
   */
  marketplaceId: string;

  /**
   * Timestamp of the change
   */
  timestamp: string;

  /**
   * Additional order details
   */
  orderDetails?: {
    /**
     * Purchase date
     */
    purchaseDate: string;

    /**
     * Order total
     */
    orderTotal?: {
      currencyCode: string;
      amount: number;
    };

    /**
     * Fulfillment channel
     */
    fulfillmentChannel?: string;

    /**
     * Number of items
     */
    numberOfItems?: number;
  };
}

/**
 * Order monitoring configuration
 */
export interface OrderMonitoringConfig {
  /**
   * Whether to enable periodic order status monitoring
   */
  enablePeriodicMonitoring?: boolean;

  /**
   * Monitoring interval in milliseconds (default: 5 minutes)
   */
  monitoringInterval?: number;

  /**
   * Maximum number of orders to monitor per check (default: 100)
   */
  maxOrdersPerCheck?: number;

  /**
   * How far back to look for orders to monitor (in hours, default: 24)
   */
  monitoringWindowHours?: number;
}

/**
 * Order status monitor class
 */
export class OrderStatusMonitor {
  private ordersClient: OrdersClient;
  private notificationManager: NotificationManager;
  private config: OrderMonitoringConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private orderStatusCache: Map<string, OrderStatus> = new Map();
  private isMonitoring: boolean = false;

  constructor(
    ordersClient: OrdersClient,
    notificationManager: NotificationManager,
    config: OrderMonitoringConfig = {}
  ) {
    this.ordersClient = ordersClient;
    this.notificationManager = notificationManager;
    this.config = {
      enablePeriodicMonitoring: config.enablePeriodicMonitoring ?? false,
      monitoringInterval: config.monitoringInterval ?? 5 * 60 * 1000, // 5 minutes
      maxOrdersPerCheck: config.maxOrdersPerCheck ?? 100,
      monitoringWindowHours: config.monitoringWindowHours ?? 24,
    };
  }

  /**
   * Starts monitoring order status changes
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      getLogger().info('Order status monitoring is already running');
      return;
    }

    if (!this.config.enablePeriodicMonitoring) {
      getLogger().info('Periodic order monitoring is disabled');
      return;
    }

    getLogger().info(
      `Starting order status monitoring (interval: ${this.config.monitoringInterval}ms)`
    );

    this.isMonitoring = true;

    // Initial check
    this.checkOrderStatusChanges().catch((error) => {
      getLogger().error('Error in initial order status check:', {
        error: (error as Error).message,
      });
    });

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkOrderStatusChanges().catch((error) => {
        getLogger().error('Error in periodic order status check:', {
          error: (error as Error).message,
        });
      });
    }, this.config.monitoringInterval);
  }

  /**
   * Stops monitoring order status changes
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      getLogger().info('Order status monitoring is not running');
      return;
    }

    getLogger().info('Stopping order status monitoring');

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Checks for order status changes
   */
  private async checkOrderStatusChanges(): Promise<void> {
    try {
      // Calculate the time window for monitoring
      const now = new Date();
      const windowStart = new Date(
        now.getTime() - this.config.monitoringWindowHours! * 60 * 60 * 1000
      );

      // Get recent orders
      const ordersResult = await this.ordersClient.getOrders({
        lastUpdatedAfter: windowStart.toISOString(),
        maxResultsPerPage: this.config.maxOrdersPerCheck,
        orderStatuses: [
          'PENDING',
          'UNSHIPPED',
          'PARTIALLY_SHIPPED',
          'SHIPPED',
          'CANCELED',
          'UNFULFILLABLE',
        ],
      });

      // Check each order for status changes
      for (const order of ordersResult.orders) {
        await this.checkSingleOrderStatusChange(order);
      }

      console.log(`Checked ${ordersResult.orders.length} orders for status changes`);
    } catch (error) {
      console.error('Error checking order status changes:', error);
    }
  }

  /**
   * Checks a single order for status changes
   */
  private async checkSingleOrderStatusChange(order: Order): Promise<void> {
    const orderId = order.amazonOrderId;
    const currentStatus = order.orderStatus;
    const previousStatus = this.orderStatusCache.get(orderId);

    // Update cache with current status
    this.orderStatusCache.set(orderId, currentStatus);

    // If we have a previous status and it's different, send notification
    if (previousStatus && previousStatus !== currentStatus) {
      console.log(`Order ${orderId} status changed from ${previousStatus} to ${currentStatus}`);

      this.notificationManager.sendOrderStatusChangeNotification({
        orderId,
        previousStatus,
        newStatus: currentStatus,
        marketplaceId: order.marketplaceId,
        orderDetails: {
          purchaseDate: order.purchaseDate,
          orderTotal: order.orderTotal,
          fulfillmentChannel: order.fulfillmentChannel,
          numberOfItems: (order.numberOfItemsShipped || 0) + (order.numberOfItemsUnshipped || 0),
        },
      });
    }
  }

  /**
   * Manually checks a specific order for status changes
   */
  public async checkOrderStatus(orderId: string): Promise<void> {
    try {
      const order = await this.ordersClient.getOrder({ amazonOrderId: orderId });
      await this.checkSingleOrderStatusChange(order);
    } catch (error) {
      console.error(`Error checking status for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the current monitoring status
   */
  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Gets the monitoring configuration
   */
  public getConfig(): OrderMonitoringConfig {
    return { ...this.config };
  }

  /**
   * Updates the monitoring configuration
   */
  public updateConfig(newConfig: Partial<OrderMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart monitoring if it's currently active and interval changed
    if (this.isMonitoring && newConfig.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Clears the order status cache
   */
  public clearCache(): void {
    this.orderStatusCache.clear();
    console.log('Order status cache cleared');
  }

  /**
   * Gets the current cache size
   */
  public getCacheSize(): number {
    return this.orderStatusCache.size;
  }
}

/**
 * Enhanced order status change notification handler
 */
export class OrderStatusChangeHandler {
  private ordersClient: OrdersClient;
  private notificationManager: NotificationManager;
  private statusMonitor: OrderStatusMonitor;

  constructor(
    ordersClient: OrdersClient,
    notificationManager: NotificationManager,
    monitoringConfig: OrderMonitoringConfig = {}
  ) {
    this.ordersClient = ordersClient;
    this.notificationManager = notificationManager;
    this.statusMonitor = new OrderStatusMonitor(
      ordersClient,
      notificationManager,
      monitoringConfig
    );
  }

  /**
   * Sets up order status change notifications
   */
  public setup(): void {
    // Override updateOrderStatus method to add notification support
    this.setupUpdateOrderStatusNotifications();

    // Start monitoring if enabled
    this.statusMonitor.startMonitoring();

    console.log('Order status change notifications set up');
  }

  /**
   * Sets up notifications for updateOrderStatus method calls
   */
  private setupUpdateOrderStatusNotifications(): void {
    // Store original updateOrderStatus method
    const originalUpdateOrderStatus = this.ordersClient.updateOrderStatus.bind(this.ordersClient);

    // Override updateOrderStatus method to add notification support
    this.ordersClient.updateOrderStatus = async (params, emitNotification = true) => {
      const { amazonOrderId, action } = params;

      // Get current order status if notification is enabled
      let previousStatus = '';
      let orderDetails: OrderStatusChangeEvent['orderDetails'];
      let marketplaceId = '';

      if (emitNotification) {
        try {
          const currentOrder = await this.ordersClient.getOrder({ amazonOrderId });
          previousStatus = currentOrder.orderStatus;
          marketplaceId = currentOrder.marketplaceId;
          orderDetails = {
            purchaseDate: currentOrder.purchaseDate,
            orderTotal: currentOrder.orderTotal,
            fulfillmentChannel: currentOrder.fulfillmentChannel,
            numberOfItems:
              (currentOrder.numberOfItemsShipped || 0) + (currentOrder.numberOfItemsUnshipped || 0),
          };
        } catch (error) {
          // If we can't get the current order, just continue with the update
          console.warn(
            `Could not get current order for ID ${amazonOrderId}: ${(error as Error).message}`
          );
        }
      }

      // Call original method
      const result = await originalUpdateOrderStatus(params);

      // Send notification if successful and notification is enabled
      if (emitNotification && result.success) {
        // Determine new status based on action
        const newStatus = this.mapActionToStatus(action, previousStatus);

        // Only send notification if we have both previous and new status and they're different
        if (previousStatus && newStatus && previousStatus !== newStatus) {
          this.notificationManager.sendOrderStatusChangeNotification({
            orderId: amazonOrderId,
            previousStatus,
            newStatus,
            marketplaceId: marketplaceId,
            orderDetails,
          });

          // Update the monitor's cache
          this.statusMonitor['orderStatusCache'].set(amazonOrderId, newStatus as OrderStatus);
        }
      }

      return result;
    };
  }

  /**
   * Maps an action to the expected new status
   */
  private mapActionToStatus(action: string, currentStatus: string): string {
    switch (action) {
      case 'CONFIRM':
        // Confirmation typically moves from PENDING to UNSHIPPED
        return currentStatus === 'PENDING' ? 'UNSHIPPED' : currentStatus;

      case 'SHIP':
        // Shipping moves to SHIPPED or PARTIALLY_SHIPPED
        return currentStatus === 'UNSHIPPED'
          ? 'SHIPPED'
          : currentStatus === 'PARTIALLY_SHIPPED'
            ? 'SHIPPED'
            : 'SHIPPED';

      case 'CANCEL':
        // Cancellation moves to CANCELED
        return 'CANCELED';

      default:
        console.warn(`Unknown action: ${action}`);
        return currentStatus;
    }
  }

  /**
   * Gets the status monitor
   */
  public getStatusMonitor(): OrderStatusMonitor {
    return this.statusMonitor;
  }

  /**
   * Manually checks an order for status changes
   */
  public async checkOrderStatus(orderId: string): Promise<void> {
    return this.statusMonitor.checkOrderStatus(orderId);
  }

  /**
   * Starts monitoring
   */
  public startMonitoring(): void {
    this.statusMonitor.startMonitoring();
  }

  /**
   * Stops monitoring
   */
  public stopMonitoring(): void {
    this.statusMonitor.stopMonitoring();
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    this.statusMonitor.stopMonitoring();
    this.statusMonitor.clearCache();
  }
}

/**
 * Sets up order status change notifications (backward compatibility)
 *
 * @param ordersClient Orders client
 * @param notificationManager Notification manager
 * @param monitoringConfig Optional monitoring configuration
 */
export function setupOrderStatusChangeNotifications(
  ordersClient: OrdersClient,
  notificationManager: NotificationManager,
  monitoringConfig: OrderMonitoringConfig = {}
): OrderStatusChangeHandler {
  const handler = new OrderStatusChangeHandler(ordersClient, notificationManager, monitoringConfig);
  handler.setup();
  return handler;
}
