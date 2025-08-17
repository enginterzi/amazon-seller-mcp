/**
 * Tests for orders resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerOrdersResources } from '../../src/resources/orders/orders-resources.js';
import { OrdersClientMockFactory } from '../utils/mock-factories/api-client-factory.js';
import type { AuthConfig } from '../../src/types/auth.js';
import type { AmazonOrder } from '../../src/types/amazon-api.js';

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
    };
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Create mock factories
    ordersClientMockFactory = new OrdersClientMockFactory();
    mockOrdersClient = ordersClientMockFactory.create();

    // Mock the OrdersClient constructor
    const { OrdersClient } = await import('../../src/api/orders-client.js');
    vi.mocked(OrdersClient).mockImplementation(() => mockOrdersClient as any);

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
    
    const ordersResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-orders');
    if (ordersResourceCall) {
      ordersResourceHandler = ordersResourceCall[3] as typeof ordersResourceHandler;
    }

    const orderActionResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-order-action');
    if (orderActionResourceCall) {
      orderActionResourceHandler = orderActionResourceCall[3] as typeof orderActionResourceHandler;
    }

    const orderFilterResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-order-filter');
    if (orderFilterResourceCall) {
      orderFilterResourceHandler = orderFilterResourceCall[3] as typeof orderFilterResourceHandler;
    }

    // Extract the order ID completion function
    const createResourceTemplateCalls = vi.mocked(resourceManager.createResourceTemplate).mock.calls;
    const ordersTemplateCall = createResourceTemplateCalls.find(call => 
      call[0] === 'amazon-orders://{amazonOrderId}'
    );
    if (ordersTemplateCall && ordersTemplateCall[2]) {
      orderIdCompletionFunction = ordersTemplateCall[2].amazonOrderId as typeof orderIdCompletionFunction;
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

      const content = (result as any).contents[0].text;
      expect(content).toContain('**Order ID:** 123-4567890-1234567');
      expect(content).toContain('**Seller Order ID:** SELLER-ORDER-123');
      expect(content).toContain('**Order Status:** UNSHIPPED');
      expect(content).toContain('**Order Total:** 29.99 USD');
      expect(content).toContain('**Name:** John Doe');
      expect(content).toContain('**Address:** 123 Main St');
      expect(content).toContain('**Email:** john@example.com');
      expect(content).toContain('**ASIN:** [B07N4M94KL](amazon-catalog://B07N4M94KL)');
      expect(content).toContain('**SKU:** [TEST-SKU-001](amazon-inventory://TEST-SKU-001)');

      expect(mockOrdersClient.getOrder).toHaveBeenCalledWith({ amazonOrderId: '123-4567890-1234567' });
      expect(mockOrdersClient.getOrderItems).toHaveBeenCalledWith({ amazonOrderId: '123-4567890-1234567' });
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
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Amazon Orders');
      expect(content).toContain('Found 1 orders');
      expect(content).toContain('[Order 123-4567890-1234567](amazon-orders://123-4567890-1234567)');
      expect(content).toContain('**Total:** 29.99 USD');
      expect(content).toContain('**Fulfillment:** Seller');
      expect(content).toContain('**Items:** 0 shipped, 2 unshipped');
      expect(content).toContain('[Next Page](amazon-orders://?nextToken=next-token-123)');
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
      const result = await ordersResourceHandler(uri, params);

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
      const content = (result as any).contents[0].text;
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
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Ship Order: 123-4567890-1234567');
      expect(content).toContain('use the `ship-order` tool');
      expect(content).toContain('**Item ID:** ITEM-123');
      expect(content).toContain('**Title:** Test Product');
    });

    it('should handle cancel action', async () => {
      // Arrange
      const uri = new URL('amazon-order-action://123-4567890-1234567/cancel');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'cancel' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Cancel Order: 123-4567890-1234567');
      expect(content).toContain('use the `cancel-order` tool');
      expect(content).toContain('Only orders that have not been shipped can be canceled');
    });

    it('should handle unsupported action', async () => {
      // Arrange
      const uri = new URL('amazon-order-action://123-4567890-1234567/invalid');
      const params = { amazonOrderId: '123-4567890-1234567', action: 'invalid' };

      // Act
      const result = await orderActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Unsupported action: invalid');
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
      const content = (result as any).contents[0].text;
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
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      expect(mockOrdersClient.getOrders).toHaveBeenCalledWith({
        fulfillmentChannels: ['AFN'],
        nextToken: undefined,
      });
    });

    it('should show filter options when no specific filter provided', async () => {
      // Arrange
      const uri = new URL('amazon-order-filter://');
      const params = {};

      // Act
      const result = await orderFilterResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Amazon Order Filters');
      expect(content).toContain('## Filter by Status');
      expect(content).toContain('[Pending Orders](amazon-order-filter://status:PENDING)');
      expect(content).toContain('## Filter by Fulfillment Channel');
      expect(content).toContain('[Amazon Fulfilled](amazon-order-filter://channel:AFN)');
    });
  });
});
