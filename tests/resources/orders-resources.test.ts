/**
 * Tests for orders resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources';
import { registerOrdersResources } from '../../src/resources/orders/orders-resources';
import { OrdersClient } from '../../src/api/orders-client';

// Mock the orders client
vi.mock('../../src/api/orders-client');

describe('Orders Resources', () => {
  // Mock MCP server
  const mockServer = {
    registerResource: vi.fn(),
  };

  // Mock resource manager
  let resourceManager: ResourceRegistrationManager;

  // Mock auth config
  const mockAuthConfig = {
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    region: 'NA' as const,
    marketplaceId: 'ATVPDKIKX0DER',
  };

  // Sample order data
  const sampleOrder = {
    amazonOrderId: '123-1234567-1234567',
    sellerOrderId: 'seller-123',
    purchaseDate: '2023-01-01T12:00:00Z',
    lastUpdateDate: '2023-01-02T12:00:00Z',
    orderStatus: 'UNSHIPPED',
    fulfillmentChannel: 'MFN',
    salesChannel: 'Amazon.com',
    orderTotal: {
      currencyCode: 'USD',
      amount: 99.99,
    },
    numberOfItemsShipped: 0,
    numberOfItemsUnshipped: 2,
    shipmentServiceLevelCategory: 'Standard',
    marketplaceId: 'ATVPDKIKX0DER',
    shippingAddress: {
      name: 'John Doe',
      addressLine1: '123 Main St',
      city: 'Seattle',
      stateOrRegion: 'WA',
      postalCode: '98101',
      countryCode: 'US',
    },
    buyerInfo: {
      buyerEmail: 'buyer@example.com',
      buyerName: 'John Doe',
    },
  };

  const sampleOrderItems = {
    amazonOrderId: '123-1234567-1234567',
    orderItems: [
      {
        asin: 'B0123456789',
        sellerSku: 'TEST-SKU-123',
        orderItemId: 'item-1',
        title: 'Test Product 1',
        quantityOrdered: 1,
        quantityShipped: 0,
        itemPrice: {
          currencyCode: 'USD',
          amount: 49.99,
        },
      },
      {
        asin: 'B0987654321',
        sellerSku: 'TEST-SKU-456',
        orderItemId: 'item-2',
        title: 'Test Product 2',
        quantityOrdered: 1,
        quantityShipped: 0,
        itemPrice: {
          currencyCode: 'USD',
          amount: 39.99,
        },
        shippingPrice: {
          currencyCode: 'USD',
          amount: 10.0,
        },
      },
    ],
  };

  const sampleOrderFulfillment = {
    amazonOrderId: '123-1234567-1234567',
    fulfillmentShipments: [
      {
        amazonShipmentId: 'ship-1',
        fulfillmentCenterId: 'FC123',
        fulfillmentShipmentStatus: 'PENDING',
        shippingDate: '2023-01-03T12:00:00Z',
        estimatedArrivalDate: '2023-01-10T12:00:00Z',
        fulfillmentShipmentItem: [
          {
            sellerSKU: 'TEST-SKU-123',
            orderItemId: 'item-1',
            quantityShipped: 1,
          },
          {
            sellerSKU: 'TEST-SKU-456',
            orderItemId: 'item-2',
            quantityShipped: 1,
          },
        ],
      },
    ],
  };

  const sampleOrdersResponse = {
    orders: [
      sampleOrder,
      {
        amazonOrderId: '123-7654321-7654321',
        purchaseDate: '2023-01-03T12:00:00Z',
        lastUpdateDate: '2023-01-03T12:00:00Z',
        orderStatus: 'SHIPPED',
        fulfillmentChannel: 'AFN',
        salesChannel: 'Amazon.com',
        orderTotal: {
          currencyCode: 'USD',
          amount: 29.99,
        },
        numberOfItemsShipped: 1,
        numberOfItemsUnshipped: 0,
        shipmentServiceLevelCategory: 'Premium',
        marketplaceId: 'ATVPDKIKX0DER',
      },
    ],
    nextToken: 'next-token',
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create resource manager with mock server
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Mock resource template creation
    resourceManager.createResourceTemplate = vi
      .fn()
      .mockImplementation((uriTemplate, listTemplate, completions) => {
        return { uriTemplate, listTemplate, completions };
      });

    // Mock resource registration
    resourceManager.registerResource = vi.fn().mockReturnValue(true);

    // Mock orders client methods
    (OrdersClient as any).mockImplementation(() => ({
      getOrders: vi.fn().mockResolvedValue(sampleOrdersResponse),
      getOrder: vi.fn().mockResolvedValue(sampleOrder),
      getOrderItems: vi.fn().mockResolvedValue(sampleOrderItems),
      getOrderFulfillment: vi.fn().mockResolvedValue(sampleOrderFulfillment),
      updateOrderStatus: vi
        .fn()
        .mockResolvedValue({ success: true, amazonOrderId: '123-1234567-1234567' }),
      getOrderBuyerInfo: vi.fn().mockResolvedValue({
        amazonOrderId: '123-1234567-1234567',
        buyerEmail: 'buyer@example.com',
        buyerName: 'John Doe',
      }),
      getOrderAddress: vi.fn().mockResolvedValue({
        amazonOrderId: '123-1234567-1234567',
        shippingAddress: sampleOrder.shippingAddress,
      }),
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should register orders resources', () => {
    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Verify resource registration
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(3);

    // Check first resource registration (amazon-orders)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-orders',
      expect.anything(),
      {
        title: 'Amazon Orders',
        description: 'View and manage your Amazon orders',
      },
      expect.any(Function)
    );

    // Check second resource registration (amazon-order-action)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-order-action',
      expect.anything(),
      {
        title: 'Amazon Order Actions',
        description: 'Perform actions on Amazon orders',
      },
      expect.any(Function)
    );

    // Check third resource registration (amazon-order-filter)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-order-filter',
      expect.anything(),
      {
        title: 'Amazon Order Filter',
        description: 'Filter and view your Amazon orders by various criteria',
      },
      expect.any(Function)
    );
  });

  it('should create resource templates with correct URI patterns', () => {
    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Verify resource template creation
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledTimes(3);

    // Check first template (amazon-orders)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-orders://{amazonOrderId}',
      'amazon-orders://',
      expect.objectContaining({
        amazonOrderId: expect.any(Function),
      })
    );

    // Check second template (amazon-order-action)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-order-action://{amazonOrderId}/{action}'
    );

    // Check third template (amazon-order-filter)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-order-filter://{filter}',
      'amazon-order-filter://'
    );
  });

  it('should handle orders resource requests with order ID', async () => {
    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const ordersResourceHandler = registerResourceCalls.find(
      (call: any) => call[0] === 'amazon-orders'
    )[3];

    // Test handler with order ID parameter
    const orderUri = new URL('amazon-orders://123-1234567-1234567');
    const orderResult = await ordersResourceHandler(orderUri, {
      amazonOrderId: '123-1234567-1234567',
    });

    // Verify result structure
    expect(orderResult).toHaveProperty('contents');
    expect(orderResult.contents).toBeInstanceOf(Array);
    expect(orderResult.contents[0]).toHaveProperty('uri', 'amazon-orders://123-1234567-1234567');
    expect(orderResult.contents[0]).toHaveProperty('text');
    expect(orderResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes key order information
    expect(orderResult.contents[0].text).toContain('# Amazon Order: 123-1234567-1234567');
    expect(orderResult.contents[0].text).toContain('**Order ID:** 123-1234567-1234567');
    expect(orderResult.contents[0].text).toContain('**Seller Order ID:** seller-123');
    expect(orderResult.contents[0].text).toContain('**Order Status:** UNSHIPPED');
    expect(orderResult.contents[0].text).toContain('**Order Total:** 99.99 USD');

    // Verify order items are included
    expect(orderResult.contents[0].text).toContain('## Order Items');
    expect(orderResult.contents[0].text).toContain('Test Product 1');
    expect(orderResult.contents[0].text).toContain('Test Product 2');

    // Verify fulfillment information is included
    expect(orderResult.contents[0].text).toContain('## Fulfillment Information');
    expect(orderResult.contents[0].text).toContain('**Amazon Shipment ID:** ship-1');
  });

  it('should handle orders resource requests without order ID (list all orders)', async () => {
    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const ordersResourceHandler = registerResourceCalls.find(
      (call: any) => call[0] === 'amazon-orders'
    )[3];

    // Test handler without order ID parameter (list all orders)
    const listUri = new URL('amazon-orders://');
    const listResult = await ordersResourceHandler(listUri, {});

    // Verify result structure
    expect(listResult).toHaveProperty('contents');
    expect(listResult.contents).toBeInstanceOf(Array);
    expect(listResult.contents[0]).toHaveProperty('uri', 'amazon-orders://');
    expect(listResult.contents[0]).toHaveProperty('text');
    expect(listResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes orders list
    expect(listResult.contents[0].text).toContain('# Amazon Orders');
    expect(listResult.contents[0].text).toContain('Found 2 orders');
    expect(listResult.contents[0].text).toContain('123-1234567-1234567');
    expect(listResult.contents[0].text).toContain('123-7654321-7654321');

    // Verify filter options are included
    expect(listResult.contents[0].text).toContain('## Filter Options');
    expect(listResult.contents[0].text).toContain('[All Orders]');
    expect(listResult.contents[0].text).toContain('[Pending Orders]');
    expect(listResult.contents[0].text).toContain('[Unshipped Orders]');
  });

  it('should handle order action resource requests', async () => {
    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const actionResourceHandler = registerResourceCalls.find(
      (call: any) => call[0] === 'amazon-order-action'
    )[3];

    // Test handler with confirm action
    const confirmUri = new URL('amazon-order-action://123-1234567-1234567/confirm');
    const confirmResult = await actionResourceHandler(confirmUri, {
      amazonOrderId: '123-1234567-1234567',
      action: 'confirm',
    });

    // Verify result structure
    expect(confirmResult).toHaveProperty('contents');
    expect(confirmResult.contents).toBeInstanceOf(Array);
    expect(confirmResult.contents[0]).toHaveProperty('uri', confirmUri.toString());
    expect(confirmResult.contents[0]).toHaveProperty('text');
    expect(confirmResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes confirm action information
    expect(confirmResult.contents[0].text).toContain('# Confirm Order: 123-1234567-1234567');
    expect(confirmResult.contents[0].text).toContain('confirm-order');

    // Test handler with ship action
    const shipUri = new URL('amazon-order-action://123-1234567-1234567/ship');
    const shipResult = await actionResourceHandler(shipUri, {
      amazonOrderId: '123-1234567-1234567',
      action: 'ship',
    });

    // Verify content includes ship action information
    expect(shipResult.contents[0].text).toContain('# Ship Order: 123-1234567-1234567');
    expect(shipResult.contents[0].text).toContain('ship-order');
    expect(shipResult.contents[0].text).toContain('carrierCode');
    expect(shipResult.contents[0].text).toContain('trackingNumber');

    // Test handler with cancel action
    const cancelUri = new URL('amazon-order-action://123-1234567-1234567/cancel');
    const cancelResult = await actionResourceHandler(cancelUri, {
      amazonOrderId: '123-1234567-1234567',
      action: 'cancel',
    });

    // Verify content includes cancel action information
    expect(cancelResult.contents[0].text).toContain('# Cancel Order: 123-1234567-1234567');
    expect(cancelResult.contents[0].text).toContain('cancel-order');
    expect(cancelResult.contents[0].text).toContain('cancellationReason');
  });

  it('should handle order filter resource requests', async () => {
    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const filterResourceHandler = registerResourceCalls.find(
      (call: any) => call[0] === 'amazon-order-filter'
    )[3];

    // Test handler without filter parameter (show filter options)
    const optionsUri = new URL('amazon-order-filter://');
    const optionsResult = await filterResourceHandler(optionsUri, {});

    // Verify result structure
    expect(optionsResult).toHaveProperty('contents');
    expect(optionsResult.contents).toBeInstanceOf(Array);
    expect(optionsResult.contents[0]).toHaveProperty('uri', 'amazon-order-filter://');
    expect(optionsResult.contents[0]).toHaveProperty('text');
    expect(optionsResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes filter options
    expect(optionsResult.contents[0].text).toContain('# Amazon Order Filters');
    expect(optionsResult.contents[0].text).toContain('Filter by Status');
    expect(optionsResult.contents[0].text).toContain('Filter by Fulfillment Channel');
    expect(optionsResult.contents[0].text).toContain('Filter by Buyer');
    expect(optionsResult.contents[0].text).toContain('Filter by Date');

    // Test handler with filter parameter
    // Need to encode the URL properly since it contains a colon
    const filterUri = new URL('amazon-order-filter://status%3AUNSHIPPED');
    const filterResult = await filterResourceHandler(filterUri, { filter: 'status:UNSHIPPED' });

    // Verify result structure
    expect(filterResult).toHaveProperty('contents');
    expect(filterResult.contents).toBeInstanceOf(Array);
    expect(filterResult.contents[0]).toHaveProperty('uri', filterUri.toString());
    expect(filterResult.contents[0]).toHaveProperty('text');
    expect(filterResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes filtered orders
    expect(filterResult.contents[0].text).toContain('# Amazon Orders: Status Filter - UNSHIPPED');
  });

  it('should handle errors gracefully', async () => {
    // Mock orders client to throw an error
    (OrdersClient as any).mockImplementation(() => ({
      getOrders: vi.fn().mockRejectedValue(new Error('API Error')),
      getOrder: vi.fn().mockRejectedValue(new Error('API Error')),
      getOrderItems: vi.fn().mockRejectedValue(new Error('API Error')),
      getOrderFulfillment: vi.fn().mockRejectedValue(new Error('API Error')),
    }));

    // Register orders resources
    registerOrdersResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const ordersResourceHandler = registerResourceCalls.find(
      (call: any) => call[0] === 'amazon-orders'
    )[3];

    // Test handler with order ID parameter
    const orderUri = new URL('amazon-orders://123-1234567-1234567');
    const orderResult = await ordersResourceHandler(orderUri, {
      amazonOrderId: '123-1234567-1234567',
    });

    // Verify error response
    expect(orderResult).toHaveProperty('contents');
    expect(orderResult.contents).toBeInstanceOf(Array);
    expect(orderResult.contents[0]).toHaveProperty('text');
    expect(orderResult.contents[0].text).toContain('# Error');
    expect(orderResult.contents[0].text).toContain('Failed to retrieve orders: API Error');
  });
});
