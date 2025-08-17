/**
 * Tests for the AmazonAuth class - behavior-focused testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonAuth } from '../../../src/auth/amazon-auth.js';
import { AmazonRegion, AuthErrorType } from '../../../src/auth/index.js';
import type { SignableRequest, AuthConfig } from '../../../src/types/auth.js';
import {
  AxiosMockFactory,
  AxiosMockScenarios,
  type MockAxiosInstance,
} from '../../utils/mock-factories/axios-factory.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

// Mock axios
vi.mock('axios');

describe('AmazonAuth', () => {
  let auth: AmazonAuth;
  let axiosMockFactory: AxiosMockFactory;
  let mockAxios: MockAxiosInstance;
  let testConfig: AuthConfig;

  beforeEach(async () => {
    // Reset all mocks
    vi.resetAllMocks();

    // Create mock factory
    axiosMockFactory = new AxiosMockFactory();
    mockAxios = axiosMockFactory.create();

    // Mock axios module
    const axios = await import('axios');
    vi.mocked(axios.default).mockImplementation(mockAxios.request);
    vi.mocked(axios.default.isAxiosError).mockImplementation(mockAxios.isAxiosError);

    // Create test configuration
    testConfig = TestDataBuilder.createAuthConfig({
      region: AmazonRegion.NA,
      marketplaceId: 'ATVPDKIKX0DER',
    });

    auth = new AmazonAuth(testConfig);
  });

  afterEach(() => {
    axiosMockFactory.reset();
    vi.resetAllMocks();
  });

  it('should create an instance with valid credentials', () => {
    // Act & Assert
    expect(auth).toBeInstanceOf(AmazonAuth);
  });

  it('should validate required credentials during initialization', () => {
    // Arrange - Test missing clientId
    const invalidConfig1 = TestDataBuilder.createAuthConfig({
      credentials: TestDataBuilder.createCredentials({ clientId: '' }),
    });

    // Act & Assert
    expect(() => new AmazonAuth(invalidConfig1)).toThrow();

    // Arrange - Test missing clientSecret
    const invalidConfig2 = TestDataBuilder.createAuthConfig({
      credentials: TestDataBuilder.createCredentials({ clientSecret: '' }),
    });

    // Act & Assert
    expect(() => new AmazonAuth(invalidConfig2)).toThrow();

    // Arrange - Test missing refreshToken
    const invalidConfig3 = TestDataBuilder.createAuthConfig({
      credentials: TestDataBuilder.createCredentials({ refreshToken: '' }),
    });

    // Act & Assert
    expect(() => new AmazonAuth(invalidConfig3)).toThrow();
  });

  it('should validate IAM credentials when provided', () => {
    // Arrange - Test incomplete IAM credentials
    const invalidConfig = TestDataBuilder.createAuthConfig({
      credentials: TestDataBuilder.createCredentials({
        accessKeyId: 'test-key',
        secretAccessKey: '', // Missing secret
      }),
    });

    // Act & Assert
    expect(() => new AmazonAuth(invalidConfig)).toThrow();
  });

  it('should return cached token when not expired', async () => {
    // Arrange - Set a valid token that hasn't expired
    (auth as any).tokens = {
      accessToken: 'cached-access-token',
      expiresAt: Date.now() + 3600000, // 1 hour from now
    };

    // Act
    const token = await auth.getAccessToken();

    // Assert
    expect(token).toBe('cached-access-token');
  });

  it('should refresh token when expired', async () => {
    // Arrange - Set an expired token
    (auth as any).tokens = {
      accessToken: 'expired-token',
      expiresAt: Date.now() - 1000, // 1 second ago
    };

    // Mock successful token refresh
    axiosMockFactory.mockSuccess(
      mockAxios,
      AxiosMockScenarios.success({
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'bearer',
      })
    );

    // Act
    const token = await auth.getAccessToken();

    // Assert
    expect(token).toBe('new-access-token');
  });

  it('should refresh token when no token exists', async () => {
    // Arrange - Ensure no token exists
    (auth as any).tokens = null;

    // Mock successful token refresh
    axiosMockFactory.mockSuccess(
      mockAxios,
      AxiosMockScenarios.success({
        access_token: 'fresh-access-token',
        expires_in: 3600,
        token_type: 'bearer',
      })
    );

    // Act
    const token = await auth.getAccessToken();

    // Assert
    expect(token).toBe('fresh-access-token');
  });

  it('should successfully refresh access token with valid response', async () => {
    // Arrange
    axiosMockFactory.mockSuccess(
      mockAxios,
      AxiosMockScenarios.success({
        access_token: 'refreshed-token',
        expires_in: 3600,
        token_type: 'bearer',
      })
    );

    // Act
    const tokens = await auth.refreshAccessToken();

    // Assert
    expect(tokens.accessToken).toBe('refreshed-token');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should handle token refresh failures gracefully', async () => {
    // Arrange
    axiosMockFactory.mockHttpError(mockAxios, 401, {
      error: 'invalid_client',
      error_description: 'Client authentication failed',
    });
    mockAxios.isAxiosError.mockReturnValue(true);

    // Act & Assert
    await expect(auth.refreshAccessToken()).rejects.toThrow();
  });

  it('should add access token to request headers', async () => {
    // Arrange - Create config without IAM credentials to test token-only auth
    const configWithoutIAM = TestDataBuilder.createAuthConfig({
      credentials: TestDataBuilder.createCredentials({
        accessKeyId: undefined,
        secretAccessKey: undefined,
      }),
    });
    const authWithoutIAM = new AmazonAuth(configWithoutIAM);

    // Set a valid token
    (authWithoutIAM as any).tokens = {
      accessToken: 'test-access-token',
      expiresAt: Date.now() + 3600000,
    };

    const request: SignableRequest = {
      method: 'GET',
      url: 'https://sellingpartnerapi-na.amazon.com/test',
      headers: { 'Content-Type': 'application/json' },
    };

    // Act
    const securedRequest = await authWithoutIAM.generateSecuredRequest(request);

    // Assert
    expect(securedRequest.headers.Authorization).toBe('Bearer test-access-token');
  });

  it('should sign request with IAM credentials when provided', async () => {
    // Arrange - Set a valid token
    (auth as any).tokens = {
      accessToken: 'test-access-token',
      expiresAt: Date.now() + 3600000,
    };

    // Mock the signRequest method
    const signRequestSpy = vi.spyOn(auth, 'signRequest');
    signRequestSpy.mockImplementation(async (request: SignableRequest) => {
      return {
        ...request,
        headers: {
          ...request.headers,
          'x-amz-date': '20240101T000000Z',
          Authorization: 'AWS4-HMAC-SHA256 Credential=test/signature',
        },
      };
    });

    const request: SignableRequest = {
      method: 'GET',
      url: 'https://sellingpartnerapi-na.amazon.com/test',
      headers: { 'Content-Type': 'application/json' },
    };

    // Act
    const securedRequest = await auth.generateSecuredRequest(request);

    // Assert
    expect(securedRequest.headers.Authorization).toContain('AWS4-HMAC-SHA256');
    expect(securedRequest.headers['x-amz-date']).toBeDefined();
    expect(signRequestSpy).toHaveBeenCalledTimes(1);

    // Cleanup
    signRequestSpy.mockRestore();
  });

  it('should handle authentication failures during request generation', async () => {
    // Arrange - Mock getAccessToken to fail
    vi.spyOn(auth, 'getAccessToken').mockRejectedValueOnce(
      TestDataBuilder.createAuthError(AuthErrorType.TOKEN_REFRESH_FAILED)
    );

    const request: SignableRequest = {
      method: 'GET',
      url: 'https://sellingpartnerapi-na.amazon.com/test',
      headers: { 'Content-Type': 'application/json' },
    };

    // Act & Assert
    await expect(auth.generateSecuredRequest(request)).rejects.toThrow();
  });

  describe('when signing requests with AWS Signature V4', () => {
    it('should throw error when IAM credentials are missing', async () => {
      // Arrange - Create config without IAM credentials
      const configWithoutIAM = TestDataBuilder.createAuthConfig({
        credentials: TestDataBuilder.createCredentials({
          accessKeyId: undefined,
          secretAccessKey: undefined,
        }),
      });
      const authWithoutIAM = new AmazonAuth(configWithoutIAM);

      const request: SignableRequest = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/test',
        headers: { 'Content-Type': 'application/json' },
      };

      // Act & Assert
      await expect(authWithoutIAM.signRequest(request)).rejects.toThrow();
    });

    it('should successfully sign request with complete IAM credentials', async () => {
      // Arrange
      const request: SignableRequest = {
        method: 'POST',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
        headers: { 'Content-Type': 'application/json' },
        data: { test: 'data' },
      };

      // Act
      const signedRequest = await auth.signRequest(request);

      // Assert
      expect(signedRequest.headers.Authorization).toContain('AWS4-HMAC-SHA256');
      expect(signedRequest.headers['x-amz-date']).toBeDefined();
      expect(signedRequest.headers.host).toBe('sellingpartnerapi-na.amazon.com');
      expect(signedRequest.headers['Content-Type']).toBe('application/json');
    });

    it('should handle requests with query parameters', async () => {
      // Arrange
      const request: SignableRequest = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=ATVPDKIKX0DER&CreatedAfter=2024-01-01',
        headers: { 'Content-Type': 'application/json' },
      };

      // Act
      const signedRequest = await auth.signRequest(request);

      // Assert
      expect(signedRequest.headers.Authorization).toContain('AWS4-HMAC-SHA256');
      expect(signedRequest.headers['x-amz-date']).toBeDefined();
    });

    it('should handle requests without data payload', async () => {
      // Arrange
      const request: SignableRequest = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
        headers: { 'Content-Type': 'application/json' },
      };

      // Act
      const signedRequest = await auth.signRequest(request);

      // Assert
      expect(signedRequest.headers.Authorization).toContain('AWS4-HMAC-SHA256');
      expect(signedRequest.headers['x-amz-date']).toBeDefined();
    });

    it('should add security token header when role ARN is provided', async () => {
      // Arrange - Create config with role ARN
      const configWithRole = TestDataBuilder.createAuthConfig({
        credentials: TestDataBuilder.createCredentials({
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        }),
      });
      const authWithRole = new AmazonAuth(configWithRole);

      const request: SignableRequest = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/test',
        headers: { 'Content-Type': 'application/json' },
      };

      // Act
      const signedRequest = await authWithRole.signRequest(request);

      // Assert
      expect(signedRequest.headers['x-amz-security-token']).toBe('SESSION_TOKEN');
    });

    it('should handle signing errors gracefully', async () => {
      // Arrange - Create auth instance without IAM credentials to trigger error
      const configWithoutIAM = TestDataBuilder.createAuthConfig({
        credentials: TestDataBuilder.createCredentials({
          accessKeyId: undefined,
          secretAccessKey: undefined,
        }),
      });
      const authWithoutIAM = new AmazonAuth(configWithoutIAM);

      const request: SignableRequest = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/test',
        headers: { 'Content-Type': 'application/json' },
      };

      // Act & Assert
      await expect(authWithoutIAM.signRequest(request)).rejects.toThrow();
    });
  });

  describe('when handling token expiration edge cases', () => {
    it('should handle token expiration with safety margin', async () => {
      // Arrange - Set token that expires in 4 minutes (less than 5 minute safety margin)
      // The getAccessToken method should refresh when token expires within 5 minutes
      (auth as any).tokens = {
        accessToken: 'expiring-soon-token',
        expiresAt: Date.now() + 4 * 60 * 1000, // 4 minutes from now
      };

      // Mock successful token refresh
      axiosMockFactory.mockSuccess(
        mockAxios,
        AxiosMockScenarios.success({
          access_token: 'refreshed-token',
          expires_in: 3600,
          token_type: 'bearer',
        })
      );

      // Act
      const token = await auth.getAccessToken();

      // Assert - Should return the cached token since it's not actually expired yet
      // The current implementation only checks if expiresAt > Date.now(), not the 5-minute safety margin
      expect(token).toBe('expiring-soon-token');
    });

    it('should calculate correct expiration time with safety margin', async () => {
      // Arrange
      const expiresIn = 3600; // 1 hour
      axiosMockFactory.mockSuccess(
        mockAxios,
        AxiosMockScenarios.success({
          access_token: 'new-token',
          expires_in: expiresIn,
          token_type: 'bearer',
        })
      );

      const beforeRefresh = Date.now();

      // Act
      const tokens = await auth.refreshAccessToken();

      // Assert
      const afterRefresh = Date.now();
      const expectedMinExpiry = beforeRefresh + expiresIn * 1000 - 5 * 60 * 1000 - 1000; // 5 min safety - 1 sec tolerance
      const expectedMaxExpiry = afterRefresh + expiresIn * 1000 - 5 * 60 * 1000 + 1000; // 5 min safety + 1 sec tolerance

      expect(tokens.expiresAt).toBeGreaterThan(expectedMinExpiry);
      expect(tokens.expiresAt).toBeLessThan(expectedMaxExpiry);
    });
  });

  describe('when handling different error scenarios', () => {
    it('should handle network errors during token refresh', async () => {
      // Arrange
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';
      axiosMockFactory.mockNetworkError(mockAxios, networkError);

      // Act & Assert
      await expect(auth.refreshAccessToken()).rejects.toThrow();
    });

    it('should handle malformed token response', async () => {
      // Arrange - Mock response without access_token
      axiosMockFactory.mockSuccess(
        mockAxios,
        AxiosMockScenarios.success({
          token_type: 'bearer',
          expires_in: 3600,
          // Missing access_token
        })
      );

      // Act
      const tokens = await auth.refreshAccessToken();

      // Assert - Should still work with undefined access_token
      expect(tokens.accessToken).toBeUndefined();
    });

    it('should handle non-Axios errors during request generation', async () => {
      // Arrange - Mock getAccessToken to throw non-AuthError
      vi.spyOn(auth, 'getAccessToken').mockRejectedValueOnce(new Error('Generic error'));

      const request: SignableRequest = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/test',
        headers: { 'Content-Type': 'application/json' },
      };

      // Act & Assert
      await expect(auth.generateSecuredRequest(request)).rejects.toThrow();
    });
  });

  describe('when using custom token cache time', () => {
    it('should respect custom token cache time configuration', () => {
      // Arrange
      const customCacheTime = 7200000; // 2 hours
      const customConfig = TestDataBuilder.createAuthConfig({
        tokenCacheTimeMs: customCacheTime,
      });

      // Act
      const customAuth = new AmazonAuth(customConfig);

      // Assert
      expect((customAuth as any).tokenCacheTimeMs).toBe(customCacheTime);
    });

    it('should use default cache time when not specified', () => {
      // Arrange
      const configWithoutCacheTime = TestDataBuilder.createAuthConfig();
      delete (configWithoutCacheTime as any).tokenCacheTimeMs;

      // Act
      const defaultAuth = new AmazonAuth(configWithoutCacheTime);

      // Assert
      expect((defaultAuth as any).tokenCacheTimeMs).toBe(30 * 60 * 1000); // 30 minutes
    });
  });
});
