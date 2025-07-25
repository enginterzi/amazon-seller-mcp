/**
 * Basic example of using the Amazon Seller MCP Client
 */

import { AmazonSellerMcpServer, AmazonRegion } from '../../src/index.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    // Create a new MCP server instance
    const server = new AmazonSellerMcpServer({
      name: 'amazon-seller-mcp-example',
      version: '1.0.0',
      credentials: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
        refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
        // Optional IAM credentials for request signing
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER', // Default to US marketplace
      region: AmazonRegion.NA, // North America region
    });

    console.log('Connecting to MCP transport...');
    
    // Connect to the MCP transport
    await server.connect({
      type: 'stdio', // Use stdio transport for this example
    });

    console.log('Registering tools and resources...');
    
    // Register all tools and resources
    server.registerAllTools();
    server.registerAllResources();

    console.log('Server started successfully!');
    
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