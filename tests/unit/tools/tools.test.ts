/**
 * Tests for all tools registration and functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  registerCatalogTools,
  registerListingsTools,
  registerInventoryTools,
  registerOrdersTools,
  registerReportsTools,
  registerAiTools,
} from '../../../src/tools/index.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { AmazonSellerMcpServerMockFactory } from '../../utils/mock-factories/server-factory.js';

describe('Tools Registration', () => {
  let server: any;
  let toolManager: ToolRegistrationManager;
  let authConfig: any;
  let serverFactory: AmazonSellerMcpServerMockFactory;

  beforeEach(() => {
    serverFactory = new AmazonSellerMcpServerMockFactory();
    server = serverFactory.createWithToolRegistration('success');
    toolManager = new ToolRegistrationManager(server);
    vi.spyOn(toolManager, 'registerTool');
    authConfig = TestDataBuilder.createAuthConfig();
  });

  it('should register all catalog tools', () => {
    registerCatalogTools(toolManager, authConfig);

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
    registerListingsTools(toolManager, authConfig);

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
    registerInventoryTools(toolManager, authConfig);

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
    registerOrdersTools(toolManager, authConfig);

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
    registerReportsTools(toolManager, authConfig);

    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'generate-report',
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
    registerAiTools(toolManager, authConfig, server);

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
    registerCatalogTools(toolManager, authConfig);
    registerListingsTools(toolManager, authConfig);
    registerInventoryTools(toolManager, authConfig);
    registerOrdersTools(toolManager, authConfig);
    registerReportsTools(toolManager, authConfig);
    registerAiTools(toolManager, authConfig, server);

    const toolNames = (toolManager.registerTool as any).mock.calls.map((call) => call[0]);
    const uniqueToolNames = new Set(toolNames);

    expect(uniqueToolNames.size).toBe(toolNames.length);
    expect(toolManager.registerTool).toHaveBeenCalledTimes(
      (toolManager.registerTool as any).mock.calls.length
    );
  });

  it('should validate input for catalog tools', () => {
    registerCatalogTools(toolManager, authConfig);

    const searchCatalogSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'search-catalog'
    )[1].inputSchema;

    expect(() => searchCatalogSchema.parse({ keywords: 'test' })).not.toThrow();
    expect(() => searchCatalogSchema.parse({})).toThrow();

    const getCatalogItemSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'get-catalog-item'
    )[1].inputSchema;

    expect(() => getCatalogItemSchema.parse({ asin: 'B00TEST123' })).not.toThrow();
    expect(() => getCatalogItemSchema.parse({})).toThrow();
  });

  it('should validate input for listings tools', () => {
    registerListingsTools(toolManager, authConfig);

    const createListingSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'create-listing'
    )[1].inputSchema;

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

    const updateListingSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'update-listing'
    )[1].inputSchema;

    expect(() =>
      updateListingSchema.parse({
        sku: 'TEST-SKU',
        productType: 'SHOES',
        attributes: { title: 'Test' },
      })
    ).not.toThrow();

    expect(() => updateListingSchema.parse({})).toThrow();

    const deleteListingSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'delete-listing'
    )[1].inputSchema;

    expect(() => deleteListingSchema.parse({ sku: 'TEST-SKU' })).not.toThrow();
    expect(() => deleteListingSchema.parse({})).toThrow();
  });

  it('should validate input for inventory tools', () => {
    registerInventoryTools(toolManager, authConfig);

    const updateInventorySchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'update-inventory'
    )[1].inputSchema;

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

    const setReplenishmentSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'set-inventory-replenishment'
    )[1].inputSchema;

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
    registerOrdersTools(toolManager, authConfig);

    const processOrderSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'process-order'
    )[1].inputSchema;

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

    const fulfillOrderSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'fulfill-order'
    )[1].inputSchema;

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
    registerReportsTools(toolManager, authConfig);

    const createReportDef = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'generate-report'
    )[1];

    expect(createReportDef).toHaveProperty('inputSchema');

    const getReportDef = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'get-report'
    )[1];

    expect(getReportDef).toHaveProperty('inputSchema');
  });

  it('should validate input for AI tools', () => {
    registerAiTools(toolManager, authConfig, server);

    const generateDescriptionSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'generate-product-description'
    )[1].inputSchema;

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

    const optimizeListingSchema = (toolManager.registerTool as any).mock.calls.find(
      (call) => call[0] === 'optimize-listing'
    )[1].inputSchema;

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
