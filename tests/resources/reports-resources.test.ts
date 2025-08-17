/**
 * Tests for reports resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerReportsResources } from '../../src/resources/reports/reports-resources.js';
import { ReportsClientMockFactory } from '../utils/mock-factories/api-client-factory.js';
import type { AuthConfig } from '../../src/types/auth.js';
import type { AmazonReport } from '../../src/types/amazon-api.js';
import type { MockMcpServer } from '../utils/mock-factories/server-factory.js';

// Mock the ReportsClient
vi.mock('../../src/api/reports-client.js', () => ({
  ReportsClient: vi.fn(),
}));

describe('Reports Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: AuthConfig;
  let mockReportsClient: ReturnType<ReportsClientMockFactory['create']>;
  let reportsClientMockFactory: ReportsClientMockFactory;
  let reportsResourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let reportActionResourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let reportFilterResourceHandler: (uri: URL, params: Record<string, string>) => Promise<unknown>;
  let reportIdCompletionFunction: (value: string) => Promise<string[]>;

  beforeEach(async () => {
    // Create mock server and resource manager
    const mockServer = {
      registerResource: vi.fn(),
    };
    resourceManager = new ResourceRegistrationManager(mockServer as MockMcpServer);

    // Create mock factories
    reportsClientMockFactory = new ReportsClientMockFactory();
    mockReportsClient = reportsClientMockFactory.create();

    // Mock the ReportsClient constructor
    const { ReportsClient } = await import('../../src/api/reports-client.js');
    vi.mocked(ReportsClient).mockImplementation(() => mockReportsClient as any);

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
    registerReportsResources(resourceManager, authConfig);

    // Extract the resource handlers from the registerResource calls
    const registerResourceCalls = vi.mocked(resourceManager.registerResource).mock.calls;
    
    const reportsResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-reports');
    if (reportsResourceCall) {
      reportsResourceHandler = reportsResourceCall[3] as typeof reportsResourceHandler;
    }

    const reportActionResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-report-action');
    if (reportActionResourceCall) {
      reportActionResourceHandler = reportActionResourceCall[3] as typeof reportActionResourceHandler;
    }

    const reportFilterResourceCall = registerResourceCalls.find(call => call[0] === 'amazon-report-filter');
    if (reportFilterResourceCall) {
      reportFilterResourceHandler = reportFilterResourceCall[3] as typeof reportFilterResourceHandler;
    }

    // Extract the report ID completion function
    const createResourceTemplateCalls = vi.mocked(resourceManager.createResourceTemplate).mock.calls;
    const reportsTemplateCall = createResourceTemplateCalls.find(call => 
      call[0] === 'amazon-reports://{reportId}'
    );
    if (reportsTemplateCall && reportsTemplateCall[2]) {
      reportIdCompletionFunction = reportsTemplateCall[2].reportId as typeof reportIdCompletionFunction;
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    reportsClientMockFactory.reset();
  });

  describe('Resource Registration', () => {
    it('should register reports resources with correct configuration', () => {
      // Assert
      expect(resourceManager.registerResource).toHaveBeenCalledTimes(3);
      expect(resourceManager.registerResource).toHaveBeenCalledWith(
        'amazon-reports',
        expect.anything(),
        expect.objectContaining({
          title: 'Amazon Reports',
          description: expect.any(String),
        }),
        expect.any(Function)
      );
    });

    it('should create resource templates with proper URI patterns', () => {
      // Assert
      expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
        'amazon-reports://{reportId}',
        'amazon-reports://',
        expect.objectContaining({
          reportId: expect.any(Function),
        })
      );
    });
  });

  describe('Report ID Completion Function', () => {
    it('should return empty array for short input', async () => {
      // Act
      const result = await reportIdCompletionFunction('ab');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return matching report IDs for valid input', async () => {
      // Arrange
      const mockReports: AmazonReport[] = [
        {
          reportId: 'REPORT-123456789',
          reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
          processingStatus: 'DONE',
          createdTime: '2024-01-01T00:00:00Z',
        },
        {
          reportId: 'REPORT-123456790',
          reportType: 'GET_ORDERS_DATA',
          processingStatus: 'IN_PROGRESS',
          createdTime: '2024-01-02T00:00:00Z',
        },
      ];

      reportsClientMockFactory.mockGetReports(mockReportsClient, mockReports);

      // Act
      const result = await reportIdCompletionFunction('REPORT-123');

      // Assert
      expect(result).toEqual(['REPORT-123456789', 'REPORT-123456790']);
      expect(mockReportsClient.getReports).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockReportsClient.getReports.mockRejectedValueOnce(new Error('API Error'));

      // Act
      const result = await reportIdCompletionFunction('REPORT');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Reports Resource Handler', () => {
    it('should handle specific report request with report ID', async () => {
      // Arrange
      const mockReport: AmazonReport = {
        reportId: 'REPORT-123456789',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2024-01-01T00:00:00Z',
        processingStartTime: '2024-01-01T00:01:00Z',
        processingEndTime: '2024-01-01T00:05:00Z',
        dataStartTime: '2023-12-31T00:00:00Z',
        dataEndTime: '2024-01-01T00:00:00Z',
        marketplaceIds: ['ATVPDKIKX0DER'],
        reportDocumentId: 'DOC-123456789',
      };

      const mockReportContent = 'sku,price,quantity\nTEST-SKU-001,29.99,10\nTEST-SKU-002,39.99,5';

      reportsClientMockFactory.mockGetReport(mockReportsClient, mockReport);
      reportsClientMockFactory.mockDownloadReportDocument(mockReportsClient, mockReportContent);

      const uri = new URL('amazon-reports://REPORT-123456789');
      const params = { reportId: 'REPORT-123456789' };

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-reports://REPORT-123456789',
            text: expect.stringContaining('# Amazon Report: REPORT-123456789'),
            mimeType: 'text/markdown',
          },
        ],
      });

      const content = (result as any).contents[0].text;
      expect(content).toContain('**Report ID:** REPORT-123456789');
      expect(content).toContain('**Report Type:** GET_FLAT_FILE_OPEN_LISTINGS_DATA');
      expect(content).toContain('**Status:** DONE');
      expect(content).toContain('**Marketplace IDs:** ATVPDKIKX0DER');
      expect(content).toContain('| sku | price | quantity |');
      expect(content).toContain('| TEST-SKU-001 | 29.99 | 10 |');
      expect(content).toContain('[Download Full Report](amazon-report-action://REPORT-123456789/download)');

      expect(mockReportsClient.getReport).toHaveBeenCalledWith({ reportId: 'REPORT-123456789' });
      expect(mockReportsClient.downloadReportDocument).toHaveBeenCalledWith('DOC-123456789');
    });

    it('should handle report in progress', async () => {
      // Arrange
      const mockReport: AmazonReport = {
        reportId: 'REPORT-123456789',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2024-01-01T00:00:00Z',
        processingStartTime: '2024-01-01T00:01:00Z',
      };

      reportsClientMockFactory.mockGetReport(mockReportsClient, mockReport);

      const uri = new URL('amazon-reports://REPORT-123456789');
      const params = { reportId: 'REPORT-123456789' };

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('This report is still being processed');
      expect(content).toContain('[Refresh Report Status](amazon-reports://REPORT-123456789)');
    });

    it('should handle cancelled report', async () => {
      // Arrange
      const mockReport: AmazonReport = {
        reportId: 'REPORT-123456789',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'CANCELLED',
        createdTime: '2024-01-01T00:00:00Z',
      };

      reportsClientMockFactory.mockGetReport(mockReportsClient, mockReport);

      const uri = new URL('amazon-reports://REPORT-123456789');
      const params = { reportId: 'REPORT-123456789' };

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('This report was not completed successfully');
      expect(content).toContain('[Request New Report](amazon-report-action://create/GET_FLAT_FILE_OPEN_LISTINGS_DATA)');
    });

    it('should handle reports list request without report ID', async () => {
      // Arrange
      const mockReports: AmazonReport[] = [
        {
          reportId: 'REPORT-123456789',
          reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
          processingStatus: 'DONE',
          createdTime: '2024-01-01T00:00:00Z',
          processingEndTime: '2024-01-01T00:05:00Z',
          reportDocumentId: 'DOC-123456789',
        },
        {
          reportId: 'REPORT-123456790',
          reportType: 'GET_ORDERS_DATA',
          processingStatus: 'IN_PROGRESS',
          createdTime: '2024-01-02T00:00:00Z',
        },
      ];

      reportsClientMockFactory.mockGetReports(mockReportsClient, mockReports, {
        nextToken: 'next-token-123',
      });

      const uri = new URL('amazon-reports://');
      const params = {};

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Amazon Reports');
      expect(content).toContain('Found 2 reports');
      expect(content).toContain('[GET_FLAT_FILE_OPEN_LISTINGS_DATA](amazon-reports://REPORT-123456789)');
      expect(content).toContain('[View Report](amazon-reports://REPORT-123456789) | [Download Report](amazon-report-action://REPORT-123456789/download)');
      expect(content).toContain('[Check Status](amazon-reports://REPORT-123456790) | [Cancel Report](amazon-report-action://REPORT-123456790/cancel)');
      expect(content).toContain('[Next Page](amazon-reports://?nextToken=next-token-123)');
      expect(content).toContain('[Create New Report](amazon-report-action://create)');
    });

    it('should handle reports list with query parameters', async () => {
      // Arrange
      const mockReports: AmazonReport[] = [];
      reportsClientMockFactory.mockGetReports(mockReportsClient, mockReports);

      const uri = new URL('amazon-reports://?reportTypes=GET_ORDERS_DATA&processingStatuses=DONE');
      const params = {};

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      expect(mockReportsClient.getReports).toHaveBeenCalledWith({
        reportTypes: ['GET_ORDERS_DATA'],
        processingStatuses: ['DONE'],
        createdSince: undefined,
        createdUntil: undefined,
        nextToken: undefined,
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockReportsClient.getReport.mockRejectedValueOnce(new Error('API Error'));

      const uri = new URL('amazon-reports://REPORT-123456789');
      const params = { reportId: 'REPORT-123456789' };

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      expect(result).toEqual({
        contents: [
          {
            uri: 'amazon-reports://REPORT-123456789',
            text: '# Error\n\nFailed to retrieve reports: API Error',
            mimeType: 'text/markdown',
          },
        ],
      });
    });

    it('should handle non-CSV report content', async () => {
      // Arrange
      const mockReport: AmazonReport = {
        reportId: 'REPORT-123456789',
        reportType: 'GET_ORDERS_DATA',
        processingStatus: 'DONE',
        createdTime: '2024-01-01T00:00:00Z',
        reportDocumentId: 'DOC-123456789',
      };

      const mockReportContent = 'This is plain text report content without CSV format';

      reportsClientMockFactory.mockGetReport(mockReportsClient, mockReport);
      reportsClientMockFactory.mockDownloadReportDocument(mockReportsClient, mockReportContent);

      const uri = new URL('amazon-reports://REPORT-123456789');
      const params = { reportId: 'REPORT-123456789' };

      // Act
      const result = await reportsResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('```\nThis is plain text report content without CSV format\n```');
    });
  });

  describe('Report Action Resource Handler', () => {
    it('should handle create action without specific report type', async () => {
      // Arrange
      const uri = new URL('amazon-report-action://create');
      const params = { reportId: 'create' };

      // Act
      const result = await reportActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Create New Report');
      expect(content).toContain('## Available Report Types');
      expect(content).toContain('[Create Inventory Report](amazon-report-action://create/GET_AFN_INVENTORY_DATA)');
      expect(content).toContain('[Create Flat File Orders Report](amazon-report-action://create/GET_FLAT_FILE_ORDERS_DATA)');
      expect(content).toContain('use the `create-report` tool');
    });

    it('should handle create action with specific report type', async () => {
      // Arrange
      const uri = new URL('amazon-report-action://create/GET_ORDERS_DATA');
      const params = { reportId: 'create', action: 'GET_ORDERS_DATA' };

      // Act
      const result = await reportActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('## Create GET_ORDERS_DATA Report');
      expect(content).toContain('"reportType": "GET_ORDERS_DATA"');
      expect(content).toContain(`"marketplaceIds": ["${authConfig.marketplaceId}"]`);
    });

    it('should handle download action for completed report', async () => {
      // Arrange
      const mockReport: AmazonReport = {
        reportId: 'REPORT-123456789',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2024-01-01T00:00:00Z',
        reportDocumentId: 'DOC-123456789',
      };

      reportsClientMockFactory.mockGetReport(mockReportsClient, mockReport);

      const uri = new URL('amazon-report-action://REPORT-123456789/download');
      const params = { reportId: 'REPORT-123456789', action: 'download' };

      // Act
      const result = await reportActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Download Report: REPORT-123456789');
      expect(content).toContain('**Report Type:** GET_FLAT_FILE_OPEN_LISTINGS_DATA');
      expect(content).toContain('use the `download-report` tool');
      expect(content).toContain('"reportId": "REPORT-123456789"');
    });

    it('should handle download action for incomplete report', async () => {
      // Arrange
      const mockReport: AmazonReport = {
        reportId: 'REPORT-123456789',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2024-01-01T00:00:00Z',
      };

      reportsClientMockFactory.mockGetReport(mockReportsClient, mockReport);

      const uri = new URL('amazon-report-action://REPORT-123456789/download');
      const params = { reportId: 'REPORT-123456789', action: 'download' };

      // Act
      const result = await reportActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('This report is not ready for download');
      expect(content).toContain('Current status: IN_PROGRESS');
    });

    it('should handle cancel action', async () => {
      // Arrange
      const uri = new URL('amazon-report-action://REPORT-123456789/cancel');
      const params = { reportId: 'REPORT-123456789', action: 'cancel' };

      // Act
      const result = await reportActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Cancel Report: REPORT-123456789');
      expect(content).toContain('use the `cancel-report` tool');
      expect(content).toContain('Only reports that are in the IN_QUEUE or IN_PROGRESS state can be canceled');
    });

    it('should handle unsupported action', async () => {
      // Arrange
      const uri = new URL('amazon-report-action://REPORT-123456789/invalid');
      const params = { reportId: 'REPORT-123456789', action: 'invalid' };

      // Act
      const result = await reportActionResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Unsupported action: invalid');
    });
  });

  describe('Report Filter Resource Handler', () => {
    it('should handle type filter', async () => {
      // Arrange
      const mockReports: AmazonReport[] = [
        {
          reportId: 'REPORT-123456789',
          reportType: 'GET_ORDERS_DATA',
          processingStatus: 'DONE',
          createdTime: '2024-01-01T00:00:00Z',
        },
      ];

      reportsClientMockFactory.mockGetReports(mockReportsClient, mockReports);

      const uri = new URL('amazon-report-filter://type%3AGET_ORDERS_DATA');
      const params = { filter: 'type:GET_ORDERS_DATA' };

      // Act
      const result = await reportFilterResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Amazon Reports: Type Filter - GET_ORDERS_DATA');
      expect(content).toContain('Found 1 reports');
      expect(mockReportsClient.getReports).toHaveBeenCalledWith({
        reportTypes: ['GET_ORDERS_DATA'],
        nextToken: undefined,
      });
    });

    it('should handle status filter', async () => {
      // Arrange
      const mockReports: AmazonReport[] = [];
      reportsClientMockFactory.mockGetReports(mockReportsClient, mockReports);

      const uri = new URL('amazon-report-filter://status%3ADONE');
      const params = { filter: 'status:DONE' };

      // Act
      const result = await reportFilterResourceHandler(uri, params);

      // Assert
      expect(mockReportsClient.getReports).toHaveBeenCalledWith({
        processingStatuses: ['DONE'],
        nextToken: undefined,
      });
    });

    it('should handle date filter', async () => {
      // Arrange
      const mockReports: AmazonReport[] = [];
      reportsClientMockFactory.mockGetReports(mockReportsClient, mockReports);

      const uri = new URL('amazon-report-filter://date%3A2024-01-01');
      const params = { filter: 'date:2024-01-01' };

      // Act
      const result = await reportFilterResourceHandler(uri, params);

      // Assert - Check that the dates are for the correct day (accounting for timezone differences)
      const callArgs = mockReportsClient.getReports.mock.calls[0][0];
      expect(callArgs.createdSince).toMatch(/202[34]-12-31T\d{2}:00:00\.000Z|2024-01-01T\d{2}:00:00\.000Z/);
      expect(callArgs.createdUntil).toMatch(/202[34]-12-31T\d{2}:59:59\.999Z|2024-01-01T\d{2}:59:59\.999Z/);
      expect(callArgs.nextToken).toBeUndefined();
    });

    it('should show filter options when no specific filter provided', async () => {
      // Arrange
      const uri = new URL('amazon-report-filter://');
      const params = {};

      // Act
      const result = await reportFilterResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Amazon Report Filters');
      expect(content).toContain('## Filter by Report Type');
      expect(content).toContain('[Inventory Reports](amazon-report-filter://type:GET_AFN_INVENTORY_DATA)');
      expect(content).toContain('## Filter by Status');
      expect(content).toContain('[Completed Reports](amazon-report-filter://status:DONE)');
    });

    it('should handle invalid date format', async () => {
      // Arrange
      const uri = new URL('amazon-report-filter://date%3Ainvalid-date');
      const params = { filter: 'date:invalid-date' };

      // Act
      const result = await reportFilterResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Invalid date format. Use YYYY-MM-DD.');
    });

    it('should handle unknown filter type', async () => {
      // Arrange
      const uri = new URL('amazon-report-filter://unknown%3Avalue');
      const params = { filter: 'unknown:value' };

      // Act
      const result = await reportFilterResourceHandler(uri, params);

      // Assert
      const content = (result as any).contents[0].text;
      expect(content).toContain('# Error');
      expect(content).toContain('Unknown filter type: unknown');
    });
  });
});
