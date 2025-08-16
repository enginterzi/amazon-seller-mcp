/**
 * Example of extending the Amazon Seller MCP Client with custom tools and resources
 *
 * This example demonstrates:
 * - Creating custom tools
 * - Creating custom resources
 * - Integrating with the Amazon Selling Partner API
 * - Using the MCP sampling capability
 */

import { AmazonSellerMcpServer, AmazonRegion } from '../../src/index.js';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    // eslint-disable-next-line no-console
    console.log('Initializing Amazon Seller MCP Server');

    // Create a new MCP server instance
    const server = new AmazonSellerMcpServer({
      name: 'amazon-seller-mcp-custom',
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
    });

    // eslint-disable-next-line no-console
    console.log('Connecting to MCP transport...');

    // Connect to the MCP transport
    await server.connect({
      type: 'stdio', // Use stdio transport for this example
    });

    // eslint-disable-next-line no-console
    console.log('Registering standard tools and resources...');

    // Register standard tools and resources
    server.registerAllTools();
    server.registerAllResources();

    // eslint-disable-next-line no-console
    console.log('Registering custom tools...');

    // Register a custom tool for product bundle creation
    server.registerTool(
      'create-product-bundle',
      {
        title: 'Create Product Bundle',
        description: 'Create a bundle of products with a special price',
        inputSchema: z.object({
          bundleSku: z.string().describe('SKU for the bundle'),
          bundleName: z.string().describe('Name of the bundle'),
          productSkus: z.array(z.string()).describe('SKUs of products to include in the bundle'),
          bundlePrice: z.number().describe('Price for the bundle'),
          description: z.string().optional().describe('Description of the bundle'),
        }),
      },
      async ({ bundleSku, bundleName, productSkus, bundlePrice }) => {
        try {
          // eslint-disable-next-line no-console
          console.log(`Creating product bundle: ${bundleName} (${bundleSku})`);
          // eslint-disable-next-line no-console
          console.log(`Products: ${productSkus.join(', ')}`);
          // eslint-disable-next-line no-console
          console.log(`Price: ${bundlePrice}`);

          // In a real implementation, you would:
          // 1. Verify all product SKUs exist
          // 2. Create a new listing for the bundle
          // 3. Link the component products
          // 4. Set the bundle price

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          return {
            content: [
              {
                type: 'text',
                text: `Successfully created bundle "${bundleName}" with SKU ${bundleSku} containing ${productSkus.length} products.`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating bundle: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Register a custom tool for competitive price analysis
    server.registerTool(
      'analyze-competitive-pricing',
      {
        title: 'Analyze Competitive Pricing',
        description: 'Analyze competitive pricing for a product and suggest optimal price',
        inputSchema: z.object({
          sku: z.string().describe('SKU of the product to analyze'),
          targetMargin: z.number().optional().describe('Target profit margin percentage'),
        }),
      },
      async ({ sku, targetMargin = 15 }) => {
        try {
          // eslint-disable-next-line no-console
          console.log(`Analyzing competitive pricing for SKU: ${sku}`);
          // eslint-disable-next-line no-console
          console.log(`Target margin: ${targetMargin}%`);

          // In a real implementation, you would:
          // 1. Get the product details
          // 2. Get competitive pricing data
          // 3. Calculate optimal price based on target margin

          // Simulate API call and analysis
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Mock analysis results
          const mockResults = {
            sku,
            currentPrice: 29.99,
            competitivePrices: [
              { seller: 'Competitor A', price: 32.99 },
              { seller: 'Competitor B', price: 27.5 },
              { seller: 'Competitor C', price: 34.99 },
            ],
            averagePrice: 31.83,
            suggestedPrice: 30.49,
            estimatedMargin: targetMargin + 2.5,
          };

          // Generate a simple analysis summary
          const analysisText = `Based on the competitive analysis:
- Your current price of $${mockResults.currentPrice} is ${mockResults.currentPrice < mockResults.averagePrice ? 'below' : 'above'} the market average of $${mockResults.averagePrice}
- The suggested price of $${mockResults.suggestedPrice} would achieve your target margin of ${targetMargin}%
- This pricing positions you competitively while maintaining profitability`;

          /*const response = await mcpServer.createMessage({
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please provide a brief analysis of the competitive pricing data for SKU ${sku}:
                  
Current price: $${mockResults.currentPrice}
Competitive prices:
${mockResults.competitivePrices.map(cp => `- ${cp.seller}: $${cp.price}`).join('\n')}
Average market price: $${mockResults.averagePrice}
Suggested price: $${mockResults.suggestedPrice}
Estimated margin at suggested price: ${mockResults.estimatedMargin}%

Provide a concise analysis and recommendation based on this data.`
                },
              },
            ],
            maxTokens: 300,
          });
          
          */

          return {
            content: [
              {
                type: 'text',
                text:
                  `# Competitive Price Analysis for SKU: ${sku}\n\n` +
                  `Current price: $${mockResults.currentPrice}\n\n` +
                  `Competitive prices:\n` +
                  `${mockResults.competitivePrices.map((cp) => `- ${cp.seller}: $${cp.price}`).join('\n')}\n\n` +
                  `Average market price: $${mockResults.averagePrice}\n` +
                  `Suggested price: $${mockResults.suggestedPrice}\n` +
                  `Estimated margin at suggested price: ${mockResults.estimatedMargin}%\n\n` +
                  `## Analysis\n\n${analysisText}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error analyzing pricing: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // eslint-disable-next-line no-console
    console.log('Registering custom resources...');

    // Register a custom resource for product bundles
    server.registerResource(
      'product-bundle',
      'amazon-bundle://{bundleId}',
      {
        title: 'Product Bundle',
        description: 'Bundle of products sold together',
      },
      async (uri, { bundleId }) => {
        try {
          // eslint-disable-next-line no-console
          console.log(`Retrieving product bundle: ${bundleId}`);

          // In a real implementation, you would fetch the bundle data from Amazon SP-API
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Mock bundle data
          const mockBundle = {
            id: bundleId,
            name: `Sample Bundle ${bundleId}`,
            sku: `BUNDLE-${bundleId}`,
            products: [
              { sku: 'PROD-A', name: 'Product A', quantity: 1 },
              { sku: 'PROD-B', name: 'Product B', quantity: 2 },
              { sku: 'PROD-C', name: 'Product C', quantity: 1 },
            ],
            price: 49.99,
            savings: 15.98,
            description: 'This bundle includes multiple products at a discounted price.',
          };

          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(mockBundle, null, 2),
                mimeType: 'application/json',
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to retrieve bundle: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
      'amazon-bundle://list', // List template
      {
        bundleId: async (value) => {
          // Provide completions for the 'bundleId' parameter
          const mockIds = ['001', '002', '003', '004', '005'];
          return mockIds.filter((id) => id.startsWith(value));
        },
      }
    );

    // Register a custom resource for sales performance
    server.registerResource(
      'sales-performance',
      'amazon-performance://{timeframe}',
      {
        title: 'Sales Performance',
        description: 'Sales performance metrics',
      },
      async (uri, { timeframe }) => {
        try {
          // eslint-disable-next-line no-console
          console.log(`Retrieving sales performance for timeframe: ${timeframe}`);

          // In a real implementation, you would fetch performance data from Amazon SP-API
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1200));

          // Mock performance data based on timeframe
          let mockData: Record<string, unknown>;

          switch (timeframe) {
            case 'daily':
              mockData = {
                timeframe: 'daily',
                date: new Date().toISOString().split('T')[0],
                metrics: {
                  totalSales: 1245.67,
                  orderCount: 32,
                  unitsSold: 45,
                  averageOrderValue: 38.93,
                  returnRate: 2.2,
                },
                topProducts: [
                  { sku: 'PROD-A', sales: 450.0, units: 15 },
                  { sku: 'PROD-B', sales: 299.97, units: 9 },
                  { sku: 'PROD-C', sales: 199.98, units: 6 },
                ],
              };
              break;
            case 'weekly':
              mockData = {
                timeframe: 'weekly',
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                metrics: {
                  totalSales: 8734.56,
                  orderCount: 224,
                  unitsSold: 315,
                  averageOrderValue: 39.0,
                  returnRate: 2.5,
                },
                topProducts: [
                  { sku: 'PROD-A', sales: 3150.0, units: 105 },
                  { sku: 'PROD-B', sales: 2099.79, units: 63 },
                  { sku: 'PROD-C', sales: 1399.86, units: 42 },
                ],
              };
              break;
            case 'monthly':
              mockData = {
                timeframe: 'monthly',
                month: new Date().toISOString().split('T')[0].substring(0, 7),
                metrics: {
                  totalSales: 35429.87,
                  orderCount: 912,
                  unitsSold: 1287,
                  averageOrderValue: 38.85,
                  returnRate: 2.8,
                },
                topProducts: [
                  { sku: 'PROD-A', sales: 12750.0, units: 425 },
                  { sku: 'PROD-B', sales: 8665.89, units: 259 },
                  { sku: 'PROD-C', sales: 5599.44, units: 168 },
                ],
              };
              break;
            default:
              mockData = {
                timeframe: 'unknown',
                error: 'Invalid timeframe specified. Use "daily", "weekly", or "monthly".',
              };
          }

          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(mockData, null, 2),
                mimeType: 'application/json',
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to retrieve performance data: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
      undefined, // No list template
      {
        timeframe: async (value) => {
          // Provide completions for the 'timeframe' parameter
          const timeframes = ['daily', 'weekly', 'monthly'];
          return timeframes.filter((tf) => tf.startsWith(value));
        },
      }
    );

    // eslint-disable-next-line no-console
    console.log('Server started successfully!');

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
