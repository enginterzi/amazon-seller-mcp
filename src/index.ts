/**
 * Amazon Seller MCP Client
 *
 * A Model Context Protocol (MCP) client for Amazon Selling Partner API.
 * This library enables AI agents to interact with Amazon Seller accounts through
 * a standardized protocol, allowing for automated management of product listings,
 * inventory, orders, and other seller operations.
 *
 * @module amazon-seller-mcp-client
 * @packageDocumentation
 */

/**
 * Server components for creating and managing an MCP server
 * @category Server
 */
export { AmazonSellerMcpServer, TransportConfig } from './server/server.js';

/**
 * API client components for interacting with Amazon Selling Partner API
 * @category API
 */
export * from './api/index.js';

/**
 * Authentication components for Amazon Selling Partner API
 * @category Authentication
 */
export { AmazonAuth } from './auth/amazon-auth.js';
export { CredentialManager, MARKETPLACES } from './auth/credential-manager.js';

/**
 * Tool registration functions for MCP tools
 * @category Tools
 */
export { registerCatalogTools } from './tools/catalog-tools.js';
export { registerListingsTools } from './tools/listings-tools.js';
export { registerInventoryTools } from './tools/inventory-tools.js';
export { registerOrdersTools } from './tools/orders-tools.js';
export { registerReportsTools } from './tools/reports-tools.js';
export { registerAiTools } from './tools/ai-tools.js';

/**
 * Resource registration functions for MCP resources
 * @category Resources
 */
export { registerCatalogResources } from './resources/catalog/catalog-resources.js';
export { registerListingsResources } from './resources/listings/listings-resources.js';
export { registerInventoryResources } from './resources/inventory/inventory-resources.js';
export { registerOrdersResources } from './resources/orders/orders-resources.js';
export { registerReportsResources } from './resources/reports/reports-resources.js';

/**
 * Type definitions for authentication, API, and MCP components
 * @category Types
 */
export * from './types/auth.js';
export * from './types/api.js';

/**
 * Utility functions for performance optimization
 * @category Utils
 */
export { CacheManager, configureCacheManager, getCacheManager } from './utils/cache-manager.js';

export {
  ConnectionPool,
  configureConnectionPool,
  getConnectionPool,
} from './utils/connection-pool.js';
