/**
 * Tests for authentication mock factory
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AmazonAuthMockFactory,
  CredentialManagerMockFactory,
  AuthMockScenarios,
  type MockAmazonAuth,
  type MockCredentialManager,
  type TokenScenario,
  type AuthErrorScenario,
} from './auth-factory.js';
import type { SignableRequest } from '../../../src/types/auth.js';

describe('AmazonAuthMockFactory', () => {
  let factory: AmazonAuthMockFactory;
  let mockAuth: MockAmazonAuth;

  beforeEach(() => {
    factory = new AmazonAuthMockFactory();
    mockAuth = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock Amazon Auth with all required methods', () => {
      expect(mockAuth.getAccessToken).toBeDefined();
      expect(mockAuth.refreshAccessToken).toBeDefined();
      expect(mockAuth.signRequest).toBeDefined();
      expect(mockAuth.generateSecuredRequest).toBeDefined();
      expect(typeof mockAuth.getAccessToken).toBe('function');
      expect(typeof mockAuth.refreshAccessToken).toBe('function');
      expect(typeof mockAuth.signRequest).toBe('function');
      expect(typeof mockAuth.generateSecuredRequest).toBe('function');
    });

    it('should setup default behaviors', async () => {
      const token = await mockAuth.getAccessToken();
      expect(token).toBe('Atza|mock-access-token-12345');

      const tokens = await mockAuth.refreshAccessToken();
      expect(tokens.accessToken).toBe('Atza|mock-access-token-12345');
      expect(tokens.tokenType).toBe('bearer');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());

      const request: SignableRequest = {
        method: 'GET',
        url: 'https://example.com/test',
        headers: {},
      };

      const signedRequest = await mockAuth.signRequest(request);
      expect(signedRequest.headers['Authorization']).toContain('AWS4-HMAC-SHA256');
      expect(signedRequest.headers['X-Amz-Date']).toBeDefined();

      const securedRequest = await mockAuth.generateSecuredRequest(request);
      expect(securedRequest.headers['Authorization']).toBe('Bearer Atza|mock-access-token-12345');
      expect(securedRequest.headers['X-Amz-Access-Token']).toBe('Atza|mock-access-token-12345');
    });

    it('should allow custom default configuration', async () => {
      const customFactory = new AmazonAuthMockFactory({
        defaultAccessToken: 'custom-token',
        defaultTokenExpirationMs: 7200000, // 2 hours
      });
      const customAuth = customFactory.create();

      const token = await customAuth.getAccessToken();
      expect(token).toBe('custom-token');

      const tokens = await customAuth.refreshAccessToken();
      expect(tokens.accessToken).toBe('custom-token');
    });

    it('should allow disabling default setup', () => {
      const customFactory = new AmazonAuthMockFactory({
        setupDefaults: false,
      });
      const customAuth = customFactory.create();

      // Methods should exist but not have default implementations
      expect(customAuth.getAccessToken).toBeDefined();
      expect(customAuth.getAccessToken.getMockImplementation()).toBeUndefined();
    });
  });

  describe('mockGetAccessToken', () => {
    it('should configure successful token retrieval', async () => {
      factory.mockGetAccessToken(mockAuth, 'test-access-token');

      const token = await mockAuth.getAccessToken();
      expect(token).toBe('test-access-token');
    });

    it('should configure one-time token retrieval', async () => {
      factory.mockGetAccessToken(mockAuth, 'first-token', { once: true });
      factory.mockGetAccessToken(mockAuth, 'second-token');

      const token1 = await mockAuth.getAccessToken();
      const token2 = await mockAuth.getAccessToken();

      expect(token1).toBe('first-token');
      expect(token2).toBe('second-token');
    });
  });

  describe('mockRefreshAccessToken', () => {
    it('should configure successful token refresh', async () => {
      const scenario: TokenScenario = {
        accessToken: 'refreshed-token',
        tokenType: 'bearer',
        expiresIn: 7200,
        refreshToken: 'new-refresh-token',
      };

      factory.mockRefreshAccessToken(mockAuth, scenario);

      const tokens = await mockAuth.refreshAccessToken();
      expect(tokens.accessToken).toBe('refreshed-token');
      expect(tokens.tokenType).toBe('bearer');
      expect(tokens.refreshToken).toBe('new-refresh-token');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should configure one-time token refresh', async () => {
      const scenario1: TokenScenario = { accessToken: 'first-refresh' };
      const scenario2: TokenScenario = { accessToken: 'second-refresh' };

      factory.mockRefreshAccessToken(mockAuth, scenario1, { once: true });
      factory.mockRefreshAccessToken(mockAuth, scenario2);

      const tokens1 = await mockAuth.refreshAccessToken();
      const tokens2 = await mockAuth.refreshAccessToken();

      expect(tokens1.accessToken).toBe('first-refresh');
      expect(tokens2.accessToken).toBe('second-refresh');
    });
  });

  describe('mockSignRequest', () => {
    it('should configure successful request signing', async () => {
      factory.mockSignRequest(mockAuth);

      const request: SignableRequest = {
        method: 'POST',
        url: 'https://api.example.com/test',
        headers: { 'Content-Type': 'application/json' },
      };

      const signedRequest = await mockAuth.signRequest(request);
      expect(signedRequest.method).toBe('POST');
      expect(signedRequest.url).toBe('https://api.example.com/test');
      expect(signedRequest.headers['Content-Type']).toBe('application/json');
      expect(signedRequest.headers['Authorization']).toContain('AWS4-HMAC-SHA256');
      expect(signedRequest.headers['X-Amz-Date']).toBeDefined();
    });

    it('should configure request signing with additional headers', async () => {
      factory.mockSignRequest(mockAuth, {
        addHeaders: { 'X-Custom-Header': 'custom-value' },
      });

      const request: SignableRequest = {
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
      };

      const signedRequest = await mockAuth.signRequest(request);
      expect(signedRequest.headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('mockGenerateSecuredRequest', () => {
    it('should configure successful secured request generation', async () => {
      factory.mockGenerateSecuredRequest(mockAuth, {
        accessToken: 'custom-access-token',
      });

      const request: SignableRequest = {
        method: 'PUT',
        url: 'https://api.example.com/resource',
        headers: {},
      };

      const securedRequest = await mockAuth.generateSecuredRequest(request);
      expect(securedRequest.headers['Authorization']).toBe('Bearer custom-access-token');
      expect(securedRequest.headers['X-Amz-Access-Token']).toBe('custom-access-token');
    });

    it('should configure secured request with additional headers', async () => {
      factory.mockGenerateSecuredRequest(mockAuth, {
        addHeaders: { 'X-Request-ID': 'req-123' },
      });

      const request: SignableRequest = {
        method: 'DELETE',
        url: 'https://api.example.com/resource/123',
        headers: {},
      };

      const securedRequest = await mockAuth.generateSecuredRequest(request);
      expect(securedRequest.headers['X-Request-ID']).toBe('req-123');
    });
  });

  describe('mockAuthError', () => {
    it('should configure authentication error', async () => {
      const scenario: AuthErrorScenario = {
        message: 'Invalid credentials',
        type: 'INVALID_CREDENTIALS',
        statusCode: 401,
        details: { code: 'INVALID_CLIENT' },
      };

      factory.mockAuthError(mockAuth, 'getAccessToken', scenario);

      try {
        await mockAuth.getAccessToken();
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const authError = error as {
          message: string;
          type: string;
          statusCode: number;
          details: Record<string, unknown>;
        };
        expect(authError.message).toBe('Invalid credentials');
        expect(authError.type).toBe('INVALID_CREDENTIALS');
        expect(authError.statusCode).toBe(401);
        expect(authError.details).toEqual({ code: 'INVALID_CLIENT' });
      }
    });

    it('should configure one-time authentication error', async () => {
      const scenario: AuthErrorScenario = {
        message: 'Temporary failure',
        type: 'TEMPORARY_ERROR',
      };

      factory.mockAuthError(mockAuth, 'refreshAccessToken', scenario, { once: true });
      factory.mockRefreshAccessToken(mockAuth, { accessToken: 'recovered-token' });

      await expect(mockAuth.refreshAccessToken()).rejects.toThrow('Temporary failure');

      const tokens = await mockAuth.refreshAccessToken();
      expect(tokens.accessToken).toBe('recovered-token');
    });
  });

  describe('mockTokenExpiration', () => {
    it('should configure token expiration scenario', async () => {
      factory.mockTokenExpiration(mockAuth, {
        expiredToken: 'expired-token-123',
        newToken: 'fresh-token-456',
      });

      // First call returns expired token
      const expiredToken = await mockAuth.getAccessToken();
      expect(expiredToken).toBe('expired-token-123');

      // Refresh returns new token
      const tokens = await mockAuth.refreshAccessToken();
      expect(tokens.accessToken).toBe('fresh-token-456');

      // Subsequent calls return new token
      const freshToken = await mockAuth.getAccessToken();
      expect(freshToken).toBe('fresh-token-456');
    });

    it('should configure token expiration with refresh delay', async () => {
      factory.mockTokenExpiration(mockAuth, {
        refreshDelay: 100,
        newToken: 'delayed-token',
      });

      const startTime = Date.now();
      const tokens = await mockAuth.refreshAccessToken();
      const endTime = Date.now();

      expect(tokens.accessToken).toBe('delayed-token');
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('mockAuthSequence', () => {
    it('should configure sequence of token responses', async () => {
      const sequence = [
        'first-token',
        'second-token',
        new Error('Third call fails'),
        'fourth-token',
      ];

      factory.mockAuthSequence(mockAuth, 'getAccessToken', sequence);

      expect(await mockAuth.getAccessToken()).toBe('first-token');
      expect(await mockAuth.getAccessToken()).toBe('second-token');
      await expect(mockAuth.getAccessToken()).rejects.toThrow('Third call fails');
      expect(await mockAuth.getAccessToken()).toBe('fourth-token');
    });

    it('should configure sequence of refresh responses', async () => {
      const sequence: TokenScenario[] = [
        { accessToken: 'refresh-1', expiresIn: 3600 },
        { accessToken: 'refresh-2', expiresIn: 7200 },
      ];

      factory.mockAuthSequence(mockAuth, 'refreshAccessToken', sequence);

      const tokens1 = await mockAuth.refreshAccessToken();
      const tokens2 = await mockAuth.refreshAccessToken();

      expect(tokens1.accessToken).toBe('refresh-1');
      expect(tokens2.accessToken).toBe('refresh-2');
    });
  });

  describe('resetAuth', () => {
    it('should reset all mocks in an auth instance', () => {
      factory.mockGetAccessToken(mockAuth, 'test-token');

      expect(() => factory.resetAuth(mockAuth)).not.toThrow();
    });
  });

  describe('mockInvalidClientError', () => {
    it('should configure invalid_client error for all auth methods', async () => {
      factory.mockInvalidClientError(mockAuth);

      // Test getAccessToken
      await expect(mockAuth.getAccessToken()).rejects.toThrow(
        'Request failed with status code 401'
      );

      // Test refreshAccessToken
      await expect(mockAuth.refreshAccessToken()).rejects.toThrow(
        'Request failed with status code 401'
      );

      // Test signRequest
      const request = { method: 'GET', url: 'https://example.com', headers: {} };
      await expect(mockAuth.signRequest(request)).rejects.toThrow(
        'Request failed with status code 401'
      );

      // Test generateSecuredRequest
      await expect(mockAuth.generateSecuredRequest(request)).rejects.toThrow(
        'Request failed with status code 401'
      );
    });

    it('should include proper error details for invalid_client', async () => {
      factory.mockInvalidClientError(mockAuth);

      try {
        await mockAuth.getAccessToken();
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const httpError = error as {
          response: {
            status: number;
            data: { error: string; error_description: string };
          };
          code: string;
        };
        expect(httpError.response.status).toBe(401);
        expect(httpError.response.data.error).toBe('invalid_client');
        expect(httpError.response.data.error_description).toBe('Client authentication failed');
        expect(httpError.code).toBe('ERR_BAD_REQUEST');
      }
    });
  });

  describe('mockAuthRecovery', () => {
    it('should simulate authentication recovery after failures', async () => {
      factory.mockAuthRecovery(mockAuth, { failureCount: 2, recoveryToken: 'recovery-token' });

      // First two calls should fail
      await expect(mockAuth.getAccessToken()).rejects.toThrow(
        'Request failed with status code 401'
      );
      await expect(mockAuth.getAccessToken()).rejects.toThrow(
        'Request failed with status code 401'
      );

      // Third call should succeed
      const token = await mockAuth.getAccessToken();
      expect(token).toBe('recovery-token');
    });

    it('should use default values when no options provided', async () => {
      factory.mockAuthRecovery(mockAuth);

      // First call should fail
      await expect(mockAuth.getAccessToken()).rejects.toThrow(
        'Request failed with status code 401'
      );

      // Second call should succeed with default token
      const token = await mockAuth.getAccessToken();
      expect(token).toBe('recovered-access-token');
    });
  });
});

describe('CredentialManagerMockFactory', () => {
  let factory: CredentialManagerMockFactory;
  let mockManager: MockCredentialManager;

  beforeEach(() => {
    factory = new CredentialManagerMockFactory();
    mockManager = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock credential manager with all methods', () => {
      expect(mockManager.loadCredentials).toBeDefined();
      expect(mockManager.saveCredentials).toBeDefined();
      expect(mockManager.validateCredentials).toBeDefined();
      expect(mockManager.getMarketplaceConfig).toBeDefined();
    });

    it('should setup default behaviors', async () => {
      const credentials = await mockManager.loadCredentials();
      expect(credentials.clientId).toBe('mock-client-id');
      expect(credentials.clientSecret).toBe('mock-client-secret');
      expect(credentials.refreshToken).toBe('mock-refresh-token');

      await expect(mockManager.saveCredentials(credentials)).resolves.toBeUndefined();

      const isValid = mockManager.validateCredentials(credentials);
      expect(isValid).toBe(true);

      const config = mockManager.getMarketplaceConfig('ATVPDKIKX0DER');
      expect(config.marketplaceId).toBe('ATVPDKIKX0DER');
      expect(config.region).toBe('NA');
    });
  });

  describe('mockLoadCredentials', () => {
    it('should mock successful credential loading', async () => {
      const customCredentials = {
        clientId: 'custom-client-id',
        clientSecret: 'custom-client-secret',
        refreshToken: 'custom-refresh-token',
        accessKeyId: 'custom-access-key',
        secretAccessKey: 'custom-secret-key',
      };

      factory.mockLoadCredentials(mockManager, customCredentials);

      const credentials = await mockManager.loadCredentials();
      expect(credentials.clientId).toBe('custom-client-id');
      expect(credentials.accessKeyId).toBe('custom-access-key');
    });
  });

  describe('mockValidateCredentials', () => {
    it('should mock credential validation', () => {
      factory.mockValidateCredentials(mockManager, false);

      const isValid = mockManager.validateCredentials({
        clientId: 'invalid',
        clientSecret: 'invalid',
        refreshToken: 'invalid',
      });

      expect(isValid).toBe(false);
    });
  });
});

describe('AuthMockScenarios', () => {
  describe('validAuth', () => {
    it('should create valid authentication scenario', () => {
      const scenario = AuthMockScenarios.validAuth('test-token');

      expect(scenario.accessToken).toBe('test-token');
      expect(scenario.tokenType).toBe('bearer');
      expect(scenario.expiresIn).toBe(3600);
    });

    it('should create valid authentication scenario with default token', () => {
      const scenario = AuthMockScenarios.validAuth();

      expect(scenario.accessToken).toBe('valid-access-token');
      expect(scenario.tokenType).toBe('bearer');
      expect(scenario.expiresIn).toBe(3600);
    });
  });

  describe('expiredToken', () => {
    it('should create expired token scenario', () => {
      const scenario = AuthMockScenarios.expiredToken('old-token');

      expect(scenario.accessToken).toBe('old-token');
      expect(scenario.tokenType).toBe('bearer');
      expect(scenario.expiresIn).toBe(-1);
    });
  });

  describe('error scenarios', () => {
    it('should create refresh failure scenario', () => {
      const scenario = AuthMockScenarios.refreshFailure('Custom refresh error');

      expect(scenario.message).toBe('Custom refresh error');
      expect(scenario.type).toBe('TOKEN_REFRESH_FAILED');
      expect(scenario.statusCode).toBe(401);
    });

    it('should create invalid credentials scenario', () => {
      const scenario = AuthMockScenarios.invalidCredentials();

      expect(scenario.message).toBe('Invalid credentials');
      expect(scenario.type).toBe('INVALID_CREDENTIALS');
      expect(scenario.statusCode).toBe(401);
    });

    it('should create network error scenario', () => {
      const scenario = AuthMockScenarios.networkError();

      expect(scenario.message).toBe('Network error');
      expect(scenario.type).toBe('NETWORK_ERROR');
      expect(scenario.statusCode).toBe(0);
    });

    it('should create rate limit error scenario', () => {
      const scenario = AuthMockScenarios.rateLimitError();

      expect(scenario.message).toBe('Rate limit exceeded');
      expect(scenario.type).toBe('RATE_LIMIT_ERROR');
      expect(scenario.statusCode).toBe(429);
    });
  });
});
