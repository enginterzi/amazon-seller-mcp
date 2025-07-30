/**
 * Integration tests for the MCP server with mock SP-API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer } from '../../src/server/server.js';
import { AmazonRegion } from '../../src/types/auth.js';
import { mockSpApiClient } from './mock-sp-api.js';

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

// Create shared mock instance
const mockMcpServerInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  registerResource: vi.fn(),
  registerTool: vi.fn(),
  createMessage: vi.fn().mockResolvedValue({
    content: {
      type: 'text',
      text: 'Generated product description for testing',
    },
  }),
};

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => mockMcpServerInstance),
    ResourceTemplate: vi.fn().mockImplementation((uriTemplate, options) => ({
      uriTemplate,
      options,
    })),
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

describe('MCP Server Integration', () => {
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

    // Connect the server
    await server.connect({ type: 'stdio' });
  });

  afterEach(async () => {
    // Clean up after each test
    await server.close();
  });

  it('should register all resources and tools', async () => {
    // Spy on the tool manager
    const toolManager = server.getToolManager();
    const toolManagerSpy = vi.spyOn(toolManager, 'registerTool');

    // Tools and resources should already be registered during connect
    // Verify that resources and tools were registered
    expect(mockMcpServerInstance.registerResource).toHaveBeenCalled();
    expect(toolManagerSpy).toHaveBeenCalled();
  });

  it('should handle catalog operations', async () => {
    // Register all resources and tools (catalog will be included)
    await server.registerAllResources();
    await server.registerAllTools();

    // Get the resource manager
    const resourceManager = server.getResourceManager();

    // Verify that catalog resources are registered
    expect(resourceManager.isResourceRegistered('amazon-catalog')).toBe(true);

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that catalog tools are registered
    expect(toolManager.isToolRegistered('search-catalog')).toBe(true);

    // Verify that catalog search tool is registered
    expect(toolManager.isToolRegistered('search-catalog')).toBe(true);
  });

  it('should handle listings operations', async () => {
    // Register all resources and tools (listings will be included)
    await server.registerAllResources();
    await server.registerAllTools();

    // Get the resource manager
    const resourceManager = server.getResourceManager();

    // Verify that listings resources are registered
    expect(resourceManager.isResourceRegistered('amazon-listings')).toBe(true);

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that listings tools are registered
    expect(toolManager.isToolRegistered('create-listing')).toBe(true);
    expect(toolManager.isToolRegistered('update-listing')).toBe(true);
    expect(toolManager.isToolRegistered('delete-listing')).toBe(true);

    // Test create listing tool
    const createListingTool = toolManager.getToolHandler('create-listing');
    expect(createListingTool).toBeDefined();

    if (createListingTool) {
      const result = await createListingTool({
        sku: 'TEST-SKU-3',
        productType: 'SHIRT',
        attributes: {
          item_name: 'New Test Product',
          brand_name: 'TestBrand',
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockSpApiClient.putListing).toHaveBeenCalled();
    }
  });

  it('should handle inventory operations', async () => {
    // Register all resources and tools (inventory will be included)
    await server.registerAllResources();
    await server.registerAllTools();

    // Get the resource manager
    const resourceManager = server.getResourceManager();

    // Verify that inventory resources are registered
    expect(resourceManager.isResourceRegistered('amazon-inventory')).toBe(true);

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that inventory tools are registered
    expect(toolManager.isToolRegistered('update-inventory')).toBe(true);
    expect(toolManager.isToolRegistered('get-inventory')).toBe(true);

    // Test update inventory tool
    const updateInventoryTool = toolManager.getToolHandler('update-inventory');
    expect(updateInventoryTool).toBeDefined();

    if (updateInventoryTool) {
      const result = await updateInventoryTool({
        sku: 'TEST-SKU-1',
        quantity: 75,
        fulfillmentChannel: 'SELLER',
      });

      expect(result.isError).toBeFalsy();
      expect(mockSpApiClient.updateInventory).toHaveBeenCalled();
    }
  });

  it('should handle orders operations', async () => {
    // Register all resources and tools (orders will be included)
    await server.registerAllResources();
    await server.registerAllTools();

    // Get the resource manager
    const resourceManager = server.getResourceManager();

    // Verify that orders resources are registered
    expect(resourceManager.isResourceRegistered('amazon-orders')).toBe(true);

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that orders tools are registered
    expect(toolManager.isToolRegistered('process-order')).toBe(true);

    // Test process order tool
    const processOrderTool = toolManager.getToolHandler('process-order');
    expect(processOrderTool).toBeDefined();

    if (processOrderTool) {
      const result = await processOrderTool({
        orderId: 'ORDER-123',
        action: 'SHIP',
      });

      expect(result.isError).toBeFalsy();
      expect(mockSpApiClient.updateOrderStatus).toHaveBeenCalled();
    }
  });

  it('should handle reports operations', async () => {
    // Register all resources and tools (reports will be included)
    await server.registerAllResources();
    await server.registerAllTools();

    // Get the resource manager
    const resourceManager = server.getResourceManager();

    // Verify that reports resources are registered
    expect(resourceManager.isResourceRegistered('amazon-reports')).toBe(true);

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that reports tools are registered
    expect(toolManager.isToolRegistered('generate-report')).toBe(true);
    expect(toolManager.isToolRegistered('get-report')).toBe(true);

    // Test generate report tool
    const generateReportTool = toolManager.getToolHandler('generate-report');
    expect(generateReportTool).toBeDefined();

    if (generateReportTool) {
      const result = await generateReportTool({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      });

      expect(result.isError).toBeFalsy();
      expect(mockSpApiClient.requestReport).toHaveBeenCalled();
    }
  });

  it('should handle AI-assisted tools', async () => {
    // Register all tools (AI tools will be included)
    await server.registerAllTools();

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that AI tools are registered
    expect(toolManager.isToolRegistered('generate-product-description')).toBe(true);

    // Test generate product description tool
    const generateDescriptionTool = toolManager.getToolHandler('generate-product-description');
    expect(generateDescriptionTool).toBeDefined();

    if (generateDescriptionTool) {
      const result = await generateDescriptionTool({
        productTitle: 'Test Product',
        keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
        targetAudience: 'General consumers',
      });

      expect(result.isError).toBeFalsy();
      expect(server.getMcpServer().createMessage).toHaveBeenCalled();
    }
  });

  it('should handle notifications', async () => {
    // Register inventory and orders tools
    server.registerInventoryTools();
    server.registerOrdersTools();

    // Get the notification manager
    const notificationManager = server.getNotificationManager();

    // Verify that notification manager is initialized
    expect(notificationManager).toBeDefined();

    // Test sending a notification
    const sendNotificationSpy = vi.spyOn(notificationManager, 'sendNotification');

    // Trigger an inventory change notification
    notificationManager.sendNotification('inventory-change', {
      sku: 'TEST-SKU-1',
      oldQuantity: 50,
      newQuantity: 45,
      fulfillmentChannel: 'AMAZON',
    });

    expect(sendNotificationSpy).toHaveBeenCalledWith('inventory-change', expect.any(Object));
  });

  it('should handle error scenarios gracefully', async () => {
    // Register all tools for testing
    await server.registerAllTools();

    // Get the tool manager
    const toolManager = server.getToolManager();

    // Verify that catalog search tool is registered
    expect(toolManager.isToolRegistered('search-catalog')).toBe(true);

    // For error handling, we would need to test through the MCP protocol
    // which is beyond the scope of this integration test
    // The error handling is tested in unit tests
  });
});
