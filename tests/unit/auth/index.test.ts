/**
 * Tests for authentication module index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';

describe('Auth Module Index', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export AmazonAuth class', async () => {
    const { AmazonAuth } = await import('../../../src/auth/index.js');

    expect(AmazonAuth).toBeDefined();
    expect(typeof AmazonAuth).toBe('function');
  });

  it('should export CredentialManager class', async () => {
    const { CredentialManager } = await import('../../../src/auth/index.js');

    expect(CredentialManager).toBeDefined();
    expect(typeof CredentialManager).toBe('function');
  });

  it('should export MARKETPLACES constant', async () => {
    const { MARKETPLACES } = await import('../../../src/auth/index.js');

    expect(MARKETPLACES).toBeDefined();
    expect(typeof MARKETPLACES).toBe('object');

    // Verify MARKETPLACES has expected structure
    expect(MARKETPLACES).toHaveProperty('US');
    expect(MARKETPLACES).toHaveProperty('CA');
    expect(MARKETPLACES).toHaveProperty('MX');
    expect(MARKETPLACES).toHaveProperty('UK');
    expect(MARKETPLACES).toHaveProperty('DE');
    expect(MARKETPLACES).toHaveProperty('FR');
    expect(MARKETPLACES).toHaveProperty('IT');
    expect(MARKETPLACES).toHaveProperty('ES');
    expect(MARKETPLACES).toHaveProperty('JP');
    expect(MARKETPLACES).toHaveProperty('AU');
  });

  it('should export authentication types', async () => {
    const exports = await import('../../../src/auth/index.js');

    // Types are exported but won't be available at runtime
    // We can verify the module loads without error
    expect(exports).toBeDefined();
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the auth module doesn't throw
    await expect(import('../../../src/auth/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/auth/index.js');
    const exportKeys = Object.keys(exports);

    // Verify we have the expected exports
    expect(exportKeys).toContain('AmazonAuth');
    expect(exportKeys).toContain('CredentialManager');
    expect(exportKeys).toContain('MARKETPLACES');

    // Verify no undefined exports
    exportKeys.forEach((key) => {
      expect(exports[key]).toBeDefined();
    });
  });

  it('should export classes that can be instantiated', async () => {
    const { AmazonAuth, CredentialManager } = await import('../../../src/auth/index.js');

    // Create test configuration
    const authConfig = TestSetup.createTestAuthConfig();

    // Verify AmazonAuth can be instantiated
    expect(() => new AmazonAuth(authConfig)).not.toThrow();

    // Verify CredentialManager can be instantiated
    expect(() => new CredentialManager()).not.toThrow();
  });

  it('should export MARKETPLACES with valid marketplace data', async () => {
    const { MARKETPLACES } = await import('../../../src/auth/index.js');

    // Test a few key marketplaces
    expect(MARKETPLACES.US).toMatchObject({
      marketplaceId: expect.any(String),
      region: expect.any(String),
    });

    expect(MARKETPLACES.UK).toMatchObject({
      marketplaceId: expect.any(String),
      region: expect.any(String),
    });

    expect(MARKETPLACES.JP).toMatchObject({
      marketplaceId: expect.any(String),
      region: expect.any(String),
    });
  });

  it('should maintain consistent marketplace ID format', async () => {
    const { MARKETPLACES } = await import('../../../src/auth/index.js');

    // Verify all marketplace IDs follow expected format
    Object.values(MARKETPLACES).forEach(
      (marketplace: { marketplaceId: string; region: string }) => {
        expect(marketplace.marketplaceId).toMatch(/^[A-Z0-9]{10,14}$/);
        expect(marketplace.region).toMatch(/^[A-Z]{2,4}$/);
      }
    );
  });
});
