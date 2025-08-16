/**
 * Reports resources for Amazon Selling Partner API
 */

import { ResourceRegistrationManager } from '../../server/resources.js';
import { ReportsClient, ReportType } from '../../api/reports-client.js';
import { AuthConfig } from '../../types/auth.js';
import { error, info } from '../../utils/logger.js';

/**
 * Register reports resources with the resource manager
 *
 * @param resourceManager Resource registration manager
 * @param authConfig Authentication configuration
 */
export function registerReportsResources(
  resourceManager: ResourceRegistrationManager,
  authConfig: AuthConfig
): void {
  const reportsClient = new ReportsClient(authConfig);

  // Register reports collection resource
  resourceManager.registerResource(
    'amazon-reports',
    resourceManager.createResourceTemplate('amazon-reports://{reportId}', 'amazon-reports://', {
      // Completion function for reportId parameter
      reportId: async (value: string) => {
        if (!value || value.length < 3) {
          return [];
        }

        try {
          // Get all reports and filter by the partial report ID
          const result = await reportsClient.getReports();

          // Filter and return matching report IDs
          return result.reports
            .filter((report) => report.reportId.toLowerCase().includes(value.toLowerCase()))
            .map((report) => report.reportId)
            .slice(0, 10); // Limit to 10 results
        } catch (err) {
          error('Error completing Report ID:', { error: err });
          return [];
        }
      },
    }),
    {
      title: 'Amazon Reports',
      description: 'View and manage your Amazon reports',
    },
    async (uri, params) => {
      try {
        const { reportId } = params;

        // If reportId is provided, get a specific report
        if (reportId) {
          const report = await reportsClient.getReport({ reportId });

          // Format the response as markdown
          let markdown = `# Amazon Report: ${reportId}\n\n`;

          // Add basic information
          markdown += `## Report Information\n\n`;
          markdown += `**Report ID:** ${report.reportId}\n\n`;
          markdown += `**Report Type:** ${report.reportType}\n\n`;
          markdown += `**Status:** ${report.processingStatus}\n\n`;
          markdown += `**Created:** ${new Date(report.createdTime).toLocaleString()}\n\n`;

          if (report.processingStartTime) {
            markdown += `**Processing Started:** ${new Date(report.processingStartTime).toLocaleString()}\n\n`;
          }

          if (report.processingEndTime) {
            markdown += `**Processing Completed:** ${new Date(report.processingEndTime).toLocaleString()}\n\n`;
          }

          if (report.dataStartTime) {
            markdown += `**Data Start Time:** ${new Date(report.dataStartTime).toLocaleString()}\n\n`;
          }

          if (report.dataEndTime) {
            markdown += `**Data End Time:** ${new Date(report.dataEndTime).toLocaleString()}\n\n`;
          }

          if (report.marketplaceIds && report.marketplaceIds.length > 0) {
            markdown += `**Marketplace IDs:** ${report.marketplaceIds.join(', ')}\n\n`;
          }

          // Add report content if available
          if (report.reportDocumentId && report.processingStatus === 'DONE') {
            markdown += `## Report Content\n\n`;

            try {
              const reportContent = await reportsClient.downloadReportDocument(
                report.reportDocumentId
              );

              // Determine if the content is likely to be CSV
              const isCSV = reportContent.includes(',') && reportContent.split('\n').length > 1;

              if (isCSV) {
                // Format as a markdown table
                const lines = reportContent.trim().split('\n');
                const headers = lines[0].split(',').map((header) => header.trim());

                // Create table header
                markdown += '| ' + headers.join(' | ') + ' |\n';
                markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

                // Add table rows (limit to 100 rows to avoid excessive content)
                const dataRows = lines.slice(1, Math.min(lines.length, 101));
                dataRows.forEach((row) => {
                  const cells = row.split(',').map((cell) => cell.trim());
                  markdown += '| ' + cells.join(' | ') + ' |\n';
                });

                if (lines.length > 101) {
                  markdown +=
                    '\n*Report truncated. Download the full report for complete data.*\n\n';
                }
              } else {
                // Format as a code block
                markdown += '```\n';
                // Limit content to avoid excessive output
                markdown +=
                  reportContent.length > 5000
                    ? reportContent.substring(0, 5000) + '\n\n... (content truncated) ...'
                    : reportContent;
                markdown += '\n```\n\n';
              }

              // Add download link
              markdown += `## Actions\n\n`;
              markdown += `- [Download Full Report](amazon-report-action://${reportId}/download)\n\n`;
            } catch (error) {
              markdown += `Failed to retrieve report content: ${(error as Error).message}\n\n`;
              markdown += `You can try downloading the report directly:\n\n`;
              markdown += `- [Download Report](amazon-report-action://${reportId}/download)\n\n`;
            }
          } else if (
            report.processingStatus === 'IN_QUEUE' ||
            report.processingStatus === 'IN_PROGRESS'
          ) {
            markdown += `## Status\n\n`;
            markdown += `This report is still being processed. Please check back later.\n\n`;
            markdown += `- [Refresh Report Status](amazon-reports://${reportId})\n\n`;
          } else if (
            report.processingStatus === 'CANCELLED' ||
            report.processingStatus === 'FATAL'
          ) {
            markdown += `## Status\n\n`;
            markdown += `This report was not completed successfully.\n\n`;
            markdown += `- [Request New Report](amazon-report-action://create/${report.reportType})\n\n`;
          }

          // Add actions
          markdown += `## Actions\n\n`;
          markdown += `- [View All Reports](amazon-reports://)\n`;
          markdown += `- [Request Similar Report](amazon-report-action://create/${report.reportType})\n`;

          if (report.processingStatus !== 'CANCELLED') {
            markdown += `- [Cancel Report](amazon-report-action://${reportId}/cancel)\n`;
          }

          return {
            contents: [
              {
                uri: `amazon-reports://${reportId}`,
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no reportId is provided, list all reports
        else {
          // Get query parameters from the URI
          const url = new URL(uri.toString());
          const reportTypes = url.searchParams.get('reportTypes')?.split(',') as
            | ReportType[]
            | undefined;
          const processingStatuses = url.searchParams.get('processingStatuses')?.split(',') as
            | Array<'CANCELLED' | 'DONE' | 'FATAL' | 'IN_PROGRESS' | 'IN_QUEUE'>
            | undefined;
          const createdSince = url.searchParams.get('createdSince') || undefined;
          const createdUntil = url.searchParams.get('createdUntil') || undefined;
          const nextToken = url.searchParams.get('nextToken') || undefined;

          // Get reports with optional filters
          const result = await reportsClient.getReports({
            reportTypes,
            processingStatuses,
            createdSince,
            createdUntil,
            nextToken,
          });

          // Format the response as markdown
          let markdown = `# Amazon Reports\n\n`;

          if (result.reports.length === 0) {
            markdown += `No reports found.\n`;
          } else {
            markdown += `Found ${result.reports.length} reports\n\n`;

            // Add filtering options
            markdown += `## Filter Options\n\n`;
            markdown += `- [All Reports](amazon-reports://)\n`;
            markdown += `- [Completed Reports](amazon-reports://?processingStatuses=DONE)\n`;
            markdown += `- [In Progress Reports](amazon-reports://?processingStatuses=IN_PROGRESS,IN_QUEUE)\n`;
            markdown += `- [Failed Reports](amazon-reports://?processingStatuses=CANCELLED,FATAL)\n\n`;

            // Add common report type filters
            markdown += `## Report Types\n\n`;
            markdown += `- [Inventory Reports](amazon-reports://?reportTypes=GET_AFN_INVENTORY_DATA,GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA)\n`;
            markdown += `- [Order Reports](amazon-reports://?reportTypes=GET_FLAT_FILE_ORDERS_DATA,GET_ORDERS_DATA)\n`;
            markdown += `- [Listing Reports](amazon-reports://?reportTypes=GET_MERCHANT_LISTINGS_ALL_DATA,GET_FLAT_FILE_OPEN_LISTINGS_DATA)\n`;
            markdown += `- [Performance Reports](amazon-reports://?reportTypes=GET_V1_SELLER_PERFORMANCE_REPORT)\n`;
            markdown += `- [Settlement Reports](amazon-reports://?reportTypes=GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE)\n\n`;

            // Add date range filters
            markdown += `## Date Range Filters\n\n`;
            markdown += `- [Last 24 Hours](amazon-reports://?createdSince=${encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())})\n`;
            markdown += `- [Last 7 Days](amazon-reports://?createdSince=${encodeURIComponent(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())})\n`;
            markdown += `- [Last 30 Days](amazon-reports://?createdSince=${encodeURIComponent(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())})\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              const nextPageUrl = new URL(uri.toString());
              nextPageUrl.searchParams.set('nextToken', result.nextToken);
              markdown += `[Next Page](${nextPageUrl.toString()})\n\n`;
            }

            // Add reports
            markdown += `## Reports\n\n`;

            result.reports.forEach((report, index) => {
              markdown += `### ${index + 1}. [${report.reportType}](amazon-reports://${report.reportId})\n\n`;

              markdown += `**Report ID:** ${report.reportId}\n\n`;
              markdown += `**Status:** ${report.processingStatus}\n\n`;
              markdown += `**Created:** ${new Date(report.createdTime).toLocaleString()}\n\n`;

              if (report.processingEndTime && report.processingStatus === 'DONE') {
                markdown += `**Completed:** ${new Date(report.processingEndTime).toLocaleString()}\n\n`;
              }

              // Add action links based on report status
              if (report.processingStatus === 'DONE' && report.reportDocumentId) {
                markdown += `[View Report](amazon-reports://${report.reportId}) | [Download Report](amazon-report-action://${report.reportId}/download)\n\n`;
              } else if (
                report.processingStatus === 'IN_QUEUE' ||
                report.processingStatus === 'IN_PROGRESS'
              ) {
                markdown += `[Check Status](amazon-reports://${report.reportId}) | [Cancel Report](amazon-report-action://${report.reportId}/cancel)\n\n`;
              } else {
                markdown += `[View Details](amazon-reports://${report.reportId}) | [Request Again](amazon-report-action://create/${report.reportType})\n\n`;
              }

              markdown += `---\n\n`;
            });
          }

          // Add action to create a new report
          markdown += `## Create New Report\n\n`;
          markdown += `- [Create New Report](amazon-report-action://create)\n\n`;

          return {
            contents: [
              {
                uri: 'amazon-reports://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error retrieving reports:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to retrieve reports: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  // Register report action resource
  resourceManager.registerResource(
    'amazon-report-action',
    resourceManager.createResourceTemplate('amazon-report-action://{reportId}/{action}'),
    {
      title: 'Amazon Report Actions',
      description: 'Perform actions on Amazon reports',
    },
    async (uri, params) => {
      try {
        const { reportId, action } = params;

        // Handle create action (special case)
        if (reportId === 'create') {
          // Format the response as markdown
          let markdown = `# Create New Report\n\n`;
          markdown += `Use this form to request a new report.\n\n`;

          // If a specific report type is provided in the action parameter
          if (action) {
            markdown += `## Create ${action} Report\n\n`;
            markdown += `To create a new ${action} report, use the \`create-report\` tool with the following parameters:\n\n`;
            markdown += '```json\n';
            markdown += `{\n`;
            markdown += `  "reportType": "${action}",\n`;
            markdown += `  "marketplaceIds": ["${authConfig.marketplaceId}"],\n`;
            markdown += `  "dataStartTime": "YYYY-MM-DDT00:00:00Z",\n`;
            markdown += `  "dataEndTime": "YYYY-MM-DDT23:59:59Z"\n`;
            markdown += `}`;
            markdown += '\n```\n\n';
          } else {
            // Show available report types
            markdown += `## Available Report Types\n\n`;

            // Group report types by category
            markdown += `### Inventory Reports\n\n`;
            markdown += `- [Create Inventory Report](amazon-report-action://create/GET_AFN_INVENTORY_DATA)\n`;
            markdown += `- [Create FBA Inventory Summary Report](amazon-report-action://create/GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA)\n`;
            markdown += `- [Create FBA Inventory Health Report](amazon-report-action://create/GET_FBA_FULFILLMENT_INVENTORY_HEALTH_DATA)\n\n`;

            markdown += `### Order Reports\n\n`;
            markdown += `- [Create Flat File Orders Report](amazon-report-action://create/GET_FLAT_FILE_ORDERS_DATA)\n`;
            markdown += `- [Create XML Orders Report](amazon-report-action://create/GET_ORDERS_DATA)\n`;
            markdown += `- [Create All Orders Report by Last Update](amazon-report-action://create/GET_FLAT_FILE_ALL_ORDERS_DATA_BY_LAST_UPDATE)\n\n`;

            markdown += `### Listing Reports\n\n`;
            markdown += `- [Create All Listings Report](amazon-report-action://create/GET_MERCHANT_LISTINGS_ALL_DATA)\n`;
            markdown += `- [Create Open Listings Report](amazon-report-action://create/GET_FLAT_FILE_OPEN_LISTINGS_DATA)\n`;
            markdown += `- [Create Inactive Listings Report](amazon-report-action://create/GET_MERCHANT_LISTINGS_INACTIVE_DATA)\n\n`;

            markdown += `### Performance Reports\n\n`;
            markdown += `- [Create Seller Performance Report](amazon-report-action://create/GET_V1_SELLER_PERFORMANCE_REPORT)\n`;
            markdown += `- [Create Seller Feedback Report](amazon-report-action://create/GET_SELLER_FEEDBACK_DATA)\n\n`;

            markdown += `### Financial Reports\n\n`;
            markdown += `- [Create Settlement Report (Flat File)](amazon-report-action://create/GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE)\n`;
            markdown += `- [Create Settlement Report (XML)](amazon-report-action://create/GET_V2_SETTLEMENT_REPORT_DATA_XML)\n\n`;

            markdown += `### Other Reports\n\n`;
            markdown += `- [Create Sales and Traffic Report](amazon-report-action://create/GET_SALES_AND_TRAFFIC_REPORT)\n`;
            markdown += `- [Create Restock Inventory Recommendations Report](amazon-report-action://create/GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT)\n\n`;

            markdown += `## Custom Report Request\n\n`;
            markdown += `To create a custom report, use the \`create-report\` tool with the following parameters:\n\n`;
            markdown += '```json\n';
            markdown += `{\n`;
            markdown += `  "reportType": "REPORT_TYPE",\n`;
            markdown += `  "marketplaceIds": ["${authConfig.marketplaceId}"],\n`;
            markdown += `  "dataStartTime": "YYYY-MM-DDT00:00:00Z",\n`;
            markdown += `  "dataEndTime": "YYYY-MM-DDT23:59:59Z",\n`;
            markdown += `  "reportOptions": {\n`;
            markdown += `    "option1": "value1",\n`;
            markdown += `    "option2": "value2"\n`;
            markdown += `  }\n`;
            markdown += `}`;
            markdown += '\n```\n\n';
          }

          markdown += `[Back to Reports](amazon-reports://)\n\n`;

          return {
            contents: [
              {
                uri: uri.toString(),
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }

        // Handle other actions for specific reports
        if (!reportId || !action) {
          throw new Error('Report ID and action are required');
        }

        // Format the response as markdown based on the action
        let markdown = '';

        switch (action.toLowerCase()) {
          case 'download':
            markdown = `# Download Report: ${reportId}\n\n`;

            try {
              // Get the report details
              const report = await reportsClient.getReport({ reportId });

              if (report.processingStatus !== 'DONE' || !report.reportDocumentId) {
                markdown += `This report is not ready for download. Current status: ${report.processingStatus}\n\n`;
                markdown += `[View Report Details](amazon-reports://${reportId})\n\n`;
              } else {
                markdown += `Use this form to download the report.\n\n`;
                markdown += `**Report ID:** ${reportId}\n\n`;
                markdown += `**Report Type:** ${report.reportType}\n\n`;
                markdown += `**Created:** ${new Date(report.createdTime).toLocaleString()}\n\n`;

                markdown += `To download this report, use the \`download-report\` tool with the following parameters:\n\n`;
                markdown += '```json\n';
                markdown += `{\n  "reportId": "${reportId}"\n}`;
                markdown += '\n```\n\n';

                markdown += `This will download the report content and return it in a suitable format.\n\n`;
              }
            } catch (error) {
              markdown += `Error retrieving report details: ${(error as Error).message}\n\n`;
            }
            break;

          case 'cancel':
            markdown = `# Cancel Report: ${reportId}\n\n`;
            markdown += `Use this form to cancel the report processing.\n\n`;
            markdown += `**Report ID:** ${reportId}\n\n`;
            markdown += `To cancel this report, use the \`cancel-report\` tool with the following parameters:\n\n`;
            markdown += '```json\n';
            markdown += `{\n  "reportId": "${reportId}"\n}`;
            markdown += '\n```\n\n';
            markdown += `**Note:** Only reports that are in the IN_QUEUE or IN_PROGRESS state can be canceled.\n\n`;
            break;

          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        markdown += `[Back to Report](amazon-reports://${reportId})\n\n`;
        markdown += `[View All Reports](amazon-reports://)\n\n`;

        return {
          contents: [
            {
              uri: uri.toString(),
              text: markdown,
              mimeType: 'text/markdown',
            },
          ],
        };
      } catch (err) {
        error('Error processing report action:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to process report action: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  // Register report filter resource
  resourceManager.registerResource(
    'amazon-report-filter',
    resourceManager.createResourceTemplate(
      'amazon-report-filter://{filter}',
      'amazon-report-filter://'
    ),
    {
      title: 'Amazon Report Filter',
      description: 'Filter and view your Amazon reports by various criteria',
    },
    async (uri, params) => {
      try {
        const { filter } = params;

        // Parse the filter string to determine the filter type and value
        let filterType: string;
        let filterValue: string;

        if (filter && filter.includes(':')) {
          [filterType, filterValue] = filter.split(':', 2);
        } else {
          // Default to showing filter options
          filterType = '';
          filterValue = '';
        }

        // If a specific filter is provided
        if (filterType && filterValue) {
          // Get query parameters from the URI
          const url = new URL(uri.toString());
          const nextToken = url.searchParams.get('nextToken') || undefined;

          // Prepare filter parameters
          const filterParams: Record<string, unknown> = { nextToken };

          // Apply the appropriate filter
          switch (filterType.toLowerCase()) {
            case 'type':
              filterParams.reportTypes = [filterValue];
              break;
            case 'status':
              if (
                ['CANCELLED', 'DONE', 'FATAL', 'IN_PROGRESS', 'IN_QUEUE'].includes(
                  filterValue.toUpperCase()
                )
              ) {
                filterParams.processingStatuses = [filterValue.toUpperCase()];
              }
              break;
            case 'date':
              // Format should be YYYY-MM-DD
              try {
                const date = new Date(filterValue);
                filterParams.createdSince = new Date(date.setHours(0, 0, 0, 0)).toISOString();
                filterParams.createdUntil = new Date(date.setHours(23, 59, 59, 999)).toISOString();
              } catch {
                throw new Error(`Invalid date format. Use YYYY-MM-DD.`);
              }
              break;
            default:
              throw new Error(`Unknown filter type: ${filterType}`);
          }

          // Get filtered reports
          const result = await reportsClient.getReports(filterParams);

          // Format the response as markdown
          let markdown = `# Amazon Reports: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Filter - ${filterValue}\n\n`;

          if (result.reports.length === 0) {
            markdown += `No reports found matching the filter.\n`;
          } else {
            markdown += `Found ${result.reports.length} reports\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              const nextPageUrl = new URL(uri.toString());
              nextPageUrl.searchParams.set('nextToken', result.nextToken);
              markdown += `[Next Page](${nextPageUrl.toString()})\n\n`;
            }

            // Add reports
            markdown += `## Reports\n\n`;

            result.reports.forEach((report, index) => {
              markdown += `### ${index + 1}. [${report.reportType}](amazon-reports://${report.reportId})\n\n`;

              markdown += `**Report ID:** ${report.reportId}\n\n`;
              markdown += `**Status:** ${report.processingStatus}\n\n`;
              markdown += `**Created:** ${new Date(report.createdTime).toLocaleString()}\n\n`;

              if (report.processingEndTime && report.processingStatus === 'DONE') {
                markdown += `**Completed:** ${new Date(report.processingEndTime).toLocaleString()}\n\n`;
              }

              // Add action links based on report status
              if (report.processingStatus === 'DONE' && report.reportDocumentId) {
                markdown += `[View Report](amazon-reports://${report.reportId}) | [Download Report](amazon-report-action://${report.reportId}/download)\n\n`;
              } else if (
                report.processingStatus === 'IN_QUEUE' ||
                report.processingStatus === 'IN_PROGRESS'
              ) {
                markdown += `[Check Status](amazon-reports://${report.reportId}) | [Cancel Report](amazon-report-action://${report.reportId}/cancel)\n\n`;
              } else {
                markdown += `[View Details](amazon-reports://${report.reportId}) | [Request Again](amazon-report-action://create/${report.reportType})\n\n`;
              }

              markdown += `---\n\n`;
            });
          }

          return {
            contents: [
              {
                uri: uri.toString(),
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no specific filter is provided, show filter options
        else {
          // Format the response as markdown
          let markdown = `# Amazon Report Filters\n\n`;
          markdown += `Use these filters to narrow down your reports view:\n\n`;

          markdown += `## Filter by Report Type\n\n`;
          markdown += `- [Inventory Reports](amazon-report-filter://type:GET_AFN_INVENTORY_DATA)\n`;
          markdown += `- [Order Reports](amazon-report-filter://type:GET_FLAT_FILE_ORDERS_DATA)\n`;
          markdown += `- [Listing Reports](amazon-report-filter://type:GET_MERCHANT_LISTINGS_ALL_DATA)\n`;
          markdown += `- [Performance Reports](amazon-report-filter://type:GET_V1_SELLER_PERFORMANCE_REPORT)\n`;
          markdown += `- [Settlement Reports](amazon-report-filter://type:GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE)\n\n`;

          markdown += `## Filter by Status\n\n`;
          markdown += `- [Completed Reports](amazon-report-filter://status:DONE)\n`;
          markdown += `- [In Progress Reports](amazon-report-filter://status:IN_PROGRESS)\n`;
          markdown += `- [Queued Reports](amazon-report-filter://status:IN_QUEUE)\n`;
          markdown += `- [Cancelled Reports](amazon-report-filter://status:CANCELLED)\n`;
          markdown += `- [Failed Reports](amazon-report-filter://status:FATAL)\n\n`;

          markdown += `## Filter by Date\n\n`;
          markdown += `Enter a date (YYYY-MM-DD) to filter by: [amazon-report-filter://date:YYYY-MM-DD]\n\n`;

          markdown += `## View All Reports\n\n`;
          markdown += `- [View All Reports](amazon-reports://)\n`;

          return {
            contents: [
              {
                uri: 'amazon-report-filter://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error filtering reports:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to filter reports: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  info('Registered reports resources');
}
