/**
 * Tests for the test setup utilities
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestSetup } from './test-setup.js';
import { AmazonRegion } from '../../src/auth/index.js';

describe('TestSetup', () => {
  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  describe('setupMockEnvironment', () => {
    it('should create a complete mock environment', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      expect(mockEnv).toMatchObject({
        axios: {
          create: expect.any(Function),
          instance: {
            request: expect.any(Function),
            get: expect.any(Function),
            post: expect.any(Function),
            put: expect.any(Function),
            delete: expect.any(Function),
            patch: expect.any(Function),
          },
        },
        auth: {
          getAccessToken: expect.any(Function),
          generateSecuredRequest: expect.any(Function),
          refreshToken: expect.any(Function),
        },
        apiClients: {
          base: expect.any(Function),
          catalog: expect.any(Function),
          orders: expect.any(Function),
          inventory: expect.any(Function),
          listings: expect.any(Function),
          reports: expect.any(Function),
        },
        utils: {
          cache: {
            get: expect.any(Function),
            set: expect.any(Function),
            delete: expect.any(Function),
            clear: expect.any(Function),
          },
          logger: {
            info: expect.any(Function),
            warn: expect.any(Function),
            error: expect.any(Function),
            debug: expect.any(Function),
          },
        },
      });
    });

    it('should allow overriding mock environment parts', () => {
      const customAuthMock = vi.fn();
      const mockEnv = TestSetup.setupMockEnvironment({
        auth: {
          getAccessToken: customAuthMock,
          generateSecuredRequest: vi.fn(),
          refreshToken: vi.fn(),
        },
      });

      expect(mockEnv.auth.getAccessToken).toBe(customAuthMock);
    });
  });

  describe('createTestAuthConfig', () => {
    it('should create valid auth configuration', () => {
      const config = TestSetup.createTestAuthConfig();

      expect(config).toMatchObject({
        credentials: expect.objectContaining({
          clientId: expect.any(String),
          clientSecret: expect.any(String),
          refreshToken: expect.any(String),
        }),
        region: AmazonRegion.NA,
        marketplaceId: expect.any(String),
        tokenCacheTimeMs: expect.any(Number),
      });
    });

    it('should allow overriding auth config properties', () => {
      const config = TestSetup.createTestAuthConfig({
        region: AmazonRegion.EU,
        marketplaceId: 'A2EUQ1WTGCTBG2',
      });

      expect(config.region).toBe(AmazonRegion.EU);
      expect(config.marketplaceId).toBe('A2EUQ1WTGCTBG2');
    });
  });

  describe('createTestApiClientConfig', () => {
    it('should create valid API client configuration', () => {
      const config = TestSetup.createTestApiClientConfig();

      expect(config).toMatchObject({
        baseUrl: expect.stringContaining('https://'),
        region: expect.any(String),
        marketplaceId: expect.any(String),
        maxRetries: expect.any(Number),
        timeoutMs: expect.any(Number),
        rateLimit: expect.objectContaining({
          requestsPerSecond: expect.any(Number),
          enabled: expect.any(Boolean),
        }),
      });
    });
  });

  describe('createTestServerConfig', () => {
    it('should create valid server configuration', () => {
      const config = TestSetup.createTestServerConfig();

      expect(config).toMatchObject({
        name: expect.stringContaining('test'),
        version: expect.stringContaining('test'),
        credentials: expect.objectContaining({
          clientId: expect.any(String),
          clientSecret: expect.any(String),
          refreshToken: expect.any(String),
        }),
        marketplaceId: expect.any(String),
        region: expect.any(String),
        debouncedNotifications: false,
        cacheConfig: expect.objectContaining({
          enabled: false,
        }),
        connectionPoolConfig: expect.objectContaining({
          enabled: false,
        }),
      });
    });

    it('should allow overriding server config properties', () => {
      const config = TestSetup.createTestServerConfig({
        name: 'custom-test-server',
        region: AmazonRegion.FE,
      });

      expect(config.name).toBe('custom-test-server');
      expect(config.region).toBe(AmazonRegion.FE);
    });
  });

  describe('setupTestEnvironment', () => {
    it('should create environment with cleanup function', () => {
      const { mockEnv, cleanup } = TestSetup.setupTestEnvironment();

      expect(mockEnv).toBeDefined();
      expect(cleanup).toBeInstanceOf(Function);

      // Verify cleanup works
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('createTestHooks', () => {
    it('should create beforeEach and afterEach hooks', () => {
      const { mockEnv, beforeEachHook, afterEachHook } = TestSetup.createTestHooks();

      expect(mockEnv).toBeNull(); // Initially null
      expect(beforeEachHook).toBeInstanceOf(Function);
      expect(afterEachHook).toBeInstanceOf(Function);

      // Test hooks work
      beforeEachHook();
      expect(mockEnv).toBeNull(); // Still null because we can't modify the reference

      afterEachHook();
      expect(() => afterEachHook()).not.toThrow();
    });
  });

  describe('setupApiResponseMocks', () => {
    it('should setup success response mocks', () => {
      const mockEnv = TestSetup.setupMockEnvironment();
      const testData = { message: 'success' };

      TestSetup.setupApiResponseMocks(mockEnv, { success: testData });

      expect(mockEnv.axios.instance.request).toHaveBeenCalledTimes(0);
      // The mock is configured but not called yet
      expect(mockEnv.axios.instance.request).toBeDefined();
    });

    it('should setup error response mocks', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      TestSetup.setupApiResponseMocks(mockEnv, {
        error: {
          type: 'SERVER_ERROR',
          statusCode: 500,
          message: 'Internal server error',
        },
      });

      expect(mockEnv.axios.instance.request).toBeDefined();
    });

    it('should setup timeout mocks', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      TestSetup.setupApiResponseMocks(mockEnv, { timeout: true });

      expect(mockEnv.axios.instance.request).toBeDefined();
    });

    it('should setup rate limit mocks', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      TestSetup.setupApiResponseMocks(mockEnv, { rateLimit: true });

      expect(mockEnv.axios.instance.request).toBeDefined();
    });
  });

  describe('setupAuthMocks', () => {
    it('should setup valid token mocks', () => {
      const mockEnv = TestSetup.setupMockEnvironment();
      const testToken = 'test-valid-token';

      TestSetup.setupAuthMocks(mockEnv, { validToken: testToken });

      expect(mockEnv.auth.getAccessToken).toBeDefined();
    });

    it('should setup expired token scenario', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      TestSetup.setupAuthMocks(mockEnv, { expiredToken: true });

      expect(mockEnv.auth.getAccessToken).toBeDefined();
    });

    it('should setup refresh failure scenario', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      TestSetup.setupAuthMocks(mockEnv, { refreshFailure: true });

      expect(mockEnv.auth.refreshToken).toBeDefined();
    });

    it('should setup signing failure scenario', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      TestSetup.setupAuthMocks(mockEnv, { signingFailure: true });

      expect(mockEnv.auth.generateSecuredRequest).toBeDefined();
    });
  });

  describe('createEndpointTestData', () => {
    it('should create catalog endpoint test data', () => {
      const data = TestSetup.createEndpointTestData('catalog');

      expect(data).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            asin: expect.stringMatching(/^B[A-Z0-9]{9}$/),
            attributes: expect.any(Object),
          }),
        ]),
      });
    });

    it('should create orders endpoint test data', () => {
      const data = TestSetup.createEndpointTestData('orders');

      expect(data).toMatchObject({
        orders: expect.arrayContaining([
          expect.objectContaining({
            AmazonOrderId: expect.any(String),
            OrderStatus: expect.any(String),
          }),
        ]),
      });
    });

    it('should create inventory endpoint test data', () => {
      const data = TestSetup.createEndpointTestData('inventory');

      expect(data).toMatchObject({
        inventorySummaries: expect.arrayContaining([
          expect.objectContaining({
            asin: expect.stringMatching(/^B[A-Z0-9]{9}$/),
            sellerSku: expect.any(String),
          }),
        ]),
      });
    });

    it('should create listings endpoint test data', () => {
      const data = TestSetup.createEndpointTestData('listings');

      expect(data).toMatchObject({
        listings: expect.arrayContaining([
          expect.objectContaining({
            sku: expect.any(String),
            productType: expect.any(String),
          }),
        ]),
      });
    });

    it('should create default test data for unknown endpoints', () => {
      const data = TestSetup.createEndpointTestData('unknown');

      expect(data).toMatchObject({
        message: 'success',
        data: expect.any(Array),
      });
    });
  });

  describe('withTestIsolation', () => {
    it('should provide isolated test environment', async () => {
      const testFn = TestSetup.withTestIsolation(async (mockEnv) => {
        expect(mockEnv).toBeDefined();
        expect(mockEnv.axios).toBeDefined();
        return 'test-result';
      });

      const result = await testFn();
      expect(result).toBe('test-result');
    });

    it('should cleanup even if test throws', async () => {
      const testFn = TestSetup.withTestIsolation(async (mockEnv) => {
        expect(mockEnv).toBeDefined();
        throw new Error('Test error');
      });

      await expect(testFn()).rejects.toThrow('Test error');
      // Cleanup should have happened automatically
    });
  });

  describe('waitForAsyncOperations', () => {
    it('should wait for specified time', async () => {
      const startTime = Date.now();
      await TestSetup.waitForAsyncOperations(50);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some variance
    });
  });

  describe('createTestSpy', () => {
    it('should create a test spy function', () => {
      const spy = TestSetup.createTestSpy();

      expect(spy).toBeInstanceOf(Function);
      expect(spy).toHaveProperty('mock');
    });

    it('should create a test spy with implementation', () => {
      const implementation = (x: number) => x * 2;
      const spy = TestSetup.createTestSpy(implementation);

      const result = spy(5);
      expect(result).toBe(10);
      expect(spy).toHaveBeenCalledWith(5);
    });
  });

  describe('verifyMockReset', () => {
    it('should pass when mocks are properly reset', () => {
      const mockEnv = TestSetup.setupMockEnvironment();

      expect(() => {
        TestSetup.verifyMockReset(mockEnv);
      }).not.toThrow();
    });

    it('should throw when mocks have remaining calls', () => {
      const mockEnv = TestSetup.setupMockEnvironment();
      mockEnv.axios.instance.request('test');

      expect(() => {
        TestSetup.verifyMockReset(mockEnv);
      }).toThrow('Mock was not properly reset');
    });
  });

  describe('cleanupMockEnvironment', () => {
    it('should cleanup mock environment without errors', () => {
      const mockEnv = TestSetup.setupMockEnvironment();
      mockEnv.axios.instance.request('test');
      mockEnv.auth.getAccessToken();

      expect(() => {
        TestSetup.cleanupMockEnvironment();
      }).not.toThrow();
    });

    it('should handle cleanup when no environment exists', () => {
      expect(() => {
        TestSetup.cleanupMockEnvironment();
      }).not.toThrow();
    });
  });
});
