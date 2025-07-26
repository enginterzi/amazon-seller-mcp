/**
 * Unit tests for Reports API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ReportsClient,
  CreateReportParams,
  Report,
  ReportDocument,
} from '../../../src/api/reports-client.js';
import { ApiError, ApiErrorType } from '../../../src/types/api.js';
import { AuthConfig } from '../../../src/types/auth.js';

// Mock the BaseApiClient's request method
vi.mock('../../../src/api/base-client.js', () => {
  return {
    BaseApiClient: class MockBaseApiClient {
      config = {
        marketplaceId: 'ATVPDKIKX0DER', // US marketplace
      };
      
      request = vi.fn();
      withCache = vi.fn((cacheKey, fn) => fn());
      clearCache = vi.fn();
    },
  };
});

// Mock fetch for downloadReportDocument
global.fetch = vi.fn();

describe('ReportsClient', () => {
  let client: ReportsClient;
  let mockAuthConfig: AuthConfig;

  beforeEach(() => {
    mockAuthConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
      region: 'us-east-1',
      marketplaceId: 'ATVPDKIKX0DER', // US marketplace
    };

    client = new ReportsClient(mockAuthConfig);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createReport', () => {
    it('should create a report successfully', async () => {
      // Arrange
      const createReportParams: CreateReportParams = {
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
      };

      const mockResponse = {
        data: {
          payload: {
            reportId: 'test-report-id',
          },
        },
      };

      (client as any).request = vi.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await client.createReport(createReportParams);

      // Assert
      expect(result).toEqual({ reportId: 'test-report-id' });
      expect((client as any).request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/reports/2021-06-30/reports',
        data: createReportParams,
      });
    });

    it('should throw an error when validation fails', async () => {
      // Arrange
      const invalidParams = {
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: [], // Empty array, should fail validation
      };

      // Act & Assert
      await expect(client.createReport(invalidParams as any)).rejects.toThrow('Validation failed');
    });

    it('should throw an error when API request fails', async () => {
      // Arrange
      const createReportParams: CreateReportParams = {
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
      };

      const mockError = new ApiError('API request failed', ApiErrorType.SERVER_ERROR, 500, {
        message: 'Internal server error',
      });

      (client as any).request = vi.fn().mockRejectedValue(mockError);

      // Act & Assert
      await expect(client.createReport(createReportParams)).rejects.toThrow('API request failed');
    });
  });

  describe('getReport', () => {
    it('should get a report successfully', async () => {
      // Arrange
      const reportId = 'test-report-id';
      const mockReport: Report = {
        reportId,
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2023-01-01T00:00:00Z',
        reportDocumentId: 'test-document-id',
      };

      const mockResponse = {
        data: {
          payload: mockReport,
        },
      };

      (client as any).request = vi.fn().mockResolvedValue(mockResponse);
      (client as any).withCache = vi.fn().mockImplementation((cacheKey, fn) => fn());

      // Act
      const result = await client.getReport({ reportId });

      // Assert
      expect(result).toEqual(mockReport);
      expect((client as any).request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/reports/2021-06-30/reports/${reportId}`,
      });
      expect((client as any).withCache).toHaveBeenCalledWith(
        `report:${reportId}`,
        expect.any(Function),
        30
      );
    });
  });

  describe('getReportDocument', () => {
    it('should get a report document successfully', async () => {
      // Arrange
      const reportDocumentId = 'test-document-id';
      const mockReportDocument: ReportDocument = {
        reportDocumentId,
        url: 'https://example.com/report.csv',
      };

      const mockResponse = {
        data: {
          payload: mockReportDocument,
        },
      };

      (client as any).request = vi.fn().mockResolvedValue(mockResponse);
      (client as any).withCache = vi.fn().mockImplementation((cacheKey, fn) => fn());

      // Act
      const result = await client.getReportDocument({ reportDocumentId });

      // Assert
      expect(result).toEqual(mockReportDocument);
      expect((client as any).request).toHaveBeenCalledWith({
        method: 'GET',
        path: `/reports/2021-06-30/documents/${reportDocumentId}`,
      });
      expect((client as any).withCache).toHaveBeenCalledWith(
        `reportDocument:${reportDocumentId}`,
        expect.any(Function),
        30
      );
    });
  });

  describe('getReports', () => {
    it('should get reports successfully with default parameters', async () => {
      // Arrange
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

      const mockResponse = {
        data: {
          payload: mockReports,
        },
      };

      (client as any).request = vi.fn().mockResolvedValue(mockResponse);
      (client as any).withCache = vi.fn().mockImplementation((cacheKey, fn) => fn());

      // Act
      const result = await client.getReports();

      // Assert
      expect(result).toEqual(mockReports);
      expect((client as any).request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/reports/2021-06-30/reports',
        query: {
          marketplaceIds: ['ATVPDKIKX0DER'],
        },
      });
    });

    it('should get reports successfully with custom parameters', async () => {
      // Arrange
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

      const mockResponse = {
        data: {
          payload: mockReports,
        },
      };

      (client as any).request = vi.fn().mockResolvedValue(mockResponse);
      (client as any).withCache = vi.fn().mockImplementation((cacheKey, fn) => fn());

      // Act
      const result = await client.getReports(params);

      // Assert
      expect(result).toEqual(mockReports);
      expect((client as any).request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/reports/2021-06-30/reports',
        query: params,
      });
    });
  });

  describe('cancelReport', () => {
    it('should cancel a report successfully', async () => {
      // Arrange
      const reportId = 'test-report-id';

      (client as any).request = vi.fn().mockResolvedValue({});
      (client as any).clearCache = vi.fn();

      // Act
      await client.cancelReport({ reportId });

      // Assert
      expect((client as any).request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: `/reports/2021-06-30/reports/${reportId}`,
      });
      expect((client as any).clearCache).toHaveBeenCalledWith(`report:${reportId}`);
    });
  });

  describe('downloadReportDocument', () => {
    it('should download a report document successfully', async () => {
      // Arrange
      const reportDocumentId = 'test-document-id';
      const mockReportDocument: ReportDocument = {
        reportDocumentId,
        url: 'https://example.com/report.csv',
      };
      const mockReportContent = 'sku,price,quantity\nABC123,19.99,100';

      // Mock getReportDocument
      client.getReportDocument = vi.fn().mockResolvedValue(mockReportDocument);

      // Mock fetch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockReportContent),
      });

      // Act
      const result = await client.downloadReportDocument(reportDocumentId);

      // Assert
      expect(result).toEqual(mockReportContent);
      expect(client.getReportDocument).toHaveBeenCalledWith({ reportDocumentId });
      expect(global.fetch).toHaveBeenCalledWith(mockReportDocument.url);
    });

    it('should handle compressed report documents', async () => {
      // Arrange
      const reportDocumentId = 'test-document-id';
      const mockReportDocument: ReportDocument = {
        reportDocumentId,
        url: 'https://example.com/report.csv.gz',
        compressionAlgorithm: 'GZIP',
      };
      const mockReportContent = 'compressed-content';

      // Mock console.warn
      console.warn = vi.fn();

      // Mock getReportDocument
      client.getReportDocument = vi.fn().mockResolvedValue(mockReportDocument);

      // Mock fetch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockReportContent),
      });

      // Act
      const result = await client.downloadReportDocument(reportDocumentId);

      // Assert
      expect(result).toEqual(mockReportContent);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should throw an error when fetch fails', async () => {
      // Arrange
      const reportDocumentId = 'test-document-id';
      const mockReportDocument: ReportDocument = {
        reportDocumentId,
        url: 'https://example.com/report.csv',
      };

      // Mock getReportDocument
      client.getReportDocument = vi.fn().mockResolvedValue(mockReportDocument);

      // Mock fetch failure
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      // Act & Assert
      await expect(client.downloadReportDocument(reportDocumentId)).rejects.toThrow(
        'Failed to download report document: Not Found'
      );
    });
  });
});
