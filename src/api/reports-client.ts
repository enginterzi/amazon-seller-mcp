/**
 * Reports API client for Amazon Selling Partner API
 */

// Third-party dependencies
import { z } from 'zod';

// Internal imports
import { BaseApiClient } from './base-client.js';
import { ApiRequestOptions } from '../types/api.js';
import { AuthConfig } from '../types/auth.js';
import { getLogger } from '../utils/logger.js';

/**
 * Report processing status
 */
export type ReportProcessingStatus = 'CANCELLED' | 'DONE' | 'FATAL' | 'IN_PROGRESS' | 'IN_QUEUE';

/**
 * Report type
 */
export type ReportType =
  | 'GET_FLAT_FILE_OPEN_LISTINGS_DATA'
  | 'GET_MERCHANT_LISTINGS_ALL_DATA'
  | 'GET_MERCHANT_LISTINGS_DATA'
  | 'GET_MERCHANT_LISTINGS_INACTIVE_DATA'
  | 'GET_MERCHANT_LISTINGS_DATA_BACK_COMPAT'
  | 'GET_MERCHANT_LISTINGS_DATA_LITE'
  | 'GET_MERCHANT_LISTINGS_DATA_LITER'
  | 'GET_MERCHANT_CANCELLED_LISTINGS_DATA'
  | 'GET_MERCHANT_LISTINGS_DEFECT_DATA'
  | 'GET_PAN_EU_OFFER_STATUS'
  | 'GET_FLAT_FILE_ORDERS_DATA'
  | 'GET_ORDERS_DATA'
  | 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_LAST_UPDATE'
  | 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE'
  | 'GET_XML_ALL_ORDERS_DATA_BY_LAST_UPDATE'
  | 'GET_XML_ALL_ORDERS_DATA_BY_ORDER_DATE'
  | 'GET_FBA_FULFILLMENT_CUSTOMER_SHIPMENT_SALES_DATA'
  | 'GET_FBA_FULFILLMENT_CUSTOMER_SHIPMENT_PROMOTION_DATA'
  | 'GET_FBA_FULFILLMENT_CUSTOMER_TAXES_DATA'
  | 'GET_AFN_INVENTORY_DATA'
  | 'GET_AFN_INVENTORY_DATA_BY_COUNTRY'
  | 'GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA'
  | 'GET_FBA_FULFILLMENT_MONTHLY_INVENTORY_DATA'
  | 'GET_FBA_FULFILLMENT_INVENTORY_RECEIPTS_DATA'
  | 'GET_RESERVED_INVENTORY_DATA'
  | 'GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA'
  | 'GET_FBA_FULFILLMENT_INVENTORY_ADJUSTMENTS_DATA'
  | 'GET_FBA_FULFILLMENT_INVENTORY_HEALTH_DATA'
  | 'GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA'
  | 'GET_FBA_MYI_ALL_INVENTORY_DATA'
  | 'GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT'
  | 'GET_SELLER_FEEDBACK_DATA'
  | 'GET_V1_SELLER_PERFORMANCE_REPORT'
  | 'GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE'
  | 'GET_V2_SETTLEMENT_REPORT_DATA_XML'
  | 'GET_AMAZON_FULFILLED_SHIPMENTS_DATA'
  | 'GET_FBA_INVENTORY_PLANNING_DATA'
  | 'GET_SALES_AND_TRAFFIC_REPORT';

/**
 * Report
 */
export interface Report {
  /**
   * Report ID
   */
  reportId: string;

  /**
   * Report type
   */
  reportType: ReportType;

  /**
   * Processing status
   */
  processingStatus: ReportProcessingStatus;

  /**
   * Marketplace IDs
   */
  marketplaceIds?: string[];

  /**
   * Created time
   */
  createdTime: string;

  /**
   * Processing start time
   */
  processingStartTime?: string;

  /**
   * Processing end time
   */
  processingEndTime?: string;

  /**
   * Report document ID
   */
  reportDocumentId?: string;

  /**
   * Data start time
   */
  dataStartTime?: string;

  /**
   * Data end time
   */
  dataEndTime?: string;
}

/**
 * Report document
 */
export interface ReportDocument {
  /**
   * Report document ID
   */
  reportDocumentId: string;

  /**
   * URL to download the report
   */
  url: string;

  /**
   * Compression algorithm
   */
  compressionAlgorithm?: 'GZIP';
}

/**
 * Parameters for creating a report
 */
export interface CreateReportParams {
  /**
   * Report type
   */
  reportType: ReportType;

  /**
   * Marketplace IDs
   */
  marketplaceIds: string[];

  /**
   * Data start time
   */
  dataStartTime?: string;

  /**
   * Data end time
   */
  dataEndTime?: string;

  /**
   * Report options
   */
  reportOptions?: Record<string, string>;
}

/**
 * Parameters for getting a report
 */
export interface GetReportParams {
  /**
   * Report ID
   */
  reportId: string;
}

/**
 * Parameters for getting a report document
 */
export interface GetReportDocumentParams {
  /**
   * Report document ID
   */
  reportDocumentId: string;
}

/**
 * Parameters for getting reports
 */
export interface GetReportsParams {
  /**
   * Report types
   */
  reportTypes?: ReportType[];

  /**
   * Processing statuses
   */
  processingStatuses?: ReportProcessingStatus[];

  /**
   * Marketplace IDs
   */
  marketplaceIds?: string[];

  /**
   * Page size
   */
  pageSize?: number;

  /**
   * Created since
   */
  createdSince?: string;

  /**
   * Created until
   */
  createdUntil?: string;

  /**
   * Next token for pagination
   */
  nextToken?: string;
}

/**
 * Create report result
 */
export interface CreateReportResult {
  /**
   * Report ID
   */
  reportId: string;
}

/**
 * Get reports result
 */
export interface GetReportsResult {
  /**
   * Reports
   */
  reports: Report[];

  /**
   * Next token for pagination
   */
  nextToken?: string;
}

/**
 * Reports API client for Amazon Selling Partner API
 */
export class ReportsClient extends BaseApiClient {
  /**
   * API version
   */
  private readonly apiVersion = 'reports/2021-06-30';

  /**
   * Create a new ReportsClient instance
   *
   * @param authConfig Authentication configuration
   */
  constructor(authConfig: AuthConfig) {
    super(authConfig);
  }

  /**
   * Create a report
   *
   * @param params Parameters for creating a report
   * @returns Promise resolving to the create report result
   */
  public async createReport(params: CreateReportParams): Promise<CreateReportResult> {
    const { reportType, marketplaceIds, dataStartTime, dataEndTime, reportOptions } = params;

    // Validate create report parameters
    this.validateCreateReportParams(params);

    // Build request body
    const requestBody = {
      reportType,
      marketplaceIds,
      dataStartTime,
      dataEndTime,
      reportOptions,
    };

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'POST',
      path: `/${this.apiVersion}/reports`,
      data: requestBody,
    };

    const response = await this.request<{ payload: CreateReportResult }>(requestOptions);

    return response.data.payload;
  }

  /**
   * Get a report
   *
   * @param params Parameters for getting a report
   * @returns Promise resolving to the report
   */
  public async getReport(params: GetReportParams): Promise<Report> {
    const { reportId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/reports/${reportId}`,
    };

    // Use cache for report (30 seconds TTL)
    const cacheKey = `report:${reportId}`;

    return this.withCache<Report>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: Report }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get a report document
   *
   * @param params Parameters for getting a report document
   * @returns Promise resolving to the report document
   */
  public async getReportDocument(params: GetReportDocumentParams): Promise<ReportDocument> {
    const { reportDocumentId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/documents/${reportDocumentId}`,
    };

    // Use cache for report document (30 seconds TTL)
    const cacheKey = `reportDocument:${reportDocumentId}`;

    return this.withCache<ReportDocument>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: ReportDocument }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get reports
   *
   * @param params Parameters for getting reports
   * @returns Promise resolving to the get reports result
   */
  public async getReports(params: GetReportsParams = {}): Promise<GetReportsResult> {
    const {
      reportTypes,
      processingStatuses,
      marketplaceIds,
      pageSize,
      createdSince,
      createdUntil,
      nextToken,
    } = params;

    // Build query parameters
    const query: Record<string, string | string[] | number | undefined> = {};

    if (reportTypes && reportTypes.length > 0) {
      query.reportTypes = reportTypes;
    }

    if (processingStatuses && processingStatuses.length > 0) {
      query.processingStatuses = processingStatuses;
    }

    if (marketplaceIds && marketplaceIds.length > 0) {
      query.marketplaceIds = marketplaceIds;
    } else {
      // Default to the configured marketplace ID
      query.marketplaceIds = [this.config.marketplaceId];
    }

    if (pageSize) {
      query.pageSize = Math.min(100, Math.max(1, pageSize)); // Ensure pageSize is between 1 and 100
    }

    if (createdSince) {
      query.createdSince = createdSince;
    }

    if (createdUntil) {
      query.createdUntil = createdUntil;
    }

    if (nextToken) {
      query.nextToken = nextToken;
    }

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/reports`,
      query: query as Record<string, string | number | boolean | undefined>,
    };

    // Use cache for reports (30 seconds TTL)
    const cacheKey = `reports:${this.config.marketplaceId}:${JSON.stringify(query)}`;

    return this.withCache<GetReportsResult>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: GetReportsResult }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Cancel a report
   *
   * @param params Parameters for canceling a report
   * @returns Promise resolving to void
   */
  public async cancelReport(params: GetReportParams): Promise<void> {
    const { reportId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'DELETE',
      path: `/${this.apiVersion}/reports/${reportId}`,
    };

    await this.request(requestOptions);

    // Clear cache for this report
    this.clearCache(`report:${reportId}`);
  }

  /**
   * Download a report document
   *
   * @param reportDocumentId Report document ID
   * @returns Promise resolving to the report content
   */
  public async downloadReportDocument(reportDocumentId: string): Promise<string> {
    // Get report document
    const reportDocument = await this.getReportDocument({ reportDocumentId });

    // Make request to download URL
    const response = await fetch(reportDocument.url);

    if (!response.ok) {
      throw new Error(`Failed to download report document: ${response.statusText}`);
    }

    // Get content
    const content = await response.text();

    // Handle compression if needed
    if (reportDocument.compressionAlgorithm === 'GZIP') {
      // In a real implementation, we would decompress the content here
      // For now, we'll just return the raw content with a warning
      getLogger().warn('GZIP compression detected but not implemented. Returning raw content.');
    }

    return content;
  }

  /**
   * Validate create report parameters
   *
   * @param params Parameters to validate
   * @throws Error if validation fails
   */
  private validateCreateReportParams(params: CreateReportParams): void {
    // Define validation schema using zod
    const schema = z.object({
      reportType: z.string().min(1, 'Report type is required'),
      marketplaceIds: z.array(z.string()).min(1, 'At least one marketplace ID is required'),
      dataStartTime: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
          'Data start time must be in ISO 8601 format'
        )
        .optional(),
      dataEndTime: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'Data end time must be in ISO 8601 format')
        .optional(),
      reportOptions: z.record(z.string()).optional(),
    });

    try {
      schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        throw new Error(`Validation failed for create report: ${formattedErrors}`);
      }
      throw error;
    }

    // Additional validation for date range
    if (params.dataStartTime && params.dataEndTime) {
      const startTime = new Date(params.dataStartTime).getTime();
      const endTime = new Date(params.dataEndTime).getTime();

      if (startTime >= endTime) {
        throw new Error('Data start time must be before data end time');
      }
    }
  }
}
