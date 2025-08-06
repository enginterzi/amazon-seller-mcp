/**
 * Tests for inventory resources registration and functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { InventoryClientMockFactory } from '../../utils/mock-factories/api-client-factory.js';
import { AmazonAuthMockFactory } from '../../utils/mock-factories/auth-factory.js';
import { registerInventoryResources } from '../../../src/resources/inventory/inventory-resources.js';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

// Mock the InventoryClient at the module level
vi.mock('../../../src/api/inventory-client.js', () => ({
  InventoryClient: vi.fn(),
}));

// Mock axios at the top level before any imports
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  
  const mockAuthResponse = {
    data: {
      access_token: 'Atza|mock-access-token-12345',
      token_type: 'bearer',
      expires_in: 3600,
    },
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
    },
  };

  const mockInventoryResponse = {
    data: {
      payload: {
        items: [
          {
            sku: 'TEST-SKU-001',
            asin: 'B08TEST123',
            condition: 'NEW',
            lastUpdatedTime: '2024-01-01T12:00:00Z',
            inventoryDetails: [{
              fulfillmentChannelCode: 'AMAZON',
              quantity: 100,
              reservedQuantity: 5,
              restockDate: '2024-02-01T00:00:00Z',
              replenishmentSettings: {
                restockLevel: 20,
                targetLevel: 100,
                maximumLevel: 200,
                leadTimeDays: 7,
              },
            }],
          }
        ],
        nextToken: null,
      },
    },
    status: 200,
    headers: {
      'x-amzn-requestid': 'test-request-id',
    },
  };

  const mockRequest = vi.fn().mockImplementation((config: any) => {
    // Mock authentication requests
    if (config.url === 'https://api.amazon.com/auth/o2/token') {
      return Promise.resolve(mockAuthResponse);
    }
    
    // Mock inventory API requests
    if (config.url && config.url.includes('inventory')) {
      return Promise.resolve(mockInventoryResponse);
    }
    
    // Default response
    return Promise.resolve(mockAuthResponse);
  });

  const mockAxios = vi.fn().mockImplementation(mockRequest);
  
  // Create a proper axios instance mock with defaults
  const mockAxiosInstance = {
    request: mockRequest,
    get: mockRequest,
    post: mockRequest,
    put: mockRequest,
    delete: mockRequest,
    patch: mockRequest,
    defaults: {
      httpAgent: undefined,
      httpsAgent: undefined,
      timeout: 10000,
      headers: {},
    },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  
  return {
    ...actual,
    default: Object.assign(mockAxios, {
      ...actual.default,
      request: mockRequest,
      defaults: mockAxiosInstance.defaults,
      interceptors: mockAxiosInstance.interceptors,
      create: vi.fn(() => mockAxiosInstance),
    }),
  };
});

describe('Inventory Resources', () => {
  let mockEnv: MockEnvironment;
  let resourceManager: ResourceRegistrationManager;
  let inventoryFactory: InventoryClientMockFactory;
  let authFactory: AmazonAuthMockFactory;
  let authConfig: any;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
    resourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
    inventoryFactory = new InventoryClientMockFactory();
    authFactory = new AmazonAuthMockFactory();
    authConfig = TestSetup.createTestAuthConfig();
    
    // Setup spy for resource registration
    vi.spyOn(resourceManager, 'registerResource');
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
    vi.clearAllMocks();
  });

  describe('registerInventoryResources', () => {
    it('should register inventory resources without errors', () => {
      expect(() => {
        registerInventoryResources(resourceManager, authConfig);
      }).not.toThrow();
    });

    it('should register amazon-inventory resource', () => {
      registerInventoryResources(resourceManager, authConfig);
      
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-inventory',
        expect.any(Object),
        expect.objectContaining({
          title: 'Amazon Inventory',
          description: 'Manage and view your Amazon inventory levels',
        }),
        expect.any(Function)
      );
    });

    it('should register amazon-inventory-filter resource', () => {
      registerInventoryResources(resourceManager, authConfig);
      
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-inventory-filter',
        expect.any(Object),
        expect.objectContaining({
          title: 'Amazon Inventory Filter',
          description: 'Filter and view your Amazon inventory by various criteria',
        }),
        expect.any(Function)
      );
    });

    it('should register exactly two resources', () => {
      registerInventoryResources(resourceManager, authConfig);
      
      expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);
    });
  });

  describe('amazon-inventory resource handler', () => {
    let resourceHandler: Function;

    beforeEach(() => {
      registerInventoryResources(resourceManager, authConfig);
      
      // Get the resource handler for amazon-inventory
      const inventoryResourceCall = (resourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      resourceHandler = inventoryResourceCall[3];
    });

    it('should handle specific inventory item retrieval successfully', async () => {
      const mockInventoryItem = {
        sku: 'TEST-SKU-001',
        asin: 'B08TEST123',
        condition: 'NEW',
        lastUpdatedTime: '2024-01-01T12:00:00Z',
        inventoryDetails: [{
          fulfillmentChannelCode: 'AMAZON',
          quantity: 100,
          reservedQuantity: 5,
          restockDate: '2024-02-01T00:00:00Z',
          replenishmentSettings: {
            restockLevel: 20,
            targetLevel: 100,
            maximumLevel: 200,
            leadTimeDays: 7,
          },
        }],
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventoryBySku = vi.fn().mockResolvedValue(mockInventoryItem);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventoryBySku: mockGetInventoryBySku,
        getInventory: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const inventoryResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const testResourceHandler = inventoryResourceCall[3];

      const uri = new URL('amazon-inventory://TEST-SKU-001');
      const params = { sku: 'TEST-SKU-001' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory://TEST-SKU-001',
          text: expect.stringContaining('# Amazon Inventory: TEST-SKU-001'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('TEST-SKU-001');
      expect(result.contents[0].text).toContain('B08TEST123');
      expect(result.contents[0].text).toContain('NEW');
      expect(result.contents[0].text).toContain('100');
      expect(result.contents[0].text).toContain('Replenishment Settings');
      expect(mockGetInventoryBySku).toHaveBeenCalledWith('TEST-SKU-001');
    });

    it('should handle inventory list retrieval successfully', async () => {
      const mockInventoryResult = {
        items: [
          {
            sku: 'TEST-SKU-001',
            asin: 'B08TEST123',
            condition: 'NEW',
            lastUpdatedTime: '2024-01-01T12:00:00Z',
            inventoryDetails: [{
              fulfillmentChannelCode: 'AMAZON',
              quantity: 100,
              reservedQuantity: 5,
            }],
          },
          {
            sku: 'TEST-SKU-002',
            asin: 'B08TEST456',
            condition: 'NEW',
            lastUpdatedTime: '2024-01-01T12:00:00Z',
            inventoryDetails: [{
              fulfillmentChannelCode: 'SELLER',
              quantity: 50,
            }],
          },
        ],
        nextToken: 'next-page-token',
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventory = vi.fn().mockResolvedValue(mockInventoryResult);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventory: mockGetInventory,
        getInventoryBySku: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const inventoryResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const testResourceHandler = inventoryResourceCall[3];

      const uri = new URL('amazon-inventory://');
      const params = {};

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory://',
          text: expect.stringContaining('# Amazon Inventory'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Found 2 inventory items');
      expect(result.contents[0].text).toContain('TEST-SKU-001');
      expect(result.contents[0].text).toContain('TEST-SKU-002');
      expect(result.contents[0].text).toContain('Next Page');
      expect(result.contents[0].text).toContain('Filter Options');
      expect(mockGetInventory).toHaveBeenCalledWith({});
    });

    it('should handle empty inventory list', async () => {
      const mockInventoryResult = {
        items: [],
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventory = vi.fn().mockResolvedValue(mockInventoryResult);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventory: mockGetInventory,
        getInventoryBySku: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const inventoryResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const testResourceHandler = inventoryResourceCall[3];

      const uri = new URL('amazon-inventory://');
      const params = {};

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory://',
          text: expect.stringContaining('No inventory items found'),
          mimeType: 'text/markdown',
        }],
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock the InventoryClient to throw an error
      const mockGetInventoryBySku = vi.fn().mockRejectedValue(new Error('Inventory API Error'));
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventoryBySku: mockGetInventoryBySku,
        getInventory: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const inventoryResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const testResourceHandler = inventoryResourceCall[3];

      const uri = new URL('amazon-inventory://TEST-SKU-001');
      const params = { sku: 'TEST-SKU-001' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory://TEST-SKU-001',
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Failed to retrieve inventory');
    });

    it('should handle URL query parameters for filtering', async () => {
      const mockInventoryResult = {
        items: [{
          sku: 'TEST-SKU-001',
          asin: 'B08TEST123',
          condition: 'NEW',
          lastUpdatedTime: '2024-01-01T12:00:00Z',
          inventoryDetails: [{
            fulfillmentChannelCode: 'AMAZON',
            quantity: 100,
          }],
        }],
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventory = vi.fn().mockResolvedValue(mockInventoryResult);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventory: mockGetInventory,
        getInventoryBySku: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const inventoryResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const testResourceHandler = inventoryResourceCall[3];

      const uri = new URL('amazon-inventory://?fulfillmentChannels=AMAZON&nextToken=test-token');
      const params = {};

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory://',
          text: expect.stringContaining('# Amazon Inventory'),
          mimeType: 'text/markdown',
        }],
      });

      // Verify that the filter parameters were passed to the API call
      expect(mockGetInventory).toHaveBeenCalledWith({
        fulfillmentChannels: ['AMAZON'],
        nextToken: 'test-token',
      });
    });
  });

  describe('amazon-inventory-filter resource handler', () => {
    let resourceHandler: Function;

    beforeEach(() => {
      registerInventoryResources(resourceManager, authConfig);
      
      // Get the resource handler for amazon-inventory-filter
      const filterResourceCall = (resourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-inventory-filter');
      resourceHandler = filterResourceCall[3];
    });

    it('should handle SKU filter successfully', async () => {
      const mockInventoryResult = {
        items: [{
          sku: 'TEST-SKU-001',
          asin: 'B08TEST123',
          condition: 'NEW',
          lastUpdatedTime: '2024-01-01T12:00:00Z',
          inventoryDetails: [{
            fulfillmentChannelCode: 'AMAZON',
            quantity: 100,
          }],
        }],
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventory = vi.fn().mockResolvedValue(mockInventoryResult);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventory: mockGetInventory,
        getInventoryBySku: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const filterResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory-filter');
      const testResourceHandler = filterResourceCall[3];

      const uri = new URL('amazon-inventory-filter://' + encodeURIComponent('sku:TEST-SKU-001'));
      const params = { filter: 'sku:TEST-SKU-001' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory-filter://' + encodeURIComponent('sku:TEST-SKU-001'),
          text: expect.stringContaining('# Amazon Inventory: Sku Filter - TEST-SKU-001'),
          mimeType: 'text/markdown',
        }],
      });

      expect(mockGetInventory).toHaveBeenCalledWith({
        sellerSkus: ['TEST-SKU-001'],
        nextToken: undefined,
      });
    });

    it('should handle channel filter successfully', async () => {
      const mockInventoryResult = {
        items: [{
          sku: 'TEST-SKU-001',
          asin: 'B08TEST123',
          condition: 'NEW',
          lastUpdatedTime: '2024-01-01T12:00:00Z',
          inventoryDetails: [{
            fulfillmentChannelCode: 'AMAZON',
            quantity: 100,
          }],
        }],
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventory = vi.fn().mockResolvedValue(mockInventoryResult);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventory: mockGetInventory,
        getInventoryBySku: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const filterResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory-filter');
      const testResourceHandler = filterResourceCall[3];

      const uri = new URL('amazon-inventory-filter://' + encodeURIComponent('channel:AMAZON'));
      const params = { filter: 'channel:AMAZON' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory-filter://' + encodeURIComponent('channel:AMAZON'),
          text: expect.stringContaining('# Amazon Inventory: Channel Filter - AMAZON'),
          mimeType: 'text/markdown',
        }],
      });

      expect(mockGetInventory).toHaveBeenCalledWith({
        fulfillmentChannels: ['AMAZON'],
        nextToken: undefined,
      });
    });

    it('should handle date filter successfully', async () => {
      const mockInventoryResult = {
        items: [{
          sku: 'TEST-SKU-001',
          asin: 'B08TEST123',
          condition: 'NEW',
          lastUpdatedTime: '2024-01-01T12:00:00Z',
          inventoryDetails: [{
            fulfillmentChannelCode: 'AMAZON',
            quantity: 100,
          }],
        }],
      };

      // Mock the InventoryClient constructor and methods
      const mockGetInventory = vi.fn().mockResolvedValue(mockInventoryResult);
      const { InventoryClient } = await import('../../../src/api/inventory-client.js');
      (InventoryClient as any).mockImplementation(() => ({
        getInventory: mockGetInventory,
        getInventoryBySku: vi.fn(),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      const registerSpy = vi.spyOn(testResourceManager, 'registerResource');
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource handler
      const filterResourceCall = registerSpy.mock.calls
        .find((call: any) => call[0] === 'amazon-inventory-filter');
      const testResourceHandler = filterResourceCall[3];

      const uri = new URL('amazon-inventory-filter://' + encodeURIComponent('date:2024-01-01'));
      const params = { filter: 'date:2024-01-01' };

      const result = await testResourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory-filter://' + encodeURIComponent('date:2024-01-01'),
          text: expect.stringContaining('# Amazon Inventory: Date Filter - 2024-01-01'),
          mimeType: 'text/markdown',
        }],
      });

      expect(mockGetInventory).toHaveBeenCalledWith({
        startDateTime: expect.any(Date),
        endDateTime: expect.any(Date),
        nextToken: undefined,
      });
    });

    it('should show filter options when no filter is provided', async () => {
      const uri = new URL('amazon-inventory-filter://');
      const params = {};

      const result = await resourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory-filter://',
          text: expect.stringContaining('# Amazon Inventory Filters'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Filter by SKU');
      expect(result.contents[0].text).toContain('Filter by ASIN');
      expect(result.contents[0].text).toContain('Filter by Fulfillment Channel');
      expect(result.contents[0].text).toContain('Filter by Update Date');
    });

    it('should handle invalid filter type', async () => {
      const uri = new URL('amazon-inventory-filter://' + encodeURIComponent('invalid:value'));
      const params = { filter: 'invalid:value' };

      const result = await resourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory-filter://' + encodeURIComponent('invalid:value'),
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Unknown filter type: invalid');
    });

    it('should handle invalid date format', async () => {
      const uri = new URL('amazon-inventory-filter://' + encodeURIComponent('date:invalid-date'));
      const params = { filter: 'date:invalid-date' };

      const result = await resourceHandler(uri, params);

      expect(result).toMatchObject({
        contents: [{
          uri: 'amazon-inventory-filter://' + encodeURIComponent('date:invalid-date'),
          text: expect.stringContaining('# Error'),
          mimeType: 'text/markdown',
        }],
      });

      expect(result.contents[0].text).toContain('Invalid date format');
    });
  });

  describe('resource template completion', () => {
    it('should provide SKU completion for inventory resource', async () => {
      // Create a mock inventory client with the expected data
      const mockClient = inventoryFactory.create();
      inventoryFactory.mockGetInventory(mockClient, [
        { sku: 'TEST-SKU-001' },
        { sku: 'TEST-SKU-002' },
      ]);

      // Reset modules to clear cache
      vi.resetModules();

      // Mock the InventoryClient constructor to return our mock
      vi.doMock('../../../src/api/inventory-client.js', () => ({
        InventoryClient: vi.fn(() => mockClient),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      vi.spyOn(testResourceManager, 'registerResource');
      
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource template for amazon-inventory
      const inventoryResourceCall = (testResourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const resourceTemplate = inventoryResourceCall[1];

      // Test SKU completion
      const completions = await resourceTemplate.sku('TEST');

      expect(completions).toEqual(['TEST-SKU-001', 'TEST-SKU-002']);
    });

    it('should handle completion errors gracefully', async () => {
      // Create a mock inventory client that throws an error
      const mockClient = inventoryFactory.create();
      mockClient.getInventory.mockRejectedValue(new Error('Completion Error'));

      // Reset modules to clear cache
      vi.resetModules();

      // Mock the InventoryClient constructor to return our mock
      vi.doMock('../../../src/api/inventory-client.js', () => ({
        InventoryClient: vi.fn(() => mockClient),
      }));

      // Re-import and register resources with the mocked client
      const { registerInventoryResources: registerWithMock } = await import('../../../src/resources/inventory/inventory-resources.js');
      
      // Create a new resource manager for this test
      const testResourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
      vi.spyOn(testResourceManager, 'registerResource');
      
      registerWithMock(testResourceManager, authConfig);
      
      // Get the resource template for amazon-inventory
      const inventoryResourceCall = (testResourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const resourceTemplate = inventoryResourceCall[1];

      // Test SKU completion with error
      const completions = await resourceTemplate.sku('TEST');

      expect(completions).toEqual([]);
    });

    it('should return empty array for short completion values', async () => {
      registerInventoryResources(resourceManager, authConfig);
      
      // Get the resource template for amazon-inventory
      const inventoryResourceCall = (resourceManager.registerResource as any).mock.calls
        .find((call: any) => call[0] === 'amazon-inventory');
      const resourceTemplate = inventoryResourceCall[1];

      // Test SKU completion with short value
      const completions = await resourceTemplate.sku('T');

      expect(completions).toEqual([]);
    });
  });
});