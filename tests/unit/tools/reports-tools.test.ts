/**
 * Tests for reports tools
 */

import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { registerReportsTools } from '../../../src/tools/reports-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  ReportsClientMockFactory,
  type MockReportsClient,
} from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import type { AuthConfig } from '../../../src/types/auth.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

describe('Reports Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockReportsClient: MockReportsClient;
  let reportsFactory: ReportsClientMockFactory;
  let authConfig: AuthConfig;
  let mockEnv: MockEnvironment;

  beforeEach(() => {
    const testEnv = TestSetup.setupTestEnvironment();
    mockEnv = testEnv.mockEnv;

    toolManager = new ToolRegistrationManager(mockEnv.server.mcpServer);
    reportsFactory = new ReportsClientMockFactory();
    mockReportsClient = reportsFactory.create();
    authConfig = TestDataBuilder.createAuthConfig();
  });

  it('should register reports tools', () => {
    registerReportsTools(toolManager, authConfig, mockReportsClient);

    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'generate-report',
      expect.objectContaining({
        title: 'Create Report',
        description: 'Request a new report from Amazon Selling Partner API',
      }),
      expect.any(Function)
    );
    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'get-report',
      expect.objectContaining({
        title: 'Get Report',
        description: 'Get information about a specific report',
      }),
      expect.any(Function)
    );
    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'download-report',
      expect.objectContaining({
        title: 'Download Report',
        description: 'Download the content of a completed report',
      }),
      expect.any(Function)
    );
    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'cancel-report',
      expect.objectContaining({
        title: 'Cancel Report',
        description: 'Cancel a report that is in progress',
      }),
      expect.any(Function)
    );
    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'list-reports',
      expect.objectContaining({
        title: 'List Reports',
        description: 'List available reports with optional filtering',
      }),
      expect.any(Function)
    );
  });

  describe('generate-report tool', () => {
    it('should handle create report tool execution', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock the create report response
      mockReportsClient.createReport.mockResolvedValue({
        reportId: 'test-report-id',
      });

      // Get the create report tool handler
      const createReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[0][2];

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
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock the create report response
      mockReportsClient.createReport.mockResolvedValue({
        reportId: 'test-report-id',
      });

      // Get the create report tool handler
      const createReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[0][2];

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
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock the create report error
      mockReportsClient.createReport.mockRejectedValue(new Error('API error'));

      // Get the create report tool handler
      const createReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[0][2];

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
      registerReportsTools(toolManager, authConfig, mockReportsClient);

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
      const getReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[1][2];

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
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock the get report error
      mockReportsClient.getReport.mockRejectedValue(new Error('API error'));

      // Get the get report tool handler
      const getReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[1][2];

      // Execute the tool
      const result = await getReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving report: API error');
    });

    it('should handle minimal report data', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock minimal report response
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'minimal-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Get the get report tool handler
      const getReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[1][2];

      // Execute the tool
      const result = await getReportHandler({
        reportId: 'minimal-report-id',
      });

      // Verify the result contains basic information
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Report ID: minimal-report-id');
      expect(result.content[0].text).toContain('Status: IN_PROGRESS');
      expect(result.content[0].text).not.toContain('Processing Started:');
      expect(result.content[0].text).not.toContain('Data Start Time:');
    });
  });

  describe('download-report tool', () => {
    it('should download completed report successfully', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock completed report
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'completed-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
        reportDocumentId: 'document-123',
      });

      // Mock report content
      const reportContent = 'SKU\tTitle\tPrice\nTEST-001\tTest Product\t19.99';
      mockReportsClient.downloadReportDocument.mockResolvedValue(reportContent);

      // Get the download report tool handler
      const downloadReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock
        .calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'completed-report-id',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Report ID: completed-report-id');
      expect(result.content[0].text).toContain('Report Content:');
      expect(result.content[0].text).toContain('SKU\tTitle\tPrice');
      expect(result.content[0].text).toContain('TEST-001\tTest Product\t19.99');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://completed-report-id');
    });

    it('should handle report not ready for download', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock report not ready
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'pending-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Get the download report tool handler
      const downloadReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock
        .calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'pending-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Report is not ready for download. Current status: IN_PROGRESS'
      );
    });

    it('should handle large report content by truncating', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock completed report
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'large-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
        reportDocumentId: 'document-456',
      });

      // Mock large report content (over 5000 characters)
      const largeContent = 'A'.repeat(6000);
      mockReportsClient.downloadReportDocument.mockResolvedValue(largeContent);

      // Get the download report tool handler
      const downloadReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock
        .calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'large-report-id',
      });

      // Verify the result is truncated
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('... (content truncated) ...');
      expect(result.content[0].text).toContain(
        'The report content is too large to display in full'
      );
    });

    it('should handle download errors', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock error during download
      mockReportsClient.getReport.mockRejectedValue(new Error('Download failed'));

      // Get the download report tool handler
      const downloadReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock
        .calls[2][2];

      // Execute the tool
      const result = await downloadReportHandler({
        reportId: 'error-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading report: Download failed');
    });
  });

  describe('cancel-report tool', () => {
    it('should cancel report in queue successfully', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock report in queue
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'queued-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_QUEUE',
        createdTime: '2025-07-15T10:00:00Z',
      });

      mockReportsClient.cancelReport.mockResolvedValue(undefined);

      // Get the cancel report tool handler
      const cancelReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'queued-report-id',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully cancelled report: queued-report-id');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://');
      expect(mockReportsClient.cancelReport).toHaveBeenCalledWith({ reportId: 'queued-report-id' });
    });

    it('should cancel report in progress successfully', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock report in progress
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'progress-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2025-07-15T10:00:00Z',
      });

      mockReportsClient.cancelReport.mockResolvedValue(undefined);

      // Get the cancel report tool handler
      const cancelReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'progress-report-id',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully cancelled report: progress-report-id');
    });

    it('should handle report that cannot be cancelled', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock completed report
      mockReportsClient.getReport.mockResolvedValue({
        reportId: 'completed-report-id',
        reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
        processingStatus: 'DONE',
        createdTime: '2025-07-15T10:00:00Z',
      });

      // Get the cancel report tool handler
      const cancelReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'completed-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Report cannot be cancelled. Current status: DONE');
    });

    it('should handle cancel errors', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock error during cancel
      mockReportsClient.getReport.mockRejectedValue(new Error('Cancel failed'));

      // Get the cancel report tool handler
      const cancelReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[3][2];

      // Execute the tool
      const result = await cancelReportHandler({
        reportId: 'error-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error cancelling report: Cancel failed');
    });
  });

  describe('list-reports tool', () => {
    it('should list reports successfully', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock reports list
      mockReportsClient.getReports.mockResolvedValue({
        reports: [
          {
            reportId: 'report-1',
            reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
            processingStatus: 'DONE',
            createdTime: '2025-07-15T10:00:00Z',
            processingEndTime: '2025-07-15T10:05:00Z',
          },
          {
            reportId: 'report-2',
            reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
            processingStatus: 'IN_PROGRESS',
            createdTime: '2025-07-15T11:00:00Z',
          },
        ],
        nextToken: 'next-page-token',
      });

      // Get the list reports tool handler
      const listReportsHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[4][2];

      // Execute the tool
      const result = await listReportsHandler({
        reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA'],
        processingStatuses: ['DONE', 'IN_PROGRESS'],
        pageSize: 10,
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 reports:');
      expect(result.content[0].text).toContain('1. Report ID: report-1');
      expect(result.content[0].text).toContain('Type: GET_FLAT_FILE_OPEN_LISTINGS_DATA');
      expect(result.content[0].text).toContain('Status: DONE');
      expect(result.content[0].text).toContain('2. Report ID: report-2');
      expect(result.content[0].text).toContain('Status: IN_PROGRESS');
      expect(result.content[0].text).toContain(
        'More reports available. Use nextToken: next-page-token'
      );

      // Verify resource links
      expect(result.content).toHaveLength(4); // Text + 3 resource links
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toBe('amazon-reports://');
      expect(result.content[2].type).toBe('resource_link');
      expect(result.content[2].uri).toBe('amazon-reports://report-1');
      expect(result.content[3].type).toBe('resource_link');
      expect(result.content[3].uri).toBe('amazon-reports://report-2');
    });

    it('should handle empty reports list', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock empty reports list
      mockReportsClient.getReports.mockResolvedValue({
        reports: [],
      });

      // Get the list reports tool handler
      const listReportsHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[4][2];

      // Execute the tool
      const result = await listReportsHandler({});

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No reports found matching the specified criteria.');
    });

    it('should handle list reports with all filters', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock reports list
      mockReportsClient.getReports.mockResolvedValue({
        reports: [
          {
            reportId: 'filtered-report',
            reportType: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
            processingStatus: 'DONE',
            createdTime: '2025-07-15T10:00:00Z',
          },
        ],
      });

      // Get the list reports tool handler
      const listReportsHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[4][2];

      // Execute the tool with all filters
      const result = await listReportsHandler({
        reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA'],
        processingStatuses: ['DONE'],
        createdSince: '2025-07-01T00:00:00Z',
        createdUntil: '2025-07-31T23:59:59Z',
        pageSize: 50,
        nextToken: 'some-token',
      });

      // Verify the reports client was called with all filters
      expect(mockReportsClient.getReports).toHaveBeenCalledWith({
        reportTypes: ['GET_FLAT_FILE_OPEN_LISTINGS_DATA'],
        processingStatuses: ['DONE'],
        createdSince: '2025-07-01T00:00:00Z',
        createdUntil: '2025-07-31T23:59:59Z',
        pageSize: 50,
        nextToken: 'some-token',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 reports:');
    });

    it('should handle list reports errors', async () => {
      // Register reports tools
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      // Mock error
      mockReportsClient.getReports.mockRejectedValue(new Error('List failed'));

      // Get the list reports tool handler
      const listReportsHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[4][2];

      // Execute the tool
      const result = await listReportsHandler({});

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing reports: List failed');
    });
  });

  describe('input validation', () => {
    it('should handle invalid input for generate-report', async () => {
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      const createReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[0][2];

      const result = await createReportHandler({
        // Missing required reportType
        marketplaceIds: ['ATVPDKIKX0DER'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating report');
    });

    it('should handle invalid input for get-report', async () => {
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      const getReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[1][2];

      const result = await getReportHandler({
        // Missing required reportId
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving report');
    });

    it('should handle invalid input for download-report', async () => {
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      const downloadReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock
        .calls[2][2];

      const result = await downloadReportHandler({
        // Missing required reportId
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading report');
    });

    it('should handle invalid input for cancel-report', async () => {
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      const cancelReportHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[3][2];

      const result = await cancelReportHandler({
        // Missing required reportId
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error cancelling report');
    });

    it('should handle invalid input for list-reports', async () => {
      registerReportsTools(toolManager, authConfig, mockReportsClient);

      const listReportsHandler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls[4][2];

      const result = await listReportsHandler({
        processingStatuses: ['INVALID_STATUS'], // Invalid status
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing reports');
    });
  });
});
