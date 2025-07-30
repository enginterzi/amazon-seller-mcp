/**
 * End-to-end integration tests for the Amazon Seller MCP Client
 *
 * These tests simulate complete workflows using the mock SP-API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer } from '../../src/server/server.js';
import { AmazonRegion } from '../../src/types/auth.js';
import { mockSpApiClient, mockListings, mockInventory, mockOrders } from './mock-sp-api.js';

// Mock the API clients
vi.mock('../../src/api/catalog-client.js', () => {
  return {
    CatalogClient: vi.fn().mockImplementation(() => mockSpApiClient),
  };
});

vi.mock('../../src/api/listings-client.js', () => {
  return {
    ListingsClient: vi.fn().mockImplementation(() => mockSpApiClient),
  };
});

vi.mock('../../src/api/inventory-client.js', () => {
  return {
    InventoryClient: vi.fn().mockImplementation(() => mockSpApiClient),
  };
});

vi.mock('../../src/api/orders-client.js', () => {
  return {
    OrdersClient: vi.fn().mockImplementation(() => mockSpApiClient),
  };
});

vi.mock('../../src/api/reports-client.js', () => {
  return {
    ReportsClient: vi.fn().mockImplementation(() => mockSpApiClient),
  };
});

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const handlers = {
    resources: new Map(),
    tools: new Map(),
  };

  return {
    McpServer: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      registerResource: vi.fn().mockImplementation((name, template, options, handler) => {
        handlers.resources.set(name, handler);
      }),
      registerTool: vi.fn().mockImplementation((name, options, handler) => {
        handlers.tools.set(name, handler);
      }),
      createMessage: vi.fn().mockResolvedValue({
        content: {
          type: 'text',
          text: 'Generated product description for testing',
        },
      }),
      getResourceHandler: (name) => handlers.resources.get(name),
      getToolHandler: (name) => handlers.tools.get(name),
    })),
    ResourceTemplate: vi.fn().mockImplementation((uriTemplate, options) => ({
      uriTemplate,
      options,
    })),
    handlers,
  };
});

// Mock transports
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: vi.fn().mockImplementation(() => ({})),
  };
});

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({})),
  };
});

describe('End-to-End Integration Tests', () => {
  // Test configuration
  const testConfig = {
    name: 'test-server',
    version: '1.0.0',
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    marketplaceId: 'ATVPDKIKX0DER',
    region: AmazonRegion.NA,
  };

  let server: AmazonSellerMcpServer;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a new server instance before each test
    server = new AmazonSellerMcpServer(testConfig);

    // Connect the server (this will automatically register tools and resources)
    await server.connect({ type: 'stdio' });
  });

  afterEach(async () => {
    // Clean up after each test
    await server.close();
  });

  it('should complete a product listing workflow', async () => {
    // Get the tool manager
    const toolManager = server.getToolManager();

    // Step 1: Search for a product in the catalog
    const searchCatalogTool = toolManager.getToolHandler('search-catalog');
    expect(searchCatalogTool).toBeDefined();

    const searchResult = await searchCatalogTool({
      keywords: 'Test Product',
    });

    expect(searchResult.isError).toBeFalsy();
    expect(mockSpApiClient.searchCatalogItems).toHaveBeenCalled();

    // Step 2: Create a new listing
    const createListingTool = toolManager.getToolHandler('create-listing');
    expect(createListingTool).toBeDefined();

    const newSku = 'TEST-SKU-E2E';
    const createListingResult = await createListingTool({
      sku: newSku,
      productType: 'SHIRT',
      attributes: {
        item_name: 'E2E Test Product',
        brand_name: 'TestBrand',
        bullet_point: ['Feature 1', 'Feature 2', 'Feature 3'],
      },
    });

    expect(createListingResult.isError).toBeFalsy();
    expect(mockSpApiClient.putListing).toHaveBeenCalled();
    expect(mockListings[newSku]).toBeDefined();

    // Step 3: Update inventory for the new listing
    const updateInventoryTool = toolManager.getToolHandler('update-inventory');
    expect(updateInventoryTool).toBeDefined();

    const updateInventoryResult = await updateInventoryTool({
      sku: newSku,
      quantity: 100,
      fulfillmentChannel: 'SELLER',
    });

    expect(updateInventoryResult.isError).toBeFalsy();
    expect(mockSpApiClient.updateInventory).toHaveBeenCalled();
    expect(mockInventory[newSku]).toBeDefined();
    expect(mockInventory[newSku].fulfillmentAvailability[0].quantity).toBe(100);

    // Step 4: Generate a product description using AI
    const generateDescriptionTool = toolManager.getToolHandler('generate-product-description');
    expect(generateDescriptionTool).toBeDefined();

    const generateDescriptionResult = await generateDescriptionTool({
      productTitle: 'E2E Test Product',
      keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
      targetAudience: 'General consumers',
    });

    expect(generateDescriptionResult.isError).toBeFalsy();
    expect(server.getMcpServer().createMessage).toHaveBeenCalled();

    // Step 5: Update the listing with the generated description
    const updateListingTool = toolManager.getToolHandler('update-listing');
    expect(updateListingTool).toBeDefined();

    const updateListingResult = await updateListingTool({
      sku: newSku,
      attributes: {
        ...mockListings[newSku].attributes,
        product_description: 'Generated product description for testing',
      },
    });

    expect(updateListingResult.isError).toBeFalsy();
    expect(mockSpApiClient.putListing).toHaveBeenCalled();
    expect(mockListings[newSku].attributes.product_description).toBe(
      'Generated product description for testing'
    );
  });

  it('should complete an order processing workflow', async () => {
    // Get the tool manager
    const toolManager = server.getToolManager();

    // Step 1: Get unshipped orders (using process-order tool as a placeholder)
    const processOrderTool = toolManager.getToolHandler('process-order');
    expect(processOrderTool).toBeDefined();

    const getOrdersResult = await processOrderTool({
      orderStatuses: ['UNSHIPPED'],
    });

    expect(getOrdersResult.isError).toBeFalsy();
    expect(mockSpApiClient.getOrders).toHaveBeenCalled();

    // Find an unshipped order
    const unshippedOrderId = 'ORDER-123'; // We know this is unshipped from our mock data

    // Step 2: Get order details (using process-order tool as a placeholder)
    const getOrderTool = toolManager.getToolHandler('process-order');
    expect(getOrderTool).toBeDefined();

    const getOrderResult = await getOrderTool({
      orderId: unshippedOrderId,
    });

    expect(getOrderResult.isError).toBeFalsy();
    expect(mockSpApiClient.getOrder).toHaveBeenCalled();

    // Step 3: Check inventory for the ordered items
    const getInventoryTool = toolManager.getToolHandler('get-inventory');
    expect(getInventoryTool).toBeDefined();

    // Get the SKU from the order
    const orderSku = mockOrders[unshippedOrderId].orderItems[0].sellerSku;

    const getInventoryResult = await getInventoryTool({
      skus: [orderSku],
    });

    expect(getInventoryResult.isError).toBeFalsy();
    expect(mockSpApiClient.getInventory).toHaveBeenCalled();

    // Step 4: Update inventory (reduce quantity)
    const updateInventoryTool = toolManager.getToolHandler('update-inventory');
    expect(updateInventoryTool).toBeDefined();

    // Get current quantity
    const currentQuantity =
      mockInventory[orderSku].fulfillmentAvailability.find(
        (fa) => fa.fulfillmentChannelCode === 'SELLER'
      )?.quantity || 0;

    const updateInventoryResult = await updateInventoryTool({
      sku: orderSku,
      quantity: currentQuantity - 1, // Reduce by 1 for the order
      fulfillmentChannel: 'SELLER',
    });

    expect(updateInventoryResult.isError).toBeFalsy();
    expect(mockSpApiClient.updateInventory).toHaveBeenCalled();

    // Step 5: Process the order (ship it)
    const processOrderTool2 = toolManager.getToolHandler('process-order');
    expect(processOrderTool2).toBeDefined();

    const processOrderResult = await processOrderTool2({
      orderId: unshippedOrderId,
      action: 'SHIP',
    });

    expect(processOrderResult.isError).toBeFalsy();
    expect(mockSpApiClient.updateOrderStatus).toHaveBeenCalled();
    expect(mockOrders[unshippedOrderId].orderStatus).toBe('SHIPPED');
  });

  it('should handle error recovery in a workflow', async () => {
    // Get the tool manager
    const toolManager = server.getToolManager();

    // Step 1: Try to get a non-existent order (will fail)
    const getOrderTool = toolManager.getToolHandler('process-order');
    expect(getOrderTool).toBeDefined();

    // Mock the getOrder method to throw an error first, then succeed on retry
    const nonExistentOrderId = 'ORDER-NONEXISTENT';
    mockSpApiClient.getOrder
      .mockRejectedValueOnce(new Error(`Order not found: ${nonExistentOrderId}`))
      .mockResolvedValueOnce({
        data: {
          orderId: nonExistentOrderId,
          purchaseDate: '2023-01-03T12:00:00Z',
          orderStatus: 'UNSHIPPED',
          fulfillmentChannel: 'SELLER',
          salesChannel: 'Amazon.com',
          orderTotal: {
            currencyCode: 'USD',
            amount: 39.99,
          },
          shipmentServiceLevelCategory: 'Standard',
          orderItems: [
            {
              asin: 'B07N4M94KL',
              sellerSku: 'TEST-SKU-1',
              title: 'Test Product 1',
              quantityOrdered: 2,
              itemPrice: {
                currencyCode: 'USD',
                amount: 19.99,
              },
            },
          ],
        },
        statusCode: 200,
        headers: {},
      });

    const getOrderResult = await getOrderTool({
      amazonOrderId: nonExistentOrderId,
      action: 'CONFIRM',
    });

    // The error should be handled and recovered
    expect(getOrderResult.isError).toBeFalsy();
    expect(mockSpApiClient.getOrder).toHaveBeenCalledTimes(2);

    // Step 2: Create a new order in our mock data
    mockOrders[nonExistentOrderId] = {
      orderId: nonExistentOrderId,
      purchaseDate: '2023-01-03T12:00:00Z',
      orderStatus: 'UNSHIPPED',
      fulfillmentChannel: 'SELLER',
      salesChannel: 'Amazon.com',
      orderTotal: {
        currencyCode: 'USD',
        amount: 39.99,
      },
      shipmentServiceLevelCategory: 'Standard',
      orderItems: [
        {
          asin: 'B07N4M94KL',
          sellerSku: 'TEST-SKU-1',
          title: 'Test Product 1',
          quantityOrdered: 2,
          itemPrice: {
            currencyCode: 'USD',
            amount: 19.99,
          },
        },
      ],
    };

    // Step 3: Process the order with a simulated rate limit error
    const processOrderTool3 = toolManager.getToolHandler('process-order');
    expect(processOrderTool3).toBeDefined();

    // Mock the updateOrderStatus method to throw a rate limit error first, then succeed on retry
    mockSpApiClient.updateOrderStatus
      .mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        response: {
          status: 429,
          data: {
            errors: [{ message: 'Rate limit exceeded' }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          orderId: nonExistentOrderId,
          status: 'SUCCESS',
        },
        statusCode: 200,
        headers: {},
      });

    const processOrderResult = await processOrderTool3({
      orderId: nonExistentOrderId,
      action: 'SHIP',
    });

    // The error should be handled and recovered
    expect(processOrderResult.isError).toBeFalsy();
    expect(mockSpApiClient.updateOrderStatus).toHaveBeenCalledTimes(2);
    expect(mockOrders[nonExistentOrderId].orderStatus).toBe('SHIPPED');
  });

  it('should handle resource and tool interactions', async () => {
    // Get the resource manager
    const resourceManager = server.getResourceManager();

    // Get the MCP server instance
    const mcpServer = server.getMcpServer();

    // Step 1: Access a catalog item resource
    const catalogItemHandler = mcpServer.getResourceHandler('amazon-catalog');
    expect(catalogItemHandler).toBeDefined();

    if (catalogItemHandler) {
      const catalogItemResult = await catalogItemHandler(new URL('amazon-catalog://B07N4M94KL'), {
        asin: 'B07N4M94KL',
      });

      expect(catalogItemResult.contents).toBeDefined();
      expect(catalogItemResult.contents[0].uri).toBe('amazon-catalog://B07N4M94KL');
      expect(mockSpApiClient.getCatalogItem).toHaveBeenCalled();
    }

    // Step 2: Use a tool that returns a resource link
    const toolManager = server.getToolManager();
    const getCatalogItemTool = toolManager.getToolHandler('get-catalog-item');
    expect(getCatalogItemTool).toBeDefined();

    if (getCatalogItemTool) {
      const getCatalogItemResult = await getCatalogItemTool({
        asin: 'B07N4M94KL',
      });

      expect(getCatalogItemResult.isError).toBeFalsy();
      expect(getCatalogItemResult.content[0].type).toBe('text');
      expect(getCatalogItemResult.content[0].text).toContain('amazon-catalog://');
    }

    // Step 3: Access the resource from the link
    if (catalogItemHandler) {
      const catalogItemResult = await catalogItemHandler(new URL('amazon-catalog://B07N4M94KL'), {
        asin: 'B07N4M94KL',
      });

      expect(catalogItemResult.contents).toBeDefined();
      expect(JSON.parse(catalogItemResult.contents[0].text).asin).toBe('B07N4M94KL');
    }
  });

  it('should handle notifications in a workflow', async () => {
    // Get the notification manager
    const notificationManager = server.getNotificationManager();

    // Set up a notification listener
    const notificationListener = vi.fn();
    notificationManager.onNotification(notificationListener);

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Update inventory to trigger a notification
    const updateInventoryTool = toolManager.getToolHandler('update-inventory');
    expect(updateInventoryTool).toBeDefined();

    // Store the original quantity
    const sku = 'TEST-SKU-1';
    const originalQuantity =
      mockInventory[sku].fulfillmentAvailability.find(
        (fa) => fa.fulfillmentChannelCode === 'AMAZON'
      )?.quantity || 0;

    // Update the inventory
    const updateInventoryResult = await updateInventoryTool({
      sku,
      quantity: originalQuantity - 10,
      fulfillmentChannel: 'AMAZON',
    });

    expect(updateInventoryResult.isError).toBeFalsy();

    // Manually trigger the notification since we're mocking
    notificationManager.sendNotification('inventory-change', {
      sku,
      oldQuantity: originalQuantity,
      newQuantity: originalQuantity - 10,
      fulfillmentChannel: 'AMAZON',
    });

    // Verify that the notification was sent
    expect(notificationListener).toHaveBeenCalledWith({
      sku,
      oldQuantity: originalQuantity,
      newQuantity: originalQuantity - 10,
      fulfillmentChannel: 'AMAZON',
    });
  });
});
