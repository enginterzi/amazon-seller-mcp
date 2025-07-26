/**
 * Comprehensive example of using the Amazon Seller MCP Client
 * 
 * This example demonstrates:
 * - Setting up the MCP server with HTTP transport
 * - Configuring authentication
 * - Using specific tools and resources
 * - Error handling
 * - Logging configuration
 */

import {
  AmazonSellerMcpServer,
  AmazonRegion,
  ApiError,
  ApiErrorType
} from '../../src/index.js';
import { NotificationType } from '../../src/server/notifications.js';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables from .env file
dotenv.config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'amazon-seller-mcp.log' })
  ]
});

async function main() {
  try {
    logger.info('Initializing Amazon Seller MCP Server');

    // Create a new MCP server instance with more detailed configuration
    const server = new AmazonSellerMcpServer({
      name: 'amazon-seller-mcp-comprehensive',
      version: '1.0.0',
      credentials: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
        refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
        // Optional IAM credentials for request signing
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        roleArn: process.env.AWS_ROLE_ARN,
      },
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER', // Default to US marketplace
      region: AmazonRegion.NA, // North America region
      debouncedNotifications: true, // Enable notification debouncing
    });

    logger.info('Connecting to HTTP transport');

    // Connect to the MCP transport with HTTP
    await server.connect({
      type: 'streamableHttp',
      httpOptions: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost', '127.0.0.1'],
        sessionManagement: true,
      }
    });

    logger.info('Registering tools and resources');

    // Register all tools and resources
    // Note: The server has private methods for selective registration,
    // but for this example we'll register everything
    server.registerAllTools();
    server.registerAllResources();

    // Get the notification manager
    const notificationManager = server.getNotificationManager();

    // Configure notification handlers
    notificationManager.onNotification((notification) => {
      if (notification.type === NotificationType.INVENTORY_CHANGE) {
        logger.info('Inventory change notification received', { notification });
      } else if (notification.type === NotificationType.ORDER_STATUS_CHANGE) {
        logger.info('Order status change notification received', { notification });
      } else {
        logger.info('Notification received', { notification });
      }
    });

    logger.info(`Server started successfully! Listening at http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}`);

    // Handle process termination
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await server.close();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Error starting server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  logger.error('Unhandled error in main function', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});