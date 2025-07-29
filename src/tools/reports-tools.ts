/**
 * Reports tools for Amazon Selling Partner API
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ReportsClient, ReportType } from '../api/reports-client.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Register reports tools with the MCP server
 *
 * @param server MCP server
 * @param authConfig Authentication configuration
 */
export function registerReportsTools(server: McpServer, authConfig: AuthConfig): void {
  const reportsClient = new ReportsClient(authConfig);

  // Register create-report tool
  server.registerTool(
    'create-report',
    {
      title: 'Create Report',
      description: 'Request a new report from Amazon Selling Partner API',
      inputSchema: {
        reportType: z.string().describe('The type of report to create'),
        marketplaceIds: z.array(z.string()).describe('The marketplace IDs for the report'),
        dataStartTime: z
          .string()
          .optional()
          .describe('The start time for the report data in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)'),
        dataEndTime: z
          .string()
          .optional()
          .describe('The end time for the report data in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)'),
        reportOptions: z
          .record(z.string())
          .optional()
          .describe('Additional options for the report'),
      },
    },
    async ({ reportType, marketplaceIds, dataStartTime, dataEndTime, reportOptions }) => {
      try {
        // Create the report
        const result = await reportsClient.createReport({
          reportType: reportType as ReportType,
          marketplaceIds: marketplaceIds || [authConfig.marketplaceId],
          dataStartTime,
          dataEndTime,
          reportOptions,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully requested report. Report ID: ${result.reportId}`,
            },
            {
              type: 'resource_link',
              uri: `amazon-reports://${result.reportId}`,
              name: 'View Report Status',
              description: 'Check the status of your requested report',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating report: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get-report tool
  server.registerTool(
    'get-report',
    {
      title: 'Get Report',
      description: 'Get information about a specific report',
      inputSchema: {
        reportId: z.string().describe('The ID of the report to retrieve'),
      },
    },
    async ({ reportId }) => {
      try {
        // Get the report
        const report = await reportsClient.getReport({ reportId });

        // Format the response
        let responseText = `Report ID: ${report.reportId}\n`;
        responseText += `Report Type: ${report.reportType}\n`;
        responseText += `Status: ${report.processingStatus}\n`;
        responseText += `Created: ${new Date(report.createdTime).toLocaleString()}\n`;

        if (report.processingStartTime) {
          responseText += `Processing Started: ${new Date(report.processingStartTime).toLocaleString()}\n`;
        }

        if (report.processingEndTime) {
          responseText += `Processing Completed: ${new Date(report.processingEndTime).toLocaleString()}\n`;
        }

        if (report.dataStartTime) {
          responseText += `Data Start Time: ${new Date(report.dataStartTime).toLocaleString()}\n`;
        }

        if (report.dataEndTime) {
          responseText += `Data End Time: ${new Date(report.dataEndTime).toLocaleString()}\n`;
        }

        if (report.marketplaceIds && report.marketplaceIds.length > 0) {
          responseText += `Marketplace IDs: ${report.marketplaceIds.join(', ')}\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
            {
              type: 'resource_link',
              uri: `amazon-reports://${reportId}`,
              name: 'View Full Report Details',
              description: 'View detailed information about this report',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving report: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register download-report tool
  server.registerTool(
    'download-report',
    {
      title: 'Download Report',
      description: 'Download the content of a completed report',
      inputSchema: {
        reportId: z.string().describe('The ID of the report to download'),
      },
    },
    async ({ reportId }) => {
      try {
        // Get the report
        const report = await reportsClient.getReport({ reportId });

        // Check if the report is ready for download
        if (report.processingStatus !== 'DONE' || !report.reportDocumentId) {
          return {
            content: [
              {
                type: 'text',
                text: `Report is not ready for download. Current status: ${report.processingStatus}`,
              },
            ],
            isError: true,
          };
        }

        // Download the report document
        const reportContent = await reportsClient.downloadReportDocument(report.reportDocumentId);

        // Determine if the content is likely to be CSV (for future use)
        // const isCSV = reportContent.includes(',') && reportContent.split('\n').length > 1;

        // Format the response
        let responseText = `Report ID: ${report.reportId}\n`;
        responseText += `Report Type: ${report.reportType}\n`;
        responseText += `Created: ${new Date(report.createdTime).toLocaleString()}\n\n`;
        responseText += `Report Content:\n\n`;

        // If the content is too large, truncate it
        const maxContentLength = 5000;
        if (reportContent.length > maxContentLength) {
          responseText += reportContent.substring(0, maxContentLength);
          responseText += '\n\n... (content truncated) ...\n\n';
          responseText +=
            'The report content is too large to display in full. Use the resource link to view the complete report.';
        } else {
          responseText += reportContent;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
            {
              type: 'resource_link',
              uri: `amazon-reports://${reportId}`,
              name: 'View Full Report',
              description: 'View the complete report with formatting',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error downloading report: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register cancel-report tool
  server.registerTool(
    'cancel-report',
    {
      title: 'Cancel Report',
      description: 'Cancel a report that is in progress',
      inputSchema: {
        reportId: z.string().describe('The ID of the report to cancel'),
      },
    },
    async ({ reportId }) => {
      try {
        // Get the report first to check its status
        const report = await reportsClient.getReport({ reportId });

        // Check if the report can be cancelled
        if (report.processingStatus !== 'IN_QUEUE' && report.processingStatus !== 'IN_PROGRESS') {
          return {
            content: [
              {
                type: 'text',
                text: `Report cannot be cancelled. Current status: ${report.processingStatus}`,
              },
            ],
            isError: true,
          };
        }

        // Cancel the report
        await reportsClient.cancelReport({ reportId });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully cancelled report: ${reportId}`,
            },
            {
              type: 'resource_link',
              uri: 'amazon-reports://',
              name: 'View All Reports',
              description: 'Return to the reports list',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error cancelling report: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register list-reports tool
  server.registerTool(
    'list-reports',
    {
      title: 'List Reports',
      description: 'List available reports with optional filtering',
      inputSchema: {
        reportTypes: z.array(z.string()).optional().describe('Filter by report types'),
        processingStatuses: z
          .array(z.enum(['CANCELLED', 'DONE', 'FATAL', 'IN_PROGRESS', 'IN_QUEUE']))
          .optional()
          .describe('Filter by processing statuses'),
        createdSince: z.string().optional().describe('Filter by creation date (ISO 8601 format)'),
        createdUntil: z.string().optional().describe('Filter by creation date (ISO 8601 format)'),
        pageSize: z.number().optional().describe('Number of reports to return (max 100)'),
        nextToken: z.string().optional().describe('Token for pagination'),
      },
    },
    async ({
      reportTypes,
      processingStatuses,
      createdSince,
      createdUntil,
      pageSize,
      nextToken,
    }) => {
      try {
        // Get reports with optional filters
        const result = await reportsClient.getReports({
          reportTypes: reportTypes as ReportType[] | undefined,
          processingStatuses,
          createdSince,
          createdUntil,
          pageSize,
          nextToken,
        });

        if (result.reports.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No reports found matching the specified criteria.',
              },
            ],
          };
        }

        // Format the response
        let responseText = `Found ${result.reports.length} reports:\n\n`;

        result.reports.forEach((report, index) => {
          responseText += `${index + 1}. Report ID: ${report.reportId}\n`;
          responseText += `   Type: ${report.reportType}\n`;
          responseText += `   Status: ${report.processingStatus}\n`;
          responseText += `   Created: ${new Date(report.createdTime).toLocaleString()}\n`;

          if (report.processingEndTime && report.processingStatus === 'DONE') {
            responseText += `   Completed: ${new Date(report.processingEndTime).toLocaleString()}\n`;
          }

          responseText += '\n';
        });

        // Add pagination info if available
        if (result.nextToken) {
          responseText += `\nMore reports available. Use nextToken: ${result.nextToken}\n`;
        }

        const content: any[] = [
          {
            type: 'text',
            text: responseText,
          },
          {
            type: 'resource_link',
            uri: 'amazon-reports://',
            name: 'View All Reports',
            description: 'View all reports with detailed formatting',
          },
        ];

        // Add links to each report
        result.reports.forEach((report) => {
          content.push({
            type: 'resource_link',
            uri: `amazon-reports://${report.reportId}`,
            name: `Report: ${report.reportType}`,
            description: `Status: ${report.processingStatus}, Created: ${new Date(report.createdTime).toLocaleString()}`,
          });
        });

        return { content };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing reports: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  console.log('Registered reports tools');
}
