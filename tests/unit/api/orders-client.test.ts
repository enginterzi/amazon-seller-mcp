/**
 * Unit tests for Orders API client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersClient } from '../../../src/api/orders-client.js';
import { OrdersClientMockFactory } from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('OrdersClient', () => {
  let ordersClient: OrdersClient;
  let mockFactory: OrdersClientMockFactory;
  let mockClient: any;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();
    ordersClient = new OrdersClient(authConfig);

    mockFactory = new OrdersClientMockFactory();
    mockClient = mockFactory.create();

    // Replace the client's request method with our mock
    (ordersClient as any).request = mockClient.request;

    // Clear the cache to ensure clean state
    (ordersClient as any).clearCache();
  });

  it('should retrieve orders successfully', async () => {
    const expectedOrders = [
      TestDataBuilder.createOrder({
        AmazonOrderId: 'TEST-ORDER-001',
        OrderStatus: 'UNSHIPPED',
      }),
    ];

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: {
          orders: expectedOrders,
          nextToken: null,
        },
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.getOrders({
      orderStatuses: ['UNSHIPPED'],
    });

    expect(result.orders).toHaveLength(1);
    TestAssertions.expectValidOrder(result.orders[0], 'TEST-ORDER-001');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/orders/v0/orders'),
      query: expect.objectContaining({
        OrderStatuses: ['UNSHIPPED'],
      }),
    });
  });

  it('should retrieve single order successfully', async () => {
    const expectedOrder = TestDataBuilder.createOrder({
      AmazonOrderId: 'TEST-ORDER-001',
      OrderStatus: 'UNSHIPPED',
    });

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedOrder,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.getOrder({
      amazonOrderId: 'TEST-ORDER-001',
    });

    TestAssertions.expectValidOrder(result, 'TEST-ORDER-001');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001'),
    });
  });

  it('should retrieve order items successfully', async () => {
    const expectedOrderItems = {
      orderItems: [
        {
          asin: 'B00TEST123',
          sellerSku: 'SKU-TEST-123',
          orderItemId: 'TEST-ITEM-001',
          title: 'Test Product',
          quantityOrdered: 1,
        },
      ],
      amazonOrderId: 'TEST-ORDER-001',
      nextToken: null,
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedOrderItems,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.getOrderItems({
      amazonOrderId: 'TEST-ORDER-001',
    });

    expect(result.orderItems).toHaveLength(1);
    expect(result.amazonOrderId).toBe('TEST-ORDER-001');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/orderItems'),
    });
  });

  it('should confirm order successfully', async () => {
    const expectedResult = {
      success: true,
      amazonOrderId: 'TEST-ORDER-001',
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedResult,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.updateOrderStatus({
      amazonOrderId: 'TEST-ORDER-001',
      action: 'CONFIRM',
    });

    expect(result.success).toBe(true);
    expect(result.amazonOrderId).toBe('TEST-ORDER-001');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'POST',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/confirmation'),
    });
  });

  it('should ship order successfully', async () => {
    const expectedResult = {
      success: true,
      amazonOrderId: 'TEST-ORDER-001',
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedResult,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.updateOrderStatus({
      amazonOrderId: 'TEST-ORDER-001',
      action: 'SHIP',
      details: {
        shippingDetails: {
          carrierCode: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          shipDate: '2023-01-02',
          items: [
            {
              orderItemId: 'TEST-ITEM-001',
              quantity: 1,
            },
          ],
        },
      },
    });

    expect(result.success).toBe(true);
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'POST',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/shipment'),
      data: expect.objectContaining({
        carrierCode: 'UPS',
        trackingNumber: '1Z999AA10123456784',
      }),
    });
  });

  it('should cancel order successfully', async () => {
    const expectedResult = {
      success: true,
      amazonOrderId: 'TEST-ORDER-001',
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedResult,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.updateOrderStatus({
      amazonOrderId: 'TEST-ORDER-001',
      action: 'CANCEL',
      details: {
        cancellationReason: 'CustomerRequest',
      },
    });

    expect(result.success).toBe(true);
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'POST',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/cancellation'),
      data: expect.objectContaining({
        cancellationReason: 'CustomerRequest',
      }),
    });
  });

  it('should handle missing shipping details error', async () => {
    await expect(
      ordersClient.updateOrderStatus({
        amazonOrderId: 'TEST-ORDER-001',
        action: 'SHIP',
        details: {},
      })
    ).rejects.toThrow('Validation failed for SHIP action: details.shippingDetails: Required');
  });

  it('should handle missing cancellation reason error', async () => {
    await expect(
      ordersClient.updateOrderStatus({
        amazonOrderId: 'TEST-ORDER-001',
        action: 'CANCEL',
        details: {},
      })
    ).rejects.toThrow('Validation failed for CANCEL action: details.cancellationReason: Required');
  });

  it('should retrieve order buyer info successfully', async () => {
    const expectedBuyerInfo = {
      amazonOrderId: 'TEST-ORDER-001',
      buyerEmail: 'test@example.com',
      buyerName: 'Test Buyer',
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedBuyerInfo,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.getOrderBuyerInfo({
      amazonOrderId: 'TEST-ORDER-001',
    });

    expect(result.amazonOrderId).toBe('TEST-ORDER-001');
    expect(result.buyerEmail).toBe('test@example.com');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/buyerInfo'),
    });
  });

  it('should retrieve order address successfully', async () => {
    const expectedAddress = {
      amazonOrderId: 'TEST-ORDER-001',
      shippingAddress: {
        name: 'Test Buyer',
        addressLine1: '123 Test St',
        city: 'Test City',
        stateOrRegion: 'Test State',
        postalCode: '12345',
        countryCode: 'US',
      },
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedAddress,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.getOrderAddress({
      amazonOrderId: 'TEST-ORDER-001',
    });

    expect(result.amazonOrderId).toBe('TEST-ORDER-001');
    expect(result.shippingAddress.name).toBe('Test Buyer');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/address'),
    });
  });

  it('should retrieve order fulfillment successfully', async () => {
    const expectedFulfillment = {
      amazonOrderId: 'TEST-ORDER-001',
      fulfillmentShipments: [
        {
          amazonShipmentId: 'TEST-SHIPMENT-001',
          fulfillmentCenterId: 'TEST-FC-001',
          fulfillmentShipmentStatus: 'SHIPPED',
          shippingDate: '2023-01-02T12:00:00Z',
          fulfillmentShipmentItem: [
            {
              sellerSKU: 'SKU-TEST-123',
              orderItemId: 'TEST-ITEM-001',
              quantityShipped: 1,
            },
          ],
        },
      ],
    };

    // Mock the request method to return the proper API response structure
    mockClient.request.mockResolvedValue({
      data: {
        payload: expectedFulfillment,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await ordersClient.getOrderFulfillment({
      amazonOrderId: 'TEST-ORDER-001',
    });

    expect(result.amazonOrderId).toBe('TEST-ORDER-001');
    expect(result.fulfillmentShipments).toHaveLength(1);
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/fulfillment'),
    });
  });
});
