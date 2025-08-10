/**
 * Type definitions for authentication-related functionality
 */

/**
 * Amazon Selling Partner API regions
 */
export enum AmazonRegion {
  NA = 'NA', // North America
  EU = 'EU', // Europe
  FE = 'FE', // Far East
}

/**
 * Region endpoint configuration
 */
export interface RegionEndpoint {
  endpoint: string;
  region: string;
}

/**
 * Map of region codes to endpoint configurations
 */
export const REGION_ENDPOINTS: Record<AmazonRegion, RegionEndpoint> = {
  [AmazonRegion.NA]: {
    endpoint: 'https://sellingpartnerapi-na.amazon.com',
    region: 'us-east-1',
  },
  [AmazonRegion.EU]: {
    endpoint: 'https://sellingpartnerapi-eu.amazon.com',
    region: 'eu-west-1',
  },
  [AmazonRegion.FE]: {
    endpoint: 'https://sellingpartnerapi-fe.amazon.com',
    region: 'us-west-2',
  },
};

/**
 * Amazon Selling Partner API credentials
 */
export interface AmazonCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  credentials: AmazonCredentials;
  region: AmazonRegion;
  marketplaceId: string;
  tokenCacheTimeMs?: number;
}

/**
 * Request to be signed with AWS Signature V4
 */
export interface SignableRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: unknown;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  REQUEST_SIGNING_FAILED = 'REQUEST_SIGNING_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  type: AuthErrorType;
  cause?: Error;

  constructor(message: string, type: AuthErrorType, cause?: Error) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.cause = cause;
  }
}
