/**
 * Amazon Selling Partner API Authentication Module
 */

import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { URL } from 'url';
import {
  AmazonCredentials,
  AmazonRegion,
  AuthConfig,
  AuthError,
  AuthErrorType,
  AuthTokens,
  REGION_ENDPOINTS,
  SignableRequest,
} from '../types/auth.js';

/**
 * Default token cache time (30 minutes)
 */
const DEFAULT_TOKEN_CACHE_TIME_MS = 30 * 60 * 1000;

/**
 * Amazon Selling Partner API Authentication
 *
 * Handles OAuth 2.0 authentication flow, token management, and AWS Signature V4 signing
 */
export class AmazonAuth {
  private credentials: AmazonCredentials;
  private region: AmazonRegion;
  private marketplaceId: string;
  private tokenCacheTimeMs: number;
  private tokens: AuthTokens | null = null;

  /**
   * Create a new AmazonAuth instance
   *
   * @param config Authentication configuration
   */
  constructor(config: AuthConfig) {
    this.credentials = config.credentials;
    this.region = config.region;
    this.marketplaceId = config.marketplaceId;
    this.tokenCacheTimeMs = config.tokenCacheTimeMs || DEFAULT_TOKEN_CACHE_TIME_MS;

    // Validate required credentials
    this.validateCredentials();
  }

  /**
   * Validate that all required credentials are provided
   */
  private validateCredentials(): void {
    const { clientId, clientSecret, refreshToken } = this.credentials;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new AuthError(
        'Missing required credentials: clientId, clientSecret, and refreshToken are required',
        AuthErrorType.INVALID_CREDENTIALS
      );
    }

    // If IAM credentials are provided, validate them
    if (this.credentials.accessKeyId || this.credentials.secretAccessKey) {
      if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
        throw new AuthError(
          'Both accessKeyId and secretAccessKey must be provided if using IAM authentication',
          AuthErrorType.INVALID_CREDENTIALS
        );
      }
    }
  }

  /**
   * Get the current access token, refreshing if necessary
   *
   * @returns Promise resolving to the access token
   */
  public async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.tokens && this.tokens.expiresAt > Date.now()) {
      return this.tokens.accessToken;
    }

    // Otherwise, refresh the token
    const tokens = await this.refreshAccessToken();
    return tokens.accessToken;
  }

  /**
   * Refresh the access token using the refresh token
   *
   * @returns Promise resolving to the new auth tokens
   */
  public async refreshAccessToken(): Promise<AuthTokens> {
    try {
      const response = await axios({
        method: 'post',
        url: 'https://api.amazon.com/auth/o2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }).toString(),
      });

      // Calculate token expiration time (subtract 5 minutes for safety margin)
      const expiresAt = Date.now() + response.data.expires_in * 1000 - 5 * 60 * 1000;

      // Store the new tokens
      this.tokens = {
        accessToken: response.data.access_token,
        expiresAt,
      };

      return this.tokens;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      throw new AuthError(
        `Failed to refresh access token: ${errorMessage}`,
        AuthErrorType.TOKEN_REFRESH_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sign a request with AWS Signature V4
   *
   * @param request Request to sign
   * @returns Promise resolving to the signed request
   */
  public async signRequest(request: SignableRequest): Promise<SignableRequest> {
    // Ensure we have IAM credentials
    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      throw new AuthError(
        'AWS IAM credentials (accessKeyId and secretAccessKey) are required for request signing',
        AuthErrorType.REQUEST_SIGNING_FAILED
      );
    }

    try {
      // Get the current region endpoint
      const regionEndpoint = REGION_ENDPOINTS[this.region];

      // Parse the URL
      const url = new URL(request.url);
      const host = url.hostname;
      const path = url.pathname + url.search;

      // Get the current date and time
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.substring(0, 8);

      // Create canonical request
      const method = request.method.toUpperCase();
      const canonicalUri = path;
      const canonicalQueryString = url.search.substring(1); // Remove leading '?'

      // Add required headers
      const headers: Record<string, string> = {
        ...request.headers,
        host,
        'x-amz-date': amzDate,
      };

      // If we have a role ARN, add the security token header
      if (this.credentials.roleArn) {
        // Note: In a real implementation, we would need to assume the role and get a session token
        // For simplicity, we're just showing where the token would be added
        headers['x-amz-security-token'] = 'SESSION_TOKEN';
      }

      // Create canonical headers
      const canonicalHeaders =
        Object.keys(headers)
          .sort()
          .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
          .join('\n') + '\n';

      const signedHeaders = Object.keys(headers)
        .sort()
        .map((key) => key.toLowerCase())
        .join(';');

      // Create payload hash
      const payload = request.data ? JSON.stringify(request.data) : '';
      const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

      // Create canonical request
      const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join('\n');

      // Create string to sign
      const algorithm = 'AWS4-HMAC-SHA256';
      const scope = `${dateStamp}/${regionEndpoint.region}/execute-api/aws4_request`;
      const stringToSign = [
        algorithm,
        amzDate,
        scope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n');

      // Calculate signature
      const signingKey = this.getSignatureKey(
        this.credentials.secretAccessKey,
        dateStamp,
        regionEndpoint.region,
        'execute-api'
      );

      const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

      // Create authorization header
      const authorizationHeader = [
        `${algorithm} Credential=${this.credentials.accessKeyId}/${scope}`,
        `SignedHeaders=${signedHeaders}`,
        `Signature=${signature}`,
      ].join(', ');

      // Add authorization header to request
      headers.Authorization = authorizationHeader;

      // Add content-type if not present and we have a payload
      if (payload && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Return signed request
      return {
        ...request,
        headers,
      };
    } catch (error) {
      throw new AuthError(
        `Failed to sign request: ${error instanceof Error ? error.message : String(error)}`,
        AuthErrorType.REQUEST_SIGNING_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate a signed request for the Amazon Selling Partner API
   *
   * @param request Request to sign
   * @returns Promise resolving to the signed request with access token
   */
  public async generateSecuredRequest(request: SignableRequest): Promise<SignableRequest> {
    try {
      // Get access token
      const accessToken = await this.getAccessToken();

      // Add access token to headers
      const requestWithToken = {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      };

      // Sign the request if we have IAM credentials
      if (this.credentials.accessKeyId && this.credentials.secretAccessKey) {
        return this.signRequest(requestWithToken);
      }

      return requestWithToken;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        `Failed to generate secured request: ${error instanceof Error ? error.message : String(error)}`,
        AuthErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get AWS Signature V4 signing key
   *
   * @param key Secret access key
   * @param dateStamp Date in YYYYMMDD format
   * @param regionName AWS region name
   * @param serviceName AWS service name
   * @returns Signing key
   */
  private getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();

    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();

    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();

    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

    return kSigning;
  }
}
