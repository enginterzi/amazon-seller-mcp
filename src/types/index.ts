/**
 * Type definitions for the Amazon Seller MCP Client
 *
 * This module exports only TypeScript types and interfaces.
 * Runtime values (enums, classes, constants) are exported from their respective modules.
 */

// Export auth types (type-only exports)
export type {
  AmazonCredentials,
  AuthTokens,
  AuthConfig,
  SignableRequest,
  RegionEndpoint,
  AmazonRegion,
  AuthErrorType,
} from './auth.js';

// Export API types (type-only exports)
export type {
  ApiClientConfig,
  RateLimitConfig,
  ApiRequestOptions,
  ApiResponse,
  RetryStrategy,
  ApiErrorType,
} from './api.js';

// Export common types (type-only exports)
export type {
  ErrorDetails,
  LogMetadata,
  ErrorRecoveryContext,
  ToolInput,
  McpRequestBody,
  NotificationData,
  HttpRequest,
  HttpResponse,
} from './common.js';

// Export common constants and utilities
export { COMMON_CONSTANTS, CommonUtils } from './common.js';

// Export Amazon API types (type-only exports)
export type {
  AmazonItemAttributes,
  AmazonItemIdentifiers,
  AmazonItemRelationships,
  AmazonCatalogItem,
  AmazonListingsItem,
  AmazonInventorySummary,
  AmazonOrder,
  AmazonReport,
  InventoryFilterParams,
  OrdersFilterParams,
  ReportsFilterParams,
  ToolContentResponse,
  OrderUpdateDetails,
} from './amazon-api.js';

// Export Amazon API constants and utilities
export { AMAZON_API_CONSTANTS, AmazonApiUtils } from './amazon-api.js';

// Export validation functions and error classes
export {
  TypeValidationError,
  validateAmazonCatalogItem,
  validateAmazonListingsItem,
  validateAmazonInventorySummary,
  validateAmazonOrder,
  validateAmazonReport,
  validateInventoryFilterParams,
  validateOrdersFilterParams,
  validateReportsFilterParams,
} from './validators.js';

// Export type guard functions
export {
  isAmazonItemAttributes,
  isAmazonItemIdentifiers,
  isAmazonItemRelationships,
  isAmazonCatalogItem,
  isAmazonListingsItem,
  isAmazonInventorySummary,
  isAmazonOrder,
  isAmazonReport,
  isInventoryFilterParams,
  isOrdersFilterParams,
  isReportsFilterParams,
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
} from './guards.js';
