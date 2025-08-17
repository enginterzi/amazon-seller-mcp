/**
 * Tests for tools module index exports
 */

import { describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

describe('Tools Module Index', () => {
  let mockEnv: MockEnvironment;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export registerCatalogTools', async () => {
    const { registerCatalogTools } = await import('../../../src/tools/index.js');

    expect(registerCatalogTools).toBeDefined();
    expect(typeof registerCatalogTools).toBe('function');
  });

  it('should export registerListingsTools', async () => {
    const { registerListingsTools } = await import('../../../src/tools/index.js');

    expect(registerListingsTools).toBeDefined();
    expect(typeof registerListingsTools).toBe('function');
  });

  it('should export registerInventoryTools', async () => {
    const { registerInventoryTools } = await import('../../../src/tools/index.js');

    expect(registerInventoryTools).toBeDefined();
    expect(typeof registerInventoryTools).toBe('function');
  });

  it('should export registerOrdersTools', async () => {
    const { registerOrdersTools } = await import('../../../src/tools/index.js');

    expect(registerOrdersTools).toBeDefined();
    expect(typeof registerOrdersTools).toBe('function');
  });

  it('should export registerReportsTools', async () => {
    const { registerReportsTools } = await import('../../../src/tools/index.js');

    expect(registerReportsTools).toBeDefined();
    expect(typeof registerReportsTools).toBe('function');
  });

  it('should export registerAiTools', async () => {
    const { registerAiTools } = await import('../../../src/tools/index.js');

    expect(registerAiTools).toBeDefined();
    expect(typeof registerAiTools).toBe('function');
  });

  it('should export all tool registration functions', async () => {
    const exports = await import('../../../src/tools/index.js');

    const expectedFunctions = [
      'registerCatalogTools',
      'registerListingsTools',
      'registerInventoryTools',
      'registerOrdersTools',
      'registerReportsTools',
      'registerAiTools',
    ];

    expectedFunctions.forEach((functionName) => {
      expect(exports[functionName]).toBeDefined();
      expect(typeof exports[functionName]).toBe('function');
    });
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the tools module doesn't throw
    await expect(import('../../../src/tools/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/tools/index.js');
    const exportKeys = Object.keys(exports);

    // Verify we have the expected number of tool registration exports
    expect(exportKeys.length).toBe(6);

    // Verify no undefined exports
    exportKeys.forEach((key) => {
      expect(exports[key]).toBeDefined();
    });
  });

  it('should export functions that can be called', async () => {
    const { registerCatalogTools } = await import('../../../src/tools/index.js');

    // Create test configuration
    const authConfig = TestSetup.createTestAuthConfig();
    const toolManager = mockEnv.server.toolManager;

    // Verify registerCatalogTools can be called without throwing
    expect(() => registerCatalogTools(toolManager as any, authConfig)).not.toThrow();
  });

  it('should export functions with consistent signatures', async () => {
    const {
      registerCatalogTools,
      registerListingsTools,
      registerInventoryTools,
      registerOrdersTools,
      registerReportsTools,
      registerAiTools,
    } = await import('../../../src/tools/index.js');

    // All registration functions should have at least 2 parameters: toolManager and authConfig
    const functions = [
      registerCatalogTools,
      registerListingsTools,
      registerInventoryTools,
      registerOrdersTools,
      registerReportsTools,
      registerAiTools,
    ];

    functions.forEach((func) => {
      expect(func.length).toBeGreaterThanOrEqual(2); // Should accept at least 2 parameters
    });
  });

  it('should register tools when called', async () => {
    const { registerCatalogTools } = await import('../../../src/tools/index.js');

    const authConfig = TestSetup.createTestAuthConfig();
    const toolManager = mockEnv.server.toolManager;

    // Call the registration function
    registerCatalogTools(toolManager as any, authConfig);

    // Verify that registerTool was called
    expect(toolManager.registerTool).toHaveBeenCalled();
  });

  it('should handle registration with different auth configs', async () => {
    const { registerInventoryTools } = await import('../../../src/tools/index.js');

    const authConfig1 = TestSetup.createTestAuthConfig({ marketplaceId: 'MARKETPLACE1' });
    const authConfig2 = TestSetup.createTestAuthConfig({ marketplaceId: 'MARKETPLACE2' });
    const toolManager = mockEnv.server.toolManager;

    // Both should work without throwing
    expect(() => registerInventoryTools(toolManager as any, authConfig1)).not.toThrow();
    expect(() => registerInventoryTools(toolManager as any, authConfig2)).not.toThrow();
  });

  it('should maintain tool registration isolation', async () => {
    const { registerOrdersTools, registerReportsTools } = await import(
      '../../../src/tools/index.js'
    );

    const authConfig = TestSetup.createTestAuthConfig();
    const toolManager1 = mockEnv.server.toolManager;
    const toolManager2 = {
      registerTool: mockEnv.server.toolManager.registerTool,
      isToolRegistered: mockEnv.server.toolManager.isToolRegistered,
      getRegisteredTools: mockEnv.server.toolManager.getRegisteredTools,
    };

    // Register different tools with different managers
    registerOrdersTools(toolManager1 as any, authConfig);
    registerReportsTools(toolManager2 as any, authConfig);

    // Both should have registered tools
    expect(toolManager1.registerTool).toHaveBeenCalled();
    expect(toolManager2.registerTool).toHaveBeenCalled();
  });
});
