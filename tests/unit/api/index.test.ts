/**
 * Tests for API module index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

describe('API Module Index', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export BaseApiClient', async () => {
    const { BaseApiClient } = await import('../../../src/api/index.js');

    expect(BaseApiClient).toBeDefined();
    expect(typeof BaseApiClient).toBe('function');
  });

  it('should export CatalogClient', async () => {
    const { CatalogClient } = await import('../../../src/api/index.js');

    expect(CatalogClient).toBeDefined();
    expect(typeof CatalogClient).toBe('function');
  });

  it('should export ListingsClient', async () => {
    const { ListingsClient } = await import('../../../src/api/index.js');

    expect(ListingsClient).toBeDefined();
    expect(typeof ListingsClient).toBe('function');
  });

  it('should export InventoryClient', async () => {
    const { InventoryClient } = await import('../../../src/api/index.js');

    expect(InventoryClient).toBeDefined();
    expect(typeof InventoryClient).toBe('function');
  });

  it('should export OrdersClient', async () => {
    const { OrdersClient } = await import('../../../src/api/index.js');

    expect(OrdersClient).toBeDefined();
    expect(typeof OrdersClient).toBe('function');
  });

  it('should export ReportsClient', async () => {
    const { ReportsClient } = await import('../../../src/api/index.js');

    expect(ReportsClient).toBeDefined();
    expect(typeof ReportsClient).toBe('function');
  });

  it('should export all API client classes', async () => {
    const exports = await import('../../../src/api/index.js');

    const expectedClients = [
      'BaseApiClient',
      'CatalogClient',
      'ListingsClient',
      'InventoryClient',
      'OrdersClient',
      'ReportsClient',
    ];

    expectedClients.forEach((clientName) => {
      expect(exports[clientName]).toBeDefined();
      expect(typeof exports[clientName]).toBe('function');
    });
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the API module doesn't throw
    await expect(import('../../../src/api/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/api/index.js');
    const exportKeys = Object.keys(exports);

    // Verify we have the expected number of API client exports
    expect(exportKeys.length).toBeGreaterThanOrEqual(6);

    // Verify no undefined exports
    exportKeys.forEach((key) => {
      expect(exports[key]).toBeDefined();
    });
  });

  it('should export classes that can be instantiated', async () => {
    const { BaseApiClient } = await import('../../../src/api/index.js');

    // Create test configuration
    const authConfig = TestSetup.createTestAuthConfig();
    const apiClientConfig = TestSetup.createTestApiClientConfig();

    // Verify BaseApiClient can be instantiated
    expect(() => new BaseApiClient(authConfig, apiClientConfig)).not.toThrow();
  });
});
