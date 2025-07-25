/**
 * Inventory notifications handler
 *
 * This file implements the inventory change notification handler
 */

import { NotificationManager } from './notifications.js';
import { InventoryClient } from '../api/inventory-client.js';

/**
 * Inventory change event data
 */
export interface InventoryChangeEvent {
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
 * Sets up inventory change notifications
 *
 * @param inventoryClient Inventory client
 * @param notificationManager Notification manager
 */
export function setupInventoryChangeNotifications(
  inventoryClient: InventoryClient,
  notificationManager: NotificationManager
): void {
  // Store original updateInventory method
  const originalUpdateInventory = inventoryClient.updateInventory.bind(inventoryClient);

  // Override updateInventory method to add notification support
  inventoryClient.updateInventory = async function (params, emitNotification = true) {
    const { sku, quantity, fulfillmentChannel } = params;

    // Get current inventory if notification is enabled
    let previousQuantity = 0;
    if (emitNotification) {
      try {
        const currentInventory = await inventoryClient.getInventoryBySku(sku);
        const currentDetail = currentInventory.inventoryDetails.find(
          (detail) => detail.fulfillmentChannelCode === fulfillmentChannel
        );
        previousQuantity = currentDetail?.quantity || 0;
      } catch (error) {
        // If we can't get the current inventory, just continue with the update
        console.warn(`Could not get current inventory for SKU ${sku}: ${(error as Error).message}`);
      }
    }

    // Call original method
    const result = await originalUpdateInventory(params);

    // Send notification if successful and notification is enabled
    if (emitNotification && result.status === 'SUCCESSFUL') {
      notificationManager.sendInventoryChangeNotification({
        sku,
        fulfillmentChannel,
        previousQuantity,
        newQuantity: quantity,
        marketplaceId: inventoryClient.getConfig().marketplaceId,
      });
    }

    return result;
  };

  console.log('Inventory change notifications set up');
}
