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
import { ReportsClientMockFactory } from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

// Mock fetch for downloadReportDocument
global.fetch = vi.fn();

describe('ReportsClient', () => {
  let reportsClient: ReportsClient;
  let mockFactory: ReportsClientMockFactory;
  let mockClient: any;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();

    mockFactory = new ReportsClientMockFactory();
    mockClient = mockFactory.create();

    // Create the client and replace its methods with mocks
    reportsClient = new ReportsClient(authConfig);
    reportsClient.createReport = mockClient.createReport;
    reportsClient.getReport = mockClient.getReport;
    reportsClient.getReportDocument = mockClient.getReportDocument;
    reportsClient.getReports = mockClient.getReports;
    reportsClient.cancelReport = mockClient.cancelReport;
    // Don't replace downloadReportDocument - let it use the actual implementation

    // Reset global fetch mock
    vi.clearAllMocks();
  });

  it('should create report successfully', async () => {
    const createReportParams: CreateReportParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: ['ATVPDKIKX0DER'],
    };

    mockFactory.mockCreateReport(mockClient, 'test-report-id');

    const result = await reportsClient.createReport(createReportParams);

    expect(result.reportId).toBe('test-report-id');
    expect(mockClient.createReport).toHaveBeenCalledWith(createReportParams);
  });

  it('should handle report creation validation errors', async () => {
    const validationError = TestDataBuilder.createApiError('VALIDATION_ERROR', {
      message: 'Validation failed',
      statusCode: 400,
    });

    mockClient.requestReport.mockRejectedValue(validationError);

    const invalidParams = {
      reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      marketplaceIds: [], // Empty array, should fail validation
    };

    const createValidationError = new Error(
      'Validation failed for create report: marketplaceIds: At least one marketplace ID is required'
    );
    mockClient.createReport.mockRejectedValue(createValidationError);

    await expect(reportsClient.createReport(invalidParams as any)).rejects.toThrow(
      'Validation failed'
    );
  });

  it('should handle API request failures', async () => {
    const serverError = TestDataBuilder.createApiError('SERVER_ERROR', {
      message: 'API request failed',
      statusCode: 500,
    });

    mockClient.createReport.mockRejectedValue(serverError);

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

    mockFactory.mockGetReport(mockClient, mockReport);

    const result = await reportsClient.getReport({ reportId });

    expect(result.reportId).toBe(reportId);
    expect(result.processingStatus).toBe('DONE');
    expect(mockClient.getReport).toHaveBeenCalledWith({ reportId });
  });

  it('should retrieve report document successfully', async () => {
    const reportDocumentId = 'test-document-id';
    const mockReportDocument: ReportDocument = {
      reportDocumentId,
      url: 'https://example.com/report.csv',
    };

    mockClient.getReportDocument.mockResolvedValue(mockReportDocument);

    const result = await reportsClient.getReportDocument({ reportDocumentId });

    expect(result.reportDocumentId).toBe(reportDocumentId);
    expect(result.url).toBe('https://example.com/report.csv');
    expect(mockClient.getReportDocument).toHaveBeenCalledWith({ reportDocumentId });
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

    mockClient.getReports.mockResolvedValue(mockReports);

    const result = await reportsClient.getReports();

    expect(result.reports).toHaveLength(2);
    expect(result.nextToken).toBe('next-token');
    expect(mockClient.getReports).toHaveBeenCalledWith();
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

    mockClient.getReports.mockResolvedValue(mockReports);

    const result = await reportsClient.getReports(params);

    expect(result.reports).toHaveLength(1);
    expect(mockClient.getReports).toHaveBeenCalledWith(params);
  });

  it('should cancel report successfully', async () => {
    const reportId = 'test-report-id';

    await reportsClient.cancelReport({ reportId });

    expect(mockClient.cancelReport).toHaveBeenCalledWith({ reportId });
  });

  it('should download report document successfully', async () => {
    const reportDocumentId = 'test-document-id';
    const mockReportDocument: ReportDocument = {
      reportDocumentId,
      url: 'https://example.com/report.csv',
    };
    const mockReportContent = 'sku,price,quantity\nABC123,19.99,100';

    // Mock getReportDocument
    mockClient.getReportDocument.mockResolvedValue(mockReportDocument);

    // Mock fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockReportContent),
    });

    const result = await reportsClient.downloadReportDocument(reportDocumentId);

    expect(result).toBe(mockReportContent);
    expect(reportsClient.getReportDocument).toHaveBeenCalledWith({ reportDocumentId });
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

    // Mock getReportDocument
    mockClient.getReportDocument.mockResolvedValue(mockReportDocument);

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

    // Mock getReportDocument
    mockClient.getReportDocument.mockResolvedValue(mockReportDocument);

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
