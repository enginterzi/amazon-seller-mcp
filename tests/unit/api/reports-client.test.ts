/**
 * Unit tests for Reports API client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReportsClient,
  CreateReportParams,
  Report,
  ReportDocument,
} from '../../../src/api/reports-client.js';
import {
  BaseApiClientMockFactory,
  type MockBaseApiClient,
} from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { TestAssertions } from '../../utils/test-assertions.js';

// Mock fetch for downloadReportDocument
global.fetch = vi.fn();

// Type for accessing private methods in tests
type ReportsClientWithPrivates = ReportsClient & {
  request: MockBaseApiClient['request'];
  withCache: <T>(key: string, fn: () => Promise<T>, ttl?: number) => Promise<T>;
  clearCache: (key?: string) => void;
  validateCreateReportParams: (params: CreateReportParams) => void;
};

describe('ReportsClient', () => {
  let reportsClient: ReportsClient;
  let mockFactory: BaseApiClientMockFactory;
  let mockBaseClient: MockBaseApiClient;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();

    mockFactory = new BaseApiClientMockFactory();
    mockBaseClient = mockFactory.create();

    // Create the client and replace the request method with our mock
    reportsClient = new ReportsClient(authConfig);
    (reportsClient as ReportsClientWithPrivates).request = mockBaseClient.request;
    (reportsClient as ReportsClientWithPrivates).clearCache = mockBaseClient.clearCache;

    // Reset global fetch mock
    vi.clearAllMocks();
  });

  it('should create report successfully', async () => {
    const createReportParams: CreateReportParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: ['ATVPDKIKX0DER'],
    };

    const expectedResult = { reportId: 'test-report-id' };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedResult,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await reportsClient.createReport(createReportParams);

    expect(result.reportId).toBe('test-report-id');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'POST',
      path: expect.stringContaining('/reports/2021-06-30/reports'),
      data: expect.objectContaining({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
      }),
    });
  });

  it('should create report with all parameters', async () => {
    const createReportParams: CreateReportParams = {
      reportType: 'GET_FLAT_FILE_ORDERS_DATA',
      marketplaceIds: ['ATVPDKIKX0DER'],
      dataStartTime: '2023-01-01T00:00:00Z',
      dataEndTime: '2023-01-31T23:59:59Z',
      reportOptions: { ShowSalesChannel: 'true' },
    };

    const expectedResult = { reportId: 'test-report-id-with-options' };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: expectedResult,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await reportsClient.createReport(createReportParams);

    expect(result.reportId).toBe('test-report-id-with-options');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'POST',
      path: expect.stringContaining('/reports/2021-06-30/reports'),
      data: expect.objectContaining({
        reportType: 'GET_FLAT_FILE_ORDERS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
        dataStartTime: '2023-01-01T00:00:00Z',
        dataEndTime: '2023-01-31T23:59:59Z',
        reportOptions: { ShowSalesChannel: 'true' },
      }),
    });
  });

  it('should handle report creation validation errors', async () => {
    const invalidParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: [], // Empty array, should fail validation
    };

    await expect(reportsClient.createReport(invalidParams as CreateReportParams)).rejects.toThrow(
      'Validation failed for create report: marketplaceIds: At least one marketplace ID is required'
    );
  });

  it('should validate date range in create report', async () => {
    const invalidParams: CreateReportParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: ['ATVPDKIKX0DER'],
      dataStartTime: '2023-01-31T23:59:59Z',
      dataEndTime: '2023-01-01T00:00:00Z', // End before start
    };

    await expect(reportsClient.createReport(invalidParams)).rejects.toThrow(
      'Data start time must be before data end time'
    );
  });

  it('should validate ISO 8601 date format', async () => {
    const invalidParams: CreateReportParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: ['ATVPDKIKX0DER'],
      dataStartTime: 'invalid-date',
    };

    await expect(reportsClient.createReport(invalidParams)).rejects.toThrow(
      'Data start time must be in ISO 8601 format'
    );
  });

  it('should handle API request failures', async () => {
    const serverError = TestDataBuilder.createApiError('SERVER_ERROR', {
      message: 'API request failed',
      statusCode: 500,
    });

    mockBaseClient.request.mockRejectedValue(serverError);

    const createReportParams: CreateReportParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: ['ATVPDKIKX0DER'],
    };

    await expect(reportsClient.createReport(createReportParams)).rejects.toThrow(
      'API request failed'
    );
  });

  it('should retrieve report successfully', async () => {
    const reportId = 'test-report-id';
    const mockReport: Report = {
      reportId,
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      processingStatus: 'DONE',
      createdTime: '2023-01-01T00:00:00Z',
      reportDocumentId: 'test-document-id',
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReport,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await reportsClient.getReport({ reportId });

    expect(result.reportId).toBe(reportId);
    expect(result.processingStatus).toBe('DONE');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining(`/reports/2021-06-30/reports/${reportId}`),
    });
  });

  it('should retrieve report document successfully', async () => {
    const reportDocumentId = 'test-document-id';
    const mockReportDocument: ReportDocument = {
      reportDocumentId,
      url: 'https://example.com/report.csv',
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReportDocument,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await reportsClient.getReportDocument({ reportDocumentId });

    expect(result.reportDocumentId).toBe(reportDocumentId);
    expect(result.url).toBe('https://example.com/report.csv');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining(`/reports/2021-06-30/documents/${reportDocumentId}`),
    });
  });

  it('should retrieve reports with default parameters successfully', async () => {
    const mockReports = {
      reports: [
        {
          reportId: 'test-report-id-1',
          reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
          processingStatus: 'DONE',
          createdTime: '2023-01-01T00:00:00Z',
        },
        {
          reportId: 'test-report-id-2',
          reportType: 'GET_MERCHANT_LISTINGS_DATA',
          processingStatus: 'IN_PROGRESS',
          createdTime: '2023-01-02T00:00:00Z',
        },
      ],
      nextToken: 'next-token',
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReports,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await reportsClient.getReports();

    expect(result.reports).toHaveLength(2);
    expect(result.nextToken).toBe('next-token');
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/reports/2021-06-30/reports'),
      query: expect.objectContaining({
        marketplaceIds: ['ATVPDKIKX0DER'], // Default marketplace
      }),
    });
  });

  it('should retrieve reports with custom parameters successfully', async () => {
    const params = {
      reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA', 'GET_MERCHANT_LISTINGS_DATA'],
      processingStatuses: ['DONE', 'IN_PROGRESS'],
      marketplaceIds: ['ATVPDKIKX0DER', 'A1F83G8C2ARO7P'], // US and UK
      pageSize: 10,
      createdSince: '2023-01-01T00:00:00Z',
      createdUntil: '2023-01-31T23:59:59Z',
      nextToken: 'test-next-token',
    };

    const mockReports = {
      reports: [
        {
          reportId: 'test-report-id-1',
          reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
          processingStatus: 'DONE',
          createdTime: '2023-01-01T00:00:00Z',
        },
      ],
    };

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReports,
      },
      statusCode: 200,
      headers: {},
    });

    const result = await reportsClient.getReports(params);

    expect(result.reports).toHaveLength(1);
    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'GET',
      path: expect.stringContaining('/reports/2021-06-30/reports'),
      query: expect.objectContaining({
        reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA', 'GET_MERCHANT_LISTINGS_DATA'],
        processingStatuses: ['DONE', 'IN_PROGRESS'],
        marketplaceIds: ['ATVPDKIKX0DER', 'A1F83G8C2ARO7P'],
        pageSize: 10,
        createdSince: '2023-01-01T00:00:00Z',
        createdUntil: '2023-01-31T23:59:59Z',
        nextToken: 'test-next-token',
      }),
    });
  });

  it('should enforce pageSize limits in getReports', async () => {
    const mockReports = { reports: [] };

    // Mock withCache to bypass caching and call the request method directly
    const withCacheSpy = vi.fn().mockImplementation(async (key, fn) => {
      return await fn();
    });
    (reportsClient as ReportsClientWithPrivates).withCache = withCacheSpy;

    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReports,
      },
      statusCode: 200,
      headers: {},
    });

    // Test pageSize too large (should be capped at 100)
    await reportsClient.getReports({ pageSize: 200 });

    // Get the first call (pageSize 200 -> 100)
    const firstCall = mockBaseClient.request.mock.calls[0];
    expect(firstCall[0].query.pageSize).toBe(100);

    // Test pageSize 0 (should be omitted from query since it's falsy)
    await reportsClient.getReports({ pageSize: 0 });

    // Get the second call (pageSize 0 -> undefined/omitted)
    const secondCall = mockBaseClient.request.mock.calls[1];
    expect(secondCall[0].query.pageSize).toBeUndefined();

    // Test pageSize negative (should be set to 1)
    await reportsClient.getReports({ pageSize: -5 });

    // Get the third call (pageSize -5 -> 1)
    const thirdCall = mockBaseClient.request.mock.calls[2];
    expect(thirdCall[0].query.pageSize).toBe(1);
  });

  it('should cancel report successfully', async () => {
    const reportId = 'test-report-id';

    mockBaseClient.request.mockResolvedValue({
      data: {},
      statusCode: 200,
      headers: {},
    });

    await reportsClient.cancelReport({ reportId });

    TestAssertions.expectApiCall(mockBaseClient.request, {
      method: 'DELETE',
      path: expect.stringContaining(`/reports/2021-06-30/reports/${reportId}`),
    });

    // Verify cache is cleared
    expect(mockBaseClient.clearCache).toHaveBeenCalledWith(`report:${reportId}`);
  });

  it('should use cache for reports', async () => {
    const mockReports = { reports: [] };

    // Mock withCache to verify it's called
    const withCacheSpy = vi.fn().mockResolvedValue(mockReports);
    (reportsClient as ReportsClientWithPrivates).withCache = withCacheSpy;

    const result = await reportsClient.getReports();

    expect(result).toEqual(mockReports);
    expect(withCacheSpy).toHaveBeenCalledWith(
      expect.stringContaining('reports:ATVPDKIKX0DER'),
      expect.any(Function),
      30 // 30 seconds TTL
    );
  });

  it('should use cache for individual reports', async () => {
    const mockReport: Report = {
      reportId: 'test-report-id',
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      processingStatus: 'DONE',
      createdTime: '2023-01-01T00:00:00Z',
    };

    // Mock withCache to verify it's called
    const withCacheSpy = vi.fn().mockResolvedValue(mockReport);
    (reportsClient as ReportsClientWithPrivates).withCache = withCacheSpy;

    const result = await reportsClient.getReport({ reportId: 'test-report-id' });

    expect(result).toEqual(mockReport);
    expect(withCacheSpy).toHaveBeenCalledWith(
      'report:test-report-id',
      expect.any(Function),
      30 // 30 seconds TTL
    );
  });

  it('should use cache for report documents', async () => {
    const mockReportDocument: ReportDocument = {
      reportDocumentId: 'test-document-id',
      url: 'https://example.com/report.csv',
    };

    // Mock withCache to verify it's called
    const withCacheSpy = vi.fn().mockResolvedValue(mockReportDocument);
    (reportsClient as ReportsClientWithPrivates).withCache = withCacheSpy;

    const result = await reportsClient.getReportDocument({ reportDocumentId: 'test-document-id' });

    expect(result).toEqual(mockReportDocument);
    expect(withCacheSpy).toHaveBeenCalledWith(
      'reportDocument:test-document-id',
      expect.any(Function),
      30 // 30 seconds TTL
    );
  });

  it('should download report document successfully', async () => {
    const reportDocumentId = 'test-document-id';
    const mockReportDocument: ReportDocument = {
      reportDocumentId,
      url: 'https://example.com/report.csv',
    };
    const mockReportContent = 'sku,price,quantity\nABC123,19.99,100';

    // Mock getReportDocument by mocking the request method
    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReportDocument,
      },
      statusCode: 200,
      headers: {},
    });

    // Mock fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockReportContent),
    });

    const result = await reportsClient.downloadReportDocument(reportDocumentId);

    expect(result).toBe(mockReportContent);
    expect(global.fetch).toHaveBeenCalledWith(mockReportDocument.url);
  });

  it('should handle compressed report documents', async () => {
    const reportDocumentId = 'test-document-id';
    const mockReportDocument: ReportDocument = {
      reportDocumentId,
      url: 'https://example.com/report.csv.gz',
      compressionAlgorithm: 'GZIP',
    };
    const mockReportContent = 'compressed-content';

    // Mock logger.warn
    const { getLogger } = await import('../../../src/utils/logger.js');
    const loggerWarnSpy = vi.spyOn(getLogger(), 'warn').mockImplementation(() => {});

    // Mock withCache to bypass caching and call the request method directly
    const withCacheSpy = vi.fn().mockResolvedValue(mockReportDocument);
    (reportsClient as ReportsClientWithPrivates).withCache = withCacheSpy;

    // Mock fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockReportContent),
    });

    const result = await reportsClient.downloadReportDocument(reportDocumentId);

    expect(result).toBe(mockReportContent);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'GZIP compression detected but not implemented. Returning raw content.'
    );

    // Restore logger.warn
    loggerWarnSpy.mockRestore();
  });

  it('should handle fetch failures when downloading report document', async () => {
    const reportDocumentId = 'test-document-id';
    const mockReportDocument: ReportDocument = {
      reportDocumentId,
      url: 'https://example.com/report.csv',
    };

    // Mock getReportDocument by mocking the request method
    mockBaseClient.request.mockResolvedValue({
      data: {
        payload: mockReportDocument,
      },
      statusCode: 200,
      headers: {},
    });

    // Mock fetch failure
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(reportsClient.downloadReportDocument(reportDocumentId)).rejects.toThrow(
      'Failed to download report document: Not Found'
    );
  });
});
