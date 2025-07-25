/**
 * Comprehensive tests for all Amazon Seller MCP resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerCatalogResources } from '../../src/resources/catalog/catalog-resources.js';
import { registerListingsResources } from '../../src/resources/listings/listings-resources.js';
import { registerInventoryResources } from '../../src/resources/inventory/inventory-resources.js';
import { registerOrdersResources } from '../../src/resources/orders/orders-resources.js';
import { registerReportsResources } from '../../src/resources/reports/reports-resources.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the API clients
vi.mock('../../src/api/catalog-client.js', () => ({
  CatalogClient: vi.fn().mockImplementation(() => ({
    searchCatalogItems: vi.fn().mockResolvedValue({
      items: [{ asin: 'B01EXAMPLE1' }, { asin: 'B01EXAMPLE2' }],
    }),
    getCatalogItem: vi.fn().mockResolvedValue({
      asin: 'B01EXAMPLE1',
      summaries: [{ itemName: 'Test Product' }],
    }),
  })),
}));

vi.mock('../../src/api/listings-client.js', () => ({
  ListingsClient: vi.fn().mockImplementation(() => ({
    getListings: vi.fn().mockResolvedValue({
      listings: [{ sku: 'SKU123' }, { sku: 'SKU456' }],
    }),
    getListing: vi.fn().mockResolvedValue({
      sku: 'SKU123',
      status: 'ACTIVE',
    }),
  })),
}));

vi.mock('../../src/api/inventory-client.js', () => ({
  InventoryClient: vi.fn().mockImplementation(() => ({
    getInventory: vi.fn().mockResolvedValue({
      items: [{ sku: 'SKU123' }, { sku: 'SKU456' }],
    }),
    getInventoryBySku: vi.fn().mockResolvedValue({
      sku: 'SKU123',
      inventoryDetails: [],
    }),
  })),
}));

vi.mock('../../src/api/orders-client.js', () => ({
  OrdersClient: vi.fn().mockImplementation(() => ({
    getOrders: vi.fn().mockResolvedValue({
      orders: [{ amazonOrderId: 'ORDER123' }, { amazonOrderId: 'ORDER456' }],
    }),
    getOrder: vi.fn().mockResolvedValue({
      amazonOrderId: 'ORDER123',
    }),
    getOrderItems: vi.fn().mockResolvedValue({
      orderItems: [],
    }),
    getOrderFulfillment: vi.fn().mockResolvedValue({
      fulfillmentShipments: [],
    }),
  })),
}));

vi.mock('../../src/api/reports-client.js', () => ({
  ReportsClient: vi.fn().mockImplementation(() => ({
    getReports: vi.fn().mockResolvedValue({
      reports: [{ reportId: 'REPORT123' }, { reportId: 'REPORT456' }],
    }),
    getReport: vi.fn().mockResolvedValue({
      reportId: 'REPORT123',
      reportType: 'TEST_REPORT',
    }),
    downloadReportDocument: vi.fn().mockResolvedValue('test,report\ndata1,data2'),
  })),
}));

// Mock the MCP server
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerResource: vi.fn(),
    })),
    ResourceTemplate: vi.fn().mockImplementation((template, options) => ({
      template,
      options,
    })),
  };
});

// Mock the catalog client
vi.mock('../../src/resources/catalog/catalog-resources.js', () => {
  return {
    registerCatalogResources: vi.fn().mockImplementation((resourceManager) => {
      resourceManager.registerResource(
        'amazon-catalog',
        {},
        { title: 'Amazon Catalog Item', description: 'Test' },
        () => {}
      );
      resourceManager.registerResource(
        'amazon-catalog-search',
        {},
        { title: 'Amazon Catalog Search', description: 'Test' },
        () => {}
      );
      console.log('Registered catalog resources');
    }),
  };
});

// Mock the listings client
vi.mock('../../src/resources/listings/listings-resources.js', () => {
  return {
    registerListingsResources: vi.fn().mockImplementation((resourceManager) => {
      resourceManager.registerResource(
        'amazon-listings',
        {},
        { title: 'Amazon Listings', description: 'Test' },
        () => {}
      );
      console.log('Registered listings resources');
    }),
  };
});

// Mock the inventory client
vi.mock('../../src/resources/inventory/inventory-resources.js', () => {
  return {
    registerInventoryResources: vi.fn().mockImplementation((resourceManager) => {
      resourceManager.registerResource(
        'amazon-inventory',
        {},
        { title: 'Amazon Inventory', description: 'Test' },
        () => {}
      );
      resourceManager.registerResource(
        'amazon-inventory-filter',
        {},
        { title: 'Amazon Inventory Filter', description: 'Test' },
        () => {}
      );
      console.log('Registered inventory resources');
    }),
  };
});

// Mock the orders client
vi.mock('../../src/resources/orders/orders-resources.js', () => {
  return {
    registerOrdersResources: vi.fn().mockImplementation((resourceManager) => {
      resourceManager.registerResource(
        'amazon-orders',
        {},
        { title: 'Amazon Orders', description: 'Test' },
        () => {}
      );
      resourceManager.registerResource(
        'amazon-order-action',
        {},
        { title: 'Amazon Order Actions', description: 'Test' },
        () => {}
      );
      resourceManager.registerResource(
        'amazon-order-filter',
        {},
        { title: 'Amazon Order Filter', description: 'Test' },
        () => {}
      );
      console.log('Registered orders resources');
    }),
  };
});

// Mock the reports client
vi.mock('../../src/resources/reports/reports-resources.js', () => {
  return {
    registerReportsResources: vi.fn().mockImplementation((resourceManager) => {
      resourceManager.registerResource(
        'amazon-reports',
        {},
        { title: 'Amazon Reports', description: 'Test' },
        () => {}
      );
      resourceManager.registerResource(
        'amazon-report-action',
        {},
        { title: 'Amazon Report Actions', description: 'Test' },
        () => {}
      );
      resourceManager.registerResource(
        'amazon-report-filter',
        {},
        { title: 'Amazon Report Filter', description: 'Test' },
        () => {}
      );
      console.log('Registered reports resources');
    }),
  };
});

describe('Amazon Seller MCP Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let mockServer: McpServer;

  // Mock auth config
  const mockAuthConfig = {
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    region: {
      endpoint: 'https://sellingpartnerapi-na.amazon.com',
      region: 'us-east-1',
    },
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  beforeEach(() => {
    mockServer = new McpServer();
    resourceManager = new ResourceRegistrationManager(mockServer);

    // Spy on resourceManager methods
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');
    vi.spyOn(resourceManager, 'getRegisteredResources');
    vi.spyOn(resourceManager, 'isResourceRegistered');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Resource Registration', () => {
    it('should register all resources without errors', () => {
      // Register all resources
      registerCatalogResources(resourceManager, mockAuthConfig);
      registerListingsResources(resourceManager, mockAuthConfig);
      registerInventoryResources(resourceManager, mockAuthConfig);
      registerOrdersResources(resourceManager, mockAuthConfig);
      registerReportsResources(resourceManager, mockAuthConfig);

      // Get the list of registered resources
      const registeredResources = resourceManager.getRegisteredResources();

      // Verify that all expected resources are registered
      expect(registeredResources).toContain('amazon-catalog');
      expect(registeredResources).toContain('amazon-catalog-search');
      expect(registeredResources).toContain('amazon-listings');
      expect(registeredResources).toContain('amazon-inventory');
      expect(registeredResources).toContain('amazon-inventory-filter');
      expect(registeredResources).toContain('amazon-orders');
      expect(registeredResources).toContain('amazon-order-action');
      expect(registeredResources).toContain('amazon-order-filter');
      expect(registeredResources).toContain('amazon-reports');
      expect(registeredResources).toContain('amazon-report-action');
      expect(registeredResources).toContain('amazon-report-filter');

      // Verify that registerResource was called the expected number of times
      expect(resourceManager.registerResource).toHaveBeenCalledTimes(11);
    });

    it('should not register the same resource twice', () => {
      // Reset the spy before this test
      vi.clearAllMocks();

      // Register catalog resources twice
      registerCatalogResources(resourceManager, mockAuthConfig);
      registerCatalogResources(resourceManager, mockAuthConfig);

      // Verify that registerResource was only called twice (once for each catalog resource)
      expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);

      // Verify that only two resources are registered
      expect(resourceManager.getRegisteredResources().length).toBe(2);
    });
  });

  describe('Resource Templates', () => {
    it('should create resource templates with correct URI patterns', () => {
      // Register all resources
      registerCatalogResources(resourceManager, mockAuthConfig);
      registerListingsResources(resourceManager, mockAuthConfig);
      registerInventoryResources(resourceManager, mockAuthConfig);
      registerOrdersResources(resourceManager, mockAuthConfig);
      registerReportsResources(resourceManager, mockAuthConfig);

      // Verify that createResourceTemplate was called with the correct URI patterns

      // Catalog resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-catalog://{asin}',
        'amazon-catalog://',
        expect.anything()
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-catalog-search://{query}',
        'amazon-catalog-search://'
      );

      // Listings resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-listings://{sku}',
        'amazon-listings://',
        expect.anything()
      );

      // Inventory resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-inventory://{sku}',
        'amazon-inventory://',
        expect.anything()
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-inventory-filter://{filter}',
        'amazon-inventory-filter://'
      );

      // Orders resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-orders://{amazonOrderId}',
        'amazon-orders://',
        expect.anything()
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-order-action://{amazonOrderId}/{action}'
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-order-filter://{filter}',
        'amazon-order-filter://'
      );

      // Reports resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-reports://{reportId}',
        'amazon-reports://',
        expect.anything()
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-report-action://{reportId}/{action}'
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-report-filter://{filter}',
        'amazon-report-filter://'
      );
    });

    it('should include completion functions for parameterized resources', () => {
      // Register all resources
      registerCatalogResources(resourceManager, mockAuthConfig);
      registerListingsResources(resourceManager, mockAuthConfig);
      registerInventoryResources(resourceManager, mockAuthConfig);
      registerOrdersResources(resourceManager, mockAuthConfig);
      registerReportsResources(resourceManager, mockAuthConfig);

      // Verify that createResourceTemplate was called with completion functions for parameterized resources

      // Catalog resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-catalog://{asin}',
        'amazon-catalog://',
        expect.objectContaining({
          asin: expect.any(Function),
        })
      );

      // Listings resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-listings://{sku}',
        'amazon-listings://',
        expect.objectContaining({
          sku: expect.any(Function),
        })
      );

      // Inventory resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-inventory://{sku}',
        'amazon-inventory://',
        expect.objectContaining({
          sku: expect.any(Function),
        })
      );

      // Orders resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-orders://{amazonOrderId}',
        'amazon-orders://',
        expect.objectContaining({
          amazonOrderId: expect.any(Function),
        })
      );

      // Reports resources
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-reports://{reportId}',
        'amazon-reports://',
        expect.objectContaining({
          reportId: expect.any(Function),
        })
      );
    });
  });

  describe('Resource Registration Options', () => {
    it('should register resources with correct titles and descriptions', () => {
      // Register all resources
      registerCatalogResources(resourceManager, mockAuthConfig);
      registerListingsResources(resourceManager, mockAuthConfig);
      registerInventoryResources(resourceManager, mockAuthConfig);
      registerOrdersResources(resourceManager, mockAuthConfig);
      registerReportsResources(resourceManager, mockAuthConfig);

      // Verify that registerResource was called with the correct options

      // Catalog resources
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-catalog',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Catalog Item',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-catalog-search',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Catalog Search',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      // Listings resources
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-listings',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Listings',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      // Inventory resources
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-inventory',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Inventory',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-inventory-filter',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Inventory Filter',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      // Orders resources
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-orders',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Orders',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-order-action',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Order Actions',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-order-filter',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Order Filter',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      // Reports resources
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-reports',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Reports',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-report-action',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Report Actions',
          description: expect.any(String),
        }),
        expect.any(Function)
      );

      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-report-filter',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Report Filter',
          description: expect.any(String),
        }),
        expect.any(Function)
      );
    });
  });

  describe('Resource Handler Functions', () => {
    it('should register resources with handler functions', () => {
      // Register all resources
      registerCatalogResources(resourceManager, mockAuthConfig);
      registerListingsResources(resourceManager, mockAuthConfig);
      registerInventoryResources(resourceManager, mockAuthConfig);
      registerOrdersResources(resourceManager, mockAuthConfig);
      registerReportsResources(resourceManager, mockAuthConfig);

      // Verify that registerResource was called with handler functions
      const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;

      // Check that all calls include a handler function as the fourth argument
      registerResourceCalls.forEach((call) => {
        expect(call[3]).toBeInstanceOf(Function);
      });
    });
  });
});

describe('Resource URI Handling', () => {
  let resourceManager: ResourceRegistrationManager;
  let mockServer: McpServer;

  // Mock auth config
  const mockAuthConfig = {
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    region: {
      endpoint: 'https://sellingpartnerapi-na.amazon.com',
      region: 'us-east-1',
    },
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  // Mock API clients with specific implementations for URI handling tests
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create new instances
    mockServer = new McpServer();
    resourceManager = new ResourceRegistrationManager(mockServer);

    // Spy on methods
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');
  });

  it('should handle parameterized URIs correctly', () => {
    // Register all resources
    registerCatalogResources(resourceManager, mockAuthConfig);
    registerListingsResources(resourceManager, mockAuthConfig);
    registerInventoryResources(resourceManager, mockAuthConfig);
    registerOrdersResources(resourceManager, mockAuthConfig);
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get all the resource handler registrations
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;

    // Extract all the handlers
    const handlers = registerResourceCalls.map((call) => ({
      name: call[0],
      handler: call[3],
    }));

    // Verify that handlers exist for all resources
    expect(handlers.find((h) => h.name === 'amazon-catalog')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-catalog-search')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-listings')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-inventory')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-inventory-filter')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-orders')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-order-action')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-order-filter')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-reports')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-report-action')).toBeDefined();
    expect(handlers.find((h) => h.name === 'amazon-report-filter')).toBeDefined();
  });

  it('should create templates with list URIs for collection resources', () => {
    // Register all resources
    registerCatalogResources(resourceManager, mockAuthConfig);
    registerListingsResources(resourceManager, mockAuthConfig);
    registerInventoryResources(resourceManager, mockAuthConfig);
    registerOrdersResources(resourceManager, mockAuthConfig);
    registerReportsResources(resourceManager, mockAuthConfig);

    // Check that collection resources have list templates
    const createTemplatesCalls = (resourceManager.createResourceTemplate as any).mock.calls;

    // Filter calls that include a list template (second parameter)
    const callsWithListTemplate = createTemplatesCalls.filter((call) => call[1] !== undefined);

    // Verify that the expected number of resources have list templates
    expect(callsWithListTemplate.length).toBe(8); // 8 resources should have list templates

    // Verify specific list templates
    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-catalog://{asin}', 'amazon-catalog://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-catalog-search://{query}', 'amazon-catalog-search://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-listings://{sku}', 'amazon-listings://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-inventory://{sku}', 'amazon-inventory://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-inventory-filter://{filter}', 'amazon-inventory-filter://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-orders://{amazonOrderId}', 'amazon-orders://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-order-filter://{filter}', 'amazon-order-filter://'])
    );

    expect(callsWithListTemplate).toContainEqual(
      expect.arrayContaining(['amazon-reports://{reportId}', 'amazon-reports://'])
    );
  });
});

describe('Resource Completions', () => {
  let resourceManager: ResourceRegistrationManager;
  let mockServer: McpServer;

  // Mock auth config
  const mockAuthConfig = {
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    region: {
      endpoint: 'https://sellingpartnerapi-na.amazon.com',
      region: 'us-east-1',
    },
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  // Mock API clients with specific implementations for completion tests
  const mockCatalogClient = {
    searchCatalogItems: vi.fn().mockResolvedValue({
      items: [{ asin: 'B01EXAMPLE1' }, { asin: 'B01EXAMPLE2' }],
    }),
  };

  const mockListingsClient = {
    getListings: vi.fn().mockResolvedValue({
      listings: [{ sku: 'SKU123' }, { sku: 'SKU456' }],
    }),
  };

  const mockInventoryClient = {
    getInventory: vi.fn().mockResolvedValue({
      items: [{ sku: 'SKU123' }, { sku: 'SKU456' }],
    }),
  };

  const mockOrdersClient = {
    getOrders: vi.fn().mockResolvedValue({
      orders: [{ amazonOrderId: 'ORDER123' }, { amazonOrderId: 'ORDER456' }],
    }),
  };

  const mockReportsClient = {
    getReports: vi.fn().mockResolvedValue({
      reports: [{ reportId: 'REPORT123' }, { reportId: 'REPORT456' }],
    }),
  };

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock the API client constructors
    vi.mock('../../src/api/catalog-client.js', () => ({
      CatalogClient: vi.fn().mockImplementation(() => mockCatalogClient),
    }));

    vi.mock('../../src/api/listings-client.js', () => ({
      ListingsClient: vi.fn().mockImplementation(() => mockListingsClient),
    }));

    vi.mock('../../src/api/inventory-client.js', () => ({
      InventoryClient: vi.fn().mockImplementation(() => mockInventoryClient),
    }));

    vi.mock('../../src/api/orders-client.js', () => ({
      OrdersClient: vi.fn().mockImplementation(() => mockOrdersClient),
    }));

    vi.mock('../../src/api/reports-client.js', () => ({
      ReportsClient: vi.fn().mockImplementation(() => mockReportsClient),
    }));

    // Create new instances
    mockServer = new McpServer();
    resourceManager = new ResourceRegistrationManager(mockServer);
  });

  it('should provide completion functions for parameterized resources', () => {
    // Register all resources
    registerCatalogResources(resourceManager, mockAuthConfig);
    registerListingsResources(resourceManager, mockAuthConfig);
    registerInventoryResources(resourceManager, mockAuthConfig);
    registerOrdersResources(resourceManager, mockAuthConfig);
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get all the resource template creations with completions
    const createTemplateCalls = (resourceManager.createResourceTemplate as any).mock.calls;

    // Filter calls that include completions (third parameter)
    const callsWithCompletions = createTemplateCalls.filter((call) => call[2] !== undefined);

    // Verify that the expected number of resources have completions
    expect(callsWithCompletions.length).toBe(5); // 5 resources should have completion functions

    // Verify specific completion functions
    const catalogCall = callsWithCompletions.find((call) => call[0] === 'amazon-catalog://{asin}');
    expect(catalogCall[2].asin).toBeInstanceOf(Function);

    const listingsCall = callsWithCompletions.find((call) => call[0] === 'amazon-listings://{sku}');
    expect(listingsCall[2].sku).toBeInstanceOf(Function);

    const inventoryCall = callsWithCompletions.find(
      (call) => call[0] === 'amazon-inventory://{sku}'
    );
    expect(inventoryCall[2].sku).toBeInstanceOf(Function);

    const ordersCall = callsWithCompletions.find(
      (call) => call[0] === 'amazon-orders://{amazonOrderId}'
    );
    expect(ordersCall[2].amazonOrderId).toBeInstanceOf(Function);

    const reportsCall = callsWithCompletions.find(
      (call) => call[0] === 'amazon-reports://{reportId}'
    );
    expect(reportsCall[2].reportId).toBeInstanceOf(Function);
  });

  it('should execute completion functions and return results', async () => {
    // Register all resources
    registerCatalogResources(resourceManager, mockAuthConfig);
    registerListingsResources(resourceManager, mockAuthConfig);
    registerInventoryResources(resourceManager, mockAuthConfig);
    registerOrdersResources(resourceManager, mockAuthConfig);
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get all the resource template creations with completions
    const createTemplateCalls = (resourceManager.createResourceTemplate as any).mock.calls;

    // Extract completion functions
    const catalogCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-catalog://{asin}'
    )[2];
    const listingsCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-listings://{sku}'
    )[2];
    const inventoryCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-inventory://{sku}'
    )[2];
    const ordersCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-orders://{amazonOrderId}'
    )[2];
    const reportsCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-reports://{reportId}'
    )[2];

    // Test catalog ASIN completion
    const asinResults = await catalogCompletions.asin('B01');
    expect(mockCatalogClient.searchCatalogItems).toHaveBeenCalled();
    expect(asinResults).toEqual(['B01EXAMPLE1', 'B01EXAMPLE2']);

    // Test listings SKU completion
    const skuResults = await listingsCompletions.sku('SKU');
    expect(mockListingsClient.getListings).toHaveBeenCalled();
    expect(skuResults).toEqual(['SKU123', 'SKU456']);

    // Test inventory SKU completion
    const inventorySkuResults = await inventoryCompletions.sku('SKU');
    expect(mockInventoryClient.getInventory).toHaveBeenCalled();
    expect(inventorySkuResults).toEqual(['SKU123', 'SKU456']);

    // Test orders ID completion
    const orderResults = await ordersCompletions.amazonOrderId('ORDER');
    expect(mockOrdersClient.getOrders).toHaveBeenCalled();
    expect(orderResults).toEqual(['ORDER123', 'ORDER456']);

    // Test reports ID completion
    const reportResults = await reportsCompletions.reportId('REPORT');
    expect(mockReportsClient.getReports).toHaveBeenCalled();
    expect(reportResults).toEqual(['REPORT123', 'REPORT456']);
  });

  it('should handle errors in completion functions gracefully', async () => {
    // Mock API clients to throw errors
    mockCatalogClient.searchCatalogItems.mockRejectedValue(new Error('API Error'));
    mockListingsClient.getListings.mockRejectedValue(new Error('API Error'));
    mockInventoryClient.getInventory.mockRejectedValue(new Error('API Error'));
    mockOrdersClient.getOrders.mockRejectedValue(new Error('API Error'));
    mockReportsClient.getReports.mockRejectedValue(new Error('API Error'));

    // Register all resources
    registerCatalogResources(resourceManager, mockAuthConfig);
    registerListingsResources(resourceManager, mockAuthConfig);
    registerInventoryResources(resourceManager, mockAuthConfig);
    registerOrdersResources(resourceManager, mockAuthConfig);
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get all the resource template creations with completions
    const createTemplateCalls = (resourceManager.createResourceTemplate as any).mock.calls;

    // Extract completion functions
    const catalogCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-catalog://{asin}'
    )[2];
    const listingsCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-listings://{sku}'
    )[2];
    const inventoryCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-inventory://{sku}'
    )[2];
    const ordersCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-orders://{amazonOrderId}'
    )[2];
    const reportsCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-reports://{reportId}'
    )[2];

    // Test that completion functions handle errors gracefully
    const asinResults = await catalogCompletions.asin('B01');
    expect(asinResults).toEqual([]);

    const skuResults = await listingsCompletions.sku('SKU');
    expect(skuResults).toEqual([]);

    const inventorySkuResults = await inventoryCompletions.sku('SKU');
    expect(inventorySkuResults).toEqual([]);

    const orderResults = await ordersCompletions.amazonOrderId('ORDER');
    expect(orderResults).toEqual([]);

    const reportResults = await reportsCompletions.reportId('REPORT');
    expect(reportResults).toEqual([]);
  });

  it('should return empty arrays for short or empty completion queries', async () => {
    // Register all resources
    registerCatalogResources(resourceManager, mockAuthConfig);
    registerListingsResources(resourceManager, mockAuthConfig);
    registerInventoryResources(resourceManager, mockAuthConfig);
    registerOrdersResources(resourceManager, mockAuthConfig);
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get all the resource template creations with completions
    const createTemplateCalls = (resourceManager.createResourceTemplate as any).mock.calls;

    // Extract completion functions
    const catalogCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-catalog://{asin}'
    )[2];
    const listingsCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-listings://{sku}'
    )[2];
    const inventoryCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-inventory://{sku}'
    )[2];
    const ordersCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-orders://{amazonOrderId}'
    )[2];
    const reportsCompletions = createTemplateCalls.find(
      (call) => call[0] === 'amazon-reports://{reportId}'
    )[2];

    // Test with empty strings
    expect(await catalogCompletions.asin('')).toEqual([]);
    expect(await listingsCompletions.sku('')).toEqual([]);
    expect(await inventoryCompletions.sku('')).toEqual([]);
    expect(await ordersCompletions.amazonOrderId('')).toEqual([]);
    expect(await reportsCompletions.reportId('')).toEqual([]);

    // Test with single character (too short)
    expect(await catalogCompletions.asin('B')).toEqual([]);
    expect(await listingsCompletions.sku('S')).toEqual([]);
    expect(await inventoryCompletions.sku('S')).toEqual([]);
    expect(await ordersCompletions.amazonOrderId('O')).toEqual([]);
    expect(await reportsCompletions.reportId('R')).toEqual([]);
  });
});
