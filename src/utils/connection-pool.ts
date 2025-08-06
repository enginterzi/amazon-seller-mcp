/**
 * Connection pool manager for Amazon Seller MCP Client
 *
 * This file implements connection pooling for HTTP requests to improve performance:
 * - Reuse HTTP connections
 * - Limit concurrent connections
 * - Connection timeout management
 * - Connection health monitoring
 */

import http from 'http';
import https from 'https';
import * as logger from './logger.js';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /**
   * Maximum number of sockets per host
   * @default 10
   */
  maxSockets?: number;

  /**
   * Maximum number of free sockets to keep alive
   * @default 5
   */
  maxFreeSockets?: number;

  /**
   * Socket timeout in milliseconds
   * @default 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Keep-alive timeout in milliseconds
   * @default 60000 (1 minute)
   */
  keepAliveTimeout?: number;

  /**
   * Whether to enable connection reuse
   * @default true
   */
  keepAlive?: boolean;
}

/**
 * Connection pool statistics
 */
interface ConnectionPoolStats {
  /**
   * Number of active sockets
   */
  activeSockets: number;

  /**
   * Number of free sockets
   */
  freeSockets: number;

  /**
   * Number of queued requests
   */
  queuedRequests: number;

  /**
   * Total number of requests
   */
  totalRequests: number;

  /**
   * Total number of timeouts
   */
  timeouts: number;

  /**
   * Total number of errors
   */
  errors: number;
}

/**
 * Connection pool manager for HTTP requests
 */
export class ConnectionPool {
  /**
   * HTTP agent for connection pooling
   */
  private httpAgent: http.Agent;

  /**
   * HTTPS agent for connection pooling
   */
  private httpsAgent: https.Agent;

  /**
   * Connection pool configuration
   */
  private config: Required<ConnectionPoolConfig>;

  /**
   * Connection pool statistics
   */
  private stats: ConnectionPoolStats = {
    activeSockets: 0,
    freeSockets: 0,
    queuedRequests: 0,
    totalRequests: 0,
    timeouts: 0,
    errors: 0,
  };

  /**
   * Create a new connection pool
   *
   * @param config Connection pool configuration
   */
  constructor(config: ConnectionPoolConfig = {}) {
    // Set default configuration
    this.config = {
      maxSockets: config.maxSockets ?? 10,
      maxFreeSockets: config.maxFreeSockets ?? 5,
      timeout: config.timeout ?? 60000,
      keepAliveTimeout: config.keepAliveTimeout ?? 60000,
      keepAlive: config.keepAlive ?? true,
    };

    // Create HTTP agent
    this.httpAgent = new http.Agent({
      keepAlive: this.config.keepAlive,
      keepAliveMsecs: this.config.keepAliveTimeout,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.timeout,
    });

    // Create HTTPS agent
    this.httpsAgent = new https.Agent({
      keepAlive: this.config.keepAlive,
      keepAliveMsecs: this.config.keepAliveTimeout,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.timeout,
    });

    // Log connection pool initialization
    logger.debug('Connection pool initialized', {
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.timeout,
      keepAliveTimeout: this.config.keepAliveTimeout,
      keepAlive: this.config.keepAlive,
    });

    // Start monitoring connections
    this.startMonitoring();
  }

  /**
   * Get the HTTP agent
   *
   * @returns HTTP agent
   */
  getHttpAgent(): http.Agent {
    return this.httpAgent;
  }

  /**
   * Get the HTTPS agent
   *
   * @returns HTTPS agent
   */
  getHttpsAgent(): https.Agent {
    return this.httpsAgent;
  }

  /**
   * Get connection pool statistics
   *
   * @returns Connection pool statistics
   */
  getStats(): ConnectionPoolStats {
    return { ...this.stats };
  }

  /**
   * Update connection pool statistics
   */
  private updateStats(): void {
    // Update HTTP agent stats
    const httpSockets = this.httpAgent.sockets;
    const httpFreeSockets = this.httpAgent.freeSockets;
    const httpRequests = this.httpAgent.requests;

    // Update HTTPS agent stats
    const httpsSockets = this.httpsAgent.sockets;
    const httpsFreeSockets = this.httpsAgent.freeSockets;
    const httpsRequests = this.httpsAgent.requests;

    // Count active sockets
    let activeSockets = 0;
    for (const key in httpSockets) {
      activeSockets += httpSockets[key]?.length || 0;
    }
    for (const key in httpsSockets) {
      activeSockets += httpsSockets[key]?.length || 0;
    }

    // Count free sockets
    let freeSockets = 0;
    for (const key in httpFreeSockets) {
      freeSockets += httpFreeSockets[key]?.length || 0;
    }
    for (const key in httpsFreeSockets) {
      freeSockets += httpsFreeSockets[key]?.length || 0;
    }

    // Count queued requests
    let queuedRequests = 0;
    for (const key in httpRequests) {
      queuedRequests += httpRequests[key]?.length || 0;
    }
    for (const key in httpsRequests) {
      queuedRequests += httpsRequests[key]?.length || 0;
    }

    // Update stats
    this.stats.activeSockets = activeSockets;
    this.stats.freeSockets = freeSockets;
    this.stats.queuedRequests = queuedRequests;
  }

  /**
   * Start monitoring connections
   */
  private startMonitoring(): void {
    // Update stats every 10 seconds
    setInterval(() => {
      this.updateStats();

      // Log connection pool stats
      logger.debug('Connection pool stats', {
        activeSockets: this.stats.activeSockets,
        freeSockets: this.stats.freeSockets,
        queuedRequests: this.stats.queuedRequests,
        totalRequests: this.stats.totalRequests,
        timeouts: this.stats.timeouts,
        errors: this.stats.errors,
      });
    }, 10000);

    // Monitor socket events
    this.monitorSocketEvents();
  }

  /**
   * Monitor socket events
   */
  private monitorSocketEvents(): void {
    // Monitor HTTP agent
    this.httpAgent.on('free', () => {
      this.updateStats();
    });

    this.httpAgent.on('timeout', () => {
      this.stats.timeouts++;
      this.updateStats();
    });

    this.httpAgent.on('error', () => {
      this.stats.errors++;
      this.updateStats();
    });

    // Monitor HTTPS agent
    this.httpsAgent.on('free', () => {
      this.updateStats();
    });

    this.httpsAgent.on('timeout', () => {
      this.stats.timeouts++;
      this.updateStats();
    });

    this.httpsAgent.on('error', () => {
      this.stats.errors++;
      this.updateStats();
    });
  }

  /**
   * Track a new request
   */
  trackRequest(): void {
    this.stats.totalRequests++;
  }

  /**
   * Close all connections
   */
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
    logger.debug('Connection pool destroyed');
  }
}

/**
 * Default connection pool instance
 */
let defaultConnectionPool: ConnectionPool;

/**
 * Configure the default connection pool
 *
 * @param config Connection pool configuration
 */
export function configureConnectionPool(config: ConnectionPoolConfig): void {
  // Destroy existing connection pool if it exists
  if (defaultConnectionPool) {
    defaultConnectionPool.destroy();
  }

  // Create new connection pool
  defaultConnectionPool = new ConnectionPool(config);
}

/**
 * Initialize default connection pool if not already initialized
 */
function ensureDefaultConnectionPool(): void {
  if (!defaultConnectionPool) {
    defaultConnectionPool = new ConnectionPool();
  }
}

/**
 * Get the default connection pool instance
 *
 * @returns Default connection pool instance
 */
export function getConnectionPool(): ConnectionPool {
  ensureDefaultConnectionPool();
  return defaultConnectionPool;
}

export default {
  ConnectionPool,
  configureConnectionPool,
  getConnectionPool,
};
