/**
 * Tests for reports tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerReportsTools } from '../../../src/tools/reports-tools.js';
import { ReportsClient } from '../../../src/api/reports-client.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the MCP server
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerTool: vi.fn(),
    })),
  };
});

// Mock the reports client
vi.mock('../../../src/api/reports-client.js', () => {
  return {
    ReportsClient: vi.fn().mockImplementation(() => ({
      createReport: vi.fn(),
      getReport: vi.fn(),
      getReports: vi.fn(),
      downloadReportDocument: vi.fn(),
      cancelReport: vi.fn(),
    })),
  };
});

describe('Reports Tools', () => {
  let server: McpServer;
  let mockReportsClient: any;
  let authConfig: any;

  beforeEach(() => {
    // Create a mock MCP server
    server = new McpServer();

    // Create a spy for the tool registration
    vi.spyOn(server, 'registerTool');

    // Reset the mock reports client
    mockReportsClient = {
      createReport: vi.fn(),
      getReport: vi.fn(),
      getReports: vi.fn(),
      downloadReportDocument: vi.fn(),
      cancelReport: vi.fn(),
    };

    // Reset the ReportsClient mock
    (ReportsClient as any).mockImplementation(() => mockReportsClient);

    // Create mock auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should register reports tools', () => {
    // Register reports tools
    registerReportsTools(server, authConfig);

    // Verify that the tools were registered
    expect(server.registerTool).toHaveBeenCalledTimes(5);
    expect(server.registerTool).toHaveBeenCalledWith(
      'create-report',
      expect.objectContaining({
        title: 'Create Report',
        description: 'Request a new report from Amazon Selling Partner API',
      }),
      expect.any(Function)
    );
    expect(server.registerTool).toHaveBeenCalledWith(
      'get-report',
      expect.objectContaining({
        title: 'Get Report',
        description: 'Get information about a specific report',
      }),
      expect.any(Function)
    );
    expect(server.registerTool).toHaveBeenCalledWith(
      'download-report',
      expect.objectContaining({
        title: 'Download Report',
        description: 'Download the content of a completed report',
      }),
      expect.any(Function)
    );
    expect(server.registerTool).toHaveBeenCalledWith(
      'cancel-report',
      expect.objectContaining({
        title: 'Cancel Report',
        description: 'Cancel a report that is in progress',
      }),
      expect.any(Function)
    );
    expect(server.registerTool).toHaveBeenCalledWith(
      'list-reports',
      expect.objectContaining({
        title: 'List Reports',
        description: 'List available reports with optional filtering',
      }),
      expect.any(Function)
    );
  });

  describe('create-report tool', () => {
    it('should handle create report tool execution', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the create report response
      mockReportsClient.createReport.mockResolvedValue({
        reportId: 'test-report-id',
      });

      // Get the create report tool handler
      const createReportHandler = (server.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await createReportHandler({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
        dataStartTime: '2025-07-01T00:00:00Z',
        dataEndTime: '2025-07-20T23:59:59Z',
        reportOptions: {
          option1: 'value1',
        },
      });

      // Verify the result
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        'Successfully requested report. Report ID: test-report-id'
      );
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://test-report-id');
      expect(result.content[1].name).toBe('View Report Status');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.createReport).toHaveBeenCalledWith({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
        dataStartTime: '2025-07-01T00:00:00Z',
        dataEndTime: '2025-07-20T23:59:59Z',
        reportOptions: {
          option1: 'value1',
        },
      });
    });

    it('should use default marketplace ID if not provided', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the create report response
      mockReportsClient.createReport.mockResolvedValue({
        reportId: 'test-report-id',
      });

      // Get the create report tool handler
      const createReportHandler = (server.registerTool as any).mock.calls[0][2];

      // Execute the tool without marketplaceIds
      const result = await createReportHandler({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
      });

      // Verify the result
      expect(result.content[0].text).toContain(
        'Successfully requested report. Report ID: test-report-id'
      );

      // Verify that the reports client was called with the default marketplace ID
      expect(mockReportsClient.createReport).toHaveBeenCalledWith({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
        dataStartTime: undefined,
        dataEndTime: undefined,
        reportOptions: undefined,
      });
    });

    it('should handle errors when creating a report', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the create report error
      mockReportsClient.createReport.mockRejectedValue(new Error('API error'));

      // Get the create report tool handler
      const createReportHandler = (server.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await createReportHandler({
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        marketplaceIds: ['ATVPDKIKX0DER'],
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating report: API error');
    });
  });

  describe('get-report tool', () => {
    it('should handle get report tool execution', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
        processingStartTime: '2025-07-15T10:01:00Z',
        processingEndTime: '2025-07-15T10:05:00Z',
        dataStartTime: '2025-07-01T00:00:00Z',
        dataEndTime: '2025-07-14T23:59:59Z',
        marketplaceIds: ['ATVPDKIKX0DER'],
        reportDocumentId: 'test-document-id',
      });

      // Get the get report tool handler
      const getReportHandler = (server.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await getReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Report ID: test-report-id');
      expect(result.content[0].text).toContain('Report Type: GET_FLAT_FILE_OPEN_LISTINGS_DATA');
      expect(result.content[0].text).toContain('Status: DONE');
      expect(result.content[0].text).toContain('Created:');
      expect(result.content[0].text).toContain('Processing Started:');
      expect(result.content[0].text).toContain('Processing Completed:');
      expect(result.content[0].text).toContain('Data Start Time:');
      expect(result.content[0].text).toContain('Data End Time:');
      expect(result.content[0].text).toContain('Marketplace IDs: ATVPDKIKX0DER');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://test-report-id');
      expect(result.content[1].name).toBe('View Full Report Details');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReport).toHaveBeenCalledWith({
        reportId: 'test-report-id',
      });
    });

    it('should handle errors when getting a report', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report error
      mockReportsClient.getReport.mockRejectedValue(new Error('API error'));

      // Get the get report tool handler
      const getReportHandler = (server.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await getReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving report: API error');
    });
  });

  describe('download-report tool', () => {
    it('should handle download report tool execution for a completed report', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
        reportDocumentId: 'test-document-id',
      });

      // Mock the download report document response
      mockReportsClient.downloadReportDocument.mockResolvedValue(
        'SKU,ASIN,Price,Quantity\nSKU001,B00TEST123,19.99,10\nSKU002,B00TEST456,29.99,5'
      );

      // Get the download report tool handler
      const downloadReportHandler = (server.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Report ID: test-report-id');
      expect(result.content[0].text).toContain('Report Type: GET_FLAT_FILE_OPEN_LISTINGS_DATA');
      expect(result.content[0].text).toContain('Report Content:');
      expect(result.content[0].text).toContain('SKU,ASIN,Price,Quantity');
      expect(result.content[0].text).toContain('SKU001,B00TEST123,19.99,10');
      expect(result.content[0].text).toContain('SKU002,B00TEST456,29.99,5');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://test-report-id');
      expect(result.content[1].name).toBe('View Full Report');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReport).toHaveBeenCalledWith({
        reportId: 'test-report-id',
      });
      expect(mockReportsClient.downloadReportDocument).toHaveBeenCalledWith('test-document-id');
    });

    it('should handle report not ready for download', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response with in-progress status
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Get the download report tool handler
      const downloadReportHandler = (server.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Report is not ready for download. Current status: IN_PROGRESS'
      );

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReport).toHaveBeenCalledWith({
        reportId: 'test-report-id',
      });
      expect(mockReportsClient.downloadReportDocument).not.toHaveBeenCalled();
    });

    it('should handle large report content', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
        reportDocumentId: 'test-document-id',
      });

      // Create a large report content (over 5000 characters)
      const largeContent =
        'Header1,Header2,Header3,Header4\n' +
        Array(500).fill('value1,value2,value3,value4').join('\n');

      // Mock the download report document response
      mockReportsClient.downloadReportDocument.mockResolvedValue(largeContent);

      // Get the download report tool handler
      const downloadReportHandler = (server.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Report ID: test-report-id');
      expect(result.content[0].text).toContain('Report Content:');
      expect(result.content[0].text).toContain('Header1,Header2,Header3,Header4');
      expect(result.content[0].text).toContain('... (content truncated) ...');
      expect(result.content[0].text).toContain(
        'The report content is too large to display in full'
      );
      expect(result.content[0].text.length).toBeLessThan(largeContent.length);
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://test-report-id');
      expect(result.content[1].name).toBe('View Full Report');
    });

    it('should handle errors when downloading a report', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report error
      mockReportsClient.getReport.mockRejectedValue(new Error('API error'));

      // Get the download report tool handler
      const downloadReportHandler = (server.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading report: API error');
    });
  });

  describe('cancel-report tool', () => {
    it('should handle cancel report tool execution for an in-progress report', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Mock the cancel report response
      mockReportsClient.cancelReport.mockResolvedValue({
        reportId: 'test-report-id',
        success: true,
      });

      // Get the cancel report tool handler
      const cancelReportHandler = (server.registerTool as any).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully cancelled report: test-report-id');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://');
      expect(result.content[1].name).toBe('View All Reports');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReport).toHaveBeenCalledWith({
        reportId: 'test-report-id',
      });
      expect(mockReportsClient.cancelReport).toHaveBeenCalledWith({
        reportId: 'test-report-id',
      });
    });

    it('should handle report that cannot be cancelled', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response with completed status
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Get the cancel report tool handler
      const cancelReportHandler = (server.registerTool as any).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Report cannot be cancelled. Current status: DONE');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReport).toHaveBeenCalledWith({
        reportId: 'test-report-id',
      });
      expect(mockReportsClient.cancelReport).not.toHaveBeenCalled();
    });

    it('should handle errors when cancelling a report', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get report response
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'test-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Mock the cancel report error
      mockReportsClient.cancelReport.mockRejectedValue(new Error('API error'));

      // Get the cancel report tool handler
      const cancelReportHandler = (server.registerTool as any).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error cancelling report: API error');
    });
  });

  describe('list-reports tool', () => {
    it('should handle list reports tool execution', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get reports response
      mockReportsClient.getReports.mockResolvedValue({
        reports: [
          {
            reportId: 'report-id-1',
            reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
            processingStatus: 'DONE',
            createdTime: '2025-07-15T10:00:00Z',
            processingEndTime: '2025-07-15T10:05:00Z',
          },
          {
            reportId: 'report-id-2',
            reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
            processingStatus: 'IN_PROGRESS',
            createdTime: '2025-07-15T11:00:00Z',
          },
        ],
        nextToken: 'next-page-token',
      });

      // Get the list reports tool handler
      const listReportsHandler = (server.registerTool as any).mock.calls[4][2];

      // Execute the tool
      const result = await listReportsHandler({
        reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA', 'GET_MERCHANT_LISTINGS_ALL_DATA'],
        processingStatuses: ['DONE', 'IN_PROGRESS'],
        createdSince: '2025-07-01T00:00:00Z',
        pageSize: 10,
      });

      // Verify the result
      expect(result.content.length).toBeGreaterThan(2); // Text + resource links
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 reports:');
      expect(result.content[0].text).toContain('Report ID: report-id-1');
      expect(result.content[0].text).toContain('Type: GET_FLAT_FILE_OPEN_LISTINGS_DATA');
      expect(result.content[0].text).toContain('Status: DONE');
      expect(result.content[0].text).toContain('Report ID: report-id-2');
      expect(result.content[0].text).toContain('Type: GET_MERCHANT_LISTINGS_ALL_DATA');
      expect(result.content[0].text).toContain('Status: IN_PROGRESS');
      expect(result.content[0].text).toContain(
        'More reports available. Use nextToken: next-page-token'
      );

      // Check resource links
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://');
      expect(result.content[1].name).toBe('View All Reports');

      expect(result.content[2].type).toBe('resource_link');
      expect(result.content[2].uri).toBe('amazon-reports://report-id-1');

      expect(result.content[3].type).toBe('resource_link');
      expect(result.content[3].uri).toBe('amazon-reports://report-id-2');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReports).toHaveBeenCalledWith({
        reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA', 'GET_MERCHANT_LISTINGS_ALL_DATA'],
        processingStatuses: ['DONE', 'IN_PROGRESS'],
        createdSince: '2025-07-01T00:00:00Z',
        createdUntil: undefined,
        pageSize: 10,
        nextToken: undefined,
      });
    });

    it('should handle empty reports list', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get reports response with empty reports
      mockReportsClient.getReports.mockResolvedValue({
        reports: [],
      });

      // Get the list reports tool handler
      const listReportsHandler = (server.registerTool as any).mock.calls[4][2];

      // Execute the tool
      const result = await listReportsHandler({});

      // Verify the result
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No reports found matching the specified criteria.');

      // Verify that the reports client was called with the correct parameters
      expect(mockReportsClient.getReports).toHaveBeenCalledWith({
        reportTypes: undefined,
        processingStatuses: undefined,
        createdSince: undefined,
        createdUntil: undefined,
        pageSize: undefined,
        nextToken: undefined,
      });
    });

    it('should handle errors when listing reports', async () => {
      // Register reports tools
      registerReportsTools(server, authConfig);

      // Mock the get reports error
      mockReportsClient.getReports.mockRejectedValue(new Error('API error'));

      // Get the list reports tool handler
      const listReportsHandler = (server.registerTool as any).mock.calls[4][2];

      // Execute the tool
      const result = await listReportsHandler({});

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing reports: API error');
    });
  });
});
