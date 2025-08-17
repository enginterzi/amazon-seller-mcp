/**
 * Tests for utils module index exports
 */

import { describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';

describe('Utils Module Index', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export error handler utilities', async () => {
    const { AmazonSellerMcpError, ApiError, AuthError, ErrorRecoveryManager, translateApiError } =
      await import('../../../src/utils/index.js');

    expect(AmazonSellerMcpError).toBeDefined();
    expect(typeof AmazonSellerMcpError).toBe('function');
    expect(ApiError).toBeDefined();
    expect(typeof ApiError).toBe('function');
    expect(AuthError).toBeDefined();
    expect(typeof AuthError).toBe('function');
    expect(ErrorRecoveryManager).toBeDefined();
    expect(typeof ErrorRecoveryManager).toBe('function');
    expect(translateApiError).toBeDefined();
    expect(typeof translateApiError).toBe('function');
  });

  it('should export logger utilities', async () => {
    const { Logger, createLogger, getLogger } = await import('../../../src/utils/index.js');

    expect(Logger).toBeDefined();
    expect(typeof Logger).toBe('function');
    expect(createLogger).toBeDefined();
    expect(typeof createLogger).toBe('function');
    expect(getLogger).toBeDefined();
    expect(typeof getLogger).toBe('function');
  });

  it('should export cache manager utilities', async () => {
    const { CacheManager, configureCacheManager, getCacheManager } = await import(
      '../../../src/utils/index.js'
    );

    expect(CacheManager).toBeDefined();
    expect(typeof CacheManager).toBe('function');
    expect(configureCacheManager).toBeDefined();
    expect(typeof configureCacheManager).toBe('function');
    expect(getCacheManager).toBeDefined();
    expect(typeof getCacheManager).toBe('function');
  });

  it('should export connection pool utilities', async () => {
    const { ConnectionPool, configureConnectionPool, getConnectionPool } = await import(
      '../../../src/utils/index.js'
    );

    expect(ConnectionPool).toBeDefined();
    expect(typeof ConnectionPool).toBe('function');
    expect(configureConnectionPool).toBeDefined();
    expect(typeof configureConnectionPool).toBe('function');
    expect(getConnectionPool).toBeDefined();
    expect(typeof getConnectionPool).toBe('function');
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the utils module doesn't throw
    await expect(import('../../../src/utils/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/utils/index.js');
    const exportKeys = Object.keys(exports);

    // Verify we have a reasonable number of exports
    expect(exportKeys.length).toBeGreaterThan(10);

    // Verify no undefined exports
    exportKeys.forEach((key) => {
      expect(exports[key]).toBeDefined();
    });
  });

  it('should export error classes that can be instantiated', async () => {
    const { AmazonSellerMcpError, ApiError, AuthError } = await import(
      '../../../src/utils/index.js'
    );

    // Verify error classes can be instantiated
    expect(() => new AmazonSellerMcpError('Test error', 'TEST_ERROR')).not.toThrow();
    expect(() => new ApiError('API error', 'API_ERROR', 400)).not.toThrow();
    expect(() => new AuthError('Auth error', 'AUTH_ERROR')).not.toThrow();
  });

  it('should export utility classes that can be instantiated', async () => {
    const { CacheManager, ConnectionPool, Logger, ErrorRecoveryManager } = await import(
      '../../../src/utils/index.js'
    );

    // Verify utility classes can be instantiated
    expect(() => new CacheManager()).not.toThrow();
    expect(() => new ConnectionPool()).not.toThrow();
    expect(() => new Logger()).not.toThrow();
    expect(() => new ErrorRecoveryManager()).not.toThrow();
  });

  it('should export factory functions that can be called', async () => {
    const { createLogger, configureCacheManager, configureConnectionPool, translateApiError } =
      await import('../../../src/utils/index.js');

    // Verify factory functions can be called
    expect(() => createLogger('test')).not.toThrow();
    expect(() => configureCacheManager({ enabled: false })).not.toThrow();
    expect(() => configureConnectionPool({ enabled: false })).not.toThrow();
    expect(() => translateApiError(new Error('test'), 'Test error')).not.toThrow();
  });

  it('should export singleton getter functions', async () => {
    const { getLogger, getCacheManager, getConnectionPool } = await import(
      '../../../src/utils/index.js'
    );

    // Verify singleton getters return consistent instances
    const logger1 = getLogger();
    const logger2 = getLogger();
    expect(logger1).toBe(logger2);

    const cache1 = getCacheManager();
    const cache2 = getCacheManager();
    expect(cache1).toBe(cache2);

    const pool1 = getConnectionPool();
    const pool2 = getConnectionPool();
    expect(pool1).toBe(pool2);
  });

  it('should maintain error class inheritance', async () => {
    const { AmazonSellerMcpError, ApiError, AuthError } = await import(
      '../../../src/utils/index.js'
    );

    const mcpError = new AmazonSellerMcpError('Test error', 'TEST_ERROR');
    const apiError = new ApiError('API error', 'API_ERROR', 400);
    const authError = new AuthError('Auth error', 'AUTH_ERROR');

    // Verify error inheritance
    expect(mcpError).toBeInstanceOf(Error);
    expect(apiError).toBeInstanceOf(Error);
    expect(authError).toBeInstanceOf(Error);

    // Verify error properties
    expect(mcpError.name).toBe('AmazonSellerMcpError');
    expect(apiError.name).toBe('ApiError');
    expect(authError.name).toBe('AuthError');
  });
});
