/**
 * Example of using notifications with the Amazon Seller MCP Client
 *
 * This example demonstrates:
 * - Setting up notification handlers
 * - Processing inventory change notifications
 * - Processing order status change notifications
 * - Custom notification handling
 */

import { AmazonSellerMcpServer, AmazonRegion } from '../../src/index.js';
import { NotificationType } from '../../src/server/notifications.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    // eslint-disable-next-line no-console
    console.log('Initializing Amazon Seller MCP Server with notifications');

    // Create a new MCP server instance with notifications enabled
    const server = new AmazonSellerMcpServer({
      name: 'amazon-seller-mcp-notifications',
      version: '1.0.0',
      credentials: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
        refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      region: AmazonRegion.NA,
      debouncedNotifications: true, // Enable notification debouncing
    });

    // eslint-disable-next-line no-console
    console.log('Connecting to MCP transport...');

    // Connect to the MCP transport
    await server.connect({
      type: 'stdio', // Use stdio transport for this example
    });

    // eslint-disable-next-line no-console
    console.log('Setting up notification handlers...');

    // Get the notification manager
    const notificationManager = server.getNotificationManager();

    // Set up a notification handler for all notifications
    notificationManager.onNotification((notification) => {
      // eslint-disable-next-line no-console
      console.log(`Received notification of type: ${notification.type}`);
      // eslint-disable-next-line no-console
      console.log(`  Timestamp: ${notification.timestamp}`);

      // Handle different notification types
      switch (notification.type) {
        case NotificationType.INVENTORY_CHANGE: {
          const invNotification =
            notification as import('../../src/server/notifications.js').InventoryChangeNotification;
          // eslint-disable-next-line no-console
          console.log('Inventory change notification received:');
          // eslint-disable-next-line no-console
          console.log(`  SKU: ${invNotification.sku}`);
          // eslint-disable-next-line no-console
          console.log(`  Previous Quantity: ${invNotification.previousQuantity}`);
          // eslint-disable-next-line no-console
          console.log(`  New Quantity: ${invNotification.newQuantity}`);
          // eslint-disable-next-line no-console
          console.log(`  Fulfillment Channel: ${invNotification.fulfillmentChannel}`);
          // eslint-disable-next-line no-console
          console.log(`  Marketplace ID: ${invNotification.marketplaceId}`);

          // You can perform additional actions here, such as:
          // - Updating external systems
          // - Sending alerts if inventory is low
          // - Triggering restock processes
          break;
        }

        case NotificationType.ORDER_STATUS_CHANGE: {
          const orderNotification =
            notification as import('../../src/server/notifications.js').OrderStatusChangeNotification;
          // eslint-disable-next-line no-console
          console.log('Order status change notification received:');
          // eslint-disable-next-line no-console
          console.log(`  Order ID: ${orderNotification.orderId}`);
          // eslint-disable-next-line no-console
          console.log(`  Previous Status: ${orderNotification.previousStatus}`);
          // eslint-disable-next-line no-console
          console.log(`  New Status: ${orderNotification.newStatus}`);
          // eslint-disable-next-line no-console
          console.log(`  Marketplace ID: ${orderNotification.marketplaceId}`);

          if (orderNotification.orderDetails) {
            // eslint-disable-next-line no-console
            console.log(`  Purchase Date: ${orderNotification.orderDetails.purchaseDate}`);
            if (orderNotification.orderDetails.orderTotal) {
              // eslint-disable-next-line no-console
              console.log(
                `  Order Total: ${orderNotification.orderDetails.orderTotal.amount} ${orderNotification.orderDetails.orderTotal.currencyCode}`
              );
            }
          }

          // You can perform additional actions here, such as:
          // - Updating fulfillment systems
          // - Sending customer notifications
          // - Triggering shipping processes
          break;
        }

        default:
          // eslint-disable-next-line no-console
          console.log('Unknown notification type received');
          // eslint-disable-next-line no-console
          console.log('  Notification:', JSON.stringify(notification, null, 2));
      }
    });

    // eslint-disable-next-line no-console
    console.log('Registering tools and resources...');

    // Register all tools and resources
    server.registerAllTools();
    server.registerAllResources();

    // eslint-disable-next-line no-console
    console.log('Server started successfully!');

    // Simulate sending notifications (in a real scenario, these would come from Amazon)
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log('\nSimulating inventory change notification...');
      notificationManager.sendInventoryChangeNotification({
        sku: 'ABC123',
        fulfillmentChannel: 'AMAZON',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      });
    }, 3000);

    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log('\nSimulating order status change notification...');
      notificationManager.sendOrderStatusChangeNotification({
        orderId: '123-4567890-1234567',
        previousStatus: 'PENDING',
        newStatus: 'SHIPPED',
        marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
        orderDetails: {
          purchaseDate: new Date().toISOString(),
          orderTotal: {
            currencyCode: 'USD',
            amount: 29.99,
          },
          fulfillmentChannel: 'AMAZON',
          numberOfItems: 1,
        },
      });
    }, 6000);

    // Handle process termination
    process.on('SIGINT', async () => {
      // eslint-disable-next-line no-console
      console.log('Shutting down server...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Run the main function
// eslint-disable-next-line no-console
main().catch(console.error);
