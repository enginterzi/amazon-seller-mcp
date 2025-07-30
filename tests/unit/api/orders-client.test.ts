/**
 * Unit tests for Orders API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { OrdersClient } from '../../../src/api/orders-client.js';
import { AuthConfig } from '../../../src/types/auth.js';

// Mock axios and AmazonAuth
vi.mock('axios');
vi.mock('../../../src/auth/amazon-auth.js', () => {
  return {
    AmazonAuth: vi.fn().mockImplementation(() => {
      return {
        getAccessToken: vi.fn().mockResolvedValue('test-access-token'),
        generateSecuredRequest: vi.fn().mockImplementation(async (request) => {
          return {
            ...request,
            headers: {
              ...request.headers,
              'x-amz-access-token': 'test-access-token',
              Authorization: 'Bearer test-access-token',
            },
          };
        }),
      };
    }),
  };
});

describe('OrdersClient', () => {
  // Sample auth config for testing
  const authConfig: AuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    region: 'NA',
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  // Sample order data
  const sampleOrder = {
    amazonOrderId: 'TEST-ORDER-001',
    purchaseDate: '2023-01-01T12:00:00Z',
    lastUpdateDate: '2023-01-01T12:30:00Z',
    orderStatus: 'UNSHIPPED',
    fulfillmentChannel: 'MFN',
    salesChannel: 'Amazon.com',
    orderTotal: {
      currencyCode: 'USD',
      amount: 29.99,
    },
    numberOfItemsShipped: 0,
    numberOfItemsUnshipped: 1,
    marketplaceId: 'ATVPDKIKX0DER',
    shipmentServiceLevelCategory: 'Standard',
  };

  // Sample order items
  const sampleOrderItems = {
    orderItems: [
      {
        asin: 'B00TEST123',
        sellerSku: 'SKU-TEST-123',
        orderItemId: 'TEST-ITEM-001',
        title: 'Test Product',
        quantityOrdered: 1,
        itemPrice: {
          currencyCode: 'USD',
          amount: 24.99,
        },
        shippingPrice: {
          currencyCode: 'USD',
          amount: 5.0,
        },
      },
    ],
    amazonOrderId: 'TEST-ORDER-001',
  };

  let ordersClient: OrdersClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create a mock axios instance with request method
    mockAxiosInstance = {
      request: vi.fn().mockResolvedValue({
        data: { payload: {} },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      }),
      defaults: { headers: {} },
    };
    
    // Mock axios.create to return the mocked axios instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);

    // Create a new OrdersClient instance before each test
    ordersClient = new OrdersClient(authConfig);
  });

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should retrieve orders successfully', async () => {
      // Mock the request method to return sample orders
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: {
            orders: [sampleOrder],
            nextToken: null,
          },
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call getOrders
      const result = await ordersClient.getOrders({
        orderStatuses: ['UNSHIPPED'],
      });

      // Verify the result
      expect(result).toEqual({
        orders: [sampleOrder],
        nextToken: null,
      });

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/orders/v0/orders'),
        })
      );
    });
  });

  describe('getOrder', () => {
    it('should retrieve a single order successfully', async () => {
      // Mock the request method to return a sample order
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: sampleOrder,
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call getOrder
      const result = await ordersClient.getOrder({
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify the result
      expect(result).toEqual(sampleOrder);

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001'),
        })
      );
    });
  });

  describe('getOrderItems', () => {
    it('should retrieve order items successfully', async () => {
      // Mock the request method to return sample order items
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: sampleOrderItems,
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call getOrderItems
      const result = await ordersClient.getOrderItems({
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify the result
      expect(result).toEqual(sampleOrderItems);

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/orderItems'),
        })
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should confirm an order successfully', async () => {
      // Mock the request method to return a successful result
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: {
            success: true,
            amazonOrderId: 'TEST-ORDER-001',
          },
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call updateOrderStatus with CONFIRM action
      const result = await ordersClient.updateOrderStatus({
        amazonOrderId: 'TEST-ORDER-001',
        action: 'CONFIRM',
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/confirmation'),
        })
      );
    });

    it('should ship an order successfully', async () => {
      // Mock the request method to return a successful result
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: {
            success: true,
            amazonOrderId: 'TEST-ORDER-001',
          },
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call updateOrderStatus with SHIP action
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

      // Verify the result
      expect(result).toEqual({
        success: true,
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/shipment'),
          data: expect.objectContaining({
            carrierCode: 'UPS',
            trackingNumber: '1Z999AA10123456784',
          }),
        })
      );
    });

    it('should cancel an order successfully', async () => {
      // Mock the request method to return a successful result
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: {
            success: true,
            amazonOrderId: 'TEST-ORDER-001',
          },
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call updateOrderStatus with CANCEL action
      const result = await ordersClient.updateOrderStatus({
        amazonOrderId: 'TEST-ORDER-001',
        action: 'CANCEL',
        details: {
          cancellationReason: 'CustomerRequest',
        },
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/cancellation'),
          data: expect.objectContaining({
            cancellationReason: 'CustomerRequest',
          }),
        })
      );
    });

    it('should throw an error when shipping details are missing for SHIP action', async () => {
      // Call updateOrderStatus with SHIP action but missing shipping details
      await expect(
        ordersClient.updateOrderStatus({
          amazonOrderId: 'TEST-ORDER-001',
          action: 'SHIP',
          details: {},
        })
      ).rejects.toThrow('Shipping details are required for SHIP action');
    });

    it('should throw an error when cancellation reason is missing for CANCEL action', async () => {
      // Call updateOrderStatus with CANCEL action but missing cancellation reason
      await expect(
        ordersClient.updateOrderStatus({
          amazonOrderId: 'TEST-ORDER-001',
          action: 'CANCEL',
          details: {},
        })
      ).rejects.toThrow('Cancellation reason is required for CANCEL action');
    });
  });

  describe('getOrderBuyerInfo', () => {
    it('should retrieve order buyer info successfully', async () => {
      // Sample buyer info
      const sampleBuyerInfo = {
        amazonOrderId: 'TEST-ORDER-001',
        buyerEmail: 'test@example.com',
        buyerName: 'Test Buyer',
      };

      // Mock the request method to return sample buyer info
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: sampleBuyerInfo,
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call getOrderBuyerInfo
      const result = await ordersClient.getOrderBuyerInfo({
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify the result
      expect(result).toEqual(sampleBuyerInfo);

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/buyerInfo'),
        })
      );
    });
  });

  describe('getOrderAddress', () => {
    it('should retrieve order address successfully', async () => {
      // Sample address
      const sampleAddress = {
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

      // Mock the request method to return sample address
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: sampleAddress,
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call getOrderAddress
      const result = await ordersClient.getOrderAddress({
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify the result
      expect(result).toEqual(sampleAddress);

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/address'),
        })
      );
    });
  });

  describe('getOrderFulfillment', () => {
    it('should retrieve order fulfillment successfully', async () => {
      // Sample fulfillment
      const sampleFulfillment = {
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

      // Mock the request method to return sample fulfillment
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          payload: sampleFulfillment,
        },
        status: 200,
        headers: {
          'x-amzn-ratelimit-limit': '10',
          'x-amzn-ratelimit-remaining': '9',
        },
      });

      // Call getOrderFulfillment
      const result = await ordersClient.getOrderFulfillment({
        amazonOrderId: 'TEST-ORDER-001',
      });

      // Verify the result
      expect(result).toEqual(sampleFulfillment);

      // Verify that the mocked axios instance request was called with the correct parameters
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/orders/v0/orders/TEST-ORDER-001/fulfillment'),
        })
      );
    });
  });
});
