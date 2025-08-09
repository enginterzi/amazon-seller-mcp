/**
 * Authentication mock factory for standardized authentication mocking
 */
import { type Mock } from 'vitest';
import axios from 'axios';
import { BaseMockFactory } from './base-factory.js';
import type { AuthTokens, SignableRequest, AmazonCredentials } from '../../../src/types/auth.js';

/**
 * Configuration for authentication mock scenarios
 */
export interface AuthMockConfig {
  /** Default access token to return */
  defaultAccessToken?: string;
  /** Default token expiration time (in ms from now) */
  defaultTokenExpirationMs?: number;
  /** Whether to setup default behaviors */
  setupDefaults?: boolean;
  /** Default credentials to use */
  defaultCredentials?: Partial<AmazonCredentials>;
}

/**
 * Mock Amazon Auth interface
 */
export interface MockAmazonAuth {
  getAccessToken: Mock<[], Promise<string>>;
  refreshAccessToken: Mock<[], Promise<AuthTokens>>;
  signRequest: Mock<[SignableRequest], Promise<SignableRequest>>;
  generateSecuredRequest: Mock<[SignableRequest], Promise<SignableRequest>>;
}

/**
 * Mock credential manager interface
 */
export interface MockCredentialManager {
  loadCredentials: Mock<[string?], Promise<AmazonCredentials>>;
  saveCredentials: Mock<[AmazonCredentials, string?], Promise<void>>;
  validateCredentials: Mock<[AmazonCredentials], boolean>;
  getMarketplaceConfig: Mock<[string], any>;
}

/**
 * Token generation scenarios
 */
export interface TokenScenario {
  /** Access token to return */
  accessToken?: string;
  /** Token type (usually 'bearer') */
  tokenType?: string;
  /** Expiration time in seconds from now */
  expiresIn?: number;
  /** Refresh token */
  refreshToken?: string;
}

/**
 * Authentication error scenarios
 */
export interface AuthErrorScenario {
  /** Error message */
  message?: string;
  /** Error type */
  type?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Additional error details */
  details?: any;
}

/**
 * Amazon Auth mock factory
 */
export class AmazonAuthMockFactory extends BaseMockFactory<MockAmazonAuth> {
  private defaultConfig: AuthMockConfig;

  constructor(config: AuthMockConfig = {}) {
    super('amazon-auth-factory', {});
    this.defaultConfig = {
      defaultAccessToken: 'Atza|mock-access-token-12345',
      defaultTokenExpirationMs: 3600000, // 1 hour
      setupDefaults: true,
      defaultCredentials: {
        clientId: 'amzn1.application-oa2-client.mock123',
        clientSecret: 'mock-client-secret-12345',
        refreshToken: 'Atzr|IwEBImock-refresh-token-12345',
      },
      ...config,
    };
  }

  /**
   * Create a mock Amazon Auth instance
   */
  create(overrides: Partial<AuthMockConfig> = {}): MockAmazonAuth {
    const config = { ...this.defaultConfig, ...overrides };

    const mockAuth: MockAmazonAuth = {
      getAccessToken: this.createMockFn(),
      refreshAccessToken: this.createMockFn(),
      signRequest: this.createMockFn(),
      generateSecuredRequest: this.createMockFn(),
    };

    // Setup default behaviors
    if (config.setupDefaults) {
      this.setupDefaultBehaviors(mockAuth, config);
    }

    this.instances.push(mockAuth);
    return mockAuth;
  }

  /**
   * Mock successful token retrieval
   */
  mockGetAccessToken(
    auth: MockAmazonAuth,
    token: string = this.defaultConfig.defaultAccessToken!,
    options: { once?: boolean } = {}
  ): void {
    if (options.once) {
      auth.getAccessToken.mockResolvedValueOnce(token);
    } else {
      auth.getAccessToken.mockResolvedValue(token);
    }
  }

  /**
   * Mock successful token refresh
   */
  mockRefreshAccessToken(
    auth: MockAmazonAuth,
    scenario: TokenScenario = {},
    options: { once?: boolean } = {}
  ): void {
    const tokens: AuthTokens = {
      accessToken: scenario.accessToken || this.defaultConfig.defaultAccessToken!,
      tokenType: scenario.tokenType || 'bearer',
      expiresAt: Date.now() + (scenario.expiresIn || 3600) * 1000,
      refreshToken: scenario.refreshToken,
    };

    if (options.once) {
      auth.refreshAccessToken.mockResolvedValueOnce(tokens);
    } else {
      auth.refreshAccessToken.mockResolvedValue(tokens);
    }
  }

  /**
   * Mock successful request signing
   */
  mockSignRequest(
    auth: MockAmazonAuth,
    options: { once?: boolean; addHeaders?: Record<string, string> } = {}
  ): void {
    const implementation = (request: SignableRequest): Promise<SignableRequest> => {
      return Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: 'AWS4-HMAC-SHA256 Credential=mock/test',
          'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
          ...options.addHeaders,
        },
      });
    };

    if (options.once) {
      auth.signRequest.mockImplementationOnce(implementation);
    } else {
      auth.signRequest.mockImplementation(implementation);
    }
  }

  /**
   * Mock successful secured request generation
   */
  mockGenerateSecuredRequest(
    auth: MockAmazonAuth,
    options: {
      once?: boolean;
      accessToken?: string;
      addHeaders?: Record<string, string>;
    } = {}
  ): void {
    const accessToken = options.accessToken || this.defaultConfig.defaultAccessToken!;

    const implementation = (request: SignableRequest): Promise<SignableRequest> => {
      return Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${accessToken}`,
          'X-Amz-Access-Token': accessToken,
          ...options.addHeaders,
        },
      });
    };

    if (options.once) {
      auth.generateSecuredRequest.mockImplementationOnce(implementation);
    } else {
      auth.generateSecuredRequest.mockImplementation(implementation);
    }
  }

  /**
   * Mock authentication errors
   */
  mockAuthError(
    auth: MockAmazonAuth,
    method: keyof MockAmazonAuth,
    scenario: AuthErrorScenario = {},
    options: { once?: boolean } = {}
  ): void {
    const error = new Error(scenario.message || 'Authentication failed');
    (error as any).type = scenario.type || 'AUTH_ERROR';
    (error as any).statusCode = scenario.statusCode || 401;
    (error as any).details = scenario.details;

    const mockFn = auth[method] as Mock;
    if (options.once) {
      mockFn.mockRejectedValueOnce(error);
    } else {
      mockFn.mockRejectedValue(error);
    }
  }

  /**
   * Mock token expiration scenario
   */
  mockTokenExpiration(
    auth: MockAmazonAuth,
    options: {
      expiredToken?: string;
      newToken?: string;
      refreshDelay?: number;
    } = {}
  ): void {
    const expiredToken = options.expiredToken || 'expired-token';
    const newToken = options.newToken || 'new-access-token';

    // First call returns expired token
    auth.getAccessToken.mockResolvedValueOnce(expiredToken);

    // Refresh returns new token
    const refreshImplementation = () => {
      const tokens: AuthTokens = {
        accessToken: newToken,
        tokenType: 'bearer',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      if (options.refreshDelay) {
        return new Promise<AuthTokens>((resolve) =>
          setTimeout(() => resolve(tokens), options.refreshDelay)
        );
      }

      return Promise.resolve(tokens);
    };

    auth.refreshAccessToken.mockImplementationOnce(refreshImplementation);

    // Subsequent calls return new token
    auth.getAccessToken.mockResolvedValue(newToken);
  }

  /**
   * Mock authentication sequence (multiple calls with different outcomes)
   */
  mockAuthSequence(
    auth: MockAmazonAuth,
    method: keyof MockAmazonAuth,
    sequence: (string | Error | TokenScenario)[]
  ): void {
    const mockFn = auth[method] as Mock;

    sequence.forEach((item) => {
      if (item instanceof Error) {
        mockFn.mockRejectedValueOnce(item);
      } else if (typeof item === 'string') {
        if (method === 'getAccessToken') {
          mockFn.mockResolvedValueOnce(item);
        }
      } else if (typeof item === 'object' && 'accessToken' in item) {
        // TokenScenario
        if (method === 'refreshAccessToken') {
          const tokens: AuthTokens = {
            accessToken: item.accessToken || 'mock-token',
            tokenType: item.tokenType || 'bearer',
            expiresAt: Date.now() + (item.expiresIn || 3600) * 1000,
            refreshToken: item.refreshToken,
          };
          mockFn.mockResolvedValueOnce(tokens);
        }
      }
    });
  }

  /**
   * Reset all mocks in an auth instance
   */
  resetAuth(auth: MockAmazonAuth): void {
    Object.values(auth).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }

  /**
   * Mock axios requests for Amazon OAuth token endpoint
   * This is used when the real AmazonAuth class makes HTTP requests
   */
  mockAxiosTokenRequests(
    scenario: 'success' | 'invalid_client' | 'network_error' = 'success',
    options: {
      accessToken?: string;
      expiresIn?: number;
      refreshToken?: string;
    } = {}
  ): void {
    if (scenario === 'success') {
      const mockResponse = {
        data: {
          access_token: options.accessToken || this.defaultConfig.defaultAccessToken,
          token_type: 'bearer',
          expires_in: options.expiresIn || 3600,
          refresh_token: options.refreshToken,
        },
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
        },
      };

      // Mock axios.request for the token endpoint
      if (axios.request && typeof axios.request.mockResolvedValue === 'function') {
        axios.request.mockResolvedValue(mockResponse);
      }

      // Also mock axios() direct call
      if (typeof axios.mockResolvedValue === 'function') {
        axios.mockResolvedValue(mockResponse);
      }
    } else if (scenario === 'invalid_client') {
      const error = new Error('Request failed with status code 401');
      (error as any).response = {
        status: 401,
        statusText: 'Unauthorized',
        data: {
          error: 'invalid_client',
          error_description: 'Client authentication failed',
        },
        headers: {
          'content-type': 'application/json',
        },
      };
      (error as any).code = 'ERR_BAD_REQUEST';
      (error as any).config = {};
      (error as any).request = {};

      // Mock axios.request to reject with the error
      if (axios.request && typeof axios.request.mockRejectedValue === 'function') {
        axios.request.mockRejectedValue(error);
      }

      // Also mock axios() direct call
      if (typeof axios.mockRejectedValue === 'function') {
        axios.mockRejectedValue(error);
      }
    } else if (scenario === 'network_error') {
      const error = new Error('Network Error');
      (error as any).code = 'ECONNREFUSED';

      // Mock axios.request to reject with the error
      if (axios.request && typeof axios.request.mockRejectedValue === 'function') {
        axios.request.mockRejectedValue(error);
      }

      // Also mock axios() direct call
      if (typeof axios.mockRejectedValue === 'function') {
        axios.mockRejectedValue(error);
      }
    }
  }

  /**
   * Create a mock that simulates the "invalid_client" authentication error
   * This is useful for testing error handling scenarios
   */
  mockInvalidClientError(auth: MockAmazonAuth): void {
    const error = new Error('Request failed with status code 401');
    (error as any).response = {
      status: 401,
      statusText: 'Unauthorized',
      data: {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      },
    };
    (error as any).code = 'ERR_BAD_REQUEST';

    // Mock all authentication methods to reject with this error
    auth.getAccessToken.mockRejectedValue(error);
    auth.refreshAccessToken.mockRejectedValue(error);
    auth.signRequest.mockRejectedValue(error);
    auth.generateSecuredRequest.mockRejectedValue(error);
  }

  /**
   * Create a mock that simulates successful authentication after initial failure
   * This is useful for testing retry and recovery scenarios
   */
  mockAuthRecovery(
    auth: MockAmazonAuth,
    options: {
      failureCount?: number;
      recoveryToken?: string;
    } = {}
  ): void {
    const failureCount = options.failureCount || 1;
    const recoveryToken = options.recoveryToken || 'recovered-access-token';

    const error = new Error('Request failed with status code 401');
    (error as any).response = {
      status: 401,
      data: {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      },
    };

    // Mock failures followed by success
    for (let i = 0; i < failureCount; i++) {
      auth.getAccessToken.mockRejectedValueOnce(error);
      auth.refreshAccessToken.mockRejectedValueOnce(error);
    }

    // Then mock success
    auth.getAccessToken.mockResolvedValue(recoveryToken);
    auth.refreshAccessToken.mockResolvedValue({
      accessToken: recoveryToken,
      tokenType: 'bearer',
      expiresAt: Date.now() + 3600000,
    });
  }

  /**
   * Setup default behaviors for mock auth
   */
  private setupDefaultBehaviors(auth: MockAmazonAuth, config: AuthMockConfig): void {
    // Default getAccessToken behavior
    auth.getAccessToken.mockResolvedValue(config.defaultAccessToken!);

    // Default refreshAccessToken behavior
    const defaultTokens: AuthTokens = {
      accessToken: config.defaultAccessToken!,
      tokenType: 'bearer',
      expiresAt: Date.now() + config.defaultTokenExpirationMs!,
    };
    auth.refreshAccessToken.mockResolvedValue(defaultTokens);

    // Default signRequest behavior
    auth.signRequest.mockImplementation((request: SignableRequest) => {
      return Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: 'AWS4-HMAC-SHA256 Credential=mock/test',
          'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
        },
      });
    });

    // Default generateSecuredRequest behavior
    auth.generateSecuredRequest.mockImplementation((request: SignableRequest) => {
      return Promise.resolve({
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${config.defaultAccessToken}`,
          'X-Amz-Access-Token': config.defaultAccessToken!,
        },
      });
    });
  }
}

/**
 * Credential Manager mock factory
 */
export class CredentialManagerMockFactory extends BaseMockFactory<MockCredentialManager> {
  constructor() {
    super('credential-manager-factory', {});
  }

  /**
   * Create a mock credential manager
   */
  create(): MockCredentialManager {
    const mockManager: MockCredentialManager = {
      loadCredentials: this.createMockFn(),
      saveCredentials: this.createMockFn(),
      validateCredentials: this.createMockFn(),
      getMarketplaceConfig: this.createMockFn(),
    };

    // Setup default behaviors
    mockManager.loadCredentials.mockResolvedValue({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      refreshToken: 'mock-refresh-token',
    });

    mockManager.saveCredentials.mockResolvedValue(undefined);
    mockManager.validateCredentials.mockReturnValue(true);

    mockManager.getMarketplaceConfig.mockReturnValue({
      marketplaceId: 'ATVPDKIKX0DER',
      region: 'NA',
      countryCode: 'US',
      currencyCode: 'USD',
      languageCode: 'en_US',
    });

    this.instances.push(mockManager);
    return mockManager;
  }

  /**
   * Mock successful credential loading
   */
  mockLoadCredentials(
    manager: MockCredentialManager,
    credentials: Partial<AmazonCredentials>,
    options: { once?: boolean } = {}
  ): void {
    const fullCredentials: AmazonCredentials = {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      refreshToken: 'mock-refresh-token',
      ...credentials,
    };

    if (options.once) {
      manager.loadCredentials.mockResolvedValueOnce(fullCredentials);
    } else {
      manager.loadCredentials.mockResolvedValue(fullCredentials);
    }
  }

  /**
   * Mock credential validation
   */
  mockValidateCredentials(
    manager: MockCredentialManager,
    isValid: boolean,
    options: { once?: boolean } = {}
  ): void {
    if (options.once) {
      manager.validateCredentials.mockReturnValueOnce(isValid);
    } else {
      manager.validateCredentials.mockReturnValue(isValid);
    }
  }
}

/**
 * Pre-configured authentication scenarios
 */
export const AuthMockScenarios = {
  /**
   * Valid authentication with fresh token
   */
  validAuth: (token: string = 'valid-access-token'): TokenScenario => ({
    accessToken: token,
    tokenType: 'bearer',
    expiresIn: 3600,
  }),

  /**
   * Expired token scenario
   */
  expiredToken: (token: string = 'expired-token'): TokenScenario => ({
    accessToken: token,
    tokenType: 'bearer',
    expiresIn: -1, // Already expired
  }),

  /**
   * Token refresh failure
   */
  refreshFailure: (message: string = 'Failed to refresh token'): AuthErrorScenario => ({
    message,
    type: 'TOKEN_REFRESH_FAILED',
    statusCode: 401,
  }),

  /**
   * Invalid credentials
   */
  invalidCredentials: (message: string = 'Invalid credentials'): AuthErrorScenario => ({
    message,
    type: 'INVALID_CREDENTIALS',
    statusCode: 401,
  }),

  /**
   * Network error during authentication
   */
  networkError: (message: string = 'Network error'): AuthErrorScenario => ({
    message,
    type: 'NETWORK_ERROR',
    statusCode: 0,
  }),

  /**
   * Rate limit error
   */
  rateLimitError: (message: string = 'Rate limit exceeded'): AuthErrorScenario => ({
    message,
    type: 'RATE_LIMIT_ERROR',
    statusCode: 429,
  }),
};
