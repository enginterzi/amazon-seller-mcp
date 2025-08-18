/**
 * Type validation mock factory for generating valid and invalid test data
 */

import { BaseMockFactory } from './base-factory.js';
import { TestDataBuilder } from '../test-data-builder.js';
import type {
  AmazonCatalogItem,
  AmazonListingsItem,
  AmazonInventorySummary,
  AmazonOrder,
  AmazonReport,
  InventoryFilterParams,
  OrdersFilterParams,
  ReportsFilterParams,
  AmazonItemAttributes,
  AmazonItemIdentifiers,
  AmazonItemRelationships,
  ToolContentResponse,
  OrderUpdateDetails,
} from '../../../src/types/amazon-api.js';
import type {
  ErrorDetails,
  LogMetadata,
  ErrorRecoveryContext,
  McpRequestBody,
  NotificationData,
  HttpRequest,
  HttpResponse,
  ToolInput,
} from '../../../src/types/common.js';
import {
  validateAmazonCatalogItem,
  validateAmazonListingsItem,
  validateAmazonInventorySummary,
  validateAmazonOrder,
  validateAmazonReport,
  validateInventoryFilterParams,
  validateOrdersFilterParams,
  validateReportsFilterParams,
} from '../../../src/types/validators.js';
import {
  isAmazonCatalogItem,
  isAmazonListingsItem,
  isAmazonInventorySummary,
  isAmazonOrder,
  isAmazonReport,
  isInventoryFilterParams,
  isOrdersFilterParams,
  isReportsFilterParams,
  isAmazonItemAttributes,
  isAmazonItemIdentifiers,
  isAmazonItemRelationships,
  isToolContentResponse,
  isOrderUpdateDetails,
  isErrorDetails,
  isLogMetadata,
  isErrorRecoveryContext,
  isMcpRequestBody,
  isNotificationData,
  isHttpRequest,
  isHttpResponse,
  isToolInput,
} from '../../../src/types/guards.js';

/**
 * Configuration for type validation mock scenarios
 */
export interface TypeValidationMockConfig {
  /** Whether to include edge cases in generated data */
  includeEdgeCases?: boolean;
  /** Whether to generate minimal valid data */
  minimal?: boolean;
  /** Custom overrides for generated data */
  overrides?: Record<string, unknown>;
}

/**
 * Type validation mock factory for generating test data with validation
 */
export class TypeValidationMockFactory extends BaseMockFactory<unknown> {
  private defaultConfig: TypeValidationMockConfig;

  constructor(config: TypeValidationMockConfig = {}) {
    super('TypeValidationMockFactory');
    this.defaultConfig = {
      includeEdgeCases: false,
      minimal: false,
      ...config,
    };
  }

  /**
   * Generate valid Amazon catalog item data
   */
  createValidAmazonCatalogItem(overrides: Partial<AmazonCatalogItem> = {}): AmazonCatalogItem {
    const item = this.defaultConfig.minimal
      ? { asin: 'B08TEST123', ...overrides }
      : TestDataBuilder.createCatalogItem(overrides);

    // Validate the generated item
    validateAmazonCatalogItem(item);
    return item;
  }

  /**
   * Generate invalid Amazon catalog item data for error testing
   */
  createInvalidAmazonCatalogItem(
    type: 'missingAsin' | 'invalidType' | 'malformedStructure' = 'missingAsin'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidCatalogItem(type);
  }

  /**
   * Generate valid Amazon listings item data
   */
  createValidAmazonListingsItem(overrides: Partial<AmazonListingsItem> = {}): AmazonListingsItem {
    const item = this.defaultConfig.minimal
      ? {
          sku: 'TEST-SKU-123',
          productType: 'PRODUCT',
          attributes: { title: 'Test Product' },
          ...overrides,
        }
      : TestDataBuilder.createListing(overrides);

    // Validate the generated item
    validateAmazonListingsItem(item);
    return item;
  }

  /**
   * Generate invalid Amazon listings item data for error testing
   */
  createInvalidAmazonListingsItem(
    type: 'missingSku' | 'invalidAttributes' | 'malformedAvailability' = 'missingSku'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidListingsItem(type);
  }

  /**
   * Generate valid Amazon inventory summary data
   */
  createValidAmazonInventorySummary(
    overrides: Partial<AmazonInventorySummary> = {}
  ): AmazonInventorySummary {
    const item = this.defaultConfig.minimal
      ? { asin: 'B08TEST123', ...overrides }
      : TestDataBuilder.createInventorySummary(overrides);

    // Validate the generated item
    validateAmazonInventorySummary(item);
    return item;
  }

  /**
   * Generate invalid Amazon inventory summary data for error testing
   */
  createInvalidAmazonInventorySummary(
    type: 'invalidDetails' | 'wrongTypes' = 'invalidDetails'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidInventorySummary(type);
  }

  /**
   * Generate valid Amazon order data
   */
  createValidAmazonOrder(overrides: Partial<AmazonOrder> = {}): AmazonOrder {
    const order = this.defaultConfig.minimal
      ? {
          amazonOrderId: 'TEST-ORDER-123',
          purchaseDate: '2024-01-15T10:30:00Z',
          orderStatus: 'Shipped',
          marketplaceId: 'ATVPDKIKX0DER',
          ...overrides,
        }
      : TestDataBuilder.createOrder(overrides);

    // Validate the generated order
    validateAmazonOrder(order);
    return order;
  }

  /**
   * Generate invalid Amazon order data for error testing
   */
  createInvalidAmazonOrder(
    type: 'missingRequired' | 'invalidTotal' | 'malformedAddress' = 'missingRequired'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidOrder(type);
  }

  /**
   * Generate valid Amazon report data
   */
  createValidAmazonReport(overrides: Partial<AmazonReport> = {}): AmazonReport {
    const report = this.defaultConfig.minimal
      ? {
          reportId: 'REPORT_123456789',
          reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
          processingStatus: 'DONE',
          createdTime: '2024-01-15T10:30:00Z',
          ...overrides,
        }
      : TestDataBuilder.createReport(overrides);

    // Validate the generated report
    validateAmazonReport(report);
    return report;
  }

  /**
   * Generate invalid Amazon report data for error testing
   */
  createInvalidAmazonReport(type: 'missingRequired' | 'wrongTypes' = 'missingRequired'): unknown {
    return TestDataBuilder.createInvalidData().invalidReport(type);
  }

  /**
   * Generate valid inventory filter parameters
   */
  createValidInventoryFilterParams(
    overrides: Partial<InventoryFilterParams> = {}
  ): InventoryFilterParams {
    const params = this.defaultConfig.minimal
      ? { ...overrides }
      : TestDataBuilder.createInventoryFilterParams(overrides);

    // Validate the generated parameters
    validateInventoryFilterParams(params);
    return params;
  }

  /**
   * Generate invalid inventory filter parameters for error testing
   */
  createInvalidInventoryFilterParams(
    type: 'invalidArrays' | 'wrongDateTypes' | 'invalidTokens' = 'invalidArrays'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidFilterParams(type);
  }

  /**
   * Generate valid orders filter parameters
   */
  createValidOrdersFilterParams(overrides: Partial<OrdersFilterParams> = {}): OrdersFilterParams {
    const params = this.defaultConfig.minimal
      ? { ...overrides }
      : TestDataBuilder.createOrdersFilterParams(overrides);

    // Validate the generated parameters
    validateOrdersFilterParams(params);
    return params;
  }

  /**
   * Generate invalid orders filter parameters for error testing
   */
  createInvalidOrdersFilterParams(
    type: 'invalidArrays' | 'wrongDateTypes' | 'invalidTokens' = 'invalidArrays'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidFilterParams(type);
  }

  /**
   * Generate valid reports filter parameters
   */
  createValidReportsFilterParams(
    overrides: Partial<ReportsFilterParams> = {}
  ): ReportsFilterParams {
    const params = this.defaultConfig.minimal
      ? { ...overrides }
      : TestDataBuilder.createReportsFilterParams(overrides);

    // Validate the generated parameters
    validateReportsFilterParams(params);
    return params;
  }

  /**
   * Generate invalid reports filter parameters for error testing
   */
  createInvalidReportsFilterParams(
    type: 'invalidArrays' | 'wrongDateTypes' | 'invalidTokens' = 'invalidArrays'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidFilterParams(type);
  }

  /**
   * Generate valid Amazon item attributes
   */
  createValidAmazonItemAttributes(
    overrides: Partial<AmazonItemAttributes> = {}
  ): AmazonItemAttributes {
    const attributes = this.defaultConfig.minimal
      ? { title: 'Test Product', ...overrides }
      : TestDataBuilder.createItemAttributes(overrides);

    // Validate using type guard
    if (!isAmazonItemAttributes(attributes)) {
      throw new Error('Generated Amazon item attributes failed type guard validation');
    }
    return attributes;
  }

  /**
   * Generate valid Amazon item identifiers
   */
  createValidAmazonItemIdentifiers(
    overrides: Partial<AmazonItemIdentifiers> = {}
  ): AmazonItemIdentifiers {
    const identifiers = this.defaultConfig.minimal
      ? {
          ATVPDKIKX0DER: [
            {
              identifier: 'B08TEST123',
              identifierType: 'ASIN',
            },
          ],
          ...overrides,
        }
      : TestDataBuilder.createItemIdentifiers(overrides);

    // Validate using type guard
    if (!isAmazonItemIdentifiers(identifiers)) {
      throw new Error('Generated Amazon item identifiers failed type guard validation');
    }
    return identifiers;
  }

  /**
   * Generate valid Amazon item relationships
   */
  createValidAmazonItemRelationships(
    overrides: Partial<AmazonItemRelationships> = {}
  ): AmazonItemRelationships {
    const relationships = this.defaultConfig.minimal
      ? {
          ATVPDKIKX0DER: [
            {
              type: 'VARIATION',
              identifiers: [
                {
                  identifier: 'B08PARENT123',
                  identifierType: 'ASIN',
                },
              ],
            },
          ],
          ...overrides,
        }
      : TestDataBuilder.createItemRelationships(overrides);

    // Validate using type guard
    if (!isAmazonItemRelationships(relationships)) {
      throw new Error('Generated Amazon item relationships failed type guard validation');
    }
    return relationships;
  }

  /**
   * Generate valid tool content response
   */
  createValidToolContentResponse(
    overrides: Partial<ToolContentResponse> = {}
  ): ToolContentResponse {
    const response = this.defaultConfig.minimal
      ? { type: 'text' as const, text: 'Test response', ...overrides }
      : TestDataBuilder.createToolContentResponse(overrides);

    // Validate using type guard
    if (!isToolContentResponse(response)) {
      throw new Error('Generated tool content response failed type guard validation');
    }
    return response;
  }

  /**
   * Generate valid order update details
   */
  createValidOrderUpdateDetails(overrides: Partial<OrderUpdateDetails> = {}): OrderUpdateDetails {
    const details = this.defaultConfig.minimal
      ? { trackingNumber: 'TRK123456789', ...overrides }
      : TestDataBuilder.createOrderUpdateDetails(overrides);

    // Validate using type guard
    if (!isOrderUpdateDetails(details)) {
      throw new Error('Generated order update details failed type guard validation');
    }
    return details;
  }

  /**
   * Generate valid error details
   */
  createValidErrorDetails(overrides: Partial<ErrorDetails> = {}): ErrorDetails {
    const details = this.defaultConfig.minimal
      ? { code: 'InvalidInput', ...overrides }
      : TestDataBuilder.createErrorDetails(overrides);

    // Validate using type guard
    if (!isErrorDetails(details)) {
      throw new Error('Generated error details failed type guard validation');
    }
    return details;
  }

  /**
   * Generate invalid error details for error testing
   */
  createInvalidErrorDetails(type: 'wrongTypes' | 'invalidHeaders' = 'wrongTypes'): unknown {
    return TestDataBuilder.createInvalidData().invalidErrorDetails(type);
  }

  /**
   * Generate valid log metadata
   */
  createValidLogMetadata(overrides: Partial<LogMetadata> = {}): LogMetadata {
    const metadata = this.defaultConfig.minimal
      ? { requestId: 'req-123456789', ...overrides }
      : TestDataBuilder.createLogMetadata(overrides);

    // Validate using type guard
    if (!isLogMetadata(metadata)) {
      throw new Error('Generated log metadata failed type guard validation');
    }
    return metadata;
  }

  /**
   * Generate invalid log metadata for error testing
   */
  createInvalidLogMetadata(type: 'wrongTypes' | 'invalidNumbers' = 'wrongTypes'): unknown {
    return TestDataBuilder.createInvalidData().invalidLogMetadata(type);
  }

  /**
   * Generate valid error recovery context
   */
  createValidErrorRecoveryContext(
    overrides: Partial<ErrorRecoveryContext> = {}
  ): ErrorRecoveryContext {
    const context = this.defaultConfig.minimal
      ? { operation: 'getCatalogItem', ...overrides }
      : TestDataBuilder.createErrorRecoveryContext(overrides);

    // Validate using type guard
    if (!isErrorRecoveryContext(context)) {
      throw new Error('Generated error recovery context failed type guard validation');
    }
    return context;
  }

  /**
   * Generate invalid error recovery context for error testing
   */
  createInvalidErrorRecoveryContext(type: 'wrongTypes' | 'invalidParams' = 'wrongTypes'): unknown {
    return TestDataBuilder.createInvalidData().invalidErrorRecoveryContext(type);
  }

  /**
   * Generate valid MCP request body
   */
  createValidMcpRequestBody(overrides: Partial<McpRequestBody> = {}): McpRequestBody {
    const request = this.defaultConfig.minimal
      ? { jsonrpc: '2.0' as const, method: 'tools/call', ...overrides }
      : TestDataBuilder.createMcpRequestBody(overrides);

    // Validate using type guard
    if (!isMcpRequestBody(request)) {
      throw new Error('Generated MCP request body failed type guard validation');
    }
    return request;
  }

  /**
   * Generate invalid MCP request body for error testing
   */
  createInvalidMcpRequestBody(
    type: 'wrongJsonRpc' | 'missingMethod' | 'invalidParams' = 'wrongJsonRpc'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidMcpRequestBody(type);
  }

  /**
   * Generate valid notification data
   */
  createValidNotificationData(overrides: Partial<NotificationData> = {}): NotificationData {
    const notification = this.defaultConfig.minimal
      ? {
          type: 'inventory.changed',
          timestamp: '2024-01-15T10:30:00Z',
          payload: { sku: 'TEST-SKU-123' },
          ...overrides,
        }
      : TestDataBuilder.createNotificationData(overrides);

    // Validate using type guard
    if (!isNotificationData(notification)) {
      throw new Error('Generated notification data failed type guard validation');
    }
    return notification;
  }

  /**
   * Generate invalid notification data for error testing
   */
  createInvalidNotificationData(
    type: 'missingRequired' | 'wrongTypes' | 'invalidPayload' = 'missingRequired'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidNotificationData(type);
  }

  /**
   * Generate valid HTTP request
   */
  createValidHttpRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
    const request = this.defaultConfig.minimal
      ? {
          method: 'GET',
          url: '/api/test',
          headers: { 'content-type': 'application/json' },
          ...overrides,
        }
      : TestDataBuilder.createHttpRequest(overrides);

    // Validate using type guard
    if (!isHttpRequest(request)) {
      throw new Error('Generated HTTP request failed type guard validation');
    }
    return request;
  }

  /**
   * Generate invalid HTTP request for error testing
   */
  createInvalidHttpRequest(
    type: 'missingRequired' | 'invalidHeaders' = 'missingRequired'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidHttpRequest(type);
  }

  /**
   * Generate valid HTTP response
   */
  createValidHttpResponse(overrides: Partial<HttpResponse> = {}): HttpResponse {
    const response = this.defaultConfig.minimal
      ? TestDataBuilder.createHttpResponse({ statusCode: 200, ...overrides })
      : TestDataBuilder.createHttpResponse(overrides);

    // Validate using type guard
    if (!isHttpResponse(response)) {
      throw new Error('Generated HTTP response failed type guard validation');
    }
    return response;
  }

  /**
   * Generate invalid HTTP response for error testing
   */
  createInvalidHttpResponse(
    type: 'missingStatusCode' | 'invalidOn' = 'missingStatusCode'
  ): unknown {
    return TestDataBuilder.createInvalidData().invalidHttpResponse(type);
  }

  /**
   * Generate valid tool input
   */
  createValidToolInput(overrides: Partial<ToolInput> = {}): ToolInput {
    const input = this.defaultConfig.minimal
      ? { asin: 'B08TEST123', ...overrides }
      : TestDataBuilder.createToolInput(overrides);

    // Validate using type guard
    if (!isToolInput(input)) {
      throw new Error('Generated tool input failed type guard validation');
    }
    return input;
  }

  /**
   * Validate any data using the appropriate validator
   */
  validateData<T>(data: unknown, type: string): T {
    switch (type) {
      case 'AmazonCatalogItem':
        return validateAmazonCatalogItem(data) as T;
      case 'AmazonListingsItem':
        return validateAmazonListingsItem(data) as T;
      case 'AmazonInventorySummary':
        return validateAmazonInventorySummary(data) as T;
      case 'AmazonOrder':
        return validateAmazonOrder(data) as T;
      case 'AmazonReport':
        return validateAmazonReport(data) as T;
      case 'InventoryFilterParams':
        return validateInventoryFilterParams(data) as T;
      case 'OrdersFilterParams':
        return validateOrdersFilterParams(data) as T;
      case 'ReportsFilterParams':
        return validateReportsFilterParams(data) as T;
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }
  }

  /**
   * Check if data matches type using the appropriate type guard
   */
  checkType(data: unknown, type: string): boolean {
    switch (type) {
      case 'AmazonCatalogItem':
        return isAmazonCatalogItem(data);
      case 'AmazonListingsItem':
        return isAmazonListingsItem(data);
      case 'AmazonInventorySummary':
        return isAmazonInventorySummary(data);
      case 'AmazonOrder':
        return isAmazonOrder(data);
      case 'AmazonReport':
        return isAmazonReport(data);
      case 'InventoryFilterParams':
        return isInventoryFilterParams(data);
      case 'OrdersFilterParams':
        return isOrdersFilterParams(data);
      case 'ReportsFilterParams':
        return isReportsFilterParams(data);
      case 'AmazonItemAttributes':
        return isAmazonItemAttributes(data);
      case 'AmazonItemIdentifiers':
        return isAmazonItemIdentifiers(data);
      case 'AmazonItemRelationships':
        return isAmazonItemRelationships(data);
      case 'ToolContentResponse':
        return isToolContentResponse(data);
      case 'OrderUpdateDetails':
        return isOrderUpdateDetails(data);
      case 'ErrorDetails':
        return isErrorDetails(data);
      case 'LogMetadata':
        return isLogMetadata(data);
      case 'ErrorRecoveryContext':
        return isErrorRecoveryContext(data);
      case 'McpRequestBody':
        return isMcpRequestBody(data);
      case 'NotificationData':
        return isNotificationData(data);
      case 'HttpRequest':
        return isHttpRequest(data);
      case 'HttpResponse':
        return isHttpResponse(data);
      case 'ToolInput':
        return isToolInput(data);
      default:
        throw new Error(`Unknown type guard: ${type}`);
    }
  }

  /**
   * Generate a batch of valid test data for multiple types
   */
  createValidDataBatch(types: string[], count: number = 1): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {};

    for (const type of types) {
      result[type] = [];
      for (let i = 0; i < count; i++) {
        switch (type) {
          case 'AmazonCatalogItem':
            result[type].push(this.createValidAmazonCatalogItem());
            break;
          case 'AmazonListingsItem':
            result[type].push(this.createValidAmazonListingsItem());
            break;
          case 'AmazonInventorySummary':
            result[type].push(this.createValidAmazonInventorySummary());
            break;
          case 'AmazonOrder':
            result[type].push(this.createValidAmazonOrder());
            break;
          case 'AmazonReport':
            result[type].push(this.createValidAmazonReport());
            break;
          case 'ErrorDetails':
            result[type].push(this.createValidErrorDetails());
            break;
          case 'LogMetadata':
            result[type].push(this.createValidLogMetadata());
            break;
          case 'NotificationData':
            result[type].push(this.createValidNotificationData());
            break;
          default:
            throw new Error(`Unsupported batch type: ${type}`);
        }
      }
    }

    return result;
  }

  /**
   * Generate a batch of invalid test data for error testing
   */
  createInvalidDataBatch(types: string[], count: number = 1): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {};

    for (const type of types) {
      result[type] = [];
      for (let i = 0; i < count; i++) {
        switch (type) {
          case 'AmazonCatalogItem':
            result[type].push(this.createInvalidAmazonCatalogItem());
            break;
          case 'AmazonListingsItem':
            result[type].push(this.createInvalidAmazonListingsItem());
            break;
          case 'AmazonInventorySummary':
            result[type].push(this.createInvalidAmazonInventorySummary());
            break;
          case 'AmazonOrder':
            result[type].push(this.createInvalidAmazonOrder());
            break;
          case 'AmazonReport':
            result[type].push(this.createInvalidAmazonReport());
            break;
          case 'ErrorDetails':
            result[type].push(this.createInvalidErrorDetails());
            break;
          case 'LogMetadata':
            result[type].push(this.createInvalidLogMetadata());
            break;
          case 'NotificationData':
            result[type].push(this.createInvalidNotificationData());
            break;
          default:
            throw new Error(`Unsupported batch type: ${type}`);
        }
      }
    }

    return result;
  }

  /**
   * Reset the factory to its initial state
   */
  reset(): void {
    super.reset();
  }

  /**
   * Create method required by base factory (not used in this implementation)
   */
  create(): unknown {
    return {};
  }
}

/**
 * Pre-configured type validation builders
 */
export const TypeValidationBuilders = {
  /**
   * Create a minimal type validation factory
   */
  minimal: () => new TypeValidationMockFactory({ minimal: true }),

  /**
   * Create a comprehensive type validation factory with edge cases
   */
  comprehensive: () => new TypeValidationMockFactory({ includeEdgeCases: true }),

  /**
   * Create a type validation factory with custom configuration
   */
  custom: (config: TypeValidationMockConfig) => new TypeValidationMockFactory(config),
};
