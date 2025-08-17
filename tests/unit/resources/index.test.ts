/**
 * Tests for resources module index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ResourceManager } from '@modelcontextprotocol/sdk/server/index.js';
import { TestSetup } from '../../utils/test-setup.js';

describe('Resources Module Index', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export registerCatalogResources', async () => {
    const { registerCatalogResources } = await import('../../../src/resources/index.js');

    expect(registerCatalogResources).toBeDefined();
    expect(typeof registerCatalogResources).toBe('function');
  });

  it('should export registerListingsResources', async () => {
    const { registerListingsResources } = await import('../../../src/resources/index.js');

    expect(registerListingsResources).toBeDefined();
    expect(typeof registerListingsResources).toBe('function');
  });

  it('should export registerInventoryResources', async () => {
    const { registerInventoryResources } = await import('../../../src/resources/index.js');

    expect(registerInventoryResources).toBeDefined();
    expect(typeof registerInventoryResources).toBe('function');
  });

  it('should export registerOrdersResources', async () => {
    const { registerOrdersResources } = await import('../../../src/resources/index.js');

    expect(registerOrdersResources).toBeDefined();
    expect(typeof registerOrdersResources).toBe('function');
  });

  it('should export registerReportsResources', async () => {
    const { registerReportsResources } = await import('../../../src/resources/index.js');

    expect(registerReportsResources).toBeDefined();
    expect(typeof registerReportsResources).toBe('function');
  });

  it('should export all resource registration functions', async () => {
    const exports = await import('../../../src/resources/index.js');

    const expectedFunctions = [
      'registerCatalogResources',
      'registerListingsResources',
      'registerInventoryResources',
      'registerOrdersResources',
      'registerReportsResources',
    ];

    expectedFunctions.forEach((functionName) => {
      expect(exports[functionName]).toBeDefined();
      expect(typeof exports[functionName]).toBe('function');
    });
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the resources module doesn't throw
    await expect(import('../../../src/resources/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/resources/index.js');
    const exportKeys = Object.keys(exports);

    // Verify we have the expected number of resource registration exports
    expect(exportKeys.length).toBe(5);

    // Verify no undefined exports
    exportKeys.forEach((key) => {
      expect(exports[key]).toBeDefined();
    });
  });

  it('should export functions that can be called', async () => {
    const { registerCatalogResources } = await import('../../../src/resources/index.js');

    // Create test configuration
    const authConfig = TestSetup.createTestAuthConfig();
    const resourceManager = {
      registerResource: () => {},
      createResourceTemplate: () => ({}),
    };

    // Verify registerCatalogResources can be called without throwing
    expect(() =>
      registerCatalogResources(resourceManager as ResourceManager, authConfig)
    ).not.toThrow();
  });
});
