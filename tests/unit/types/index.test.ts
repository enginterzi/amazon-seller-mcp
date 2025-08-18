/**
 * Tests for types module index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';

describe('Types Module Index', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the types module doesn't throw
    await expect(import('../../../src/types/index.js')).resolves.toBeDefined();
  });

  it('should export auth types', async () => {
    const exports = await import('../../../src/types/index.js');

    // Types are exported but won't be available at runtime
    // We can verify the module loads without error
    expect(exports).toBeDefined();
  });

  it('should export API types', async () => {
    const exports = await import('../../../src/types/index.js');

    // Types are exported but won't be available at runtime
    // We can verify the module loads without error
    expect(exports).toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/types/index.js');

    // Since types are compile-time only, we can only verify the module loads
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export validation functions and type guards', async () => {
    const exports = await import('../../../src/types/index.js');
    const exportKeys = Object.keys(exports);

    // Should export validation functions and type guards
    expect(exportKeys.length).toBeGreaterThan(0);

    // Check for validation functions
    expect(exports.TypeValidationError).toBeDefined();
    expect(exports.validateAmazonCatalogItem).toBeDefined();
    expect(exports.validateAmazonOrder).toBeDefined();

    // Check for type guard functions
    expect(exports.isAmazonCatalogItem).toBeDefined();
    expect(exports.isErrorDetails).toBeDefined();
    expect(exports.isMcpRequestBody).toBeDefined();

    // Verify they are functions
    expect(typeof exports.validateAmazonCatalogItem).toBe('function');
    expect(typeof exports.isAmazonCatalogItem).toBe('function');
  });

  it('should support type imports in TypeScript context', async () => {
    // This test verifies that the types can be imported without errors
    // In a real TypeScript context, these would be available as types

    try {
      await import('../../../src/types/index.js');
      // If we get here, the import succeeded
      expect(true).toBe(true);
    } catch (error) {
      // If import fails, the test should fail
      expect(error).toBeUndefined();
    }
  });

  it('should maintain type module structure', async () => {
    // Verify that the types module can be imported alongside other modules
    const [typesModule, authModule, apiModule] = await Promise.all([
      import('../../../src/types/index.js'),
      import('../../../src/auth/index.js'),
      import('../../../src/api/index.js'),
    ]);

    expect(typesModule).toBeDefined();
    expect(authModule).toBeDefined();
    expect(apiModule).toBeDefined();
  });

  it('should not interfere with runtime module loading', async () => {
    // Import types module first, then runtime modules
    await import('../../../src/types/index.js');

    const { AmazonAuth } = await import('../../../src/auth/index.js');
    const { BaseApiClient } = await import('../../../src/api/index.js');

    // Verify runtime modules still work after types import
    expect(AmazonAuth).toBeDefined();
    expect(typeof AmazonAuth).toBe('function');
    expect(BaseApiClient).toBeDefined();
    expect(typeof BaseApiClient).toBe('function');
  });

  it('should support re-export pattern', async () => {
    // Verify that the re-export pattern works correctly
    const typesExports = await import('../../../src/types/index.js');
    const authExports = await import('../../../src/types/auth.js');
    const apiExports = await import('../../../src/types/api.js');

    // All should load without errors
    expect(typesExports).toBeDefined();
    expect(authExports).toBeDefined();
    expect(apiExports).toBeDefined();
  });

  it('should maintain module isolation', async () => {
    // Import the types module multiple times
    const import1 = await import('../../../src/types/index.js');
    const import2 = await import('../../../src/types/index.js');
    const import3 = await import('../../../src/types/index.js');

    // All imports should succeed and reference the same module
    expect(import1).toBe(import2);
    expect(import2).toBe(import3);
  });
});
