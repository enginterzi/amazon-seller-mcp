/**
 * Tests for orders resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerOrdersResources } from '../../src/resources/orders/orders-resources.js';
import { OrdersClientMockFactory } from '../utils/mock-factories/api-client-factory.js';
import type { AuthConfig } from '../../src/types/auth.js';
import type { AmazonOrder } from '../../src/types/amazon-api.js';

// Type for resource handler result
type ResourceResult = { contents: Array<{ uri: string; text: string; mimeType: string }> };

// Mock the OrdersClient
vi.mock('../../src/api/orders-client.js', () => ({
  OrdersClient: vi.fn(),
}));

describe('Orders Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: AuthConfig;
  let mockOrdersClient: ReturnType<OrdersClientMockFactory['create']>;
  let ordersClientMockFactory: OrdersClientMockFactory;
  let ordersResourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let orderActionResourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let orderFilterResourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let orderIdCompletionFunction: (value: string) => Promise<string[]>;

  beforeEach(async () => {
    // Create mock server and resource manager
    const mockServer = {
      registerResource: vi.fn(),
    } as Pick<McpServer, 'registerResource'>;
    resourceManager = new ResourceRegistrationManager(mockServer);

    // Create mock factories
    ordersClientMockFactory = new OrdersClientMockFactory();
    mockOrdersClient = ordersClientMockFactory.create();

    // Mock the OrdersClient constructor
    const { OrdersClient } = await import('../../src/api/orders-client.js');
    vi.mocked(OrdersClient).mockImplementation(() => mockOrdersClient);

    // Spy on resource manager methods
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');

    // Create test auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: 'NA',
      marketplaceId: 'ATVPDKIKX0DER',
    };

    // Register resources and capture the handlers
    registerOrdersResources(resourceManager, authConfig);

    // Extract the resource handlers from the registerResource calls
    const registerResourceCalls = vi.mocked(resourceManager.registerResource).mock.calls;

    const ordersResourceCall = registerResourceCalls.find((call) => call[0] === 'amazon-orders');
    if (ordersResourceCall) {
      ordersResourceHandler = ordersResourceCall[3] as typeof ordersResourceHandler;
    }

    const orderActionResourceCall = registerResourceCalls.find(
      (call) => call[0] === 'amazon-order-action'
    );
    if (orderActionResourceCall) {
      orderActionResourceHandler = orderActionResourceCall[3] as typeof orderActionResourceHandler;
    }

    const orderFilterResourceCall = registerResourceCalls.find(
      (call) => call[0] === 'amazon-order-filter'
    );
    if (orderFilterResourceCall) {
      orderFilterResourceHandler = orderFilterResourceCall[3] as typeof orderFilterResourceHandler;
    }

    // Extract the order ID completion function
    const createResourceTemplateCalls = vi.mocked(resourceManager.createResourceTemplate).mock
      .calls;
    const ordersTemplateCall = createResourceTemplateCalls.find(
      (call) => call[0] === 'amazon-orders://{amazonOrderId}'
    );
    if (ordersTemplateCall && ordersTemplateCall[2]) {
      orderIdCompletionFunction = ordersTemplateCall[2]
        .amazonOrderId as typeof orderIdCompletionFunction;
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    ordersClientMockFactory.reset();
  });

  describe('Resource Registration', () => {
    it('should register orders resources with correct configuration', () => {
      // Assert
      expect(resourceManager.registerResource).toHaveBeenCalledTimes(3);
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
    });

    it('should create resource templates with proper URI patterns', () => {
      // Assert
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-orders://{amazonOrderId}',
        'amazon-orders://',
        expect.objectContaining({
          amazonOrderId: expect.any(Function),
        })
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-order-action://{amazonOrderId}/{action}'
      );

      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-order-filter://{filter}',
        'amazon-order-filter://'
      );
    });
  });

  describe('Order ID Completion Function', () => {
    it('should return empty array for short input', async () => {
      // Act
      const result = await orderIdCompletionFunction('ab');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return matching order IDs for valid input', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [
        {
          amazonOrderId: '123-4567890-1234567',
          orderStatus: 'UNSHIPPED',
          purchaseDate: '2024-01-01T00:00:00Z',
          lastUpdateDate: '2024-01-01T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
        },
        {
          amazonOrderId: '123-4567890-7654321',
          orderStatus: 'SHIPPED',
          purchaseDate: '2024-01-02T00:00:00Z',
          lastUpdateDate: '2024-01-02T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      ];

      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      // Act
      const result = await orderIdCompletionFunction('123');

      // Assert
      expect(result).toEqual(['123-4567890-1234567', '123-4567890-7654321']);
      expect(mockOrdersClient.getOrders).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockOrdersClient.getOrders.mockRejectedValueOnce(new Error('API Error'));

      // Act
      const result = await orderIdCompletionFunction('123');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Orders Resource Handler', () => {
    it('should handle specific order request with order ID', async () => {
      // Arrange
      const mockOrder: AmazonOrder = {
        amazonOrderId: '123-4567890-1234567',
        sellerOrderId: 'SELLER-ORDER-123',
        orderStatus: 'UNSHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
        fulfillmentChannel: 'MFN',
        salesChannel: 'Amazon.com',
        orderTotal: { amount: '29.99', currencyCode: 'USD' },
        shipmentServiceLevelCategory: 'Standard',
        shippingAddress: {
          name: 'John Doe',
          addressLine1: '123 Main St',
          city: 'Anytown',
          stateOrRegion: 'CA',
          postalCode: '12345',
          countryCode: 'US',
          phone: '555-1234',
        },
        buyerInfo: {
          buyerName: 'John Doe',
          buyerEmail: 'john@example.com',
        },
      };

      const mockOrderItems = {
        orderItems: [
          {
            orderItemId: 'ITEM-123',
            title: 'Test Product',
            asin: 'B07N4M94KL',
            sellerSku: 'TEST-SKU-001',
            quantityOrdered: 2,
            quantityShipped: 0,
            itemPrice: { amount: '29.99', currencyCode: 'USD' },
            shippingPrice: { amount: '5.99', currencyCode: 'USD' },
          },
        ],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      ordersClientMockFactory.mockGetOrder(mockOrdersClient, '123-4567890-1234567', mockOrder);
      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);
      mockOrdersClient.getOrderFulfillment.mockResolvedValueOnce({
        amazonOrderId: '123-4567890-1234567',
        fulfillmentShipments: [],
      });

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-orders://123-4567890-1234567',
            text: expect.stringContaining('# Amazon Order: 123-4567890-1234567'),
            mimeType: 'text/markdown',
          },
        ],
      });

      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('**Order ID:** 123-4567890-1234567');
      expect(content).toContain('**Seller Order ID:** SELLER-ORDER-123');
      expect(content).toContain('**Order Status:** UNSHIPPED');
      expect(content).toContain('**Order Total:** 29.99 USD');
      expect(content).toContain('**Name:** John Doe');
      expect(content).toContain('**Address:** 123 Main St');
      expect(content).toContain('**Email:** john@example.com');
      expect(content).toContain('**ASIN:** [B07N4M94KL](amazon-catalog://B07N4M94KL)');
      expect(content).toContain('**SKU:** [TEST-SKU-001](amazon-inventory://TEST-SKU-001)');

      expect(mockOrdersClient.getOrder).toHaveBeenCalledWith({
        amazonOrderId: '123-4567890-1234567',
      });
      expect(mockOrdersClient.getOrderItems).toHaveBeenCalledWith({
        amazonOrderId: '123-4567890-1234567',
      });
    });

    it('should handle order with minimal information', async () => {
      // Arrange - Test order with minimal fields to cover optional field branches
      const mockOrder: AmazonOrder = {
        amazonOrderId: '123-4567890-1234567',
        orderStatus: 'UNSHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
        // No optional fields like sellerOrderId, fulfillmentChannel, etc.
      };

      const mockOrderItems = {
        orderItems: [],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      ordersClientMockFactory.mockGetOrder(mockOrdersClient, '123-4567890-1234567', mockOrder);
      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);
      mockOrdersClient.getOrderFulfillment.mockRejectedValueOnce(new Error('No fulfillment info'));

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Amazon Order: 123-4567890-1234567');
      expect(content).toContain('**Order ID:** 123-4567890-1234567');
      expect(content).toContain('**Order Status:** UNSHIPPED');
      expect(content).toContain('No items found for this order');
      // Should not contain optional fields
      expect(content).not.toContain('**Seller Order ID:**');
      expect(content).not.toContain('**Fulfillment Channel:**');
      expect(content).not.toContain('**Order Total:**');
    });

    it('should handle order with extended shipping address', async () => {
      // Arrange - Test order with extended shipping address to cover all address field branches
      const mockOrder: AmazonOrder = {
        amazonOrderId: '123-4567890-1234567',
        orderStatus: 'UNSHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
        shippingAddress: {
          name: 'John Doe',
          addressLine1: '123 Main St',
          addressLine2: 'Apt 4B',
          addressLine3: 'Building C',
          city: 'Anytown',
          stateOrRegion: 'CA',
          postalCode: '12345',
          countryCode: 'US',
          phone: '555-1234',
        },
      };

      const mockOrderItems = {
        orderItems: [],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      ordersClientMockFactory.mockGetOrder(mockOrdersClient, '123-4567890-1234567', mockOrder);
      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);
      mockOrdersClient.getOrderFulfillment.mockResolvedValueOnce({
        amazonOrderId: '123-4567890-1234567',
        fulfillmentShipments: [],
      });

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('**Address:** 123 Main St, Apt 4B, Building C');
      expect(content).toContain('**Phone:** 555-1234');
    });

    it('should handle order with complete buyer info', async () => {
      // Arrange - Test order with complete buyer info to cover all buyer field branches
      const mockOrder: AmazonOrder = {
        amazonOrderId: '123-4567890-1234567',
        orderStatus: 'UNSHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
        buyerInfo: {
          buyerName: 'John Doe',
          buyerEmail: 'john@example.com',
          buyerCounty: 'Los Angeles County',
          purchaseOrderNumber: 'PO-12345',
        },
      };

      const mockOrderItems = {
        orderItems: [],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      ordersClientMockFactory.mockGetOrder(mockOrdersClient, '123-4567890-1234567', mockOrder);
      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);
      mockOrdersClient.getOrderFulfillment.mockResolvedValueOnce({
        amazonOrderId: '123-4567890-1234567',
        fulfillmentShipments: [],
      });

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('**Name:** John Doe');
      expect(content).toContain('**Email:** john@example.com');
      expect(content).toContain('**County:** Los Angeles County');
      expect(content).toContain('**Purchase Order Number:** PO-12345');
    });

    it('should handle order with complete item details', async () => {
      // Arrange - Test order items with all optional fields to cover item field branches
      const mockOrder: AmazonOrder = {
        amazonOrderId: '123-4567890-1234567',
        orderStatus: 'UNSHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      const mockOrderItems = {
        orderItems: [
          {
            orderItemId: 'ITEM-123',
            title: 'Test Product',
            asin: 'B07N4M94KL',
            sellerSku: 'TEST-SKU-001',
            quantityOrdered: 2,
            quantityShipped: 1,
            itemPrice: { amount: '29.99', currencyCode: 'USD' },
            shippingPrice: { amount: '5.99', currencyCode: 'USD' },
            itemTax: { amount: '2.40', currencyCode: 'USD' },
            shippingTax: { amount: '0.48', currencyCode: 'USD' },
            promotionDiscount: { amount: '5.00', currencyCode: 'USD' },
          },
        ],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      ordersClientMockFactory.mockGetOrder(mockOrdersClient, '123-4567890-1234567', mockOrder);
      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);
      mockOrdersClient.getOrderFulfillment.mockResolvedValueOnce({
        amazonOrderId: '123-4567890-1234567',
        fulfillmentShipments: [],
      });

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('**Quantity Shipped:** 1');
      expect(content).toContain('**Item Tax:** 2.40 USD');
      expect(content).toContain('**Shipping Tax:** 0.48 USD');
      expect(content).toContain('**Promotion Discount:** 5.00 USD');
    });

    it('should handle order with fulfillment shipments', async () => {
      // Arrange - Test order with fulfillment shipments to cover fulfillment branches
      const mockOrder: AmazonOrder = {
        amazonOrderId: '123-4567890-1234567',
        orderStatus: 'SHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      const mockOrderItems = {
        orderItems: [],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      const mockFulfillment = {
        amazonOrderId: '123-4567890-1234567',
        fulfillmentShipments: [
          {
            amazonShipmentId: 'SHIP-123',
            fulfillmentCenterId: 'FC-123',
            fulfillmentShipmentStatus: 'SHIPPED',
            shippingDate: '2024-01-02T00:00:00Z',
            estimatedArrivalDate: '2024-01-05T00:00:00Z',
            shippingNotes: ['Handle with care', 'Fragile items'],
            fulfillmentShipmentItem: [
              {
                sellerSKU: 'TEST-SKU-001',
                quantityShipped: 1,
              },
            ],
          },
        ],
      };

      ordersClientMockFactory.mockGetOrder(mockOrdersClient, '123-4567890-1234567', mockOrder);
      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);
      mockOrdersClient.getOrderFulfillment.mockResolvedValueOnce(mockFulfillment);

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('## Fulfillment Information');
      expect(content).toContain('**Amazon Shipment ID:** SHIP-123');
      expect(content).toContain('**Fulfillment Center ID:** FC-123');
      expect(content).toContain('**Status:** SHIPPED');
      expect(content).toContain('**Shipping Notes:**');
      expect(content).toContain('- Handle with care');
      expect(content).toContain('- Fragile items');
      expect(content).toContain('1. **TEST-SKU-001** - Quantity: 1');
    });

    it('should handle empty orders list', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [];
      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-orders://');
      const params = {};

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Amazon Orders');
      expect(content).toContain('No orders found.');
    });

    it('should handle orders list request without order ID', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [
        {
          amazonOrderId: '123-4567890-1234567',
          orderStatus: 'UNSHIPPED',
          purchaseDate: '2024-01-01T00:00:00Z',
          lastUpdateDate: '2024-01-01T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
          orderTotal: { amount: '29.99', currencyCode: 'USD' },
          fulfillmentChannel: 'MFN',
          shipmentServiceLevelCategory: 'Standard',
          numberOfItemsShipped: 0,
          numberOfItemsUnshipped: 2,
        },
      ];

      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders, {
        nextToken: 'next-token-123',
      });

      const uri = new URL('amazon-orders://');
      const params = {};

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Amazon Orders');
      expect(content).toContain('Found 1 orders');
      expect(content).toContain('[Order 123-4567890-1234567](amazon-orders://123-4567890-1234567)');
      expect(content).toContain('**Total:** 29.99 USD');
      expect(content).toContain('**Fulfillment:** Seller');
      expect(content).toContain('**Items:** 0 shipped, 2 unshipped');
      expect(content).toContain('[Next Page](amazon-orders://?nextToken=next-token-123)');
    });

    it('should handle orders list with AFN fulfillment channel', async () => {
      // Arrange - Test AFN fulfillment channel branch
      const mockOrders: AmazonOrder[] = [
        {
          amazonOrderId: '123-4567890-1234567',
          orderStatus: 'UNSHIPPED',
          purchaseDate: '2024-01-01T00:00:00Z',
          lastUpdateDate: '2024-01-01T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
          fulfillmentChannel: 'AFN',
        },
      ];

      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-orders://');
      const params = {};

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('**Fulfillment:** Amazon');
    });

    it('should handle orders list with query parameters', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [
        {
          amazonOrderId: '123-4567890-1234567',
          orderStatus: 'PENDING',
          purchaseDate: '2024-01-01T00:00:00Z',
          lastUpdateDate: '2024-01-01T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      ];

      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-orders://?orderStatuses=PENDING&fulfillmentChannels=MFN');
      const params = {};

      // Act
      await ordersResourceHandler(uri, params);

      // Assert
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        orderStatuses: ['PENDING'],
        fulfillmentChannels: ['MFN'],
        createdAfter: undefined,
        createdBefore: undefined,
        nextToken: undefined,
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockOrdersClient.getOrder.mockRejectedValueOnce(new Error('API Error'));

      const uri = new URL('amazon-orders://123-4567890-1234567');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await ordersResourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-orders://123-4567890-1234567',
            text: '# Error\n\nFailed to retrieve orders: API Error',
            mimeType: 'text/markdown',
          },
        ],
      });
    });
  });

  describe('Order Action Resource Handler', () => {
    it('should handle confirm action', async () => {
      // Arrange
      const uri = new URL('amazon-order-action://123-4567890-1234567/confirm');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'confirm' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Confirm Order: 123-4567890-1234567');
      expect(content).toContain('**Order ID:** 123-4567890-1234567');
      expect(content).toContain('use the `confirm-order` tool');
    });

    it('should handle ship action with order items', async () => {
      // Arrange
      const mockOrderItems = {
        orderItems: [
          {
            orderItemId: 'ITEM-123',
            title: 'Test Product',
            quantityOrdered: 2,
          },
        ],
        amazonOrderId: '123-4567890-1234567',
        nextToken: null,
      };

      mockOrdersClient.getOrderItems.mockResolvedValueOnce(mockOrderItems);

      const uri = new URL('amazon-order-action://123-4567890-1234567/ship');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'ship' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Ship Order: 123-4567890-1234567');
      expect(content).toContain('use the `ship-order` tool');
      expect(content).toContain('**Item ID:** ITEM-123');
      expect(content).toContain('**Title:** Test Product');
    });

    it('should handle ship action when getOrderItems fails', async () => {
      // Arrange - Test error handling branch in ship action
      mockOrdersClient.getOrderItems.mockRejectedValueOnce(new Error('API Error'));

      const uri = new URL('amazon-order-action://123-4567890-1234567/ship');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'ship' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Ship Order: 123-4567890-1234567');
      expect(content).toContain('use the `ship-order` tool');
      // Should not contain order items section since API call failed
      expect(content).not.toContain('## Order Items');
    });

    it('should handle cancel action', async () => {
      // Arrange
      const uri = new URL('amazon-order-action://123-4567890-1234567/cancel');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'cancel' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Cancel Order: 123-4567890-1234567');
      expect(content).toContain('use the `cancel-order` tool');
      expect(content).toContain('Only orders that have not been shipped can be canceled');
    });

    it('should handle missing order ID', async () => {
      // Arrange
      const uri = new URL('amazon-order-action:///confirm');
      const params = { action: 'confirm' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Order ID and action are required');
    });

    it('should handle missing action', async () => {
      // Arrange
      const uri = new URL('amazon-order-action://123-4567890-1234567/');
      const params = { amazonOrderId: '123-4567890-1234567' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Order ID and action are required');
    });

    it('should handle unsupported action', async () => {
      // Arrange
      const uri = new URL('amazon-order-action://123-4567890-1234567/invalid');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'invalid' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Unsupported action: invalid');
    });

    it('should handle API errors in action handler', async () => {
      // Arrange - Force an error by mocking a failure in the action handler itself
      // Mock an error by providing invalid params that will cause the handler to throw
      const invalidUri = new URL('amazon-order-action://');
      const invalidParams = {};

      // Act
      const result = await orderActionResourceHandler(invalidUri, invalidParams);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Failed to process order action');
    });
  });

  describe('Order Filter Resource Handler', () => {
    it('should handle status filter', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [
        {
          amazonOrderId: '123-4567890-1234567',
          orderStatus: 'PENDING',
          purchaseDate: '2024-01-01T00:00:00Z',
          lastUpdateDate: '2024-01-01T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      ];

      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-order-filter://status%3APENDING');
      const params = { filter: 'status:PENDING' };

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Amazon Orders: Status Filter - PENDING');
      expect(content).toContain('Found 1 orders');
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        orderStatuses: ['PENDING'],
        nextToken: undefined,
      });
    });

    it('should handle channel filter', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [];
      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-order-filter://channel%3AAFN');
      const params = { filter: 'channel:AFN' };

      // Act
      await orderFilterResourceHandler(uri, params);

      // Assert
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        fulfillmentChannels: ['AFN'],
        nextToken: undefined,
      });
    });

    it('should handle buyer filter', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [];
      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-order-filter://buyer%3Atest@example.com');
      const params = { filter: 'buyer:test@example.com' };

      // Act
      await orderFilterResourceHandler(uri, params);

      // Assert
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        buyerEmail: 'test@example.com',
        nextToken: undefined,
      });
    });

    it('should handle date filter', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [];
      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-order-filter://date%3A2024-01-01');
      const params = { filter: 'date:2024-01-01' };

      // Act
      await orderFilterResourceHandler(uri, params);

      // Assert
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAfter: expect.stringMatching(/202[34]-\d{2}-\d{2}T\d{2}:00:00\.000Z/),
          createdBefore: expect.stringMatching(/202[34]-\d{2}-\d{2}T\d{2}:59:59\.999Z/),
          nextToken: undefined,
        })
      );
    });

    it('should handle invalid date format', async () => {
      // Arrange
      const uri = new URL('amazon-order-filter://date%3Ainvalid-date');
      const params = { filter: 'date:invalid-date' };

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Invalid date format. Use YYYY-MM-DD.');
    });

    it('should handle unknown filter type', async () => {
      // Arrange
      const uri = new URL('amazon-order-filter://unknown%3Avalue');
      const params = { filter: 'unknown:value' };

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Unknown filter type: unknown');
    });

    it('should handle invalid status filter value', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [];
      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-order-filter://status%3AINVALID_STATUS');
      const params = { filter: 'status:INVALID_STATUS' };

      // Act
      await orderFilterResourceHandler(uri, params);

      // Assert - Should not set orderStatuses for invalid status
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        nextToken: undefined,
      });
    });

    it('should handle invalid channel filter value', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [];
      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders);

      const uri = new URL('amazon-order-filter://channel%3AINVALID_CHANNEL');
      const params = { filter: 'channel:INVALID_CHANNEL' };

      // Act
      await orderFilterResourceHandler(uri, params);

      // Assert - Should not set fulfillmentChannels for invalid channel
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        nextToken: undefined,
      });
    });

    it('should handle filter with pagination', async () => {
      // Arrange
      const mockOrders: AmazonOrder[] = [
        {
          amazonOrderId: '123-4567890-1234567',
          orderStatus: 'PENDING',
          purchaseDate: '2024-01-01T00:00:00Z',
          lastUpdateDate: '2024-01-01T00:00:00Z',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      ];

      ordersClientMockFactory.mockGetOrders(mockOrdersClient, mockOrders, {
        nextToken: 'next-token-123',
      });

      const uri = new URL('amazon-order-filter://status%3APENDING');
      const params = { filter: 'status:PENDING' };

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain(
        '[Next Page](amazon-order-filter://status%3APENDING?nextToken=next-token-123)'
      );
    });

    it('should show filter options when no specific filter provided', async () => {
      // Arrange
      const uri = new URL('amazon-order-filter://');
      const params = {};

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Amazon Order Filters');
      expect(content).toContain('## Filter by Status');
      expect(content).toContain('[Pending Orders](amazon-order-filter://status:PENDING)');
      expect(content).toContain('## Filter by Fulfillment Channel');
      expect(content).toContain('[Amazon Fulfilled](amazon-order-filter://channel:AFN)');
    });

    it('should handle API errors in filter handler', async () => {
      // Arrange
      mockOrdersClient.getOrders.mockRejectedValueOnce(new Error('API Error'));

      const uri = new URL('amazon-order-filter://status%3APENDING');
      const params = { filter: 'status:PENDING' };

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as ResourceResult).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Failed to filter orders: API Error');
    });
  });
});
