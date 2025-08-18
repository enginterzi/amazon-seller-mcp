/**
 * API client mock factory for standardized API client mocking
 */
import { type Mock } from 'vitest';
import { BaseMockFactory } from './base-factory.js';
import type { ApiResponse } from '../../../src/types/api.js';
import type { AuthConfig } from '../../../src/types/auth.js';
import type {
  AmazonCatalogItem,
  AmazonOrder,
  AmazonInventorySummary,
  AmazonListingsItem,
  AmazonReport,
} from '../../../src/types/amazon-api.js';
import {
  validateAmazonCatalogItem,
  validateAmazonListingsItem,
  validateAmazonInventorySummary,
  validateAmazonOrder,
  validateAmazonReport,
} from '../../../src/types/validators.js';

/**
 * Configuration for API client mock scenarios
 */
export interface ApiClientMockConfig {
  /** Default auth config to use */
  authConfig?: Partial<AuthConfig>;
  /** Whether to setup common methods */
  setupCommonMethods?: boolean;
  /** Default response data */
  defaultResponse?: unknown;
  /** Default error to throw */
  defaultError?: Error;
}

/**
 * Mock base API client interface
 */
export interface MockBaseApiClient {
  request: Mock;
  clearCache: Mock;
}

/**
 * Mock catalog client interface
 */
export interface MockCatalogClient extends MockBaseApiClient {
  getCatalogItem: Mock;
  searchCatalogItems: Mock;
}

/**
 * Mock listings client interface
 */
export interface MockListingsClient extends MockBaseApiClient {
  getListings: Mock;
  getListing: Mock;
  putListing: Mock;
  deleteListing: Mock;
  patchListing: Mock;
}

/**
 * Mock inventory client interface
 */
export interface MockInventoryClient extends MockBaseApiClient {
  getInventory: Mock;
  updateInventory: Mock;
  setInventoryReplenishment: Mock;
}

/**
 * Mock orders client interface
 */
export interface MockOrdersClient extends MockBaseApiClient {
  getOrders: Mock;
  getOrder: Mock;
  updateOrderStatus: Mock;
  getOrderItems: Mock;
  getOrderBuyerInfo: Mock;
  getOrderAddress: Mock;
  getOrderFulfillment: Mock;
}

/**
 * Mock reports client interface
 */
export interface MockReportsClient extends MockBaseApiClient {
  createReport: Mock;
  requestReport: Mock;
  getReport: Mock;
  getReportDocument: Mock;
  getReports: Mock;
  cancelReport: Mock;
  downloadReportDocument: Mock;
}

/**
 * Base API client mock factory
 */
export class BaseApiClientMockFactory extends BaseMockFactory<MockBaseApiClient> {
  private defaultConfig: ApiClientMockConfig;

  constructor(config: ApiClientMockConfig = {}) {
    super('BaseApiClientMockFactory');
    this.defaultConfig = {
      setupCommonMethods: true,
      defaultResponse: { data: {}, statusCode: 200, headers: {} },
      ...config,
    };
  }

  /**
   * Create a mock base API client
   */
  create(overrides: Partial<ApiClientMockConfig> = {}): MockBaseApiClient {
    const config = { ...this.defaultConfig, ...overrides };

    const mockClient: MockBaseApiClient = {
      request: this.createMockFn(),
      clearCache: this.createMockFn(),
    };

    // Setup basic behaviors to ensure methods return promises
    if (config.defaultResponse) {
      mockClient.request.mockResolvedValue(config.defaultResponse);
    } else {
      // Use mockResolvedValue instead of mockImplementation to allow mockRejectedValueOnce to work
      // mockResolvedValue can be overridden by mockRejectedValueOnce, but mockImplementation cannot
      mockClient.request.mockResolvedValue({ data: {}, statusCode: 200, headers: {} });
    }

    mockClient.clearCache.mockResolvedValue(undefined);

    this.instances.push(mockClient);
    return mockClient;
  }

  /**
   * Configure a successful response for a method
   */
  mockSuccess<T>(
    client: MockBaseApiClient,
    method: keyof MockBaseApiClient,
    data: T,
    options: { once?: boolean; statusCode?: number } = {}
  ): void {
    const response: ApiResponse<T> = {
      data,
      statusCode: options.statusCode || 200,
      headers: {},
    };

    const mockFn = client[method] as Mock;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }
  }

  /**
   * Configure an error response for a method
   */
  mockError(
    client: MockBaseApiClient,
    method: keyof MockBaseApiClient,
    error: Error,
    options: { once?: boolean } = {}
  ): void {
    const mockFn = client[method] as Mock;
    if (options.once) {
      mockFn.mockRejectedValueOnce(error);
    } else {
      mockFn.mockRejectedValue(error);
    }
  }

  /**
   * Configure a sequence of responses for a method
   */
  mockSequence<T>(
    client: MockBaseApiClient,
    method: keyof MockBaseApiClient,
    responses: (T | Error)[]
  ): void {
    const mockFn = client[method] as Mock;

    responses.forEach((response) => {
      if (response instanceof Error) {
        mockFn.mockRejectedValueOnce(response);
      } else {
        const apiResponse: ApiResponse<T> = {
          data: response,
          statusCode: 200,
          headers: {},
        };
        mockFn.mockResolvedValueOnce(apiResponse);
      }
    });
  }

  /**
   * Reset all mocks in a client
   */
  resetClient(client: MockBaseApiClient): void {
    Object.values(client).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }
}

/**
 * Catalog client mock factory
 */
export class CatalogClientMockFactory extends BaseMockFactory<MockCatalogClient> {
  private baseFactory: BaseApiClientMockFactory;

  constructor(config: ApiClientMockConfig = {}) {
    super('CatalogClientMockFactory');
    this.baseFactory = new BaseApiClientMockFactory(config);
  }

  /**
   * Create a mock catalog client
   */
  create(overrides: Partial<ApiClientMockConfig> = {}): MockCatalogClient {
    const baseClient = this.baseFactory.create(overrides);

    const mockClient: MockCatalogClient = {
      ...baseClient,
      getCatalogItem: this.createMockFn(),
      searchCatalogItems: this.createMockFn(),
    };

    // Only setup default behaviors if not overridden
    if (!overrides.defaultResponse) {
      mockClient.getCatalogItem.mockResolvedValue({
        asin: 'B07N4M94KL',
        attributes: { item_name: ['Test Product'] },
      });

      mockClient.searchCatalogItems.mockResolvedValue({
        items: [],
        pagination: { nextToken: null },
      });
    }

    this.instances.push(mockClient);
    return mockClient;
  }

  /**
   * Mock a successful catalog item retrieval
   */
  mockGetCatalogItem(
    client: MockCatalogClient,
    asin: string,
    item: AmazonCatalogItem,
    options: { once?: boolean; validate?: boolean } = {}
  ): void {
    // Validate the item if validation is explicitly requested
    if (options.validate === true) {
      try {
        validateAmazonCatalogItem(item);
      } catch (error) {
        throw new Error(`Invalid catalog item data for ASIN ${asin}: ${error}`);
      }
    }

    const mockFn = client.getCatalogItem;
    if (options.once) {
      mockFn.mockResolvedValueOnce(item);
    } else {
      mockFn.mockResolvedValue(item);
    }
  }

  /**
   * Mock a successful catalog search
   */
  mockSearchCatalogItems(
    client: MockCatalogClient,
    results: AmazonCatalogItem[],
    options: { once?: boolean; nextToken?: string; validate?: boolean } = {}
  ): void {
    // Validate all items if validation is explicitly requested
    if (options.validate === true) {
      results.forEach((item, index) => {
        try {
          validateAmazonCatalogItem(item);
        } catch (error) {
          throw new Error(`Invalid catalog item data at index ${index}: ${error}`);
        }
      });
    }

    const response = {
      items: results,
      pagination: { nextToken: options.nextToken || null },
    };

    const mockFn = client.searchCatalogItems;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }
  }

  /**
   * Reset all mocks in a client
   */
  resetClient(client: MockCatalogClient): void {
    Object.values(client).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }
}

/**
 * Listings client mock factory
 */
export class ListingsClientMockFactory extends BaseMockFactory<MockListingsClient> {
  private baseFactory: BaseApiClientMockFactory;

  constructor(config: ApiClientMockConfig = {}) {
    super('ListingsClientMockFactory');
    this.baseFactory = new BaseApiClientMockFactory(config);
  }

  /**
   * Create a mock listings client
   */
  create(overrides: Partial<ApiClientMockConfig> = {}): MockListingsClient {
    const baseClient = this.baseFactory.create(overrides);

    const mockClient: MockListingsClient = {
      ...baseClient,
      getListings: this.createMockFn(),
      getListing: this.createMockFn(),
      putListing: this.createMockFn(),
      deleteListing: this.createMockFn(),
      patchListing: this.createMockFn(),
    };

    // Only setup default behaviors if not overridden
    if (!overrides.defaultResponse) {
      mockClient.getListings.mockResolvedValue({
        listings: [],
        nextToken: null,
      });
      mockClient.getListing.mockResolvedValue({
        sku: 'TEST-SKU',
        status: 'ACTIVE',
      });
      mockClient.putListing.mockResolvedValue({
        submissionId: 'SUBMISSION-123',
        status: 'ACCEPTED',
      });
      mockClient.deleteListing.mockResolvedValue({
        submissionId: 'SUBMISSION-456',
        status: 'ACCEPTED',
      });
      mockClient.patchListing.mockResolvedValue({
        submissionId: 'SUBMISSION-789',
        status: 'ACCEPTED',
      });
    }

    this.instances.push(mockClient);
    return mockClient;
  }

  /**
   * Mock successful listings retrieval
   */
  mockGetListings(
    client: MockListingsClient,
    listings: AmazonListingsItem[],
    options: { once?: boolean; nextToken?: string | null; validate?: boolean } = {}
  ): void {
    // Validate all listings if validation is explicitly requested
    if (options.validate === true) {
      listings.forEach((listing, index) => {
        try {
          validateAmazonListingsItem(listing);
        } catch (error) {
          throw new Error(`Invalid listings item data at index ${index}: ${error}`);
        }
      });
    }

    const listingsResult = {
      listings,
      nextToken: options.nextToken || null,
    };

    // Mock both the high-level method and the request method
    const mockFn = client.getListings;
    if (options.once) {
      mockFn.mockResolvedValueOnce(listingsResult);
    } else {
      mockFn.mockResolvedValue(listingsResult);
    }

    // Also mock the request method for actual client tests
    const apiResponse = {
      data: { payload: listingsResult },
      statusCode: 200,
      headers: {},
    };

    const requestMockFn = client.request;
    if (options.once) {
      requestMockFn.mockResolvedValueOnce(apiResponse);
    } else {
      requestMockFn.mockResolvedValue(apiResponse);
    }
  }

  /**
   * Mock successful listing retrieval
   */
  mockGetListing(
    client: MockListingsClient,
    sku: string,
    listing: AmazonListingsItem,
    options: { once?: boolean; validate?: boolean } = {}
  ): void {
    // Validate the listing if validation is explicitly requested
    if (options.validate === true) {
      try {
        validateAmazonListingsItem(listing);
      } catch (error) {
        throw new Error(`Invalid listings item data for SKU ${sku}: ${error}`);
      }
    }

    const mockFn = client.getListing;
    if (options.once) {
      mockFn.mockResolvedValueOnce(listing);
    } else {
      mockFn.mockResolvedValue(listing);
    }
  }

  /**
   * Mock successful listing creation/update
   */
  mockPutListing(
    client: MockListingsClient,
    submissionId: string = 'SUBMISSION-123',
    options: { once?: boolean } = {}
  ): void {
    const response = {
      submissionId,
      status: 'ACCEPTED' as const,
    };

    // Mock both the high-level method and the request method
    const mockFn = client.putListing;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }

    // Also mock the request method for actual client tests
    const apiResponse = {
      data: { payload: response },
      statusCode: 200,
      headers: {},
    };

    const requestMockFn = client.request;
    if (options.once) {
      requestMockFn.mockResolvedValueOnce(apiResponse);
    } else {
      requestMockFn.mockResolvedValue(apiResponse);
    }
  }

  /**
   * Reset all mocks in a client
   */
  resetClient(client: MockListingsClient): void {
    Object.values(client).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }
}

/**
 * Inventory client mock factory
 */
export class InventoryClientMockFactory extends BaseMockFactory<MockInventoryClient> {
  private baseFactory: BaseApiClientMockFactory;

  constructor(config: ApiClientMockConfig = {}) {
    super('InventoryClientMockFactory');
    this.baseFactory = new BaseApiClientMockFactory(config);
  }

  /**
   * Create a mock inventory client
   */
  create(overrides: Partial<ApiClientMockConfig> = {}): MockInventoryClient {
    const baseClient = this.baseFactory.create(overrides);

    const mockClient: MockInventoryClient = {
      ...baseClient,
      getInventory: this.createMockFn(),
      updateInventory: this.createMockFn(),
      setInventoryReplenishment: this.createMockFn(),
    };

    // Only setup default behaviors if not overridden
    if (!overrides.defaultResponse) {
      mockClient.getInventory.mockResolvedValue({
        items: [],
        nextToken: null,
      });
      mockClient.updateInventory.mockResolvedValue({
        sku: 'DEFAULT-SKU',
        fulfillmentChannel: 'AMAZON',
        status: 'SUCCESSFUL',
      });
      mockClient.setInventoryReplenishment.mockResolvedValue({
        sku: 'DEFAULT-SKU',
        status: 'SUCCESSFUL',
      });

      // Also setup default request method behavior for actual client tests
      const defaultInventoryResponse = {
        data: {
          payload: {
            items: [],
            nextToken: null,
          },
        },
        statusCode: 200,
        headers: {},
      };

      mockClient.request.mockResolvedValue(defaultInventoryResponse);
    }

    this.instances.push(mockClient);
    return mockClient;
  }

  /**
   * Mock successful inventory retrieval
   */
  mockGetInventory(
    client: MockInventoryClient,
    items: AmazonInventorySummary[],
    options: { once?: boolean; nextToken?: string | null; validate?: boolean } = {}
  ): void {
    // Validate all inventory items if validation is explicitly requested
    if (options.validate === true) {
      items.forEach((item, index) => {
        try {
          validateAmazonInventorySummary(item);
        } catch (error) {
          throw new Error(`Invalid inventory summary data at index ${index}: ${error}`);
        }
      });
    }

    const inventoryDetails = {
      items,
      nextToken: options.nextToken || null,
    };

    // Mock both the high-level method and the request method
    const mockFn = client.getInventory;
    if (options.once) {
      mockFn.mockResolvedValueOnce(inventoryDetails);
    } else {
      mockFn.mockResolvedValue(inventoryDetails);
    }

    // Also mock the request method for actual client tests
    const apiResponse = {
      data: { payload: inventoryDetails },
      statusCode: 200,
      headers: {},
    };

    const requestMockFn = client.request;
    if (options.once) {
      requestMockFn.mockResolvedValueOnce(apiResponse);
    } else {
      requestMockFn.mockResolvedValue(apiResponse);
    }
  }

  /**
   * Mock successful inventory update
   */
  mockUpdateInventory(
    client: MockInventoryClient,
    sku: string = 'DEFAULT-SKU',
    options: {
      once?: boolean;
      fulfillmentChannel?: 'AMAZON' | 'SELLER';
      status?: 'SUCCESSFUL' | 'FAILED';
      errorCode?: string;
      errorMessage?: string;
    } = {}
  ): void {
    const updateResult = {
      sku,
      fulfillmentChannel: options.fulfillmentChannel || 'AMAZON',
      status: options.status || 'SUCCESSFUL',
      ...(options.errorCode && { errorCode: options.errorCode }),
      ...(options.errorMessage && { errorMessage: options.errorMessage }),
    };

    // Mock both the high-level method and the request method
    const mockFn = client.updateInventory;
    if (options.once) {
      mockFn.mockResolvedValueOnce(updateResult);
    } else {
      mockFn.mockResolvedValue(updateResult);
    }

    // Also mock the request method for actual client tests
    const apiResponse = {
      data: { payload: updateResult },
      statusCode: 200,
      headers: {},
    };

    const requestMockFn = client.request;
    if (options.once) {
      requestMockFn.mockResolvedValueOnce(apiResponse);
    } else {
      requestMockFn.mockResolvedValue(apiResponse);
    }
  }

  /**
   * Mock successful inventory replenishment setting
   */
  mockSetInventoryReplenishment(
    client: MockInventoryClient,
    sku: string = 'DEFAULT-SKU',
    options: {
      once?: boolean;
      status?: 'SUCCESSFUL' | 'FAILED';
      errorCode?: string;
      errorMessage?: string;
    } = {}
  ): void {
    const replenishmentResult = {
      sku,
      status: options.status || 'SUCCESSFUL',
      ...(options.errorCode && { errorCode: options.errorCode }),
      ...(options.errorMessage && { errorMessage: options.errorMessage }),
    };

    // Mock both the high-level method and the request method
    const mockFn = client.setInventoryReplenishment;
    if (options.once) {
      mockFn.mockResolvedValueOnce(replenishmentResult);
    } else {
      mockFn.mockResolvedValue(replenishmentResult);
    }

    // Also mock the request method for actual client tests
    const apiResponse = {
      data: { payload: replenishmentResult },
      statusCode: 200,
      headers: {},
    };

    const requestMockFn = client.request;
    if (options.once) {
      requestMockFn.mockResolvedValueOnce(apiResponse);
    } else {
      requestMockFn.mockResolvedValue(apiResponse);
    }
  }

  /**
   * Reset all mocks in a client
   */
  resetClient(client: MockInventoryClient): void {
    Object.values(client).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }

  /**
   * Reset the factory to its initial state
   */
  reset(): void {
    super.reset();
  }
}

/**
 * Orders client mock factory
 */
export class OrdersClientMockFactory extends BaseMockFactory<MockOrdersClient> {
  private baseFactory: BaseApiClientMockFactory;

  constructor(config: ApiClientMockConfig = {}) {
    super('OrdersClientMockFactory');
    this.baseFactory = new BaseApiClientMockFactory(config);
  }

  /**
   * Create a mock orders client
   */
  create(overrides: Partial<ApiClientMockConfig> = {}): MockOrdersClient {
    const baseClient = this.baseFactory.create(overrides);

    const mockClient: MockOrdersClient = {
      ...baseClient,
      getOrders: this.createMockFn(),
      getOrder: this.createMockFn(),
      updateOrderStatus: this.createMockFn(),
      getOrderItems: this.createMockFn(),
      getOrderBuyerInfo: this.createMockFn(),
      getOrderAddress: this.createMockFn(),
      getOrderFulfillment: this.createMockFn(),
    };

    // Only setup default behaviors if not overridden
    if (!overrides.defaultResponse) {
      mockClient.getOrders.mockResolvedValue({
        orders: [],
        nextToken: null,
      });
      mockClient.getOrder.mockResolvedValue({
        amazonOrderId: 'ORDER-123',
        orderStatus: 'UNSHIPPED',
        purchaseDate: '2024-01-01T00:00:00Z',
        lastUpdateDate: '2024-01-01T00:00:00Z',
        marketplaceId: 'ATVPDKIKX0DER',
      });
      mockClient.updateOrderStatus.mockResolvedValue({
        success: true,
        amazonOrderId: 'ORDER-123',
      });
      mockClient.getOrderItems.mockResolvedValue({
        orderItems: [],
        amazonOrderId: 'ORDER-123',
        nextToken: null,
      });
      mockClient.getOrderBuyerInfo.mockResolvedValue({
        amazonOrderId: 'ORDER-123',
        buyerEmail: 'test@example.com',
        buyerName: 'Test Buyer',
      });
      mockClient.getOrderAddress.mockResolvedValue({
        amazonOrderId: 'ORDER-123',
        shippingAddress: {
          name: 'Test Buyer',
          addressLine1: '123 Test St',
          city: 'Test City',
          stateOrRegion: 'Test State',
          postalCode: '12345',
          countryCode: 'US',
        },
      });
      mockClient.getOrderFulfillment.mockResolvedValue({
        amazonOrderId: 'ORDER-123',
        fulfillmentShipments: [],
      });
    }

    this.instances.push(mockClient);
    return mockClient;
  }

  /**
   * Mock successful order retrieval
   */
  mockGetOrder(
    client: MockOrdersClient,
    orderId: string,
    order: AmazonOrder,
    options: { once?: boolean; validate?: boolean } = {}
  ): void {
    // Validate the order if validation is explicitly requested
    if (options.validate === true) {
      try {
        validateAmazonOrder(order);
      } catch (error) {
        throw new Error(`Invalid order data for order ID ${orderId}: ${error}`);
      }
    }

    const mockFn = client.getOrder;
    if (options.once) {
      mockFn.mockResolvedValueOnce(order);
    } else {
      mockFn.mockResolvedValue(order);
    }
  }

  /**
   * Mock successful orders list retrieval
   */
  mockGetOrders(
    client: MockOrdersClient,
    orders: AmazonOrder[],
    options: { once?: boolean; nextToken?: string; validate?: boolean } = {}
  ): void {
    // Validate all orders if validation is explicitly requested
    if (options.validate === true) {
      orders.forEach((order, index) => {
        try {
          validateAmazonOrder(order);
        } catch (error) {
          throw new Error(`Invalid order data at index ${index}: ${error}`);
        }
      });
    }

    const response = {
      orders,
      nextToken: options.nextToken || null,
    };

    const mockFn = client.getOrders;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }
  }

  /**
   * Reset all mocks in a client
   */
  resetClient(client: MockOrdersClient): void {
    Object.values(client).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }
}

/**
 * Reports client mock factory
 */
export class ReportsClientMockFactory extends BaseMockFactory<MockReportsClient> {
  private baseFactory: BaseApiClientMockFactory;

  constructor(config: ApiClientMockConfig = {}) {
    super('ReportsClientMockFactory');
    this.baseFactory = new BaseApiClientMockFactory(config);
  }

  /**
   * Create a mock reports client
   */
  create(overrides: Partial<ApiClientMockConfig> = {}): MockReportsClient {
    const baseClient = this.baseFactory.create(overrides);

    const mockClient: MockReportsClient = {
      ...baseClient,
      createReport: this.createMockFn(),
      requestReport: this.createMockFn(),
      getReport: this.createMockFn(),
      getReportDocument: this.createMockFn(),
      getReports: this.createMockFn(),
      cancelReport: this.createMockFn(),
      downloadReportDocument: this.createMockFn(),
    };

    // Only setup default behaviors if not overridden
    if (!overrides.defaultResponse) {
      mockClient.createReport.mockResolvedValue({
        reportId: 'REPORT-123',
      });
      mockClient.requestReport.mockResolvedValue({
        reportId: 'REPORT-123',
      });
      mockClient.getReport.mockResolvedValue({
        reportId: 'REPORT-123',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2024-01-01T00:00:00Z',
      });
      mockClient.getReportDocument.mockResolvedValue({
        reportDocumentId: 'DOC-123',
        url: 'https://example.com/report.csv',
      });
      mockClient.getReports.mockResolvedValue({
        reports: [],
        nextToken: null,
      });
      mockClient.cancelReport.mockResolvedValue(undefined);
      mockClient.downloadReportDocument.mockResolvedValue('report,data\nvalue1,value2');
    }

    this.instances.push(mockClient);
    return mockClient;
  }

  /**
   * Mock successful report creation
   */
  mockCreateReport(
    client: MockReportsClient,
    reportId: string = 'REPORT-123',
    options: { once?: boolean } = {}
  ): void {
    const response = { reportId };

    const mockFn = client.createReport;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }
  }

  /**
   * Mock successful report request (alias for createReport)
   */
  mockRequestReport(
    client: MockReportsClient,
    reportId: string = 'REPORT-123',
    options: { once?: boolean } = {}
  ): void {
    const response = { reportId };

    const mockFn = client.requestReport;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }
  }

  /**
   * Mock successful report retrieval
   */
  mockGetReport(
    client: MockReportsClient,
    report: AmazonReport,
    options: { once?: boolean; validate?: boolean } = {}
  ): void {
    // Validate the report if validation is explicitly requested
    if (options.validate === true) {
      try {
        validateAmazonReport(report);
      } catch (error) {
        throw new Error(`Invalid report data for report ID ${report.reportId}: ${error}`);
      }
    }

    const mockFn = client.getReport;
    if (options.once) {
      mockFn.mockResolvedValueOnce(report);
    } else {
      mockFn.mockResolvedValue(report);
    }
  }

  /**
   * Mock successful reports list retrieval
   */
  mockGetReports(
    client: MockReportsClient,
    reports: AmazonReport[],
    options: { once?: boolean; nextToken?: string; validate?: boolean } = {}
  ): void {
    // Validate all reports if validation is explicitly requested
    if (options.validate === true) {
      reports.forEach((report, index) => {
        try {
          validateAmazonReport(report);
        } catch (error) {
          throw new Error(`Invalid report data at index ${index}: ${error}`);
        }
      });
    }

    const response = {
      reports,
      nextToken: options.nextToken || null,
    };

    const mockFn = client.getReports;
    if (options.once) {
      mockFn.mockResolvedValueOnce(response);
    } else {
      mockFn.mockResolvedValue(response);
    }
  }

  /**
   * Mock successful report document retrieval
   */
  mockGetReportDocument(
    client: MockReportsClient,
    reportDocument: { url: string; compressionAlgorithm?: string },
    options: { once?: boolean } = {}
  ): void {
    const mockFn = client.getReportDocument;
    if (options.once) {
      mockFn.mockResolvedValueOnce(reportDocument);
    } else {
      mockFn.mockResolvedValue(reportDocument);
    }
  }

  /**
   * Mock successful report document download
   */
  mockDownloadReportDocument(
    client: MockReportsClient,
    content: string = 'report,data\nvalue1,value2',
    options: { once?: boolean } = {}
  ): void {
    const mockFn = client.downloadReportDocument;
    if (options.once) {
      mockFn.mockResolvedValueOnce(content);
    } else {
      mockFn.mockResolvedValue(content);
    }
  }

  /**
   * Reset all mocks in a client
   */
  resetClient(client: MockReportsClient): void {
    Object.values(client).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }
}

/**
 * Pre-configured API response builders
 */
export const ApiResponseBuilders = {
  /**
   * Create a successful API response
   */
  success: <T>(data: T, statusCode: number = 200): ApiResponse<T> => ({
    data,
    statusCode,
    headers: {},
  }),

  /**
   * Create a paginated response
   */
  paginated: <T>(
    items: T[],
    nextToken?: string
  ): { items: T[]; pagination: { nextToken: string | null } } => ({
    items,
    pagination: { nextToken: nextToken || null },
  }),

  /**
   * Create a submission response
   */
  submission: (submissionId: string, status: string = 'ACCEPTED') => ({
    submissionId,
    status,
  }),

  /**
   * Create an empty response
   */
  empty: () => ({}),
};
