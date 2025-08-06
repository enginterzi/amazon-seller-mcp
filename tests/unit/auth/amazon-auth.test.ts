/**
 * Tests for the AmazonAuth class - behavior-focused testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonAuth } from '../../../src/auth/amazon-auth.js';
import { AmazonRegion, AuthErrorType } from '../../../src/auth/index.js';
import type { SignableRequest } from '../../../src/types/auth.js';
import { AxiosMockFactory, AxiosMockScenarios } from '../../utils/mock-factories/axios-factory.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

// Mock axios
vi.mock('axios');

describe('AmazonAuth', () => {
  let auth: AmazonAuth;
  let axiosMockFactory: AxiosMockFactory;
  let mockAxios: any;
  let testConfig: any;

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
    axiosMockFactory.mockSuccess(mockAxios, AxiosMockScenarios.success({
      access_token: 'new-access-token',
      expires_in: 3600,
      token_type: 'bearer',
    }));

    // Act
    const token = await auth.getAccessToken();

    // Assert
    expect(token).toBe('new-access-token');
  });

  it('should refresh token when no token exists', async () => {
    // Arrange - Ensure no token exists
    (auth as any).tokens = null;

    // Mock successful token refresh
    axiosMockFactory.mockSuccess(mockAxios, AxiosMockScenarios.success({
      access_token: 'fresh-access-token',
      expires_in: 3600,
      token_type: 'bearer',
    }));

    // Act
    const token = await auth.getAccessToken();

    // Assert
    expect(token).toBe('fresh-access-token');
  });

  it('should successfully refresh access token with valid response', async () => {
    // Arrange
    axiosMockFactory.mockSuccess(mockAxios, AxiosMockScenarios.success({
      access_token: 'refreshed-token',
      expires_in: 3600,
      token_type: 'bearer',
    }));

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
});
