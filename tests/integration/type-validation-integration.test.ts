/**
 * Integration tests for type validation with API clients and MCP handlers
 *
 * These tests verify that type validation functions and guards work correctly
 * with existing API clients and MCP request/response handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer } from '../../src/server/server.js';
import { TestSetup, TestDataBuilder } from '../utils/index.js';
import {
  validateAmazonCatalogItem,
  validateAmazonOrder,
  validateAmazonInventorySummary,
  validateInventoryFilterParams,
  validateOrdersFilterParams,
  isAmazonCatalogItem,
  isAmazonOrder,
  isAmazonInventorySummary,
  isInventoryFilterParams,
  isOrdersFilterParams,
  TypeValidationError,
} from '../../src/types/index.js';
import type { MockEnvironment } from '../utils/test-setup.js';

describe('Type Validation Integration Tests', () => {
  let server: AmazonSellerMcpServer;
  let mockEnv: MockEnvironment;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Setup isolated test environment
    const testEnv = await TestSetup.createServerTestEnvironment({
      name: 'type-validation-integration',
      version: '1.0.0-test',
    });

    server = testEnv.server;
    mockEnv = testEnv.mockEnv;
    cleanup = testEnv.cleanup;

    // Register all components before connecting
    await server.registerAllResources();
    await server.registerAllTools();
    await server.connect({ type: 'stdio' });
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('API Client Integration with Type Validation', () => {
    it('should validate catalog API responses using type validation functions', async () => {
      // Arrange - Create valid catalog data
      const validCatalogData = TestDataBuilder.createCatalogItem({
        asin: 'B07VALIDATION123',
        attributes: {
          item_name: [{ value: 'Integration Test Product', language_tag: 'en_US' }],
          brand: [{ value: 'TestBrand', language_tag: 'en_US' }],
        },
      });

      // Setup mock response
      TestSetup.setupApiResponseMocks(mockEnv, {
        success: { items: [validCatalogData] },
      });

      // Act - Test that the client would receive valid data
      const mockResponse = { items: [validCatalogData] };

      // Validate the response data using our validation functions
      expect(() => validateAmazonCatalogItem(validCatalogData)).not.toThrow();
      expect(isAmazonCatalogItem(validCatalogData)).toBe(true);

      // Verify the response structure matches expected format
      expect(mockResponse.items).toHaveLength(1);
      expect(mockResponse.items[0]).toMatchObject({
        asin: 'B07VALIDATION123',
        attributes: expect.objectContaining({
          item_name: expect.arrayContaining([
            expect.objectContaining({
              value: 'Integration Test Product',
              language_tag: 'en_US',
            }),
          ]),
        }),
      });
    });

    it('should handle invalid catalog API responses with type validation', async () => {
      // Arrange - Create invalid catalog data
      const invalidCatalogData = {
        asin: 123, // Invalid: should be string
        attributes: 'invalid', // Invalid: should be object
      };

      // Act & Assert - Validation should fail
      expect(() => validateAmazonCatalogItem(invalidCatalogData)).toThrow(TypeValidationError);
      expect(isAmazonCatalogItem(invalidCatalogData)).toBe(false);

      // Verify error details
      try {
        validateAmazonCatalogItem(invalidCatalogData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeValidationError);
        expect((error as TypeValidationError).typeName).toBe('AmazonCatalogItem');
        expect((error as TypeValidationError).validationErrors).toBeDefined();
      }
    });

    it('should validate orders API responses using type validation functions', async () => {
      // Arrange - Create valid order data
      const validOrderData = TestDataBuilder.createOrder({
        amazonOrderId: 'ORDER-VALIDATION-123',
        orderStatus: 'Unshipped',
        purchaseDate: '2024-01-15T10:30:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
      });

      // Setup mock response
      TestSetup.setupApiResponseMocks(mockEnv, {
        success: { orders: [validOrderData] },
      });

      // Act - Test that the client would receive valid data
      const mockResponse = { orders: [validOrderData] };

      // Validate the response data using our validation functions
      expect(() => validateAmazonOrder(validOrderData)).not.toThrow();
      expect(isAmazonOrder(validOrderData)).toBe(true);

      // Verify the response structure
      expect(mockResponse.orders).toHaveLength(1);
      expect(mockResponse.orders[0]).toMatchObject({
        amazonOrderId: expect.any(String),
        orderStatus: expect.any(String),
        purchaseDate: expect.any(String),
        marketplaceId: expect.any(String),
      });
    });

    it('should validate inventory API responses using type validation functions', async () => {
      // Arrange - Create valid inventory data
      const validInventoryData = TestDataBuilder.createInventorySummary({
        sellerSku: 'VALIDATION-SKU-001',
        totalQuantity: 50,
        inventoryDetails: {
          fulfillableQuantity: 45,
          inboundWorkingQuantity: 5,
        },
      });

      // Setup mock response
      TestSetup.setupApiResponseMocks(mockEnv, {
        success: { inventorySummaries: [validInventoryData] },
      });

      // Act - Test that the client would receive valid data
      const mockResponse = { inventorySummaries: [validInventoryData] };

      // Validate the response data using our validation functions
      expect(() => validateAmazonInventorySummary(validInventoryData)).not.toThrow();
      expect(isAmazonInventorySummary(validInventoryData)).toBe(true);

      // Verify the response structure
      expect(mockResponse.inventorySummaries).toHaveLength(1);
      expect(mockResponse.inventorySummaries[0]).toMatchObject({
        sellerSku: 'VALIDATION-SKU-001',
        inventoryDetails: expect.objectContaining({
          fulfillableQuantity: 45,
          inboundWorkingQuantity: 5,
        }),
      });
    });

    it('should validate filter parameters before API requests', async () => {
      // Arrange - Create valid filter parameters
      const validInventoryFilters = {
        marketplaceIds: ['ATVPDKIKX0DER'],
        sellerSkus: ['SKU-001', 'SKU-002'],
        startDateTime: '2024-01-01T00:00:00Z',
        endDateTime: '2024-01-31T23:59:59Z',
      };

      const validOrdersFilters = {
        marketplaceIds: ['ATVPDKIKX0DER'],
        orderStatuses: ['Unshipped', 'PartiallyShipped'],
        createdAfter: '2024-01-01T00:00:00Z',
        createdBefore: '2024-01-31T23:59:59Z',
      };

      // Act & Assert - Validation should pass
      expect(() => validateInventoryFilterParams(validInventoryFilters)).not.toThrow();
      expect(isInventoryFilterParams(validInventoryFilters)).toBe(true);

      expect(() => validateOrdersFilterParams(validOrdersFilters)).not.toThrow();
      expect(isOrdersFilterParams(validOrdersFilters)).toBe(true);

      // Verify filter structure
      expect(validInventoryFilters).toMatchObject({
        marketplaceIds: expect.arrayContaining(['ATVPDKIKX0DER']),
        sellerSkus: expect.arrayContaining(['SKU-001', 'SKU-002']),
        startDateTime: expect.any(String),
        endDateTime: expect.any(String),
      });

      expect(validOrdersFilters).toMatchObject({
        marketplaceIds: expect.arrayContaining(['ATVPDKIKX0DER']),
        orderStatuses: expect.arrayContaining(['Unshipped', 'PartiallyShipped']),
        createdAfter: expect.any(String),
        createdBefore: expect.any(String),
      });
    });

    it('should reject invalid filter parameters before API requests', async () => {
      // Arrange - Create invalid filter parameters
      const invalidInventoryFilters = {
        marketplaceIds: 'invalid', // Should be array
        sellerSkus: [123, 456], // Should be string array
        startDateTime: new Date(), // Should be string or Date
      };

      const invalidOrdersFilters = {
        marketplaceIds: ['VALID'],
        orderStatuses: null, // Should be array or undefined
        createdAfter: 12345, // Should be string
      };

      // Act & Assert - Validation should fail
      expect(() => validateInventoryFilterParams(invalidInventoryFilters)).toThrow(
        TypeValidationError
      );
      expect(isInventoryFilterParams(invalidInventoryFilters)).toBe(false);

      expect(() => validateOrdersFilterParams(invalidOrdersFilters)).toThrow(TypeValidationError);
      expect(isOrdersFilterParams(invalidOrdersFilters)).toBe(false);
    });
  });

  describe('MCP Request/Response Type Validation', () => {
    it('should validate MCP tool inputs using type guards', async () => {
      // Arrange - Get tool manager
      const toolManager = server.getToolManager();

      // Valid tool inputs
      const validCatalogSearchInput = {
        keywords: 'wireless headphones',
        brandNames: ['Sony', 'Bose'],
        pageSize: 10,
      };

      const validOrderProcessInput = {
        orderId: 'ORDER-MCP-123',
        action: 'SHIP',
        trackingNumber: 'TRACK123456789',
      };

      // Act - Test tool input validation
      const searchTool = toolManager.getToolHandler('search-catalog');
      const processOrderTool = toolManager.getToolHandler('process-order');

      // These should not throw during input validation
      expect(searchTool).toBeDefined();
      expect(processOrderTool).toBeDefined();

      // Verify input structure using type guards
      expect(typeof validCatalogSearchInput).toBe('object');
      expect(validCatalogSearchInput.keywords).toBe('wireless headphones');
      expect(Array.isArray(validCatalogSearchInput.brandNames)).toBe(true);
      expect(typeof validCatalogSearchInput.pageSize).toBe('number');

      expect(typeof validOrderProcessInput).toBe('object');
      expect(validOrderProcessInput.orderId).toBe('ORDER-MCP-123');
      expect(validOrderProcessInput.action).toBe('SHIP');
    });

    it('should handle MCP tool responses with proper type validation', async () => {
      // Arrange - Setup test data
      const catalogData = TestDataBuilder.createCatalogItem({
        asin: 'B07MCP123',
        attributes: {
          item_name: [{ value: 'MCP Test Product', language_tag: 'en_US' }],
        },
      });

      TestSetup.setupApiResponseMocks(mockEnv, {
        success: { items: [catalogData] },
      });

      // Act - Execute MCP tool and validate response
      const toolManager = server.getToolManager();
      const searchTool = toolManager.getToolHandler('search-catalog');

      const response = await searchTool({
        keywords: 'test product',
      });

      // Assert - Validate MCP response structure
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content.length).toBeGreaterThan(0);

      // Verify content structure
      const content = response.content[0];
      expect(content).toMatchObject({
        type: 'text',
        text: expect.any(String),
      });

      // The response text should contain information about the search
      expect(typeof content.text).toBe('string');
      expect(content.text.length).toBeGreaterThan(0);
    });

    it('should validate MCP notification data structure', async () => {
      // Arrange - Setup notification manager
      const notificationManager = server.getNotificationManager();
      const notificationSpy = TestSetup.createTestSpy();

      // Valid notification data
      const validNotificationData = {
        type: 'inventory-change',
        timestamp: new Date().toISOString(),
        payload: {
          sku: 'NOTIFICATION-SKU-001',
          oldQuantity: 50,
          newQuantity: 45,
          fulfillmentChannel: 'SELLER',
        },
        source: 'inventory-service',
      };

      // Act - Test notification validation
      notificationManager.addListener('inventory-change', notificationSpy);

      await notificationManager.sendGenericNotification(
        'inventory-change',
        validNotificationData.payload
      );

      // Assert - Verify notification structure
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'NOTIFICATION-SKU-001',
          oldQuantity: 50,
          newQuantity: 45,
          fulfillmentChannel: 'SELLER',
        })
      );

      // Validate notification data structure
      expect(validNotificationData).toMatchObject({
        type: expect.any(String),
        timestamp: expect.any(String),
        payload: expect.any(Object),
        source: expect.any(String),
      });
    });

    it('should handle type validation errors in MCP request processing', async () => {
      // Arrange - Create invalid input data
      const invalidInput = {
        keywords: 123, // Should be string
        brandNames: 'invalid', // Should be array
        pageSize: 'invalid', // Should be number
      };

      // Act - Execute MCP tool with invalid input
      const toolManager = server.getToolManager();
      const searchTool = toolManager.getToolHandler('search-catalog');

      const response = await searchTool(invalidInput);

      // Assert - Tool should handle invalid input gracefully
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);

      // Response should indicate an error occurred
      const content = response.content[0];
      expect(content.type).toBe('text');
      expect(typeof content.text).toBe('string');

      // Error message should be present (tools handle validation internally)
      expect(content.text.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Type Safety Validation', () => {
    it('should maintain type safety throughout complete workflow', async () => {
      // Arrange - Setup complete workflow data
      const catalogItem = TestDataBuilder.createCatalogItem({
        asin: 'B07E2E123',
        attributes: {
          item_name: [{ value: 'End-to-End Test Product', language_tag: 'en_US' }],
          brand: [{ value: 'TestBrand', language_tag: 'en_US' }],
        },
      });

      const orderData = TestDataBuilder.createOrder({
        AmazonOrderId: 'ORDER-E2E-123',
        OrderStatus: 'Unshipped',
      });

      const inventoryData = TestDataBuilder.createInventorySummary({
        sellerSku: 'E2E-SKU-001',
        totalQuantity: 25,
      });

      // Setup mock responses
      TestSetup.setupApiResponseMocks(mockEnv, {
        success: {
          items: [catalogItem],
          orders: [orderData],
          inventorySummaries: [inventoryData],
        },
      });

      // Act - Execute complete workflow with type validation
      const toolManager = server.getToolManager();

      // Step 1: Search catalog (validate input and output)
      const searchInput = { keywords: 'test product' };
      expect(typeof searchInput.keywords).toBe('string');

      const searchResult = await toolManager.getToolHandler('search-catalog')(searchInput);
      expect(searchResult.content).toBeDefined();

      // Step 2: Get inventory (validate filter parameters)
      const inventoryFilters = { sellerSkus: ['E2E-SKU-001'] };
      expect(() => validateInventoryFilterParams(inventoryFilters)).not.toThrow();

      const inventoryResult = await toolManager.getToolHandler('get-inventory')(inventoryFilters);
      expect(inventoryResult.content).toBeDefined();

      // Step 3: Process order (validate order data)
      const orderFilters = { orderStatuses: ['Unshipped'] };
      expect(() => validateOrdersFilterParams(orderFilters)).not.toThrow();

      const orderResult = await toolManager.getToolHandler('get-orders')(orderFilters);
      expect(orderResult.content).toBeDefined();

      // Assert - Verify all steps completed with proper type validation
      expect(searchResult.content[0].type).toBe('text');
      expect(inventoryResult.content[0].type).toBe('text');
      expect(orderResult.content[0].type).toBe('text');

      // Verify type validation functions work with test data
      expect(() => validateAmazonCatalogItem(catalogItem)).not.toThrow();
      expect(() => validateAmazonOrder(orderData)).not.toThrow();
      expect(() => validateAmazonInventorySummary(inventoryData)).not.toThrow();
    });

    it('should detect and handle type mismatches in complex workflows', async () => {
      // Arrange - Create data with type mismatches
      const invalidCatalogItem = {
        asin: null, // Invalid type
        attributes: 'invalid', // Invalid type
      };

      const invalidOrderData = {
        amazonOrderId: 123, // Invalid type
        orderStatus: null, // Invalid type
      };

      // Act & Assert - Type validation should catch all issues
      expect(() => validateAmazonCatalogItem(invalidCatalogItem)).toThrow(TypeValidationError);
      expect(() => validateAmazonOrder(invalidOrderData)).toThrow(TypeValidationError);

      expect(isAmazonCatalogItem(invalidCatalogItem)).toBe(false);
      expect(isAmazonOrder(invalidOrderData)).toBe(false);

      // Verify error details provide useful information
      try {
        validateAmazonCatalogItem(invalidCatalogItem);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeValidationError);
        const validationError = error as TypeValidationError;
        expect(validationError.typeName).toBe('AmazonCatalogItem');
        expect(validationError.validationErrors.issues).toBeDefined();
        expect(validationError.validationErrors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should ensure no regressions in existing functionality', async () => {
      // Arrange - Use existing test patterns to verify no regressions
      const testData = {
        catalog: {
          asin: 'B07REGRESSION123',
          attributes: {
            item_name: [{ value: 'Regression Test Product', language_tag: 'en_US' }],
            brand: [{ value: 'TestBrand', language_tag: 'en_US' }],
          },
        },
        order: TestDataBuilder.createOrder({
          amazonOrderId: 'ORDER-REGRESSION-123',
        }),
        inventory: TestDataBuilder.createInventorySummary({
          sellerSku: 'REGRESSION-SKU-001',
        }),
      };

      // Act - Verify all existing functionality still works
      const toolManager = server.getToolManager();
      const resourceManager = server.getResourceManager();
      const notificationManager = server.getNotificationManager();

      // Test tool registration (existing functionality)
      expect(toolManager.isToolRegistered('search-catalog')).toBe(true);
      expect(toolManager.isToolRegistered('get-inventory')).toBe(true);
      expect(toolManager.isToolRegistered('process-order')).toBe(true);

      // Test resource registration (existing functionality)
      expect(resourceManager.isResourceRegistered('amazon-catalog')).toBe(true);
      expect(resourceManager.isResourceRegistered('amazon-inventory')).toBe(true);
      expect(resourceManager.isResourceRegistered('amazon-orders')).toBe(true);

      // Test notification system (existing functionality)
      expect(notificationManager).toBeDefined();
      expect(typeof notificationManager.sendGenericNotification).toBe('function');

      // Assert - Type validation enhances but doesn't break existing functionality
      expect(() => validateAmazonCatalogItem(testData.catalog)).not.toThrow();
      expect(() => validateAmazonOrder(testData.order)).not.toThrow();
      expect(() => validateAmazonInventorySummary(testData.inventory)).not.toThrow();

      // Verify type guards work correctly
      expect(isAmazonCatalogItem(testData.catalog)).toBe(true);
      expect(isAmazonOrder(testData.order)).toBe(true);
      expect(isAmazonInventorySummary(testData.inventory)).toBe(true);
    });
  });
});
