/**
 * Tests for reports resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources';
import { registerReportsResources } from '../../src/resources/reports/reports-resources';
import { ReportsClient } from '../../src/api/reports-client';

// Mock the reports client
vi.mock('../../src/api/reports-client');

describe('Reports Resources', () => {
  // Mock MCP server
  const mockServer = {
    registerResource: vi.fn(),
  };

  // Mock resource manager
  let resourceManager: ResourceRegistrationManager;

  // Mock auth config
  const mockAuthConfig = {
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

  // Sample report data
  const sampleReport = {
    reportId: 'report-123',
    reportType: 'GET_FLAT_FILE_ORDERS_DATA',
    processingStatus: 'DONE',
    marketplaceIds: ['ATVPDKIKX0DER'],
    createdTime: '2023-01-01T12:00:00Z',
    processingStartTime: '2023-01-01T12:01:00Z',
    processingEndTime: '2023-01-01T12:05:00Z',
    reportDocumentId: 'doc-123',
  };

  const sampleReportDocument = {
    reportDocumentId: 'doc-123',
    url: 'https://example.com/report.csv',
    compressionAlgorithm: undefined,
  };

  const sampleReportContent =
    'Order ID,Order Date,SKU,Quantity\n123-456,2023-01-01,SKU123,1\n789-012,2023-01-02,SKU456,2';

  const sampleReportsResponse = {
    reports: [
      sampleReport,
      {
        reportId: 'report-456',
        reportType: 'GET_AFN_INVENTORY_DATA',
        processingStatus: 'IN_PROGRESS',
        marketplaceIds: ['ATVPDKIKX0DER'],
        createdTime: '2023-01-02T12:00:00Z',
        processingStartTime: '2023-01-02T12:01:00Z',
      },
      {
        reportId: 'report-789',
        reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
        processingStatus: 'CANCELLED',
        marketplaceIds: ['ATVPDKIKX0DER'],
        createdTime: '2023-01-03T12:00:00Z',
      },
    ],
    nextToken: 'next-token',
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create resource manager with mock server
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Mock resource template creation
    resourceManager.createResourceTemplate = vi
      .fn()
      .mockImplementation((uriTemplate, listTemplate, completions) => {
        return { uriTemplate, listTemplate, completions };
      });

    // Mock resource registration
    resourceManager.registerResource = vi.fn().mockReturnValue(true);

    // Mock reports client methods
    (ReportsClient as any).mockImplementation(() => ({
      getReports: vi.fn().mockResolvedValue(sampleReportsResponse),
      getReport: vi.fn().mockResolvedValue(sampleReport),
      getReportDocument: vi.fn().mockResolvedValue(sampleReportDocument),
      downloadReportDocument: vi.fn().mockResolvedValue(sampleReportContent),
      createReport: vi.fn().mockResolvedValue({ reportId: 'new-report-123' }),
      cancelReport: vi.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should register reports resources', () => {
    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Verify resource registration
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(3);

    // Check first resource registration (amazon-reports)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-reports',
      expect.anything(),
      {
        title: 'Amazon Reports',
        description: 'View and manage your Amazon reports',
      },
      expect.any(Function)
    );

    // Check second resource registration (amazon-report-action)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-report-action',
      expect.anything(),
      {
        title: 'Amazon Report Actions',
        description: 'Perform actions on Amazon reports',
      },
      expect.any(Function)
    );

    // Check third resource registration (amazon-report-filter)
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-report-filter',
      expect.anything(),
      {
        title: 'Amazon Report Filter',
        description: 'Filter and view your Amazon reports by various criteria',
      },
      expect.any(Function)
    );
  });

  it('should create resource templates with correct URI patterns', () => {
    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Verify resource template creation
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledTimes(3);

    // Check first template (amazon-reports)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-reports://{reportId}',
      'amazon-reports://',
      expect.objectContaining({
        reportId: expect.any(Function),
      })
    );

    // Check second template (amazon-report-action)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-report-action://{reportId}/{action}'
    );

    // Check third template (amazon-report-filter)
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-report-filter://{filter}',
      'amazon-report-filter://'
    );
  });

  it('should handle reports resource requests with report ID', async () => {
    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const reportsResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-reports'
    )[3];

    // Test handler with report ID parameter
    const reportUri = new URL('amazon-reports://report-123');
    const reportResult = await reportsResourceHandler(reportUri, { reportId: 'report-123' });

    // Verify result structure
    expect(reportResult).toHaveProperty('contents');
    expect(reportResult.contents).toBeInstanceOf(Array);
    expect(reportResult.contents[0]).toHaveProperty('uri', 'amazon-reports://report-123');
    expect(reportResult.contents[0]).toHaveProperty('text');
    expect(reportResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes key report information
    expect(reportResult.contents[0].text).toContain('# Amazon Report: report-123');
    expect(reportResult.contents[0].text).toContain('**Report ID:** report-123');
    expect(reportResult.contents[0].text).toContain('**Report Type:** GET_FLAT_FILE_ORDERS_DATA');
    expect(reportResult.contents[0].text).toContain('**Status:** DONE');

    // Verify report content is included
    expect(reportResult.contents[0].text).toContain('## Report Content');
    expect(reportResult.contents[0].text).toContain('Order ID | Order Date | SKU | Quantity');
  });

  it('should handle reports resource requests without report ID (list all reports)', async () => {
    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const reportsResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-reports'
    )[3];

    // Test handler without report ID parameter (list all reports)
    const listUri = new URL('amazon-reports://');
    const listResult = await reportsResourceHandler(listUri, {});

    // Verify result structure
    expect(listResult).toHaveProperty('contents');
    expect(listResult.contents).toBeInstanceOf(Array);
    expect(listResult.contents[0]).toHaveProperty('uri', 'amazon-reports://');
    expect(listResult.contents[0]).toHaveProperty('text');
    expect(listResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes reports list
    expect(listResult.contents[0].text).toContain('# Amazon Reports');
    expect(listResult.contents[0].text).toContain('Found 3 reports');
    expect(listResult.contents[0].text).toContain('GET_FLAT_FILE_ORDERS_DATA');
    expect(listResult.contents[0].text).toContain('GET_AFN_INVENTORY_DATA');
    expect(listResult.contents[0].text).toContain('GET_MERCHANT_LISTINGS_ALL_DATA');

    // Verify filter options are included
    expect(listResult.contents[0].text).toContain('## Filter Options');
    expect(listResult.contents[0].text).toContain('[All Reports]');
    expect(listResult.contents[0].text).toContain('[Completed Reports]');
    expect(listResult.contents[0].text).toContain('[In Progress Reports]');
  });

  it('should handle report action resource requests', async () => {
    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const actionResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-report-action'
    )[3];

    // Test handler with download action
    const downloadUri = new URL('amazon-report-action://report-123/download');
    const downloadResult = await actionResourceHandler(downloadUri, {
      reportId: 'report-123',
      action: 'download',
    });

    // Verify result structure
    expect(downloadResult).toHaveProperty('contents');
    expect(downloadResult.contents).toBeInstanceOf(Array);
    expect(downloadResult.contents[0]).toHaveProperty('uri', downloadUri.toString());
    expect(downloadResult.contents[0]).toHaveProperty('text');
    expect(downloadResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes download action information
    expect(downloadResult.contents[0].text).toContain('# Download Report: report-123');
    expect(downloadResult.contents[0].text).toContain('download-report');

    // Test handler with cancel action
    const cancelUri = new URL('amazon-report-action://report-123/cancel');
    const cancelResult = await actionResourceHandler(cancelUri, {
      reportId: 'report-123',
      action: 'cancel',
    });

    // Verify content includes cancel action information
    expect(cancelResult.contents[0].text).toContain('# Cancel Report: report-123');
    expect(cancelResult.contents[0].text).toContain('cancel-report');

    // Test handler with create action
    const createUri = new URL('amazon-report-action://create');
    const createResult = await actionResourceHandler(createUri, {
      reportId: 'create',
    });

    // Verify content includes create action information
    expect(createResult.contents[0].text).toContain('# Create New Report');
    expect(createResult.contents[0].text).toContain('Available Report Types');
  });

  it('should handle report filter resource requests', async () => {
    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const filterResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-report-filter'
    )[3];

    // Test handler without filter parameter (show filter options)
    const optionsUri = new URL('amazon-report-filter://');
    const optionsResult = await filterResourceHandler(optionsUri, {});

    // Verify result structure
    expect(optionsResult).toHaveProperty('contents');
    expect(optionsResult.contents).toBeInstanceOf(Array);
    expect(optionsResult.contents[0]).toHaveProperty('uri', 'amazon-report-filter://');
    expect(optionsResult.contents[0]).toHaveProperty('text');
    expect(optionsResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes filter options
    expect(optionsResult.contents[0].text).toContain('# Amazon Report Filters');
    expect(optionsResult.contents[0].text).toContain('Filter by Report Type');
    expect(optionsResult.contents[0].text).toContain('Filter by Status');
    expect(optionsResult.contents[0].text).toContain('Filter by Date');

    // Test handler with filter parameter
    // Need to encode the URL properly since it contains a colon
    const filterUri = new URL('amazon-report-filter://status%3ADONE');
    const filterResult = await filterResourceHandler(filterUri, { filter: 'status:DONE' });

    // Verify result structure
    expect(filterResult).toHaveProperty('contents');
    expect(filterResult.contents).toBeInstanceOf(Array);
    expect(filterResult.contents[0]).toHaveProperty('uri', filterUri.toString());
    expect(filterResult.contents[0]).toHaveProperty('text');
    expect(filterResult.contents[0]).toHaveProperty('mimeType', 'text/markdown');

    // Verify content includes filtered reports
    expect(filterResult.contents[0].text).toContain('# Amazon Reports: Status Filter - DONE');
  });

  it('should handle errors gracefully', async () => {
    // Mock reports client to throw an error
    (ReportsClient as any).mockImplementation(() => ({
      getReports: vi.fn().mockRejectedValue(new Error('API Error')),
      getReport: vi.fn().mockRejectedValue(new Error('API Error')),
      getReportDocument: vi.fn().mockRejectedValue(new Error('API Error')),
      downloadReportDocument: vi.fn().mockRejectedValue(new Error('API Error')),
    }));

    // Register reports resources
    registerReportsResources(resourceManager, mockAuthConfig);

    // Get the resource handler function
    const registerResourceCalls = (resourceManager.registerResource as any).mock.calls;
    const reportsResourceHandler = registerResourceCalls.find(
      (call) => call[0] === 'amazon-reports'
    )[3];

    // Test handler with report ID parameter
    const reportUri = new URL('amazon-reports://report-123');
    const reportResult = await reportsResourceHandler(reportUri, { reportId: 'report-123' });

    // Verify error response
    expect(reportResult).toHaveProperty('contents');
    expect(reportResult.contents).toBeInstanceOf(Array);
    expect(reportResult.contents[0]).toHaveProperty('text');
    expect(reportResult.contents[0].text).toContain('# Error');
    expect(reportResult.contents[0].text).toContain('Failed to retrieve reports: API Error');
  });
});
