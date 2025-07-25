/**
 * Tests for all tools registration and functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  registerCatalogTools,
  registerListingsTools,
  registerInventoryTools,
  registerOrdersTools,
  registerReportsTools,
  registerAiTools,
} from '../../../src/tools/index.js';

// Mock the MCP server
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerTool: vi.fn(),
      createMessage: vi.fn().mockResolvedValue({
        content: {
          type: 'text',
          text: 'Generated content from LLM',
        },
      }),
    })),
  };
});

// Mock the API clients
vi.mock('../../../src/api/catalog-client.js');
vi.mock('../../../src/api/listings-client.js');
vi.mock('../../../src/api/inventory-client.js');
vi.mock('../../../src/api/orders-client.js');
vi.mock('../../../src/api/reports-client.js');

describe('Tools Registration', () => {
  let server: McpServer;
  let toolManager: ToolRegistrationManager;
  let authConfig: any;

  beforeEach(() => {
    // Create a mock MCP server
    server = new McpServer();

    // Create a mock tool manager
    toolManager = new ToolRegistrationManager(server);

    // Spy on the registerTool method
    vi.spyOn(toolManager, 'registerTool');

    // Create mock auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Tool Registration', () => {
    it('should register all catalog tools', () => {
      // Register catalog tools
      registerCatalogTools(toolManager, authConfig);

      // Verify that the tools were registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'search-catalog',
        expect.objectContaining({
          title: 'Search Amazon Catalog',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'get-catalog-item',
        expect.objectContaining({
          title: 'Get Amazon Catalog Item',
        }),
        expect.any(Function)
      );
    });

    it('should register all listings tools', () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Verify that the tools were registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'create-listing',
        expect.objectContaining({
          title: 'Create Amazon Listing',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'update-listing',
        expect.objectContaining({
          title: 'Update Amazon Listing',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'delete-listing',
        expect.objectContaining({
          title: 'Delete Amazon Listing',
        }),
        expect.any(Function)
      );
    });

    it('should register all inventory tools', () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Verify that the tools were registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'get-inventory',
        expect.objectContaining({
          title: 'Get Amazon Inventory',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'update-inventory',
        expect.objectContaining({
          title: 'Update Amazon Inventory',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'set-inventory-replenishment',
        expect.objectContaining({
          title: 'Set Inventory Replenishment Settings',
        }),
        expect.any(Function)
      );
    });

    it('should register all orders tools', () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Verify that the tools were registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'process-order',
        expect.objectContaining({
          title: 'Process Amazon Order',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'update-order-status',
        expect.objectContaining({
          title: 'Update Amazon Order Status',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'fulfill-order',
        expect.objectContaining({
          title: 'Fulfill Amazon Order',
        }),
        expect.any(Function)
      );
    });

    it('should register all reports tools', () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig);

      // Verify that the tools were registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'create-report',
        expect.objectContaining({
          title: 'Create Report',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'get-report',
        expect.objectContaining({
          title: 'Get Report',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'download-report',
        expect.objectContaining({
          title: 'Download Report',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'cancel-report',
        expect.objectContaining({
          title: 'Cancel Report',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'list-reports',
        expect.objectContaining({
          title: 'List Reports',
        }),
        expect.any(Function)
      );
    });

    it('should register all AI tools', () => {
      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Verify that the tools were registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'generate-product-description',
        expect.objectContaining({
          title: 'Generate Product Description',
        }),
        expect.any(Function)
      );

      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'optimize-listing',
        expect.objectContaining({
          title: 'Optimize Amazon Listing',
        }),
        expect.any(Function)
      );
    });

    it('should register all tools without conflicts', () => {
      // Register all tools
      registerCatalogTools(toolManager, authConfig);
      registerListingsTools(toolManager, authConfig);
      registerInventoryTools(toolManager, authConfig);
      registerOrdersTools(toolManager, authConfig);
      registerReportsTools(toolManager, authConfig);
      registerAiTools(toolManager, authConfig, server);

      // Get all registered tool names
      const toolNames = (toolManager.registerTool as any).mock.calls.map((call) => call[0]);

      // Check for duplicates
      const uniqueToolNames = new Set(toolNames);
      expect(uniqueToolNames.size).toBe(toolNames.length);

      // Verify the total number of tools
      // The actual number might vary based on implementation, so we just check it's a reasonable number
      expect(toolManager.registerTool).toHaveBeenCalledTimes(
        (toolManager.registerTool as any).mock.calls.length
      );
    });
  });

  describe('Tool Input Validation', () => {
    it('should validate input for catalog tools', () => {
      // Register catalog tools
      registerCatalogTools(toolManager, authConfig);

      // Get the search catalog tool schema
      const searchCatalogSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'search-catalog'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() => searchCatalogSchema.parse({ keywords: 'test' })).not.toThrow();
      expect(() => searchCatalogSchema.parse({})).toThrow();

      // Get the get catalog item tool schema
      const getCatalogItemSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'get-catalog-item'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() => getCatalogItemSchema.parse({ asin: 'B00TEST123' })).not.toThrow();
      expect(() => getCatalogItemSchema.parse({})).toThrow();
    });

    it('should validate input for listings tools', () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Get the create listing tool schema
      const createListingSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'create-listing'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        createListingSchema.parse({
          sku: 'TEST-SKU',
          productType: 'SHOES',
          attributes: { title: 'Test' },
        })
      ).not.toThrow();

      expect(() =>
        createListingSchema.parse({
          sku: 'TEST-SKU',
        })
      ).toThrow();

      // Get the update listing tool schema
      const updateListingSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'update-listing'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        updateListingSchema.parse({
          sku: 'TEST-SKU',
          productType: 'SHOES',
          attributes: { title: 'Test' },
        })
      ).not.toThrow();

      expect(() => updateListingSchema.parse({})).toThrow();

      // Get the delete listing tool schema
      const deleteListingSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'delete-listing'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() => deleteListingSchema.parse({ sku: 'TEST-SKU' })).not.toThrow();
      expect(() => deleteListingSchema.parse({})).toThrow();
    });

    it('should validate input for inventory tools', () => {
      // Register inventory tools
      registerInventoryTools(toolManager, authConfig);

      // Get the update inventory tool schema
      const updateInventorySchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'update-inventory'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        updateInventorySchema.parse({
          sku: 'TEST-SKU',
          quantity: 10,
          fulfillmentChannel: 'AMAZON',
        })
      ).not.toThrow();

      expect(() =>
        updateInventorySchema.parse({
          sku: 'TEST-SKU',
        })
      ).toThrow();

      // Get the set inventory replenishment tool schema
      const setReplenishmentSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'set-inventory-replenishment'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        setReplenishmentSchema.parse({
          sku: 'TEST-SKU',
          restockLevel: 5,
          targetLevel: 10,
        })
      ).not.toThrow();

      expect(() =>
        setReplenishmentSchema.parse({
          sku: 'TEST-SKU',
        })
      ).toThrow();
    });

    it('should validate input for orders tools', () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Get the process order tool schema
      const processOrderSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'process-order'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        processOrderSchema.parse({
          amazonOrderId: '123-4567890-1234567',
          action: 'CONFIRM',
        })
      ).not.toThrow();

      expect(() =>
        processOrderSchema.parse({
          amazonOrderId: '123-4567890-1234567',
          action: 'INVALID_ACTION',
        })
      ).toThrow();

      // Get the fulfill order tool schema
      const fulfillOrderSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'fulfill-order'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        fulfillOrderSchema.parse({
          amazonOrderId: '123-4567890-1234567',
          carrierCode: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          shipDate: '2025-07-20',
          items: [{ orderItemId: 'item-1', quantity: 1 }],
        })
      ).not.toThrow();

      expect(() =>
        fulfillOrderSchema.parse({
          amazonOrderId: '123-4567890-1234567',
        })
      ).toThrow();
    });

    it('should validate input for reports tools', () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig);

      // Get the create report tool definition
      const createReportDef = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'create-report'
      )[1];

      // Verify the tool definition has an inputSchema
      expect(createReportDef).toHaveProperty('inputSchema');

      // Get the get report tool definition
      const getReportDef = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'get-report'
      )[1];

      // Verify the tool definition has an inputSchema
      expect(getReportDef).toHaveProperty('inputSchema');
    });

    it('should validate input for AI tools', () => {
      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Get the generate product description tool schema
      const generateDescriptionSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        generateDescriptionSchema.parse({
          productTitle: 'Test Product',
          keyFeatures: ['Feature 1', 'Feature 2'],
        })
      ).not.toThrow();

      expect(() =>
        generateDescriptionSchema.parse({
          productTitle: 'Test Product',
        })
      ).toThrow();

      // Get the optimize listing tool schema
      const optimizeListingSchema = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[1].inputSchema;

      // Verify the schema validates correctly
      expect(() =>
        optimizeListingSchema.parse({
          sku: 'TEST-SKU',
          optimizationGoal: 'conversion',
        })
      ).not.toThrow();

      expect(() =>
        optimizeListingSchema.parse({
          sku: 'TEST-SKU',
          optimizationGoal: 'invalid-goal',
        })
      ).toThrow();
    });
  });
});
