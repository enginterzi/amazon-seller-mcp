/**
 * Base mock factory infrastructure for centralized mock management
 */
import { vi, type Mock } from 'vitest';

/**
 * Generic mock factory interface for creating and managing mocks
 */
export interface MockFactory<T = any> {
  /**
   * Create a mock instance with optional overrides
   */
  create(overrides?: Partial<T>): T;

  /**
   * Create multiple mock instances
   */
  createMultiple(count: number, overrides?: Partial<T>[]): T[];

  /**
   * Reset the factory to its initial state
   */
  reset(): void;

  /**
   * Get the factory name for identification
   */
  getName(): string;
}

/**
 * Base mock factory implementation with common functionality
 */
export abstract class BaseMockFactory<T = any> implements MockFactory<T> {
  protected readonly name: string;
  protected instances: T[] = [];
  protected defaultConfig: Partial<T>;

  constructor(name: string, defaultConfig: Partial<T> = {}) {
    this.name = name;
    this.defaultConfig = defaultConfig;
  }

  /**
   * Create a mock instance with optional overrides
   */
  abstract create(overrides?: Partial<T>): T;

  /**
   * Create multiple mock instances
   */
  createMultiple(count: number, overrides?: Partial<T>[]): T[] {
    const instances: T[] = [];

    for (let i = 0; i < count; i++) {
      const override = overrides?.[i] || {};
      instances.push(this.create(override));
    }

    return instances;
  }

  /**
   * Reset the factory to its initial state
   */
  reset(): void {
    this.instances = [];
    this.resetMocks();
  }

  /**
   * Get the factory name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Reset all vitest mocks created by this factory
   */
  protected resetMocks(): void {
    vi.resetAllMocks();
  }

  /**
   * Create a vitest mock function with optional implementation
   */
  protected createMockFn<TArgs extends any[] = any[], TReturn = any>(
    implementation?: (...args: TArgs) => TReturn
  ): Mock<TArgs, TReturn> {
    return implementation ? vi.fn(implementation) : vi.fn();
  }

  /**
   * Merge default configuration with overrides
   */
  protected mergeConfig(overrides: Partial<T> = {}): Partial<T> {
    return { ...this.defaultConfig, ...overrides };
  }
}

/**
 * Factory registry for managing multiple mock factories
 */
export class MockFactoryRegistry {
  private static instance: MockFactoryRegistry;
  private factories: Map<string, MockFactory> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): MockFactoryRegistry {
    if (!MockFactoryRegistry.instance) {
      MockFactoryRegistry.instance = new MockFactoryRegistry();
    }
    return MockFactoryRegistry.instance;
  }

  /**
   * Register a mock factory
   */
  register<T>(factory: MockFactory<T>): void {
    this.factories.set(factory.getName(), factory);
  }

  /**
   * Get a registered factory by name
   */
  get<T>(name: string): MockFactory<T> | undefined {
    return this.factories.get(name) as MockFactory<T>;
  }

  /**
   * Check if a factory is registered
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Reset all registered factories
   */
  resetAll(): void {
    for (const factory of this.factories.values()) {
      factory.reset();
    }
  }

  /**
   * Clear all registered factories
   */
  clear(): void {
    this.resetAll();
    this.factories.clear();
  }

  /**
   * Get all registered factory names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Mock scenario configuration for different test scenarios
 */
export interface MockScenario {
  name: string;
  description: string;
  setup: () => void;
  teardown?: () => void;
}

/**
 * Mock scenario manager for handling different test scenarios
 */
export class MockScenarioManager {
  private scenarios: Map<string, MockScenario> = new Map();
  private activeScenario: string | null = null;

  /**
   * Register a mock scenario
   */
  register(scenario: MockScenario): void {
    this.scenarios.set(scenario.name, scenario);
  }

  /**
   * Activate a mock scenario
   */
  activate(scenarioName: string): void {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Mock scenario not found: ${scenarioName}`);
    }

    // Teardown previous scenario if active
    if (this.activeScenario) {
      this.deactivate();
    }

    // Setup new scenario
    scenario.setup();
    this.activeScenario = scenarioName;
  }

  /**
   * Deactivate the current scenario
   */
  deactivate(): void {
    if (!this.activeScenario) {
      return;
    }

    const scenario = this.scenarios.get(this.activeScenario);
    if (scenario?.teardown) {
      scenario.teardown();
    }

    this.activeScenario = null;
  }

  /**
   * Get the active scenario name
   */
  getActiveScenario(): string | null {
    return this.activeScenario;
  }

  /**
   * Check if a scenario is registered
   */
  hasScenario(name: string): boolean {
    return this.scenarios.has(name);
  }

  /**
   * Reset all scenarios
   */
  reset(): void {
    this.deactivate();
    this.scenarios.clear();
  }
}

/**
 * Test isolation utilities for proper test cleanup
 */
export class TestIsolationUtils {
  private static cleanupTasks: (() => void)[] = [];

  /**
   * Register a cleanup task to be executed during test teardown
   */
  static registerCleanup(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Execute all registered cleanup tasks
   */
  static cleanup(): void {
    for (const task of this.cleanupTasks) {
      try {
        task();
      } catch (error) {
        process.stderr.write(`WARNING: Cleanup task failed: ${error}\n`);
      }
    }
    this.cleanupTasks = [];
  }

  /**
   * Reset all mock factories and cleanup
   */
  static resetAll(): void {
    MockFactoryRegistry.getInstance().resetAll();
    this.cleanup();
  }
}

/**
 * Common mock utilities for test setup
 */
export class MockUtils {
  /**
   * Create a mock promise that resolves with the given value
   */
  static createResolvedPromise<T>(value: T): Promise<T> {
    return Promise.resolve(value);
  }

  /**
   * Create a mock promise that rejects with the given error
   */
  static createRejectedPromise(error: Error): Promise<never> {
    return Promise.reject(error);
  }

  /**
   * Create a mock function that returns different values on subsequent calls
   */
  static createSequentialMock<T>(...values: T[]): Mock<[], T> {
    let callCount = 0;
    return vi.fn(() => {
      const value = values[callCount % values.length];
      callCount++;
      return value;
    });
  }

  /**
   * Create a mock function that throws an error after a certain number of calls
   */
  static createFailAfterMock<T>(successValue: T, failAfter: number, error: Error): Mock<[], T> {
    let callCount = 0;
    return vi.fn(() => {
      callCount++;
      if (callCount > failAfter) {
        throw error;
      }
      return successValue;
    });
  }

  /**
   * Create a mock function with delay simulation
   */
  static createDelayedMock<T>(value: T, delay: number): Mock<[], Promise<T>> {
    return vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(value), delay)));
  }
}
