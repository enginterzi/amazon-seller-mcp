/**
 * Tests for API client mock factory
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BaseApiClientMockFactory,
  CatalogClientMockFactory,
  ListingsClientMockFactory,
  InventoryClientMockFactory,
  OrdersClientMockFactory,
  ReportsClientMockFactory,
  ApiResponseBuilders,
  type MockBaseApiClient,
  type MockCatalogClient,
  type MockListingsClient,
  type MockInventoryClient,
  type MockOrdersClient,
  type MockReportsClient,
} from './api-client-factory.js';

describe('BaseApiClientMockFactory', () => {
  let factory: BaseApiClientMockFactory;
  let mockClient: MockBaseApiClient;

  beforeEach(() => {
    factory = new BaseApiClientMockFactory();
    mockClient = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock base API client with required methods', () => {
      expect(mockClient.request).toBeDefined();
      expect(mockClient.clearCache).toBeDefined();
      expect(typeof mockClient.request).toBe('function');
      expect(typeof mockClient.clearCache).toBe('function');
    });

    it('should setup default behaviors', async () => {
      const result = await mockClient.request({});
      expect(result).toEqual({ data: {}, statusCode: 200, headers: {} });

      await expect(mockClient.clearCache()).resolves.toBeUndefined();
    });

    it('should allow custom default response', async () => {
      const customFactory = new BaseApiClientMockFactory({
        defaultResponse: { data: { custom: true }, statusCode: 201, headers: {} },
      });
      const customClient = customFactory.create();

      await expect(customClient.request()).resolves.toEqual({
        data: { custom: true },
        statusCode: 201,
        headers: {},
      });
    });
  });

  describe('mockSuccess', () => {
    it('should configure successful response for a method', async () => {
      const testData = { message: 'success' };

      factory.mockSuccess(mockClient, 'request', testData);

      const result = await mockClient.request({});
      expect(result.data).toEqual(testData);
      expect(result.statusCode).toBe(200);
    });

    it('should configure successful response with custom status code', async () => {
      const testData = { id: 123 };

      factory.mockSuccess(mockClient, 'request', testData, { statusCode: 201 });

      const result = await mockClient.request({});
      expect(result.data).toEqual(testData);
      expect(result.statusCode).toBe(201);
    });

    it('should configure one-time successful response', async () => {
      const testData1 = { first: true };
      const testData2 = { second: true };

      factory.mockSuccess(mockClient, 'request', testData1, { once: true });
      factory.mockSuccess(mockClient, 'request', testData2);

      const result1 = await mockClient.request({});
      const result2 = await mockClient.request({});

      expect(result1.data).toEqual(testData1);
      expect(result2.data).toEqual(testData2);
    });
  });

  describe('mockError', () => {
    it('should configure error response for a method', async () => {
      const testError = new Error('Test error');

      factory.mockError(mockClient, 'request', testError);

      await expect(mockClient.request({})).rejects.toThrow('Test error');
    });

    it('should configure one-time error response', async () => {
      const testError = new Error('First error');
      const testData = { recovered: true };

      factory.mockError(mockClient, 'request', testError, { once: true });
      factory.mockSuccess(mockClient, 'request', testData);

      await expect(mockClient.request({})).rejects.toThrow('First error');

      const result = await mockClient.request({});
      expect(result.data).toEqual(testData);
    });
  });

  describe('mockSequence', () => {
    it('should configure sequence of responses', async () => {
      const responses = [{ first: true }, new Error('Second call fails'), { third: true }];

      factory.mockSequence(mockClient, 'request', responses);

      const result1 = await mockClient.request({});
      expect(result1.data).toEqual({ first: true });

      await expect(mockClient.request({})).rejects.toThrow('Second call fails');

      const result3 = await mockClient.request({});
      expect(result3.data).toEqual({ third: true });
    });
  });

  describe('resetClient', () => {
    it('should reset all mocks in a client', () => {
      factory.mockSuccess(mockClient, 'request', { test: true });

      expect(() => factory.resetClient(mockClient)).not.toThrow();
    });
  });
});

describe('CatalogClientMockFactory', () => {
  let factory: CatalogClientMockFactory;
  let mockClient: MockCatalogClient;

  beforeEach(() => {
    factory = new CatalogClientMockFactory();
    mockClient = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock catalog client with all methods', () => {
      expect(mockClient.request).toBeDefined();
      expect(mockClient.clearCache).toBeDefined();
      expect(mockClient.getCatalogItem).toBeDefined();
      expect(mockClient.searchCatalogItems).toBeDefined();
    });

    it('should setup default behaviors', async () => {
      const catalogItem = await mockClient.getCatalogItem({});
      expect(catalogItem.asin).toBe('B07N4M94KL');

      const searchResults = await mockClient.searchCatalogItems({});
      expect(searchResults.items).toEqual([]);
      expect(searchResults.pagination.nextToken).toBeNull();
    });
  });

  describe('mockGetCatalogItem', () => {
    it('should mock successful catalog item retrieval', async () => {
      const testItem = {
        asin: 'B123456789',
        attributes: { item_name: ['Custom Product'] },
      };

      factory.mockGetCatalogItem(mockClient, 'B123456789', testItem);

      const result = await mockClient.getCatalogItem({ asin: 'B123456789' });
      expect(result).toEqual(testItem);
    });
  });

  describe('mockSearchCatalogItems', () => {
    it('should mock successful catalog search', async () => {
      const testItems = [
        { asin: 'B123', attributes: { item_name: ['Item 1'] } },
        { asin: 'B456', attributes: { item_name: ['Item 2'] } },
      ];

      factory.mockSearchCatalogItems(mockClient, testItems);

      const result = await mockClient.searchCatalogItems({ keywords: 'test' });
      expect(result.items).toEqual(testItems);
      expect(result.pagination.nextToken).toBeNull();
    });

    it('should mock search with pagination', async () => {
      const testItems = [{ asin: 'B123' }];

      factory.mockSearchCatalogItems(mockClient, testItems, { nextToken: 'next-page' });

      const result = await mockClient.searchCatalogItems({ keywords: 'test' });
      expect(result.pagination.nextToken).toBe('next-page');
    });
  });
});

describe('ListingsClientMockFactory', () => {
  let factory: ListingsClientMockFactory;
  let mockClient: MockListingsClient;

  beforeEach(() => {
    factory = new ListingsClientMockFactory();
    mockClient = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock listings client with all methods', () => {
      expect(mockClient.getListings).toBeDefined();
      expect(mockClient.getListing).toBeDefined();
      expect(mockClient.putListing).toBeDefined();
      expect(mockClient.deleteListing).toBeDefined();
      expect(mockClient.patchListing).toBeDefined();
    });

    it('should setup default behaviors', async () => {
      const listings = await mockClient.getListings({});
      expect(listings).toEqual({
        listings: [],
        nextToken: null,
      });

      const listing = await mockClient.getListing({ sku: 'TEST-SKU' });
      expect(listing.sku).toBe('TEST-SKU');
      expect(listing.status).toBe('ACTIVE');

      const putResult = await mockClient.putListing({});
      expect(putResult.submissionId).toBe('SUBMISSION-123');
      expect(putResult.status).toBe('ACCEPTED');
    });
  });

  describe('mockGetListing', () => {
    it('should mock successful listing retrieval', async () => {
      const testListing = {
        sku: 'CUSTOM-SKU',
        status: 'INACTIVE',
        attributes: { item_name: 'Custom Product' },
      };

      factory.mockGetListing(mockClient, 'CUSTOM-SKU', testListing);

      const result = await mockClient.getListing({ sku: 'CUSTOM-SKU' });
      expect(result).toEqual(testListing);
    });
  });

  describe('mockPutListing', () => {
    it('should mock successful listing creation', async () => {
      factory.mockPutListing(mockClient, 'CUSTOM-SUBMISSION-123');

      const result = await mockClient.putListing({});
      expect(result.submissionId).toBe('CUSTOM-SUBMISSION-123');
      expect(result.status).toBe('ACCEPTED');
    });
  });
});

describe('InventoryClientMockFactory', () => {
  let factory: InventoryClientMockFactory;
  let mockClient: MockInventoryClient;

  beforeEach(() => {
    factory = new InventoryClientMockFactory();
    mockClient = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock inventory client with all methods', () => {
      expect(mockClient.getInventory).toBeDefined();
      expect(mockClient.updateInventory).toBeDefined();
    });

    it('should setup default behaviors', async () => {
      const inventory = await mockClient.getInventory({});
      expect(inventory.items).toEqual([]);
      expect(inventory.nextToken).toBeNull();

      const updateResult = await mockClient.updateInventory({});
      expect(updateResult.sku).toBe('DEFAULT-SKU');
      expect(updateResult.status).toBe('SUCCESSFUL');
    });
  });

  describe('mockGetInventory', () => {
    it('should mock successful inventory retrieval', async () => {
      const testInventory = [
        { sku: 'SKU-1', quantity: 10 },
        { sku: 'SKU-2', quantity: 5 },
      ];

      factory.mockGetInventory(mockClient, testInventory);

      const result = await mockClient.getInventory({});
      expect(result.items).toEqual(testInventory);
    });
  });

  describe('mockUpdateInventory', () => {
    it('should mock successful inventory update', async () => {
      factory.mockUpdateInventory(mockClient, 'CUSTOM-SKU-456');

      const result = await mockClient.updateInventory({});
      expect(result.sku).toBe('CUSTOM-SKU-456');
      expect(result.status).toBe('SUCCESSFUL');
    });
  });
});

describe('OrdersClientMockFactory', () => {
  let factory: OrdersClientMockFactory;
  let mockClient: MockOrdersClient;

  beforeEach(() => {
    factory = new OrdersClientMockFactory();
    mockClient = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock orders client with all methods', () => {
      expect(mockClient.getOrders).toBeDefined();
      expect(mockClient.getOrder).toBeDefined();
      expect(mockClient.updateOrderStatus).toBeDefined();
      expect(mockClient.getOrderItems).toBeDefined();
    });

    it('should setup default behaviors', async () => {
      const orders = await mockClient.getOrders({});
      expect(orders.orders).toEqual([]);

      const order = await mockClient.getOrder({ orderId: 'ORDER-123' });
      expect(order.amazonOrderId).toBe('ORDER-123');
      expect(order.orderStatus).toBe('UNSHIPPED');
    });
  });

  describe('mockGetOrder', () => {
    it('should mock successful order retrieval', async () => {
      const testOrder = {
        orderId: 'CUSTOM-ORDER-456',
        orderStatus: 'SHIPPED',
        purchaseDate: '2023-01-01T12:00:00Z',
      };

      factory.mockGetOrder(mockClient, 'CUSTOM-ORDER-456', testOrder);

      const result = await mockClient.getOrder({ orderId: 'CUSTOM-ORDER-456' });
      expect(result).toEqual(testOrder);
    });
  });

  describe('mockGetOrders', () => {
    it('should mock successful orders list retrieval', async () => {
      const testOrders = [
        { orderId: 'ORDER-1', orderStatus: 'SHIPPED' },
        { orderId: 'ORDER-2', orderStatus: 'UNSHIPPED' },
      ];

      factory.mockGetOrders(mockClient, testOrders);

      const result = await mockClient.getOrders({});
      expect(result.orders).toEqual(testOrders);
    });
  });
});

describe('ReportsClientMockFactory', () => {
  let factory: ReportsClientMockFactory;
  let mockClient: MockReportsClient;

  beforeEach(() => {
    factory = new ReportsClientMockFactory();
    mockClient = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock reports client with all methods', () => {
      expect(mockClient.requestReport).toBeDefined();
      expect(mockClient.getReport).toBeDefined();
      expect(mockClient.getReportDocument).toBeDefined();
      expect(mockClient.getReports).toBeDefined();
    });

    it('should setup default behaviors', async () => {
      const requestResult = await mockClient.requestReport({});
      expect(requestResult.reportId).toBe('REPORT-123');

      const report = await mockClient.getReport({ reportId: 'REPORT-123' });
      expect(report.reportId).toBe('REPORT-123');
      expect(report.processingStatus).toBe('DONE');
    });
  });

  describe('mockRequestReport', () => {
    it('should mock successful report request', async () => {
      factory.mockRequestReport(mockClient, 'CUSTOM-REPORT-456');

      const result = await mockClient.requestReport({});
      expect(result.reportId).toBe('CUSTOM-REPORT-456');
    });
  });

  describe('mockGetReport', () => {
    it('should mock successful report retrieval', async () => {
      const testReport = {
        reportId: 'CUSTOM-REPORT-789',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2023-01-01T12:00:00Z',
      };

      factory.mockGetReport(mockClient, testReport);

      const result = await mockClient.getReport({ reportId: 'CUSTOM-REPORT-789' });
      expect(result).toEqual(testReport);
    });
  });
});

describe('ApiResponseBuilders', () => {
  describe('success', () => {
    it('should create a successful API response', () => {
      const data = { message: 'success' };
      const response = ApiResponseBuilders.success(data);

      expect(response.data).toEqual(data);
      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({});
    });

    it('should create a successful API response with custom status code', () => {
      const data = { id: 123 };
      const response = ApiResponseBuilders.success(data, 201);

      expect(response.data).toEqual(data);
      expect(response.statusCode).toBe(201);
    });
  });

  describe('paginated', () => {
    it('should create a paginated response without next token', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = ApiResponseBuilders.paginated(items);

      expect(response.items).toEqual(items);
      expect(response.pagination.nextToken).toBeNull();
    });

    it('should create a paginated response with next token', () => {
      const items = [{ id: 1 }];
      const response = ApiResponseBuilders.paginated(items, 'next-page');

      expect(response.items).toEqual(items);
      expect(response.pagination.nextToken).toBe('next-page');
    });
  });

  describe('submission', () => {
    it('should create a submission response with default status', () => {
      const response = ApiResponseBuilders.submission('SUB-123');

      expect(response.submissionId).toBe('SUB-123');
      expect(response.status).toBe('ACCEPTED');
    });

    it('should create a submission response with custom status', () => {
      const response = ApiResponseBuilders.submission('SUB-456', 'REJECTED');

      expect(response.submissionId).toBe('SUB-456');
      expect(response.status).toBe('REJECTED');
    });
  });

  describe('empty', () => {
    it('should create an empty response', () => {
      const response = ApiResponseBuilders.empty();

      expect(response).toEqual({});
    });
  });
});
