/**
 * Test setup utilities for consistent test environment initialization
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { BaseApiClient } from '../../src/api/base-client.js';
import { AmazonSellerMcpServer } from '../../src/server/server.js';
import { TestDataBuilder } from './test-data-builder.js';
import { TestPortManager } from './port-utils.js';
import { cleanupEventEmitters } from './event-cleanup.js';
import type { AmazonCredentials, AuthConfig, ApiClientConfig } from '../../src/types/index.js';
import { AmazonRegion } from '../../src/auth/index.js';
import type { AmazonSellerMcpConfig } from '../../src/server/server.js';

/**
 * Mock environment configuration
 */
export interface MockEnvironment {
  /**
   * Mocked axios instance
   */
  axios: {
    create: Mock;
    instance: {
      request: Mock;
      get: Mock;
      post: Mock;
      put: Mock;
      delete: Mock;
      patch: Mock;
    };
  };

  /**
   * Mocked authentication
   */
  auth: {
    getAccessToken: Mock;
    generateSecuredRequest: Mock;
    refreshToken: Mock;
  };

  /**
   * Mocked API clients
   */
  apiClients: {
    base: Mock;
    catalog: Mock;
    orders: Mock;
    inventory: Mock;
    listings: Mock;
    reports: Mock;
  };

  /**
   * Mocked server components
   */
  server: {
    mcpServer: {
      registerTool: Mock;
      registerResource: Mock;
      setRequestHandler: Mock;
      connect: Mock;
      close: Mock;
      sendLoggingMessage: Mock;
      sendResourceUpdated: Mock;
      sendResourceListChanged: Mock;
      clearPendingNotifications: Mock;
    };
    amazonSellerServer: {
      registerTool: Mock;
      registerResource: Mock;
      connect: Mock;
      close: Mock;
      getMcpServer: Mock;
      setupNotifications: Mock;
      setupResources: Mock;
      setupTools: Mock;
    };
    toolManager: {
      registerTool: Mock;
      isToolRegistered: Mock;
      getRegisteredTools: Mock;
    };
    resourceManager: {
      registerResource: Mock;
      isResourceRegistered: Mock;
      getRegisteredResources: Mock;
    };
  };

  /**
   * Mocked utilities
   */
  utils: {
    cache: {
      get: Mock;
      set: Mock;
      delete: Mock;
      clear: Mock;
    };
    logger: {
      info: Mock;
      warn: Mock;
      error: Mock;
      debug: Mock;
    };
  };
}

/**
 * Test component factory configuration
 */
export interface TestComponentConfig {
  /**
   * Credentials to use
   */
  credentials?: Partial<AmazonCredentials>;

  /**
   * Auth configuration
   */
  authConfig?: Partial<AuthConfig>;

  /**
   * API client configuration
   */
  apiClientConfig?: Partial<ApiClientConfig>;

  /**
   * Server configuration
   */
  serverConfig?: Partial<AmazonSellerMcpConfig>;

  /**
   * Mock overrides
   */
  mockOverrides?: {
    auth?: Partial<MockEnvironment['auth']>;
    axios?: Partial<MockEnvironment['axios']>;
    server?: Partial<MockEnvironment['server']>;
    utils?: Partial<MockEnvironment['utils']>;
  };
}

/**
 * Test setup utilities for creating consistent test environments
 */
export class TestSetup {
  /**
   * Current mock environment
   */
  private static currentMockEnvironment: MockEnvironment | null = null;

  /**
   * Port manager for test isolation
   */
  private static portManager = TestPortManager.getInstance();

  /**
   * Setup a complete mock environment for testing
   */
  static setupMockEnvironment(overrides: Partial<MockEnvironment> = {}): MockEnvironment {
    // Mock axios
    const mockAxiosInstance = {
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    };

    const mockAxios = {
      create: vi.fn().mockReturnValue(mockAxiosInstance),
      instance: mockAxiosInstance,
    };

    // Mock authentication
    const mockAuth = {
      getAccessToken: vi.fn().mockResolvedValue('test-access-token'),
      generateSecuredRequest: vi.fn().mockImplementation((request) =>
        Promise.resolve({
          ...request,
          headers: {
            ...request.headers,
            Authorization: 'AWS4-HMAC-SHA256 Credential=test/test',
          },
        })
      ),
      refreshToken: vi.fn().mockResolvedValue({
        accessToken: 'new-test-token',
        expiresAt: Date.now() + 3600000,
      }),
    };

    // Mock API clients
    const mockApiClients = {
      base: vi.fn(),
      catalog: vi.fn(),
      orders: vi.fn(),
      inventory: vi.fn(),
      listings: vi.fn(),
      reports: vi.fn(),
    };

    // Mock server components
    const mockMcpServer = {
      registerTool: vi.fn().mockReturnValue(true),
      registerResource: vi.fn().mockReturnValue(true),
      setRequestHandler: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      sendLoggingMessage: vi.fn().mockResolvedValue(undefined),
      sendResourceUpdated: vi.fn().mockResolvedValue(undefined),
      sendResourceListChanged: vi.fn().mockResolvedValue(undefined),
      clearPendingNotifications: vi.fn().mockResolvedValue(undefined),
    };

    const mockAmazonSellerServer = {
      registerTool: vi.fn().mockImplementation((name, options, handler) => {
        return mockMcpServer.registerTool(name, options, handler);
      }),
      registerResource: vi.fn().mockImplementation((template, handler) => {
        return mockMcpServer.registerResource(template, handler);
      }),
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getMcpServer: vi.fn().mockReturnValue(mockMcpServer),
      setupNotifications: vi.fn().mockResolvedValue(undefined),
      setupResources: vi.fn().mockResolvedValue(undefined),
      setupTools: vi.fn().mockResolvedValue(undefined),
    };

    const mockToolManager = {
      registerTool: vi.fn().mockReturnValue(true),
      isToolRegistered: vi.fn().mockReturnValue(false),
      getRegisteredTools: vi.fn().mockReturnValue([]),
    };

    const mockResourceManager = {
      registerResource: vi.fn().mockReturnValue(true),
      isResourceRegistered: vi.fn().mockReturnValue(false),
      getRegisteredResources: vi.fn().mockReturnValue([]),
    };

    const mockServer = {
      mcpServer: mockMcpServer,
      amazonSellerServer: mockAmazonSellerServer,
      toolManager: mockToolManager,
      resourceManager: mockResourceManager,
    };

    // Mock utilities
    const mockUtils = {
      cache: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    const mockEnvironment: MockEnvironment = {
      axios: mockAxios,
      auth: mockAuth,
      apiClients: mockApiClients,
      server: mockServer,
      utils: mockUtils,
      ...overrides,
    };

    this.currentMockEnvironment = mockEnvironment;
    return mockEnvironment;
  }

  /**
   * Create a test authentication configuration
   */
  static createTestAuthConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
    return TestDataBuilder.createAuthConfig(overrides);
  }

  /**
   * Create a test API client configuration
   */
  static createTestApiClientConfig(overrides: Partial<ApiClientConfig> = {}): ApiClientConfig {
    return TestDataBuilder.createApiClientConfig(overrides);
  }

  /**
   * Create a test server configuration
   */
  static createTestServerConfig(
    overrides: Partial<AmazonSellerMcpConfig> = {}
  ): AmazonSellerMcpConfig {
    const credentials = TestDataBuilder.createCredentials();

    return {
      name: 'test-amazon-seller-mcp',
      version: '1.0.0-test',
      credentials,
      marketplaceId: 'ATVPDKIKX0DER',
      region: AmazonRegion.NA,
      debouncedNotifications: false,
      cacheConfig: {
        enabled: false, // Disable caching in tests
        ttlMs: 0,
      },
      connectionPoolConfig: {
        enabled: false, // Disable connection pooling in tests
        maxConnections: 1,
      },
      ...overrides,
    };
  }

  /**
   * Allocate a port for testing
   * @returns Promise that resolves to an allocated port number
   */
  static async allocateTestPort(): Promise<number> {
    return this.portManager.allocatePort();
  }

  /**
   * Release a test port
   * @param port Port number to release
   */
  static releaseTestPort(port: number): void {
    this.portManager.releasePort(port);
  }

  /**
   * Create HTTP transport configuration with dynamic port allocation
   * @param overrides Optional overrides for HTTP options
   * @returns Promise that resolves to transport configuration with allocated port
   */
  static async createHttpTransportConfig(
    overrides: {
      host?: string;
      enableDnsRebindingProtection?: boolean;
      allowedHosts?: string[];
      sessionManagement?: boolean;
    } = {}
  ): Promise<{
    type: 'streamableHttp';
    httpOptions: {
      port: number;
      host: string;
      enableDnsRebindingProtection?: boolean;
      allowedHosts?: string[];
      sessionManagement?: boolean;
    };
  }> {
    const port = await this.allocateTestPort();

    return {
      type: 'streamableHttp',
      httpOptions: {
        port,
        host: 'localhost',
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost'],
        sessionManagement: true,
        ...overrides,
      },
    };
  }

  /**
   * Create a test BaseApiClient instance with mocked dependencies
   */
  static createTestApiClient(config: TestComponentConfig = {}): {
    client: BaseApiClient;
    mocks: MockEnvironment;
  } {
    const mockEnv = this.setupMockEnvironment(config.mockOverrides);

    // Mock the BaseApiClient constructor dependencies
    vi.doMock('axios', () => ({
      default: mockEnv.axios,
      create: mockEnv.axios.create,
    }));

    vi.doMock('../../src/auth/amazon-auth.js', () => ({
      AmazonAuth: vi.fn().mockImplementation(() => mockEnv.auth),
    }));

    const authConfig = this.createTestAuthConfig(config.authConfig);
    const apiClientConfig = this.createTestApiClientConfig(config.apiClientConfig);

    // Create the client (this would normally be done with proper dependency injection)
    const client = new BaseApiClient(authConfig, apiClientConfig);

    return { client, mocks: mockEnv };
  }

  /**
   * Create a test AmazonSellerMcpServer instance with mocked dependencies
   */
  static createTestServer(config: TestComponentConfig = {}): {
    server: AmazonSellerMcpServer;
    mocks: MockEnvironment;
  } {
    const mockEnv = this.setupMockEnvironment(config.mockOverrides);
    const serverConfig = this.createTestServerConfig(config.serverConfig);

    // Mock server dependencies
    vi.doMock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
      McpServer: vi.fn().mockImplementation(() => ({
        setRequestHandler: vi.fn(),
        connect: vi.fn(),
        close: vi.fn(),
      })),
    }));

    const server = new AmazonSellerMcpServer(serverConfig);

    return { server, mocks: mockEnv };
  }

  /**
   * Setup common test environment with automatic cleanup
   */
  static setupTestEnvironment(): {
    mockEnv: MockEnvironment;
    cleanup: () => void;
  } {
    const mockEnv = this.setupMockEnvironment();

    const cleanup = () => {
      this.cleanupMockEnvironment();
      vi.clearAllMocks();
      vi.resetAllMocks();
    };

    return { mockEnv, cleanup };
  }

  /**
   * Create a test environment with beforeEach/afterEach hooks
   */
  static createTestHooks(): {
    mockEnv: MockEnvironment | null;
    beforeEachHook: () => void;
    afterEachHook: () => void;
  } {
    let mockEnv: MockEnvironment | null = null;

    const beforeEachHook = () => {
      mockEnv = this.setupMockEnvironment();
    };

    const afterEachHook = () => {
      this.cleanupMockEnvironment();
      vi.clearAllMocks();
      vi.resetAllMocks();
      mockEnv = null;
    };

    return { mockEnv, beforeEachHook, afterEachHook };
  }

  /**
   * Setup API response mocks for common scenarios
   */
  static setupApiResponseMocks(
    mockEnv: MockEnvironment,
    scenarios: {
      success?: unknown;
      error?: { type: string; statusCode: number; message: string };
      timeout?: boolean;
      rateLimit?: boolean;
    } = {}
  ): void {
    const { success, error, timeout, rateLimit } = scenarios;

    if (success) {
      const response = TestDataBuilder.createApiResponse(success);
      mockEnv.axios.instance.request.mockResolvedValue({
        data: response.data,
        status: response.statusCode,
        headers: response.headers,
      });
    }

    if (error) {
      const apiError = TestDataBuilder.createApiError(error.type as any, {
        message: error.message,
        statusCode: error.statusCode,
      });
      mockEnv.axios.instance.request.mockRejectedValue(apiError);
    }

    if (timeout) {
      mockEnv.axios.instance.request.mockRejectedValue(new Error('Request timeout'));
    }

    if (rateLimit) {
      const rateLimitError = TestDataBuilder.createApiError('RATE_LIMIT_EXCEEDED' as any, {
        message: 'Rate limit exceeded',
        statusCode: 429,
      });
      mockEnv.axios.instance.request.mockRejectedValue(rateLimitError);
    }
  }

  /**
   * Setup authentication mocks for different scenarios
   */
  static setupAuthMocks(
    mockEnv: MockEnvironment,
    scenarios: {
      validToken?: string;
      expiredToken?: boolean;
      refreshFailure?: boolean;
      signingFailure?: boolean;
    } = {}
  ): void {
    const { validToken, expiredToken, refreshFailure, signingFailure } = scenarios;

    if (validToken) {
      mockEnv.auth.getAccessToken.mockResolvedValue(validToken);
    }

    if (expiredToken) {
      mockEnv.auth.getAccessToken
        .mockRejectedValueOnce(TestDataBuilder.createAuthError('TOKEN_REFRESH_FAILED' as any))
        .mockResolvedValue('new-valid-token');
    }

    if (refreshFailure) {
      mockEnv.auth.refreshToken.mockRejectedValue(
        TestDataBuilder.createAuthError('TOKEN_REFRESH_FAILED' as any)
      );
    }

    if (signingFailure) {
      mockEnv.auth.generateSecuredRequest.mockRejectedValue(
        TestDataBuilder.createAuthError('REQUEST_SIGNING_FAILED' as any)
      );
    }
  }

  /**
   * Create test data for specific Amazon API endpoints
   */
  static createEndpointTestData(endpoint: string): Record<string, unknown> {
    switch (endpoint) {
      case 'catalog':
        return {
          items: [
            TestDataBuilder.createCatalogItem(),
            TestDataBuilder.createCatalogItem({ asin: 'B08TEST456' }),
          ],
        };

      case 'orders':
        return {
          orders: [
            TestDataBuilder.createOrder(),
            TestDataBuilder.createOrder({ AmazonOrderId: 'ORDER-456' }),
          ],
        };

      case 'inventory':
        return {
          inventorySummaries: [
            TestDataBuilder.createInventorySummary(),
            TestDataBuilder.createInventorySummary({ sellerSku: 'SKU-456' }),
          ],
        };

      case 'listings':
        return {
          listings: [
            TestDataBuilder.createListing(),
            TestDataBuilder.createListing({ sku: 'SKU-456' }),
          ],
        };

      default:
        return { message: 'success', data: [] };
    }
  }

  /**
   * Cleanup mock environment
   */
  static cleanupMockEnvironment(): void {
    if (this.currentMockEnvironment) {
      // Clear all mocks
      Object.values(this.currentMockEnvironment.axios.instance).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.auth).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.server.mcpServer).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.server.amazonSellerServer).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.server.toolManager).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.server.resourceManager).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.utils.cache).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      Object.values(this.currentMockEnvironment.utils.logger).forEach((mock) => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });

      this.currentMockEnvironment = null;
    }

    // Release all allocated ports
    this.portManager.releaseAllPorts();

    // Clean up event emitters
    cleanupEventEmitters();

    // Clear all module mocks
    vi.clearAllMocks();
  }

  /**
   * Create a test isolation wrapper that ensures proper cleanup
   */
  static withTestIsolation<T>(testFn: (mockEnv: MockEnvironment) => Promise<T>): () => Promise<T> {
    return async () => {
      const { mockEnv, cleanup } = this.setupTestEnvironment();

      try {
        return await testFn(mockEnv);
      } finally {
        cleanup();
      }
    };
  }

  /**
   * Wait for async operations to complete (useful for testing async behavior)
   */
  static async waitForAsyncOperations(timeoutMs = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  /**
   * Create a test spy that tracks calls and arguments
   */
  static createTestSpy<T extends (...args: unknown[]) => unknown>(implementation?: T): Mock<T> {
    return vi.fn(implementation);
  }

  /**
   * Verify that all mocks have been properly reset
   */
  static verifyMockReset(mockEnv: MockEnvironment): void {
    const allMocks = [
      ...Object.values(mockEnv.axios.instance),
      ...Object.values(mockEnv.auth),
      ...Object.values(mockEnv.server.mcpServer),
      ...Object.values(mockEnv.server.amazonSellerServer),
      ...Object.values(mockEnv.server.toolManager),
      ...Object.values(mockEnv.server.resourceManager),
      ...Object.values(mockEnv.utils.cache),
      ...Object.values(mockEnv.utils.logger),
    ];

    allMocks.forEach((mock) => {
      if (typeof mock === 'function' && 'mock' in mock) {
        if (mock.mock.calls.length > 0) {
          throw new Error(`Mock was not properly reset: ${mock.mock.calls.length} calls remaining`);
        }
      }
    });
  }

  /**
   * Create a server test environment with proper isolation and cleanup
   * @param config Optional server configuration overrides
   * @returns Server test environment with cleanup function
   */
  static async createServerTestEnvironment(config: Partial<AmazonSellerMcpConfig> = {}): Promise<{
    server: AmazonSellerMcpServer;
    mockEnv: MockEnvironment;
    allocatedPort?: number;
    cleanup: () => Promise<void>;
  }> {
    const mockEnv = this.setupMockEnvironment();
    const serverConfig = this.createTestServerConfig(config);

    // Create server instance
    const server = new AmazonSellerMcpServer(serverConfig);

    let allocatedPort: number | undefined;

    const cleanup = async () => {
      try {
        // Close server if it's connected
        if (server.isServerConnected()) {
          await server.close();
        }
      } catch (error) {
        process.stderr.write(`WARNING: Error closing server during cleanup: ${error}\n`);
      }

      // Release allocated port if any
      if (allocatedPort) {
        this.releaseTestPort(allocatedPort);
      }

      // Clean up event emitters
      cleanupEventEmitters();

      // Clean up mock environment
      this.cleanupMockEnvironment();
    };

    return {
      server,
      mockEnv,
      allocatedPort,
      cleanup,
    };
  }

  /**
   * Create a server test environment with HTTP transport
   * @param config Optional server configuration overrides
   * @param httpOptions Optional HTTP transport options
   * @returns Server test environment with HTTP transport and cleanup function
   */
  static async createHttpServerTestEnvironment(
    config: Partial<AmazonSellerMcpConfig> = {},
    httpOptions: {
      host?: string;
      enableDnsRebindingProtection?: boolean;
      allowedHosts?: string[];
      sessionManagement?: boolean;
    } = {}
  ): Promise<{
    server: AmazonSellerMcpServer;
    mockEnv: MockEnvironment;
    transportConfig: {
      type: 'streamableHttp';
      httpOptions: {
        port: number;
        host: string;
        enableDnsRebindingProtection?: boolean;
        allowedHosts?: string[];
        sessionManagement?: boolean;
      };
    };
    cleanup: () => Promise<void>;
  }> {
    const {
      server,
      mockEnv,
      cleanup: baseCleanup,
    } = await this.createServerTestEnvironment(config);
    const transportConfig = await this.createHttpTransportConfig(httpOptions);

    const cleanup = async () => {
      // Release the port from transport config
      this.releaseTestPort(transportConfig.httpOptions.port);
      await baseCleanup();
    };

    return {
      server,
      mockEnv,
      transportConfig,
      cleanup,
    };
  }
}
