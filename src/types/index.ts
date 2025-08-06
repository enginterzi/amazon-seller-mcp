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
