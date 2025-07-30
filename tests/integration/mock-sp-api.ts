/**
 * Mock implementation of Amazon Selling Partner API for integration tests
 */
import { vi } from 'vitest';
import { ApiResponse } from '../../src/types/api';

/**
 * Mock catalog item data
 */
export const mockCatalogItems = {
  B07N4M94KL: {
    asin: 'B07N4M94KL',
    attributes: {
      item_name: ['Test Product 1'],
      brand_name: ['TestBrand'],
      product_description: ['This is a test product description'],
      bullet_point: ['Feature 1', 'Feature 2', 'Feature 3'],
      color_name: ['Black'],
      size_name: ['Medium'],
    },
    identifiers: {
      marketplaceASIN: {
        marketplaceId: 'ATVPDKIKX0DER',
        asin: 'B07N4M94KL',
      },
    },
    images: [
      {
        link: 'https://example.com/image1.jpg',
        height: 500,
        width: 500,
      },
    ],
    productTypes: {
      PRODUCT: 'SHIRT',
    },
    summaries: [
      {
        marketplaceId: 'ATVPDKIKX0DER',
        brandName: 'TestBrand',
        colorName: 'Black',
        itemName: 'Test Product 1',
        manufacturer: 'TestManufacturer',
        modelNumber: 'TM-123',
      },
    ],
  },
  B07N4M94KM: {
    asin: 'B07N4M94KM',
    attributes: {
      item_name: ['Test Product 2'],
      brand_name: ['TestBrand'],
      product_description: ['This is another test product description'],
      bullet_point: ['Feature A', 'Feature B', 'Feature C'],
      color_name: ['White'],
      size_name: ['Large'],
    },
    identifiers: {
      marketplaceASIN: {
        marketplaceId: 'ATVPDKIKX0DER',
        asin: 'B07N4M94KM',
      },
    },
    images: [
      {
        link: 'https://example.com/image2.jpg',
        height: 500,
        width: 500,
      },
    ],
    productTypes: {
      PRODUCT: 'PANTS',
    },
    summaries: [
      {
        marketplaceId: 'ATVPDKIKX0DER',
        brandName: 'TestBrand',
        colorName: 'White',
        itemName: 'Test Product 2',
        manufacturer: 'TestManufacturer',
        modelNumber: 'TM-456',
      },
    ],
  },
};

/**
 * Mock listings data
 */
export const mockListings = {
  'TEST-SKU-1': {
    sku: 'TEST-SKU-1',
    status: 'ACTIVE',
    identifiers: {
      marketplaceId: 'ATVPDKIKX0DER',
      asin: 'B07N4M94KL',
      sellerId: 'A1B2C3D4E5',
    },
    attributes: {
      condition: 'New',
      item_name: 'Test Product 1',
      brand_name: 'TestBrand',
      bullet_point: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    offers: [
      {
        price: {
          amount: 19.99,
          currencyCode: 'USD',
        },
        quantity: 100,
      },
    ],
  },
  'TEST-SKU-2': {
    sku: 'TEST-SKU-2',
    status: 'ACTIVE',
    identifiers: {
      marketplaceId: 'ATVPDKIKX0DER',
      asin: 'B07N4M94KM',
      sellerId: 'A1B2C3D4E5',
    },
    attributes: {
      condition: 'New',
      item_name: 'Test Product 2',
      brand_name: 'TestBrand',
      bullet_point: ['Feature A', 'Feature B', 'Feature C'],
    },
    offers: [
      {
        price: {
          amount: 29.99,
          currencyCode: 'USD',
        },
        quantity: 50,
      },
    ],
  },
};

/**
 * Mock inventory data
 */
export const mockInventory = {
  'TEST-SKU-1': {
    sku: 'TEST-SKU-1',
    fulfillmentAvailability: [
      {
        fulfillmentChannelCode: 'AMAZON',
        quantity: 50,
      },
      {
        fulfillmentChannelCode: 'SELLER',
        quantity: 50,
      },
    ],
  },
  'TEST-SKU-2': {
    sku: 'TEST-SKU-2',
    fulfillmentAvailability: [
      {
        fulfillmentChannelCode: 'AMAZON',
        quantity: 20,
      },
      {
        fulfillmentChannelCode: 'SELLER',
        quantity: 30,
      },
    ],
  },
};

/**
 * Mock orders data
 */
export const mockOrders = {
  'ORDER-123': {
    orderId: 'ORDER-123',
    purchaseDate: '2023-01-01T12:00:00Z',
    orderStatus: 'UNSHIPPED',
    fulfillmentChannel: 'SELLER',
    salesChannel: 'Amazon.com',
    orderTotal: {
      currencyCode: 'USD',
      amount: 19.99,
    },
    shipmentServiceLevelCategory: 'Standard',
    orderItems: [
      {
        asin: 'B07N4M94KL',
        sellerSku: 'TEST-SKU-1',
        title: 'Test Product 1',
        quantityOrdered: 1,
        itemPrice: {
          currencyCode: 'USD',
          amount: 19.99,
        },
      },
    ],
    shippingAddress: {
      name: 'John Doe',
      addressLine1: '123 Test St',
      city: 'Seattle',
      stateOrRegion: 'WA',
      postalCode: '98101',
      countryCode: 'US',
    },
  },
  'ORDER-456': {
    orderId: 'ORDER-456',
    purchaseDate: '2023-01-02T12:00:00Z',
    orderStatus: 'SHIPPED',
    fulfillmentChannel: 'AMAZON',
    salesChannel: 'Amazon.com',
    orderTotal: {
      currencyCode: 'USD',
      amount: 29.99,
    },
    shipmentServiceLevelCategory: 'Expedited',
    orderItems: [
      {
        asin: 'B07N4M94KM',
        sellerSku: 'TEST-SKU-2',
        title: 'Test Product 2',
        quantityOrdered: 1,
        itemPrice: {
          currencyCode: 'USD',
          amount: 29.99,
        },
      },
    ],
  },
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
 * Mock Amazon SP-API client
 */
export const mockSpApiClient = {
  // Authentication
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

    return Promise.resolve(mockApiResponse({ payload: item }));
  }),

  searchCatalogItems: vi.fn().mockImplementation((params) => {
    const { keywords } = params;
    const items = Object.values(mockCatalogItems).filter((item) => {
      const itemName = item.attributes.item_name[0].toLowerCase();
      if (typeof keywords === 'string') {
        return itemName.includes(keywords.toLowerCase());
      } else if (Array.isArray(keywords)) {
        return keywords.some((keyword: string) => itemName.includes(keyword.toLowerCase()));
      }
      return false;
    });

    return Promise.resolve(
      mockApiResponse({
        payload: {
          items,
          numberOfResults: items.length,
          pagination: {
            nextToken: null,
          },
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
 * Mock Amazon SP-API client factory
 */
export function createMockSpApiClient() {
  return mockSpApiClient;
}
