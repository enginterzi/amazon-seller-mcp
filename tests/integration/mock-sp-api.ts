/**
 * Mock implementation of Amazon Selling Partner API for integration tests
 *
 * This mock provides realistic API responses and behavior patterns
 * for testing integration workflows without external dependencies.
 * Uses behavior-focused testing patterns with proper isolation.
 */

import { vi } from 'vitest';
import { TestDataBuilder } from '../utils/index.js';
import type { ApiResponse } from '../../src/types/api.js';

/**
 * Mock catalog item data using standardized test data builders
 */
export const mockCatalogItems = {
  B07N4M94KL: TestDataBuilder.createCatalogItem({
    asin: 'B07N4M94KL',
    attributes: {
      item_name: [{ value: 'Test Product 1', language_tag: 'en_US' }],
      brand: [{ value: 'TestBrand', language_tag: 'en_US' }],
      list_price: [{ value: 29.99, currency: 'USD' }],
    },
    summaries: [
      {
        marketplaceId: 'ATVPDKIKX0DER',
        adultProduct: false,
        brand: 'TestBrand',
        itemName: 'Test Product 1',
        manufacturer: 'TestManufacturer',
      },
    ],
  }),
  B07N4M94KM: TestDataBuilder.createCatalogItem({
    asin: 'B07N4M94KM',
    attributes: {
      item_name: [{ value: 'Test Product 2', language_tag: 'en_US' }],
      brand: [{ value: 'TestBrand', language_tag: 'en_US' }],
      list_price: [{ value: 39.99, currency: 'USD' }],
    },
    summaries: [
      {
        marketplaceId: 'ATVPDKIKX0DER',
        adultProduct: false,
        brand: 'TestBrand',
        itemName: 'Test Product 2',
        manufacturer: 'TestManufacturer',
      },
    ],
  }),
};

/**
 * Mock listings data using standardized test data builders
 */
export const mockListings = {
  'TEST-SKU-1': TestDataBuilder.createListing({
    sku: 'TEST-SKU-1',
    asin: 'B07N4M94KL',
    attributes: {
      condition_type: [{ value: 'new_new', marketplace_id: 'ATVPDKIKX0DER' }],
      merchant_suggested_asin: [{ value: 'B07N4M94KL', marketplace_id: 'ATVPDKIKX0DER' }],
      purchasable_offer: [
        {
          marketplace_id: 'ATVPDKIKX0DER',
          currency: 'USD',
          our_price: [{ schedule: [{ value_with_tax: 19.99 }] }],
        },
      ],
    },
  }),
  'TEST-SKU-2': TestDataBuilder.createListing({
    sku: 'TEST-SKU-2',
    asin: 'B07N4M94KM',
    attributes: {
      condition_type: [{ value: 'new_new', marketplace_id: 'ATVPDKIKX0DER' }],
      merchant_suggested_asin: [{ value: 'B07N4M94KM', marketplace_id: 'ATVPDKIKX0DER' }],
      purchasable_offer: [
        {
          marketplace_id: 'ATVPDKIKX0DER',
          currency: 'USD',
          our_price: [{ schedule: [{ value_with_tax: 29.99 }] }],
        },
      ],
    },
  }),
};

/**
 * Mock inventory data using standardized test data builders
 */
export const mockInventory = {
  'TEST-SKU-1': TestDataBuilder.createInventorySummary({
    sellerSku: 'TEST-SKU-1',
    totalQuantity: 100,
    inventoryDetails: {
      fulfillableQuantity: 95,
      inboundWorkingQuantity: 0,
      inboundShippedQuantity: 0,
      inboundReceivingQuantity: 0,
      reservedQuantity: {
        totalReservedQuantity: 5,
        pendingCustomerOrderQuantity: 5,
        pendingTransshipmentQuantity: 0,
        fcProcessingQuantity: 0,
      },
    },
  }),
  'TEST-SKU-2': TestDataBuilder.createInventorySummary({
    sellerSku: 'TEST-SKU-2',
    totalQuantity: 50,
    inventoryDetails: {
      fulfillableQuantity: 45,
      inboundWorkingQuantity: 0,
      inboundShippedQuantity: 0,
      inboundReceivingQuantity: 0,
      reservedQuantity: {
        totalReservedQuantity: 5,
        pendingCustomerOrderQuantity: 3,
        pendingTransshipmentQuantity: 0,
        fcProcessingQuantity: 2,
      },
    },
  }),
};

/**
 * Mock orders data using standardized test data builders
 */
export const mockOrders = {
  'ORDER-123': TestDataBuilder.createOrder({
    AmazonOrderId: 'ORDER-123',
    PurchaseDate: '2023-01-01T12:00:00Z',
    OrderStatus: 'Unshipped',
    FulfillmentChannel: 'MFN',
    SalesChannel: 'Amazon.com',
    OrderTotal: {
      CurrencyCode: 'USD',
      Amount: '19.99',
    },
    ShipServiceLevel: 'Standard',
    MarketplaceId: 'ATVPDKIKX0DER',
  }),
  'ORDER-456': TestDataBuilder.createOrder({
    AmazonOrderId: 'ORDER-456',
    PurchaseDate: '2023-01-02T12:00:00Z',
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    SalesChannel: 'Amazon.com',
    OrderTotal: {
      CurrencyCode: 'USD',
      Amount: '29.99',
    },
    ShipServiceLevel: 'Expedited',
    MarketplaceId: 'ATVPDKIKX0DER',
  }),
};

/**
 * Mock reports data
 */
export const mockReports = {
  'REPORT-123': {
    reportId: 'REPORT-123',
    reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
    processingStatus: 'DONE',
    createdTime: '2023-01-01T12:00:00Z',
    processingStartTime: '2023-01-01T12:01:00Z',
    processingEndTime: '2023-01-01T12:02:00Z',
    reportDocumentId: 'DOC-123',
  },
  'REPORT-456': {
    reportId: 'REPORT-456',
    reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
    processingStatus: 'DONE',
    createdTime: '2023-01-02T12:00:00Z',
    processingStartTime: '2023-01-02T12:01:00Z',
    processingEndTime: '2023-01-02T12:02:00Z',
    reportDocumentId: 'DOC-456',
  },
};

/**
 * Mock report documents data
 */
export const mockReportDocuments = {
  'DOC-123': {
    reportDocumentId: 'DOC-123',
    url: 'https://example.com/report-123.csv',
    compressionAlgorithm: 'GZIP',
  },
  'DOC-456': {
    reportDocumentId: 'DOC-456',
    url: 'https://example.com/report-456.csv',
    compressionAlgorithm: 'GZIP',
  },
};

/**
 * Mock API response generator
 */
export function mockApiResponse<T>(data: T, statusCode = 200): ApiResponse<T> {
  return {
    data,
    statusCode,
    headers: {
      'x-amzn-requestid': 'test-request-id',
      'x-amzn-ratelimit-limit': '5',
      'x-amzn-ratelimit-remaining': '4',
      'x-amzn-ratelimit-reset': new Date(Date.now() + 1000).toISOString(),
    },
    rateLimit: {
      limit: 5,
      remaining: 4,
      resetAt: new Date(Date.now() + 1000),
    },
  };
}

/**
 * Mock Amazon SP-API client with behavior-focused testing patterns
 */
export const mockSpApiClient = {
  // Authentication methods
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    expiresAt: Date.now() + 3600000,
  }),

  // Catalog API
  getCatalogItem: vi.fn().mockImplementation((params) => {
    const { asin } = params;
    const item = mockCatalogItems[asin];

    if (!item) {
      throw new Error(`Catalog item not found: ${asin}`);
    }

    return Promise.resolve(mockApiResponse(item));
  }),

  searchCatalogItems: vi.fn().mockImplementation((params) => {
    const { keywords } = params;
    const items = Object.values(mockCatalogItems).filter((item) => {
      const itemName = item.attributes.item_name[0].toLowerCase();
      return keywords.some((keyword: string) => itemName.includes(keyword.toLowerCase()));
    });

    return Promise.resolve(
      mockApiResponse({
        items,
        pagination: {
          nextToken: null,
        },
      })
    );
  }),

  // Listings API
  getListings: vi.fn().mockImplementation((params) => {
    const { skus } = params;
    let listings = Object.values(mockListings);

    if (skus && skus.length > 0) {
      listings = listings.filter((listing) => skus.includes(listing.sku));
    }

    return Promise.resolve(mockApiResponse(listings));
  }),

  getListing: vi.fn().mockImplementation((params) => {
    const { sku } = params;
    const listing = mockListings[sku];

    if (!listing) {
      throw new Error(`Listing not found: ${sku}`);
    }

    return Promise.resolve(mockApiResponse(listing));
  }),

  putListing: vi.fn().mockImplementation((params) => {
    const { sku, attributes } = params;

    // Create or update listing
    mockListings[sku] = {
      ...(mockListings[sku] || {}),
      sku,
      status: 'ACTIVE',
      identifiers: {
        marketplaceId: 'ATVPDKIKX0DER',
        sellerId: 'A1B2C3D4E5',
      },
      attributes,
    };

    return Promise.resolve(
      mockApiResponse({
        submissionId: 'SUBMISSION-123',
        status: 'ACCEPTED',
      })
    );
  }),

  deleteListing: vi.fn().mockImplementation((params) => {
    const { sku } = params;

    if (!mockListings[sku]) {
      throw new Error(`Listing not found: ${sku}`);
    }

    delete mockListings[sku];

    return Promise.resolve(
      mockApiResponse({
        submissionId: 'SUBMISSION-456',
        status: 'ACCEPTED',
      })
    );
  }),

  // Inventory API
  getInventory: vi.fn().mockImplementation((params) => {
    const { skus } = params;
    let inventory = Object.values(mockInventory);

    if (skus && skus.length > 0) {
      inventory = inventory.filter((item) => skus.includes(item.sku));
    }

    return Promise.resolve(
      mockApiResponse({
        inventory,
        pagination: {
          nextToken: null,
        },
      })
    );
  }),

  updateInventory: vi.fn().mockImplementation((params) => {
    const { sku, quantity, fulfillmentChannel } = params;

    if (!mockInventory[sku]) {
      mockInventory[sku] = {
        sku,
        fulfillmentAvailability: [],
      };
    }

    // Find or create fulfillment channel entry
    const channelIndex = mockInventory[sku].fulfillmentAvailability.findIndex(
      (fa) => fa.fulfillmentChannelCode === fulfillmentChannel
    );

    if (channelIndex >= 0) {
      mockInventory[sku].fulfillmentAvailability[channelIndex].quantity = quantity;
    } else {
      mockInventory[sku].fulfillmentAvailability.push({
        fulfillmentChannelCode: fulfillmentChannel,
        quantity,
      });
    }

    return Promise.resolve(
      mockApiResponse({
        submissionId: 'SUBMISSION-789',
        status: 'ACCEPTED',
      })
    );
  }),

  // Orders API
  getOrders: vi.fn().mockImplementation((params) => {
    const { orderStatuses } = params;
    let orders = Object.values(mockOrders);

    if (orderStatuses && orderStatuses.length > 0) {
      orders = orders.filter((order) => orderStatuses.includes(order.orderStatus));
    }

    return Promise.resolve(
      mockApiResponse({
        orders,
        pagination: {
          nextToken: null,
        },
      })
    );
  }),

  getOrder: vi.fn().mockImplementation((params) => {
    const { orderId } = params;
    const order = mockOrders[orderId];

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return Promise.resolve(mockApiResponse(order));
  }),

  updateOrderStatus: vi.fn().mockImplementation((params) => {
    const { orderId, action } = params;

    if (!mockOrders[orderId]) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Update order status based on action
    if (action === 'SHIP') {
      mockOrders[orderId].orderStatus = 'SHIPPED';
    } else if (action === 'CANCEL') {
      mockOrders[orderId].orderStatus = 'CANCELED';
    }

    return Promise.resolve(
      mockApiResponse({
        orderId,
        status: 'SUCCESS',
      })
    );
  }),

  // Reports API
  requestReport: vi.fn().mockImplementation((params) => {
    const { reportType } = params;

    const reportId = `REPORT-${Date.now()}`;

    mockReports[reportId] = {
      reportId,
      reportType,
      processingStatus: 'IN_PROGRESS',
      createdTime: new Date().toISOString(),
    };

    return Promise.resolve(
      mockApiResponse({
        reportId,
      })
    );
  }),

  getReport: vi.fn().mockImplementation((params) => {
    const { reportId } = params;
    const report = mockReports[reportId];

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    return Promise.resolve(mockApiResponse(report));
  }),

  getReportDocument: vi.fn().mockImplementation((params) => {
    const { reportDocumentId } = params;
    const document = mockReportDocuments[reportDocumentId];

    if (!document) {
      throw new Error(`Report document not found: ${reportDocumentId}`);
    }

    return Promise.resolve(mockApiResponse(document));
  }),
};

/**
 * Mock Amazon SP-API client factory with enhanced testing capabilities
 */
export function createMockSpApiClient() {
  return mockSpApiClient;
}

/**
 * Reset all mock functions to clean state for proper test isolation
 */
export function resetMockSpApiClient(): void {
  Object.values(mockSpApiClient).forEach((mockFn) => {
    if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
      mockFn.mockReset();
    }
  });
}

/**
 * Setup mock scenarios for behavior-focused testing
 */
export function setupMockScenario(scenario: 'success' | 'error' | 'rate-limit' | 'timeout'): void {
  resetMockSpApiClient();

  switch (scenario) {
    case 'success':
      // Setup successful responses using test data builders
      mockSpApiClient.searchCatalogItems.mockResolvedValue(
        mockApiResponse({ items: Object.values(mockCatalogItems) })
      );
      mockSpApiClient.getOrders.mockResolvedValue(
        mockApiResponse({ orders: Object.values(mockOrders) })
      );
      mockSpApiClient.getInventory.mockResolvedValue(
        mockApiResponse({ inventorySummaries: Object.values(mockInventory) })
      );
      break;

    case 'error': {
      // Setup error responses using standardized error builders
      const apiError = TestDataBuilder.createApiError('SERVER_ERROR', {
        message: 'API Error',
        statusCode: 500,
      });
      Object.values(mockSpApiClient).forEach((mockFn) => {
        if (typeof mockFn === 'function' && 'mockRejectedValue' in mockFn) {
          mockFn.mockRejectedValue(apiError);
        }
      });
      break;
    }

    case 'rate-limit': {
      // Setup rate limiting scenario with proper error structure
      const rateLimitError = TestDataBuilder.createApiError('RATE_LIMIT_EXCEEDED', {
        message: 'Rate limit exceeded',
        statusCode: 429,
      });
      Object.values(mockSpApiClient).forEach((mockFn) => {
        if (typeof mockFn === 'function' && 'mockRejectedValue' in mockFn) {
          mockFn.mockRejectedValue(rateLimitError);
        }
      });
      break;
    }

    case 'timeout': {
      // Setup timeout scenario with proper error structure
      const timeoutError = TestDataBuilder.createApiError('NETWORK_ERROR', {
        message: 'Request timeout',
        statusCode: 408,
      });
      Object.values(mockSpApiClient).forEach((mockFn) => {
        if (typeof mockFn === 'function' && 'mockRejectedValue' in mockFn) {
          mockFn.mockRejectedValue(timeoutError);
        }
      });
      break;
    }
  }
}
