/**
 * Tests for reports tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
      const createReportHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[0][2];

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
      const createReportHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[0][2];

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
      const createReportHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[0][2];

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
      const getReportHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[1][2];

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
      const getReportHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await getReportHandler({
        reportId: 'test-report-id',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving report: API error');
    });
  });
});
