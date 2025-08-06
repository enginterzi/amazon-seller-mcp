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

      // Mock console.warn to capture the warning
      const originalWarn = console.warn;
      const mockWarn = vi.fn();
      console.warn = mockWarn;

      resetAllFactories();

      expect(mockWarn).toHaveBeenCalledWith(
        'resetAllFactories: Please import MockFactoryRegistry and TestIsolationUtils directly to avoid circular dependencies'
      );

      // Restore console.warn
      console.warn = originalWarn;
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