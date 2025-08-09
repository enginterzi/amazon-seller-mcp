/**
 * Integration Test Template
 *
 * This template provides a standardized structure for integration tests.
 * Integration tests verify component interactions and end-to-end workflows.
 *
 * Guidelines:
 * - Test complete user workflows and component interactions
 * - Use real implementations where possible, mock only external services
 * - Verify end-to-end functionality and data flow
 * - Test critical business processes and user journeys
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import components for integration testing
import { AmazonSellerMcpServer } from '../../src/server/server.js';

// Import test utilities and mock factories
import {
  TestSetup,
  TestDataBuilder,
  TestAssertions,
  MockSpApi,
  IntegrationTestEnvironment,
} from '../utils/index.js';

describe('End-to-End Workflow Integration', () => {
  let testEnvironment: IntegrationTestEnvironment;
  let server: AmazonSellerMcpServer;
  let mockSpApi: MockSpApi;

  beforeEach(async () => {
    // Setup integration test environment
    testEnvironment = await TestSetup.createIntegrationEnvironment();
    mockSpApi = testEnvironment.mockSpApi;
    server = testEnvironment.server;
  });

  afterEach(async () => {
    // Cleanup test environment
    await testEnvironment.cleanup();
  });

  describe('product catalog workflow', () => {
    it('should complete product search and retrieval workflow', async () => {
      // Arrange
      const searchQuery = 'wireless headphones';
      const expectedProducts = TestDataBuilder.createProductsList(5);
      mockSpApi.setupCatalogScenario('successful-search', {
        query: searchQuery,
        products: expectedProducts,
      });

      // Act - Execute complete workflow
      const searchResults = await server.handleToolCall('search_products', {
        query: searchQuery,
        marketplace: 'US',
      });

      const firstProduct = searchResults.content[0];
      const productDetails = await server.handleToolCall('get_product', {
        asin: firstProduct.asin,
      });

      // Assert - Verify workflow completion
      TestAssertions.expectToolSuccess(
        searchResults,
        expect.objectContaining({
          products: expect.arrayContaining([
            expect.objectContaining({
              asin: expect.any(String),
              title: expect.stringContaining('headphones'),
            }),
          ]),
        })
      );

      TestAssertions.expectToolSuccess(
        productDetails,
        expect.objectContaining({
          asin: firstProduct.asin,
          title: expect.any(String),
          price: expect.any(Number),
        })
      );
    });

    it('should handle product not found scenario gracefully', async () => {
      // Arrange
      const nonExistentAsin = 'B000000000';
      mockSpApi.setupCatalogScenario('product-not-found', {
        asin: nonExistentAsin,
      });

      // Act
      const result = await server.handleToolCall('get_product', {
        asin: nonExistentAsin,
      });

      // Assert
      TestAssertions.expectToolError(result, 'ProductNotFound');
    });
  });

  describe('listing management workflow', () => {
    it('should complete create-update-delete listing workflow', async () => {
      // Arrange
      const listingData = TestDataBuilder.createListingData();
      const sku = listingData.sku;

      mockSpApi.setupListingsScenario('full-lifecycle', {
        sku,
        listingData,
      });

      // Act - Create listing
      const createResult = await server.handleToolCall('create_listing', listingData);

      // Act - Update listing
      const updateData = { ...listingData, price: listingData.price + 10 };
      const updateResult = await server.handleToolCall('update_listing', {
        sku,
        updates: updateData,
      });

      // Act - Get listing to verify update
      const getResult = await server.handleToolCall('get_listing', { sku });

      // Act - Delete listing
      const deleteResult = await server.handleToolCall('delete_listing', { sku });

      // Assert - Verify complete workflow
      TestAssertions.expectToolSuccess(
        createResult,
        expect.objectContaining({
          sku,
          status: 'ACTIVE',
        })
      );

      TestAssertions.expectToolSuccess(
        updateResult,
        expect.objectContaining({
          sku,
          price: updateData.price,
        })
      );

      TestAssertions.expectToolSuccess(
        getResult,
        expect.objectContaining({
          sku,
          price: updateData.price,
        })
      );

      TestAssertions.expectToolSuccess(
        deleteResult,
        expect.objectContaining({
          sku,
          status: 'DELETED',
        })
      );
    });

    it('should handle validation errors during listing creation', async () => {
      // Arrange
      const invalidListingData = TestDataBuilder.createInvalidListingData();
      mockSpApi.setupListingsScenario('validation-error', {
        listingData: invalidListingData,
      });

      // Act
      const result = await server.handleToolCall('create_listing', invalidListingData);

      // Assert
      TestAssertions.expectToolError(result, 'ValidationError');
      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('inventory management workflow', () => {
    it('should complete inventory update and tracking workflow', async () => {
      // Arrange
      const sku = 'TEST-SKU-001';
      const initialQuantity = 100;
      const updateQuantity = 75;

      mockSpApi.setupInventoryScenario('quantity-management', {
        sku,
        initialQuantity,
        updateQuantity,
      });

      // Act - Get initial inventory
      const initialInventory = await server.handleToolCall('get_inventory', { sku });

      // Act - Update inventory quantity
      const updateResult = await server.handleToolCall('update_inventory', {
        sku,
        quantity: updateQuantity,
      });

      // Act - Verify inventory update
      const updatedInventory = await server.handleToolCall('get_inventory', { sku });

      // Assert - Verify workflow completion
      TestAssertions.expectToolSuccess(
        initialInventory,
        expect.objectContaining({
          sku,
          quantity: initialQuantity,
        })
      );

      TestAssertions.expectToolSuccess(
        updateResult,
        expect.objectContaining({
          sku,
          quantity: updateQuantity,
        })
      );

      TestAssertions.expectToolSuccess(
        updatedInventory,
        expect.objectContaining({
          sku,
          quantity: updateQuantity,
        })
      );
    });
  });

  describe('order processing workflow', () => {
    it('should complete order fulfillment workflow', async () => {
      // Arrange
      const orderId = 'ORDER-123456789';
      const trackingNumber = 'TRACK-987654321';

      mockSpApi.setupOrderScenario('fulfillment-workflow', {
        orderId,
        trackingNumber,
      });

      // Act - Get order details
      const orderDetails = await server.handleToolCall('get_order', { orderId });

      // Act - Fulfill order
      const fulfillmentResult = await server.handleToolCall('fulfill_order', {
        orderId,
        trackingNumber,
        carrier: 'UPS',
      });

      // Act - Verify order status
      const updatedOrder = await server.handleToolCall('get_order', { orderId });

      // Assert - Verify workflow completion
      TestAssertions.expectToolSuccess(
        orderDetails,
        expect.objectContaining({
          orderId,
          status: 'Unshipped',
        })
      );

      TestAssertions.expectToolSuccess(
        fulfillmentResult,
        expect.objectContaining({
          orderId,
          trackingNumber,
        })
      );

      TestAssertions.expectToolSuccess(
        updatedOrder,
        expect.objectContaining({
          orderId,
          status: 'Shipped',
          trackingNumber,
        })
      );
    });

    it('should handle order cancellation workflow', async () => {
      // Arrange
      const orderId = 'ORDER-CANCEL-123';
      const cancellationReason = 'Customer requested cancellation';

      mockSpApi.setupOrderScenario('cancellation-workflow', {
        orderId,
        cancellationReason,
      });

      // Act - Cancel order
      const cancellationResult = await server.handleToolCall('cancel_order', {
        orderId,
        reason: cancellationReason,
      });

      // Act - Verify cancellation
      const cancelledOrder = await server.handleToolCall('get_order', { orderId });

      // Assert - Verify workflow completion
      TestAssertions.expectToolSuccess(
        cancellationResult,
        expect.objectContaining({
          orderId,
          status: 'Cancelled',
        })
      );

      TestAssertions.expectToolSuccess(
        cancelledOrder,
        expect.objectContaining({
          orderId,
          status: 'Cancelled',
        })
      );
    });
  });

  describe('error handling and recovery', () => {
    it('should handle API rate limiting across multiple operations', async () => {
      // Arrange
      const operations = [
        { tool: 'get_product', params: { asin: 'B123456789' } },
        { tool: 'get_product', params: { asin: 'B987654321' } },
        { tool: 'get_product', params: { asin: 'B555666777' } },
      ];

      mockSpApi.setupRateLimitScenario('burst-requests', {
        operations,
        rateLimitAfter: 2,
      });

      // Act - Execute operations that trigger rate limiting
      const results = [];
      for (const operation of operations) {
        const result = await server.handleToolCall(operation.tool, operation.params);
        results.push(result);
      }

      // Assert - Verify rate limiting is handled gracefully
      results.forEach((result, index) => {
        if (index < 2) {
          TestAssertions.expectToolSuccess(result, expect.any(Object));
        } else {
          // Third request should be rate limited but handled gracefully
          expect(result).toBeDefined();
        }
      });
    });

    it('should recover from temporary network failures', async () => {
      // Arrange
      const asin = 'B123456789';
      mockSpApi.setupNetworkFailureScenario('temporary-failure', {
        asin,
        failureCount: 2,
      });

      // Act - Operation should succeed after retries
      const result = await server.handleToolCall('get_product', { asin });

      // Assert - Verify successful recovery
      TestAssertions.expectToolSuccess(
        result,
        expect.objectContaining({
          asin,
        })
      );
    });
  });

  describe('resource integration', () => {
    it('should provide consistent data through tools and resources', async () => {
      // Arrange
      const asin = 'B123456789';
      const productData = TestDataBuilder.createProduct({ asin });
      mockSpApi.setupCatalogScenario('consistent-data', {
        asin,
        productData,
      });

      // Act - Get data through tool
      const toolResult = await server.handleToolCall('get_product', { asin });

      // Act - Get data through resource
      const resourceResult = await server.readResource({
        uri: `amazon://catalog/products/${asin}`,
      });

      // Assert - Verify data consistency
      TestAssertions.expectToolSuccess(toolResult, productData);

      expect(resourceResult.contents[0]).toEqual(
        expect.objectContaining({
          uri: `amazon://catalog/products/${asin}`,
          mimeType: 'application/json',
        })
      );

      const resourceData = JSON.parse(resourceResult.contents[0].text);
      expect(resourceData).toEqual(productData);
    });
  });

  describe('performance and scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      // Arrange
      const skus = TestDataBuilder.createSkuList(50);
      const inventoryUpdates = skus.map((sku) => ({
        sku,
        quantity: Math.floor(Math.random() * 100) + 1,
      }));

      mockSpApi.setupBulkOperationScenario('inventory-updates', {
        updates: inventoryUpdates,
      });

      // Act - Measure execution time
      const startTime = Date.now();
      const results = await server.handleToolCall('bulk_update_inventory', {
        updates: inventoryUpdates,
      });
      const executionTime = Date.now() - startTime;

      // Assert - Verify performance and results
      TestAssertions.expectToolSuccess(
        results,
        expect.objectContaining({
          updatedCount: inventoryUpdates.length,
          failedCount: 0,
        })
      );

      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});

/**
 * Template Usage Instructions:
 *
 * 1. Replace workflow descriptions with your actual business processes
 * 2. Update component imports to match your project structure
 * 3. Configure mock scenarios to match your external service interactions
 * 4. Add workflow-specific test cases for your domain
 * 5. Ensure all critical user journeys are covered
 * 6. Test both happy path and error scenarios for each workflow
 * 7. Verify data consistency across different access methods
 * 8. Include performance tests for bulk operations
 * 9. Test error recovery and resilience patterns
 * 10. Use realistic test data that matches production scenarios
 */
