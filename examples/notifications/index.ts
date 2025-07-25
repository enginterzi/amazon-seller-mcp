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
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
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

    console.log('Connecting to MCP transport...');
    
    // Connect to the MCP transport
    await server.connect({
      type: 'stdio', // Use stdio transport for this example
    });

    console.log('Setting up notification handlers...');
    
    // Get the notification manager
    const notificationManager = server.getNotificationManager();
    
    // Set up inventory change notification handler
    notificationManager.onInventoryChange((notification) => {
      console.log('Inventory change notification received:');
      console.log(`  SKU: ${notification.data.sku}`);
      console.log(`  Old Quantity: ${notification.data.oldQuantity}`);
      console.log(`  New Quantity: ${notification.data.newQuantity}`);
      console.log(`  Fulfillment Channel: ${notification.data.fulfillmentChannel}`);
      
      // You can perform additional actions here, such as:
      // - Updating external systems
      // - Sending alerts if inventory is low
      // - Triggering restock processes
    });
    
    // Set up order status change notification handler
    notificationManager.onOrderStatusChange((notification) => {
      console.log('Order status change notification received:');
      console.log(`  Order ID: ${notification.data.orderId}`);
      console.log(`  Old Status: ${notification.data.oldStatus}`);
      console.log(`  New Status: ${notification.data.newStatus}`);
      
      // You can perform additional actions here, such as:
      // - Updating fulfillment systems
      // - Sending customer notifications
      // - Triggering shipping processes
    });
    
    // Set up a custom notification handler for all notifications
    notificationManager.onNotification((notification) => {
      console.log(`Received notification of type: ${notification.type}`);
      console.log(`  Title: ${notification.title}`);
      console.log(`  Description: ${notification.description}`);
      console.log(`  Timestamp: ${notification.timestamp}`);
      
      // Log notification data
      console.log('  Data:', JSON.stringify(notification.data, null, 2));
    });

    console.log('Registering tools and resources...');
    
    // Register all tools and resources
    server.registerAllTools();
    server.registerAllResources();

    console.log('Server started successfully!');
    
    // Simulate sending notifications (in a real scenario, these would come from Amazon)
    setTimeout(() => {
      console.log('\nSimulating inventory change notification...');
      notificationManager.sendNotification({
        type: 'inventory_update',
        title: 'Inventory Updated',
        description: 'Inventory levels have changed',
        data: {
          sku: 'ABC123',
          oldQuantity: 10,
          newQuantity: 5,
          fulfillmentChannel: 'AMAZON'
        },
      });
    }, 3000);
    
    setTimeout(() => {
      console.log('\nSimulating order status change notification...');
      notificationManager.sendNotification({
        type: 'order_status_change',
        title: 'Order Status Changed',
        description: 'An order status has been updated',
        data: {
          orderId: '123-4567890-1234567',
          oldStatus: 'PENDING',
          newStatus: 'SHIPPED',
        },
      });
    }, 6000);
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);