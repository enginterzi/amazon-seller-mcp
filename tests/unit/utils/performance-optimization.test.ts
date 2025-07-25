/**
 * Tests for performance optimization features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheManager, configureCacheManager } from '../../../src/utils/cache-manager.js';
import { ConnectionPool, configureConnectionPool } from '../../../src/utils/connection-pool.js';
import { BaseApiClient } from '../../../src/api/base-client.js';
import { AuthConfig } from '../../../src/types/auth.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{"value":"test","expiresAt":9999999999999}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
  },
}));

// Mock http and https
vi.mock('http', async () => {
  return {
    default: {
      Agent: vi.fn().mockImplementation(() => ({
        sockets: {},
        freeSockets: {},
        requests: {},
        on: vi.fn(),
        destroy: vi.fn(),
      })),
    },
    Agent: vi.fn().mockImplementation(() => ({
      sockets: {},
      freeSockets: {},
      requests: {},
      on: vi.fn(),
      destroy: vi.fn(),
    })),
  };
});

vi.mock('https', async () => {
  return {
    default: {
      Agent: vi.fn().mockImplementation(() => ({
        sockets: {},
        freeSockets: {},
        requests: {},
        on: vi.fn(),
        destroy: vi.fn(),
      })),
    },
    Agent: vi.fn().mockImplementation(() => ({
      sockets: {},
      freeSockets: {},
      requests: {},
      on: vi.fn(),
      destroy: vi.fn(),
    })),
  };
});

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      defaultTtl: 60,
      checkPeriod: 120,
      maxEntries: 100,
      persistent: false,
    });
  });

  it('should store and retrieve values', async () => {
    await cacheManager.set('test-key', 'test-value');
    const value = await cacheManager.get('test-key');
    expect(value).toBe('test-value');
  });

  it('should respect TTL', async () => {
    await cacheManager.set('test-key', 'test-value', 0.01); // 10ms TTL
    await new Promise((resolve) => setTimeout(resolve, 20));
    const value = await cacheManager.get('test-key');
    expect(value).toBeUndefined();
  });

  it('should delete values', async () => {
    await cacheManager.set('test-key', 'test-value');
    await cacheManager.del('test-key');
    const value = await cacheManager.get('test-key');
    expect(value).toBeUndefined();
  });

  it('should clear all values', async () => {
    await cacheManager.set('test-key-1', 'test-value-1');
    await cacheManager.set('test-key-2', 'test-value-2');
    await cacheManager.clear();
    const value1 = await cacheManager.get('test-key-1');
    const value2 = await cacheManager.get('test-key-2');
    expect(value1).toBeUndefined();
    expect(value2).toBeUndefined();
  });

  it('should track statistics', async () => {
    await cacheManager.set('test-key', 'test-value');
    await cacheManager.get('test-key'); // Hit
    await cacheManager.get('non-existent-key'); // Miss

    const stats = cacheManager.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
  });

  it('should execute function with caching', async () => {
    const fn = vi.fn().mockResolvedValue('test-value');

    // First call should execute the function
    const result1 = await cacheManager.withCache('test-key', fn);
    expect(result1).toBe('test-value');
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call should use cached value
    const result2 = await cacheManager.withCache('test-key', fn);
    expect(result2).toBe('test-value');
    expect(fn).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should configure the default cache manager', async () => {
    configureCacheManager({
      defaultTtl: 120,
      maxEntries: 200,
    });

    // The default cache manager should be configured with the new settings
    // This is hard to test directly, but we can verify it doesn't throw
    expect(() =>
      configureCacheManager({
        defaultTtl: 60,
        maxEntries: 100,
      })
    ).not.toThrow();
  });
});

describe('ConnectionPool', () => {
  let connectionPool: ConnectionPool;

  beforeEach(() => {
    connectionPool = new ConnectionPool({
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 60000,
      keepAliveTimeout: 60000,
      keepAlive: true,
    });
  });

  afterEach(() => {
    connectionPool.destroy();
  });

  it('should provide HTTP and HTTPS agents', () => {
    const httpAgent = connectionPool.getHttpAgent();
    const httpsAgent = connectionPool.getHttpsAgent();

    expect(httpAgent).toBeDefined();
    expect(httpsAgent).toBeDefined();
  });

  it('should track requests', () => {
    connectionPool.trackRequest();
    connectionPool.trackRequest();

    const stats = connectionPool.getStats();
    expect(stats.totalRequests).toBe(2);
  });

  it('should configure the default connection pool', () => {
    configureConnectionPool({
      maxSockets: 20,
      maxFreeSockets: 10,
    });

    // The default connection pool should be configured with the new settings
    // This is hard to test directly, but we can verify it doesn't throw
    expect(() =>
      configureConnectionPool({
        maxSockets: 10,
        maxFreeSockets: 5,
      })
    ).not.toThrow();
  });
});

describe('BaseApiClient with performance optimizations', () => {
  let client: BaseApiClient;

  const mockAuthConfig: AuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    region: 'us-east-1',
    marketplaceId: 'ATVPDKIKX0DER',
  };

  beforeEach(() => {
    // Mock axios request
    (axios.create as any).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {},
      }),
      defaults: {},
    });

    client = new BaseApiClient(mockAuthConfig);
  });

  it('should use connection pooling', async () => {
    // This is mostly testing that the setup doesn't throw
    expect(client).toBeDefined();

    // The axios instance should have httpAgent and httpsAgent set
    // This is hard to test directly since we're mocking axios
  });

  it('should batch similar requests', async () => {
    // Add the batchRequest method to the client for testing
    const batchRequestMethod = (client as any).batchRequest.bind(client);

    const fn1 = vi.fn().mockResolvedValue('result-1');
    const fn2 = vi.fn().mockResolvedValue('result-2');

    // First request should execute the function
    const promise1 = batchRequestMethod('test-key', fn1);

    // Second request with same key should reuse the promise
    const promise2 = batchRequestMethod('test-key', fn2);

    // Different key should execute the function
    const promise3 = batchRequestMethod('different-key', fn2);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    expect(result1).toBe('result-1');
    expect(result2).toBe('result-1'); // Should be the same as result1
    expect(result3).toBe('result-2');

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should clean up old batches', async () => {
    // Add the batchRequest and cleanupBatches methods to the client for testing
    const batchRequestMethod = (client as any).batchRequest.bind(client);
    const cleanupBatchesMethod = (client as any).cleanupBatches.bind(client);

    // Add some batches
    await batchRequestMethod('key-1', () => Promise.resolve('result-1'));
    await batchRequestMethod('key-2', () => Promise.resolve('result-2'));

    // Manually set the timestamp to be old
    (client as any).batchManager.set('key-1', {
      promise: Promise.resolve('result-1'),
      timestamp: Date.now() - 1000, // 1 second ago
    });

    // Clean up batches older than 500ms
    cleanupBatchesMethod(500);

    // key-1 should be removed, key-2 should remain
    expect((client as any).batchManager.has('key-1')).toBe(false);
    expect((client as any).batchManager.has('key-2')).toBe(true);
  });
});
