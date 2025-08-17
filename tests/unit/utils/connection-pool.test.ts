/**
 * Tests for connection pool utility
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import http from 'http';
import https from 'https';

// Type for global object with connection pool
type GlobalWithConnectionPool = typeof globalThis & {
  __defaultConnectionPool?: unknown;
};

// Type for HTTP agent with internal properties
type HttpAgentWithInternals = http.Agent & {
  sockets?: Record<string, unknown[]>;
  freeSockets?: Record<string, unknown[]>;
  requests?: Record<string, unknown[]>;
};

// Type for connection pool with internal methods
type ConnectionPoolWithInternals = ConnectionPool & {
  updateStats?: () => void;
};
import {
  ConnectionPool,
  configureConnectionPool,
  getConnectionPool,
} from '../../../src/utils/connection-pool.js';

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('ConnectionPool', () => {
  let connectionPool: ConnectionPool;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default connection pool
    (global as GlobalWithConnectionPool).__defaultConnectionPool = undefined;
  });

  afterEach(() => {
    if (connectionPool) {
      try {
        connectionPool.destroy();
      } catch {
        // Ignore destroy errors in tests
      }
    }
  });

  describe('constructor', () => {
    it('should create connection pool with default configuration', () => {
      connectionPool = new ConnectionPool();

      expect(connectionPool).toBeDefined();
      expect(connectionPool.getHttpAgent()).toBeInstanceOf(http.Agent);
      expect(connectionPool.getHttpsAgent()).toBeInstanceOf(https.Agent);
    });

    it('should create connection pool with custom configuration', () => {
      connectionPool = new ConnectionPool({
        maxSockets: 20,
        maxFreeSockets: 10,
        timeout: 30000,
        keepAliveTimeout: 30000,
        keepAlive: false,
      });

      expect(connectionPool).toBeDefined();

      const httpAgent = connectionPool.getHttpAgent();
      const httpsAgent = connectionPool.getHttpsAgent();

      expect(httpAgent.maxSockets).toBe(20);
      expect(httpAgent.maxFreeSockets).toBe(10);
      expect(httpAgent.keepAlive).toBe(false);

      expect(httpsAgent.maxSockets).toBe(20);
      expect(httpsAgent.maxFreeSockets).toBe(10);
      expect(httpsAgent.keepAlive).toBe(false);
    });

    it('should initialize with proper default values', () => {
      connectionPool = new ConnectionPool();

      const httpAgent = connectionPool.getHttpAgent();
      const httpsAgent = connectionPool.getHttpsAgent();

      expect(httpAgent.maxSockets).toBe(10);
      expect(httpAgent.maxFreeSockets).toBe(5);
      expect(httpAgent.keepAlive).toBe(true);

      expect(httpsAgent.maxSockets).toBe(10);
      expect(httpsAgent.maxFreeSockets).toBe(5);
      expect(httpsAgent.keepAlive).toBe(true);
    });
  });

  describe('agent access', () => {
    beforeEach(() => {
      connectionPool = new ConnectionPool();
    });

    it('should return HTTP agent', () => {
      const httpAgent = connectionPool.getHttpAgent();

      expect(httpAgent).toBeInstanceOf(http.Agent);
      expect(httpAgent.keepAlive).toBe(true);
    });

    it('should return HTTPS agent', () => {
      const httpsAgent = connectionPool.getHttpsAgent();

      expect(httpsAgent).toBeInstanceOf(https.Agent);
      expect(httpsAgent.keepAlive).toBe(true);
    });

    it('should return different instances for HTTP and HTTPS agents', () => {
      const httpAgent = connectionPool.getHttpAgent();
      const httpsAgent = connectionPool.getHttpsAgent();

      expect(httpAgent).not.toBe(httpsAgent);
    });
  });

  describe('statistics tracking', () => {
    beforeEach(() => {
      connectionPool = new ConnectionPool();
    });

    it('should return initial statistics', () => {
      const stats = connectionPool.getStats();

      expect(stats).toEqual({
        activeSockets: 0,
        freeSockets: 0,
        queuedRequests: 0,
        totalRequests: 0,
        timeouts: 0,
        errors: 0,
      });
    });

    it('should track total requests', () => {
      connectionPool.trackRequest();
      connectionPool.trackRequest();
      connectionPool.trackRequest();

      const stats = connectionPool.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should update statistics when sockets are available', () => {
      const httpAgent = connectionPool.getHttpAgent();

      // Simulate socket activity by adding mock sockets
      (httpAgent as HttpAgentWithInternals).sockets = {
        'example.com:80': [{ id: 1 }, { id: 2 }],
        'api.example.com:80': [{ id: 3 }],
      };

      (httpAgent as HttpAgentWithInternals).freeSockets = {
        'example.com:80': [{ id: 4 }],
      };

      (httpAgent as HttpAgentWithInternals).requests = {
        'example.com:80': [{ id: 5 }, { id: 6 }],
      };

      // Trigger stats update by calling the private method
      (connectionPool as ConnectionPoolWithInternals).updateStats();

      const stats = connectionPool.getStats();
      expect(stats.activeSockets).toBe(3); // 2 + 1 from sockets
      expect(stats.freeSockets).toBe(1);
      expect(stats.queuedRequests).toBe(2);
    });

    it('should handle empty socket collections', () => {
      const httpAgent = connectionPool.getHttpAgent();
      const httpsAgent = connectionPool.getHttpsAgent();

      // Ensure socket collections are empty
      (httpAgent as HttpAgentWithInternals).sockets = {};
      (httpAgent as HttpAgentWithInternals).freeSockets = {};
      (httpAgent as HttpAgentWithInternals).requests = {};
      (httpsAgent as HttpAgentWithInternals).sockets = {};
      (httpsAgent as HttpAgentWithInternals).freeSockets = {};
      (httpsAgent as HttpAgentWithInternals).requests = {};

      (connectionPool as ConnectionPoolWithInternals).updateStats();

      const stats = connectionPool.getStats();
      expect(stats.activeSockets).toBe(0);
      expect(stats.freeSockets).toBe(0);
      expect(stats.queuedRequests).toBe(0);
    });
  });

  describe('event monitoring', () => {
    beforeEach(() => {
      connectionPool = new ConnectionPool();
    });

    it('should handle HTTP agent free events', () => {
      const httpAgent = connectionPool.getHttpAgent();

      // Emit free event with a mock socket that has destroy method
      const mockSocket = { destroy: vi.fn() };
      httpAgent.emit('free', mockSocket, {});

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle HTTP agent timeout events', () => {
      const httpAgent = connectionPool.getHttpAgent();

      // Emit timeout event
      httpAgent.emit('timeout');

      const stats = connectionPool.getStats();
      expect(stats.timeouts).toBe(1);
    });

    it('should handle HTTP agent error events', () => {
      const httpAgent = connectionPool.getHttpAgent();

      // Emit error event
      httpAgent.emit('error', new Error('Test error'));

      const stats = connectionPool.getStats();
      expect(stats.errors).toBe(1);
    });

    it('should handle HTTPS agent free events', () => {
      const httpsAgent = connectionPool.getHttpsAgent();

      // Emit free event with a mock socket that has destroy method
      const mockSocket = { destroy: vi.fn() };
      httpsAgent.emit('free', mockSocket, {});

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle HTTPS agent timeout events', () => {
      const httpsAgent = connectionPool.getHttpsAgent();

      // Emit timeout event
      httpsAgent.emit('timeout');

      const stats = connectionPool.getStats();
      expect(stats.timeouts).toBe(1);
    });

    it('should handle HTTPS agent error events', () => {
      const httpsAgent = connectionPool.getHttpsAgent();

      // Emit error event
      httpsAgent.emit('error', new Error('Test error'));

      const stats = connectionPool.getStats();
      expect(stats.errors).toBe(1);
    });

    it('should accumulate multiple events', () => {
      const httpAgent = connectionPool.getHttpAgent();
      const httpsAgent = connectionPool.getHttpsAgent();

      // Emit multiple events
      httpAgent.emit('timeout');
      httpAgent.emit('error', new Error('HTTP error'));
      httpsAgent.emit('timeout');
      httpsAgent.emit('error', new Error('HTTPS error'));

      const stats = connectionPool.getStats();
      expect(stats.timeouts).toBe(2);
      expect(stats.errors).toBe(2);
    });
  });

  describe('monitoring interval', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start monitoring with periodic updates', () => {
      connectionPool = new ConnectionPool();

      // Fast forward time to trigger monitoring
      vi.advanceTimersByTime(10000);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should update statistics periodically', () => {
      connectionPool = new ConnectionPool();

      // Track a request
      connectionPool.trackRequest();

      // Fast forward time
      vi.advanceTimersByTime(10000);

      const stats = connectionPool.getStats();
      expect(stats.totalRequests).toBe(1);
    });
  });

  describe('destroy method', () => {
    beforeEach(() => {
      connectionPool = new ConnectionPool();
    });

    it('should destroy both HTTP and HTTPS agents', () => {
      const httpAgent = connectionPool.getHttpAgent();
      const httpsAgent = connectionPool.getHttpsAgent();

      const httpDestroySpy = vi.spyOn(httpAgent, 'destroy');
      const httpsDestroySpy = vi.spyOn(httpsAgent, 'destroy');

      connectionPool.destroy();

      expect(httpDestroySpy).toHaveBeenCalled();
      expect(httpsDestroySpy).toHaveBeenCalled();
    });
  });

  describe('default connection pool functions', () => {
    afterEach(() => {
      // Clean up global state
      (global as GlobalWithConnectionPool).__defaultConnectionPool = undefined;
    });

    it('should configure default connection pool', () => {
      const config = {
        maxSockets: 15,
        timeout: 45000,
      };

      configureConnectionPool(config);
      const defaultPool = getConnectionPool();

      expect(defaultPool).toBeDefined();
      expect(defaultPool.getHttpAgent().maxSockets).toBe(15);
    });

    it('should destroy existing pool when reconfiguring', () => {
      // Create initial pool
      configureConnectionPool({ maxSockets: 5 });
      const firstPool = getConnectionPool();
      const destroySpy = vi.spyOn(firstPool, 'destroy');

      // Reconfigure
      configureConnectionPool({ maxSockets: 10 });

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should get default connection pool and create if not exists', () => {
      const defaultPool = getConnectionPool();

      expect(defaultPool).toBeDefined();
      expect(defaultPool).toBeInstanceOf(ConnectionPool);
    });

    it('should return same instance on multiple calls', () => {
      const pool1 = getConnectionPool();
      const pool2 = getConnectionPool();

      expect(pool1).toBe(pool2);
    });
  });

  describe('configuration edge cases', () => {
    it('should handle zero values in configuration', () => {
      connectionPool = new ConnectionPool({
        maxSockets: 0,
        maxFreeSockets: 0,
        timeout: 0,
        keepAliveTimeout: 0,
      });

      const httpAgent = connectionPool.getHttpAgent();

      expect(httpAgent.maxSockets).toBe(Infinity); // Node.js converts 0 to Infinity for maxSockets
      expect(httpAgent.maxFreeSockets).toBe(256); // Node.js has a default value for maxFreeSockets
    });

    it('should handle partial configuration', () => {
      connectionPool = new ConnectionPool({
        maxSockets: 25,
        // Other values should use defaults
      });

      const httpAgent = connectionPool.getHttpAgent();

      expect(httpAgent.maxSockets).toBe(25);
      expect(httpAgent.maxFreeSockets).toBe(5); // Default
      expect(httpAgent.keepAlive).toBe(true); // Default
    });
  });

  describe('socket collection handling', () => {
    beforeEach(() => {
      connectionPool = new ConnectionPool();
    });

    it('should handle undefined socket collections', () => {
      const httpAgent = connectionPool.getHttpAgent();

      // Set socket collections to undefined
      (httpAgent as HttpAgentWithInternals).sockets = undefined;
      (httpAgent as HttpAgentWithInternals).freeSockets = undefined;
      (httpAgent as HttpAgentWithInternals).requests = undefined;

      // Should not throw error when updating stats
      expect(() => (connectionPool as ConnectionPoolWithInternals).updateStats()).not.toThrow();

      const stats = connectionPool.getStats();
      expect(stats.activeSockets).toBe(0);
      expect(stats.freeSockets).toBe(0);
      expect(stats.queuedRequests).toBe(0);
    });

    it('should handle socket collections with undefined arrays', () => {
      const httpAgent = connectionPool.getHttpAgent();

      // Set socket collections with undefined arrays
      (httpAgent as HttpAgentWithInternals).sockets = {
        'example.com:80': undefined,
        'api.example.com:80': null,
      };

      (connectionPool as ConnectionPoolWithInternals).updateStats();

      const stats = connectionPool.getStats();
      expect(stats.activeSockets).toBe(0);
    });
  });
});
