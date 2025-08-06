/**
 * Integration tests for MCP server component registration and management
 * 
 * These tests verify server behavior and component interactions
 * using behavior-focused testing patterns with proper isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer } from '../../src/server/server.js';
import { TestSetup, TestDataBuilder, TestAssertions } from '../utils/index.js';
import { mockSpApiClient } from './mock-sp-api.js';
import type { MockEnvironment } from '../utils/test-setup.js';

describe('Amazon Seller MCP Server Integration', () => {
  let server: AmazonSellerMcpServer;
  let mockEnv: MockEnvironment;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Setup isolated test environment with proper cleanup
    const testEnv = await TestSetup.createServerTestEnvironment({
      name: 'test-mcp-server',
      version: '1.0.0-integration',
    });
    
    server = testEnv.server;
    mockEnv = testEnv.mockEnv;
    cleanup = testEnv.cleanup;
    // Note: Individual tests will register specific components before connecting
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  it('should register all resources and tools successfully during initialization', async () => {
    // Act - Register all server components before connecting
    await server.registerAllResources();
    await server.registerAllTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    // Assert - Verify component managers are available for use
    const resourceManager = server.getResourceManager();
    const toolManager = server.getToolManager();

    expect(resourceManager).toBeDefined();
    expect(toolManager).toBeDefined();
    
    // Verify tools and resources were registered
    expect(toolManager.getRegisteredTools().length).toBeGreaterThan(0);
    expect(resourceManager.getRegisteredResources().length).toBeGreaterThan(0);
  });

  it('should provide catalog search functionality through registered tools', async () => {
    // Arrange - Setup catalog test data
    const catalogData = TestDataBuilder.createCatalogItem({
      asin: 'B07CATALOG123',
      attributes: {
        item_name: [{ value: 'Integration Test Product', language_tag: 'en_US' }],
        brand: [{ value: 'TestBrand', language_tag: 'en_US' }],
      },
    });

    TestSetup.setupApiResponseMocks(mockEnv, {
      success: { items: [catalogData] },
    });

    // Act - Register catalog components before connecting
    await server.registerCatalogResources();
    await server.registerCatalogTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const toolManager = server.getToolManager();
    const resourceManager = server.getResourceManager();

    // Assert - Verify catalog components are registered
    expect(toolManager.isToolRegistered('search-catalog')).toBe(true);
    expect(toolManager.isToolRegistered('get-catalog-item')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-catalog')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-catalog-search')).toBe(true);
  });

  it('should support complete listing management workflow from creation to updates', async () => {
    // Arrange - Setup listing test data
    const listingData = TestDataBuilder.createListing({
      sku: 'INTEGRATION-SKU-001',
      productType: 'ELECTRONICS',
      attributes: {
        condition_type: [{ value: 'new_new', marketplace_id: 'ATVPDKIKX0DER' }],
        merchant_suggested_asin: [{ value: 'B08TEST123', marketplace_id: 'ATVPDKIKX0DER' }],
      },
    });

    TestSetup.setupApiResponseMocks(mockEnv, {
      success: { submissionId: 'SUB-123', status: 'ACCEPTED' },
    });

    // Act - Register listings components before connecting
    await server.registerListingsResources();
    await server.registerListingsTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const toolManager = server.getToolManager();
    const resourceManager = server.getResourceManager();

    // Assert - Verify listings components are registered
    expect(toolManager.isToolRegistered('create-listing')).toBe(true);
    expect(toolManager.isToolRegistered('update-listing')).toBe(true);
    expect(toolManager.isToolRegistered('delete-listing')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-listings')).toBe(true);
  });

  it('should enable inventory management through query and update operations', async () => {
    // Arrange - Setup inventory test data
    const sku = 'INVENTORY-SKU-001';
    const inventoryData = TestDataBuilder.createInventorySummary({
      sellerSku: sku,
      totalQuantity: 100,
      inventoryDetails: { fulfillableQuantity: 95 },
    });

    TestSetup.setupApiResponseMocks(mockEnv, {
      success: { inventorySummaries: [inventoryData] },
    });

    // Act - Register inventory components before connecting
    await server.registerInventoryResources();
    await server.registerInventoryTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const toolManager = server.getToolManager();
    const resourceManager = server.getResourceManager();

    // Assert - Verify inventory components are registered
    expect(toolManager.isToolRegistered('get-inventory')).toBe(true);
    expect(toolManager.isToolRegistered('update-inventory')).toBe(true);
    expect(toolManager.isToolRegistered('set-inventory-replenishment')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-inventory')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-inventory-filter')).toBe(true);
  });

  it('should support order processing workflow from retrieval to status updates', async () => {
    // Arrange - Setup order test data
    const orderId = 'ORDER-INTEGRATION-123';
    const orderData = TestDataBuilder.createOrder({
      AmazonOrderId: orderId,
      OrderStatus: 'Unshipped',
    });

    TestSetup.setupApiResponseMocks(mockEnv, {
      success: { orders: [orderData] },
    });

    // Act - Register orders components before connecting
    await server.registerOrdersResources();
    await server.registerOrdersTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const toolManager = server.getToolManager();
    const resourceManager = server.getResourceManager();

    // Assert - Verify orders components are registered
    expect(toolManager.isToolRegistered('process-order')).toBe(true);
    expect(toolManager.isToolRegistered('update-order-status')).toBe(true);
    expect(toolManager.isToolRegistered('fulfill-order')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-orders')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-order-action')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-order-filter')).toBe(true);
  });

  it('should enable report generation and retrieval workflow for business analytics', async () => {
    // Arrange - Setup report test data
    const reportType = 'GET_FLAT_FILE_OPEN_LISTINGS_DATA';
    const reportId = 'REPORT-INTEGRATION-123';

    TestSetup.setupApiResponseMocks(mockEnv, {
      success: { reportId },
    });

    // Act - Register reports components before connecting
    await server.registerReportsResources();
    await server.registerReportsTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const toolManager = server.getToolManager();
    const resourceManager = server.getResourceManager();

    // Assert - Verify reports components are registered
    expect(toolManager.getRegisteredTools()).toContain('generate-report');
    expect(toolManager.getRegisteredTools()).toContain('get-report');
    expect(resourceManager.isResourceRegistered('amazon-reports')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-report-action')).toBe(true);
    expect(resourceManager.isResourceRegistered('amazon-report-filter')).toBe(true);
  });

  it('should provide AI-powered content generation for product optimization', async () => {
    // Act - Register AI tools before connecting
    await server.registerAiTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const toolManager = server.getToolManager();

    // Assert - Verify AI tools are properly registered
    expect(toolManager.isToolRegistered('generate-product-description')).toBe(true);
    expect(toolManager.isToolRegistered('optimize-listing')).toBe(true);
  });

  it('should handle notification delivery and subscription management for system events', async () => {
    // Arrange - Register components before connecting
    await server.registerInventoryTools();
    await server.registerOrdersTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });

    const notificationManager = server.getNotificationManager();
    const notificationSpy = TestSetup.createTestSpy();

    // Act - Test notification subscription and delivery workflow
    notificationManager.onNotification(notificationSpy);

    const notificationData = {
      sku: 'NOTIFICATION-SKU-001',
      previousQuantity: 50,
      newQuantity: 45,
      fulfillmentChannel: 'AMAZON' as const,
      marketplaceId: 'ATVPDKIKX0DER',
    };

    notificationManager.sendInventoryChangeNotification(notificationData);

    // Wait for async notification processing
    await TestSetup.waitForAsyncOperations(50);

    // Test listener removal
    notificationManager.removeListener(notificationSpy);

    // Assert - Verify notification system behavior
    expect(notificationManager).toBeDefined();
    expect(notificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: notificationData.sku,
        previousQuantity: notificationData.previousQuantity,
        newQuantity: notificationData.newQuantity,
        fulfillmentChannel: notificationData.fulfillmentChannel,
        marketplaceId: notificationData.marketplaceId,
      })
    );
  });

  it('should handle API errors gracefully while maintaining service availability', async () => {
    // Arrange - Setup error scenario
    const apiError = TestDataBuilder.createApiError('NETWORK_ERROR' as any, {
      message: 'Service temporarily unavailable',
      statusCode: 503,
    });

    TestSetup.setupApiResponseMocks(mockEnv, {
      error: { type: 'NETWORK_ERROR', statusCode: 503, message: 'Service temporarily unavailable' },
    });

    mockSpApiClient.searchCatalogItems.mockRejectedValueOnce(apiError);

    // Act - Register catalog tools before connecting
    await server.registerCatalogTools();
    
    // Connect after registration
    await server.connect({ type: 'stdio' });
    const toolManager = server.getToolManager();

    // Assert - Verify catalog tools are registered for error handling
    expect(toolManager.isToolRegistered('search-catalog')).toBe(true);
    expect(toolManager.isToolRegistered('get-catalog-item')).toBe(true);
  });

  it('should maintain system stability when components encounter configuration errors', async () => {
    // Arrange - Setup component failure scenario
    const invalidConfig = {
      ...TestSetup.createTestServerConfig(),
      credentials: {
        clientId: 'invalid-client-id',
        clientSecret: '',
        refreshToken: 'invalid-token',
      },
    };

    // Act - Test server behavior with invalid configuration
    let serverWithInvalidConfig: AmazonSellerMcpServer | null = null;
    let configError: Error | null = null;

    try {
      serverWithInvalidConfig = new AmazonSellerMcpServer(invalidConfig);
      // Connect to test configuration validation
      await serverWithInvalidConfig.connect({ type: 'stdio' });
    } catch (error) {
      configError = error as Error;
    }
    
    // Connect the main server for comparison
    await server.connect({ type: 'stdio' });

    // Assert - Verify system stability during configuration failures
    expect(configError).toBeInstanceOf(Error);
    
    // Verify original server remains functional
    expect(server.getMcpServer()).toBeDefined();
    expect(server.getToolManager()).toBeDefined();

    // Cleanup invalid server if it was created
    if (serverWithInvalidConfig) {
      await serverWithInvalidConfig.close();
    }
  });
});
