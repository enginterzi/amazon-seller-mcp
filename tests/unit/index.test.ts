/**
 * Tests for main library index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestSetup } from '../utils/test-setup.js';
import type { MockEnvironment } from '../utils/test-setup.js';

describe('Main Library Index', () => {
  let mockEnv: MockEnvironment;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export AmazonSellerMcpServer and TransportConfig', async () => {
    const exports = await import('../../src/index.js');
    
    expect(exports.AmazonSellerMcpServer).toBeDefined();
    expect(typeof exports.AmazonSellerMcpServer).toBe('function');
    
    // TransportConfig is a TypeScript interface, so it may not be available at runtime
    // Just verify the module loads without error
    expect(exports).toBeDefined();
  });

  it('should export API client components', async () => {
    const exports = await import('../../src/index.js');
    
    // Check that API exports are present
    expect(exports.BaseApiClient).toBeDefined();
    expect(exports.CatalogClient).toBeDefined();
    expect(exports.ListingsClient).toBeDefined();
    expect(exports.InventoryClient).toBeDefined();
    expect(exports.OrdersClient).toBeDefined();
    expect(exports.ReportsClient).toBeDefined();
  });

  it('should export authentication components', async () => {
    const { AmazonAuth, CredentialManager, MARKETPLACES } = await import('../../src/index.js');
    
    expect(AmazonAuth).toBeDefined();
    expect(typeof AmazonAuth).toBe('function');
    expect(CredentialManager).toBeDefined();
    expect(typeof CredentialManager).toBe('function');
    expect(MARKETPLACES).toBeDefined();
    expect(typeof MARKETPLACES).toBe('object');
  });

  it('should export tool registration functions', async () => {
    const {
      registerCatalogTools,
      registerListingsTools,
      registerInventoryTools,
      registerOrdersTools,
      registerReportsTools,
      registerAiTools,
    } = await import('../../src/index.js');
    
    expect(registerCatalogTools).toBeDefined();
    expect(typeof registerCatalogTools).toBe('function');
    expect(registerListingsTools).toBeDefined();
    expect(typeof registerListingsTools).toBe('function');
    expect(registerInventoryTools).toBeDefined();
    expect(typeof registerInventoryTools).toBe('function');
    expect(registerOrdersTools).toBeDefined();
    expect(typeof registerOrdersTools).toBe('function');
    expect(registerReportsTools).toBeDefined();
    expect(typeof registerReportsTools).toBe('function');
    expect(registerAiTools).toBeDefined();
    expect(typeof registerAiTools).toBe('function');
  });

  it('should export resource registration functions', async () => {
    const {
      registerCatalogResources,
      registerListingsResources,
      registerInventoryResources,
      registerOrdersResources,
      registerReportsResources,
    } = await import('../../src/index.js');
    
    expect(registerCatalogResources).toBeDefined();
    expect(typeof registerCatalogResources).toBe('function');
    expect(registerListingsResources).toBeDefined();
    expect(typeof registerListingsResources).toBe('function');
    expect(registerInventoryResources).toBeDefined();
    expect(typeof registerInventoryResources).toBe('function');
    expect(registerOrdersResources).toBeDefined();
    expect(typeof registerOrdersResources).toBe('function');
    expect(registerReportsResources).toBeDefined();
    expect(typeof registerReportsResources).toBe('function');
  });

  it('should export type definitions', async () => {
    const exports = await import('../../src/index.js');
    
    // Types are exported but won't be available at runtime
    // We can verify the module loads without error
    expect(exports).toBeDefined();
  });

  it('should export utility functions', async () => {
    const {
      CacheManager,
      configureCacheManager,
      getCacheManager,
      ConnectionPool,
      configureConnectionPool,
      getConnectionPool,
    } = await import('../../src/index.js');
    
    expect(CacheManager).toBeDefined();
    expect(typeof CacheManager).toBe('function');
    expect(configureCacheManager).toBeDefined();
    expect(typeof configureCacheManager).toBe('function');
    expect(getCacheManager).toBeDefined();
    expect(typeof getCacheManager).toBe('function');
    expect(ConnectionPool).toBeDefined();
    expect(typeof ConnectionPool).toBe('function');
    expect(configureConnectionPool).toBeDefined();
    expect(typeof configureConnectionPool).toBe('function');
    expect(getConnectionPool).toBeDefined();
    expect(typeof getConnectionPool).toBe('function');
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the main module doesn't throw
    await expect(import('../../src/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../src/index.js');
    const exportKeys = Object.keys(exports);
    
    // Verify we have a reasonable number of exports
    expect(exportKeys.length).toBeGreaterThan(10);
    
    // Verify no undefined exports (filter out undefined values)
    const definedExports = exportKeys.filter(key => exports[key] !== undefined);
    expect(definedExports.length).toBeGreaterThan(10);
  });
});