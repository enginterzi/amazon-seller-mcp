/**
 * Notification manager for MCP server
 *
 * This file implements notification handling for the MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EventEmitter } from 'events';

/**
 * Notification types
 */
export enum NotificationType {
  INVENTORY_CHANGE = 'inventory_change',
  ORDER_STATUS_CHANGE = 'order_status_change',
}

/**
 * Base notification interface
 */
export interface Notification {
  /**
   * Notification type
   */
  type: NotificationType;

  /**
   * Timestamp when the notification was created
   */
  timestamp: string;
}

/**
 * Inventory change notification
 */
export interface InventoryChangeNotification extends Notification {
  /**
   * Notification type (always INVENTORY_CHANGE)
   */
  type: NotificationType.INVENTORY_CHANGE;

  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Fulfillment channel
   */
  fulfillmentChannel: 'AMAZON' | 'SELLER';

  /**
   * Previous quantity
   */
  previousQuantity: number;

  /**
   * New quantity
   */
  newQuantity: number;

  /**
   * Marketplace ID
   */
  marketplaceId: string;
}

/**
 * Order status change notification
 */
export interface OrderStatusChangeNotification extends Notification {
  /**
   * Notification type (always ORDER_STATUS_CHANGE)
   */
  type: NotificationType.ORDER_STATUS_CHANGE;

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
 * Notification manager options
 */
export interface NotificationManagerOptions {
  /**
   * Whether to debounce notifications
   */
  debounced?: boolean;

  /**
   * Debounce time in milliseconds
   */
  debounceTime?: number;
}

/**
 * Notification manager class
 * Handles sending notifications through the MCP server
 */
export class NotificationManager {
  /**
   * MCP server instance
   */
  private server: McpServer;

  /**
   * Event emitter for internal events
   */
  private eventEmitter: EventEmitter;

  /**
   * Whether to debounce notifications
   */
  private debounced: boolean;

  /**
   * Debounce time in milliseconds
   */
  private debounceTime: number;

  /**
   * Map of pending notifications
   */
  private pendingNotifications: Map<
    string,
    { notification: Notification; timeout: NodeJS.Timeout }
  >;

  /**
   * Creates a new notification manager
   *
   * @param server MCP server instance
   * @param options Notification manager options
   */
  constructor(server: McpServer, options: NotificationManagerOptions = {}) {
    this.server = server;
    this.eventEmitter = new EventEmitter();
    this.debounced = options.debounced ?? false;
    this.debounceTime = options.debounceTime ?? 1000; // Default to 1 second
    this.pendingNotifications = new Map();

    console.log(
      `Notification manager initialized (debounced: ${this.debounced}, debounceTime: ${this.debounceTime}ms)`
    );
  }

  /**
   * Sends an inventory change notification
   *
   * @param notification Inventory change notification
   */
  public sendInventoryChangeNotification(
    notification: Omit<InventoryChangeNotification, 'type' | 'timestamp'>
  ): void {
    const fullNotification: InventoryChangeNotification = {
      ...notification,
      type: NotificationType.INVENTORY_CHANGE,
      timestamp: new Date().toISOString(),
    };

    this.sendNotification(fullNotification).catch((error) => {
      console.error('Error sending inventory change notification:', error);
    });
  }

  /**
   * Sends an order status change notification
   *
   * @param notification Order status change notification
   */
  public sendOrderStatusChangeNotification(
    notification: Omit<OrderStatusChangeNotification, 'type' | 'timestamp'>
  ): void {
    const fullNotification: OrderStatusChangeNotification = {
      ...notification,
      type: NotificationType.ORDER_STATUS_CHANGE,
      timestamp: new Date().toISOString(),
    };

    this.sendNotification(fullNotification).catch((error) => {
      console.error('Error sending order status change notification:', error);
    });
  }

  /**
   * Sends a notification through the MCP server
   *
   * @param notification Notification to send
   */
  private async sendNotification(notification: Notification): Promise<void> {
    if (this.debounced) {
      this.sendDebouncedNotification(notification);
    } else {
      this.sendImmediateNotification(notification).catch((error) => {
        console.error('Error sending immediate notification:', error);
      });
    }
  }

  /**
   * Sends a notification immediately
   *
   * @param notification Notification to send
   */
  private async sendImmediateNotification(notification: Notification): Promise<void> {
    try {
      // Format notification based on type
      let title: string;
      let description: string;
      let content: string;

      switch (notification.type) {
        case NotificationType.INVENTORY_CHANGE: {
          const invNotification = notification as InventoryChangeNotification;
          title = `Inventory Change: SKU ${invNotification.sku}`;
          description = `Inventory quantity changed from ${invNotification.previousQuantity} to ${invNotification.newQuantity}`;
          content = JSON.stringify(invNotification, null, 2);
          break;
        }
        case NotificationType.ORDER_STATUS_CHANGE: {
          const orderNotification = notification as OrderStatusChangeNotification;
          title = `Order Status Change: Order ${orderNotification.orderId}`;
          description = `Order status changed from ${orderNotification.previousStatus} to ${orderNotification.newStatus}`;
          content = JSON.stringify(orderNotification, null, 2);
          break;
        }
        default:
          title = 'Notification';
          description = 'A notification was received';
          content = JSON.stringify(notification, null, 2);
      }

      // Send notification through MCP server logging
      await this.server.server.sendLoggingMessage({
        level: 'info',
        data: {
          title,
          description,
          content,
          type: notification.type,
          timestamp: notification.timestamp,
        },
      });

      // Emit event for internal listeners
      this.eventEmitter.emit('notification', notification);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Sends a debounced notification
   *
   * @param notification Notification to send
   */
  private sendDebouncedNotification(notification: Notification): void {
    let key: string;

    // Create a unique key based on notification type and identifier
    switch (notification.type) {
      case NotificationType.INVENTORY_CHANGE: {
        const invNotification = notification as InventoryChangeNotification;
        key = `${notification.type}:${invNotification.sku}:${invNotification.fulfillmentChannel}`;
        break;
      }
      case NotificationType.ORDER_STATUS_CHANGE: {
        const orderNotification = notification as OrderStatusChangeNotification;
        key = `${notification.type}:${orderNotification.orderId}`;
        break;
      }
      default:
        key = `${notification.type}:${Date.now()}`;
    }

    // Clear existing timeout if any
    if (this.pendingNotifications.has(key)) {
      clearTimeout(this.pendingNotifications.get(key)!.timeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      if (this.pendingNotifications.has(key)) {
        const { notification } = this.pendingNotifications.get(key)!;
        this.pendingNotifications.delete(key);
        this.sendImmediateNotification(notification).catch((error) => {
          console.error('Error sending debounced notification:', error);
        });
      }
    }, this.debounceTime);

    // Store notification and timeout
    this.pendingNotifications.set(key, { notification, timeout });
  }

  /**
   * Adds an event listener for notifications
   *
   * @param listener Listener function
   */
  public onNotification(listener: (notification: Notification) => void): void {
    this.eventEmitter.on('notification', listener);
  }

  /**
   * Removes an event listener
   *
   * @param listener Listener function to remove
   */
  public removeListener(listener: (notification: Notification) => void): void {
    this.eventEmitter.removeListener('notification', listener);
  }

  /**
   * Clears all pending notifications
   */
  public clearPendingNotifications(): void {
    for (const { timeout } of this.pendingNotifications.values()) {
      clearTimeout(timeout);
    }

    this.pendingNotifications.clear();
  }
}
