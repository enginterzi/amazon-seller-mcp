/**
 * Tests for base mock factory infrastructure
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BaseMockFactory,
  MockFactoryRegistry,
  MockScenarioManager,
  TestIsolationUtils,
  MockUtils,
  type MockFactory,
  type MockScenario,
} from './base-factory.js';

// Test implementation of BaseMockFactory
class TestMockFactory extends BaseMockFactory<{ id: string; value: number }> {
  constructor() {
    super('test-factory', { value: 0 });
  }

  create(overrides: Partial<{ id: string; value: number }> = {}) {
    const config = this.mergeConfig(overrides);
    const instance = {
      id: config.id || `test-${this.instances.length}`,
      value: config.value || 0,
    };
    this.instances.push(instance);
    return instance;
  }
}

describe('BaseMockFactory', () => {
  let factory: TestMockFactory;

  beforeEach(() => {
    factory = new TestMockFactory();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock instance with default config', () => {
      const instance = factory.create();

      expect(instance).toEqual({
        id: 'test-0',
        value: 0,
      });
    });

    it('should create a mock instance with overrides', () => {
      const instance = factory.create({
        id: 'custom-id',
        value: 42,
      });

      expect(instance).toEqual({
        id: 'custom-id',
        value: 42,
      });
    });

    it('should track created instances', () => {
      factory.create();
      factory.create();

      expect(factory['instances']).toHaveLength(2);
    });
  });

  describe('createMultiple', () => {
    it('should create multiple instances with default config', () => {
      const instances = factory.createMultiple(3);

      expect(instances).toHaveLength(3);
      expect(instances[0]).toEqual({ id: 'test-0', value: 0 });
      expect(instances[1]).toEqual({ id: 'test-1', value: 0 });
      expect(instances[2]).toEqual({ id: 'test-2', value: 0 });
    });

    it('should create multiple instances with individual overrides', () => {
      const instances = factory.createMultiple(2, [
        { id: 'first', value: 1 },
        { id: 'second', value: 2 },
      ]);

      expect(instances).toHaveLength(2);
      expect(instances[0]).toEqual({ id: 'first', value: 1 });
      expect(instances[1]).toEqual({ id: 'second', value: 2 });
    });

    it('should handle partial overrides array', () => {
      const instances = factory.createMultiple(3, [{ id: 'first' }]);

      expect(instances).toHaveLength(3);
      expect(instances[0]).toEqual({ id: 'first', value: 0 });
      expect(instances[1]).toEqual({ id: 'test-1', value: 0 });
      expect(instances[2]).toEqual({ id: 'test-2', value: 0 });
    });
  });

  describe('reset', () => {
    it('should clear instances and reset mocks', () => {
      factory.create();
      factory.create();

      expect(factory['instances']).toHaveLength(2);

      factory.reset();

      expect(factory['instances']).toHaveLength(0);
    });
  });

  describe('getName', () => {
    it('should return the factory name', () => {
      expect(factory.getName()).toBe('test-factory');
    });
  });
});

describe('MockFactoryRegistry', () => {
  let registry: MockFactoryRegistry;
  let factory1: MockFactory;
  let factory2: MockFactory;

  beforeEach(() => {
    registry = MockFactoryRegistry.getInstance();
    registry.clear();

    factory1 = new TestMockFactory();
    factory2 = new TestMockFactory();
    // Override name for second factory
    (factory2 as any).name = 'test-factory-2';
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a factory', () => {
      registry.register(factory1);

      expect(registry.has('test-factory')).toBe(true);
      expect(registry.get('test-factory')).toBe(factory1);
    });

    it('should register multiple factories', () => {
      registry.register(factory1);
      registry.register(factory2);

      expect(registry.has('test-factory')).toBe(true);
      expect(registry.has('test-factory-2')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return registered factory', () => {
      registry.register(factory1);

      const retrieved = registry.get('test-factory');

      expect(retrieved).toBe(factory1);
    });

    it('should return undefined for unregistered factory', () => {
      const retrieved = registry.get('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('resetAll', () => {
    it('should reset all registered factories', () => {
      // Create instances to verify they get reset
      factory1.create();
      factory2.create();
      
      registry.register(factory1);
      registry.register(factory2);

      // Verify instances exist before reset
      expect(factory1['instances']).toHaveLength(1);
      expect(factory2['instances']).toHaveLength(1);

      registry.resetAll();

      // Verify instances were cleared after reset
      expect(factory1['instances']).toHaveLength(0);
      expect(factory2['instances']).toHaveLength(0);
    });
  });

  describe('getRegisteredNames', () => {
    it('should return all registered factory names', () => {
      registry.register(factory1);
      registry.register(factory2);

      const names = registry.getRegisteredNames();

      expect(names).toContain('test-factory');
      expect(names).toContain('test-factory-2');
      expect(names).toHaveLength(2);
    });
  });
});

describe('MockScenarioManager', () => {
  let manager: MockScenarioManager;
  let setupSpy: ReturnType<typeof vi.fn>;
  let teardownSpy: ReturnType<typeof vi.fn>;
  let scenario: MockScenario;

  beforeEach(() => {
    manager = new MockScenarioManager();
    setupSpy = vi.fn();
    teardownSpy = vi.fn();

    scenario = {
      name: 'test-scenario',
      description: 'Test scenario for testing',
      setup: setupSpy,
      teardown: teardownSpy,
    };
  });

  afterEach(() => {
    manager.reset();
  });

  describe('register', () => {
    it('should register a scenario', () => {
      manager.register(scenario);

      expect(manager.hasScenario('test-scenario')).toBe(true);
    });
  });

  describe('activate', () => {
    it('should activate a scenario and call setup', () => {
      manager.register(scenario);

      manager.activate('test-scenario');

      expect(setupSpy).toHaveBeenCalledTimes(1);
      expect(manager.getActiveScenario()).toBe('test-scenario');
    });

    it('should throw error for non-existent scenario', () => {
      expect(() => manager.activate('non-existent')).toThrow(
        'Mock scenario not found: non-existent'
      );
    });

    it('should teardown previous scenario when activating new one', () => {
      const scenario2 = {
        name: 'test-scenario-2',
        description: 'Second test scenario',
        setup: vi.fn(),
        teardown: vi.fn(),
      };

      manager.register(scenario);
      manager.register(scenario2);

      manager.activate('test-scenario');
      manager.activate('test-scenario-2');

      expect(teardownSpy).toHaveBeenCalledTimes(1);
      expect(scenario2.setup).toHaveBeenCalledTimes(1);
      expect(manager.getActiveScenario()).toBe('test-scenario-2');
    });
  });

  describe('deactivate', () => {
    it('should deactivate active scenario and call teardown', () => {
      manager.register(scenario);
      manager.activate('test-scenario');

      manager.deactivate();

      expect(teardownSpy).toHaveBeenCalledTimes(1);
      expect(manager.getActiveScenario()).toBeNull();
    });

    it('should handle deactivation when no scenario is active', () => {
      expect(() => manager.deactivate()).not.toThrow();
    });

    it('should handle scenario without teardown', () => {
      const scenarioWithoutTeardown = {
        name: 'no-teardown',
        description: 'Scenario without teardown',
        setup: vi.fn(),
      };

      manager.register(scenarioWithoutTeardown);
      manager.activate('no-teardown');

      expect(() => manager.deactivate()).not.toThrow();
    });
  });
});

describe('TestIsolationUtils', () => {
  beforeEach(() => {
    TestIsolationUtils.cleanup();
  });

  afterEach(() => {
    TestIsolationUtils.cleanup();
  });

  describe('registerCleanup', () => {
    it('should register and execute cleanup tasks', () => {
      const cleanupTask = vi.fn();

      TestIsolationUtils.registerCleanup(cleanupTask);
      TestIsolationUtils.cleanup();

      expect(cleanupTask).toHaveBeenCalledTimes(1);
    });

    it('should perform multiple cleanup tasks when cleaning up', () => {
      const task1 = vi.fn();
      const task2 = vi.fn();

      TestIsolationUtils.registerCleanup(task1);
      TestIsolationUtils.registerCleanup(task2);
      TestIsolationUtils.cleanup();

      expect(task1).toHaveBeenCalledTimes(1);
      expect(task2).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup task errors gracefully', () => {
      const errorTask = vi.fn(() => {
        throw new Error('Cleanup error');
      });
      const normalTask = vi.fn();

      TestIsolationUtils.registerCleanup(errorTask);
      TestIsolationUtils.registerCleanup(normalTask);

      expect(() => TestIsolationUtils.cleanup()).not.toThrow();
      expect(errorTask).toHaveBeenCalledTimes(1);
      expect(normalTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetAll', () => {
    it('should reset factory registry and cleanup', () => {
      const registry = MockFactoryRegistry.getInstance();
      const resetSpy = vi.spyOn(registry, 'resetAll');
      const cleanupTask = vi.fn();

      TestIsolationUtils.registerCleanup(cleanupTask);
      TestIsolationUtils.resetAll();

      expect(resetSpy).toHaveBeenCalledTimes(1);
      expect(cleanupTask).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MockUtils', () => {
  describe('createResolvedPromise', () => {
    it('should create a resolved promise', async () => {
      const promise = MockUtils.createResolvedPromise('test-value');

      await expect(promise).resolves.toBe('test-value');
    });
  });

  describe('createRejectedPromise', () => {
    it('should create a rejected promise', async () => {
      const error = new Error('Test error');
      const promise = MockUtils.createRejectedPromise(error);

      await expect(promise).rejects.toThrow('Test error');
    });
  });

  describe('createSequentialMock', () => {
    it('should return values in sequence', () => {
      const mock = MockUtils.createSequentialMock('first', 'second', 'third');

      expect(mock()).toBe('first');
      expect(mock()).toBe('second');
      expect(mock()).toBe('third');
      expect(mock()).toBe('first'); // Should cycle back
    });
  });

  describe('createFailAfterMock', () => {
    it('should succeed then fail after specified calls', () => {
      const error = new Error('Failure');
      const mock = MockUtils.createFailAfterMock('success', 2, error);

      expect(mock()).toBe('success');
      expect(mock()).toBe('success');
      expect(() => mock()).toThrow('Failure');
    });
  });

  describe('createDelayedMock', () => {
    it('should return a promise that resolves after delay', async () => {
      const mock = MockUtils.createDelayedMock('delayed-value', 10);
      const startTime = Date.now();

      const result = await mock();
      const endTime = Date.now();

      expect(result).toBe('delayed-value');
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });
});