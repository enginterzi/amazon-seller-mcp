/**
 * Tests for mock factories index
 */
import { describe, it, expect, vi } from 'vitest';
import {
  resetAllFactories,
  MockFactoryRegistry,
  AxiosMockFactory,
  BaseApiClientMockFactory,
  AmazonAuthMockFactory,
} from './index.js';

describe('Mock Factories Index', () => {
  describe('resetAllFactories', () => {
    it('should be a function that warns about direct imports', () => {
      expect(typeof resetAllFactories).toBe('function');

      // Mock process.stderr.write to capture the warning
      const originalWrite = process.stderr.write;
      const mockWrite = vi.fn();
      process.stderr.write = mockWrite as typeof process.stderr.write;

      resetAllFactories();

      expect(mockWrite).toHaveBeenCalledWith(
        'WARNING: resetAllFactories: Please import MockFactoryRegistry and TestIsolationUtils directly to avoid circular dependencies\n'
      );

      // Restore process.stderr.write
      process.stderr.write = originalWrite;
    });
  });

  describe('exports', () => {
    it('should export all required types and classes', () => {
      // This test mainly ensures the imports work correctly
      expect(AxiosMockFactory).toBeDefined();
      expect(BaseApiClientMockFactory).toBeDefined();
      expect(AmazonAuthMockFactory).toBeDefined();
      expect(MockFactoryRegistry).toBeDefined();
    });

    it('should allow creating individual factories', () => {
      const axiosFactory = new AxiosMockFactory();
      const apiClientFactory = new BaseApiClientMockFactory();
      const authFactory = new AmazonAuthMockFactory();

      expect(axiosFactory).toBeInstanceOf(AxiosMockFactory);
      expect(apiClientFactory).toBeInstanceOf(BaseApiClientMockFactory);
      expect(authFactory).toBeInstanceOf(AmazonAuthMockFactory);
    });

    it('should allow using the registry directly', () => {
      const registry = MockFactoryRegistry.getInstance();
      const axiosFactory = new AxiosMockFactory();

      registry.register(axiosFactory);

      expect(registry.has('axios-factory')).toBe(true);

      const retrievedFactory = registry.get('axios-factory');
      expect(retrievedFactory).toBeDefined();
      expect(retrievedFactory).toBe(axiosFactory);

      // Clean up
      registry.clear();
    });
  });
});
