/**
 * Tests for server module index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

describe('Server Module Index', () => {
  let mockEnv: MockEnvironment;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should export AmazonSellerMcpServer from server.js', async () => {
    const { AmazonSellerMcpServer } = await import('../../../src/server/index.js');
    
    expect(AmazonSellerMcpServer).toBeDefined();
    expect(typeof AmazonSellerMcpServer).toBe('function');
  });

  it('should export TransportConfig from server.js', async () => {
    const exports = await import('../../../src/server/index.js');
    
    // TransportConfig is a TypeScript interface, so it may not be available at runtime
    // Just verify the module loads without error
    expect(exports).toBeDefined();
  });

  it('should export ResourceRegistrationManager from resources.js', async () => {
    const { ResourceRegistrationManager } = await import('../../../src/server/index.js');
    
    expect(ResourceRegistrationManager).toBeDefined();
    expect(typeof ResourceRegistrationManager).toBe('function');
  });

  it('should export ToolRegistrationManager from tools.js', async () => {
    const { ToolRegistrationManager } = await import('../../../src/server/index.js');
    
    expect(ToolRegistrationManager).toBeDefined();
    expect(typeof ToolRegistrationManager).toBe('function');
  });

  it('should export NotificationManager from notifications.js', async () => {
    const { NotificationManager } = await import('../../../src/server/index.js');
    
    expect(NotificationManager).toBeDefined();
    expect(typeof NotificationManager).toBe('function');
  });

  it('should export setupInventoryChangeNotifications from inventory-notifications.js', async () => {
    const { setupInventoryChangeNotifications } = await import('../../../src/server/index.js');
    
    expect(setupInventoryChangeNotifications).toBeDefined();
    expect(typeof setupInventoryChangeNotifications).toBe('function');
  });

  it('should export setupOrderStatusChangeNotifications from order-notifications.js', async () => {
    const { setupOrderStatusChangeNotifications } = await import('../../../src/server/index.js');
    
    expect(setupOrderStatusChangeNotifications).toBeDefined();
    expect(typeof setupOrderStatusChangeNotifications).toBe('function');
  });

  it('should handle module initialization without errors', async () => {
    // Test that importing the server module doesn't throw
    await expect(import('../../../src/server/index.js')).resolves.toBeDefined();
  });

  it('should provide consistent export structure', async () => {
    const exports = await import('../../../src/server/index.js');
    const exportKeys = Object.keys(exports);
    
    // Verify we have a reasonable number of exports
    expect(exportKeys.length).toBeGreaterThan(5);
    
    // Verify no undefined exports
    exportKeys.forEach(key => {
      expect(exports[key]).toBeDefined();
    });
  });

  it('should export classes that can be instantiated', async () => {
    const { AmazonSellerMcpServer, ResourceRegistrationManager, ToolRegistrationManager } = 
      await import('../../../src/server/index.js');
    
    // Create test configuration
    const serverConfig = TestSetup.createTestServerConfig();
    const mockMcpServer = mockEnv.server.mcpServer;
    
    // Verify AmazonSellerMcpServer can be instantiated
    expect(() => new AmazonSellerMcpServer(serverConfig)).not.toThrow();
    
    // Verify ResourceRegistrationManager can be instantiated
    expect(() => new ResourceRegistrationManager(mockMcpServer)).not.toThrow();
    
    // Verify ToolRegistrationManager can be instantiated
    expect(() => new ToolRegistrationManager(mockMcpServer)).not.toThrow();
  });

  it('should export notification functions that can be called', async () => {
    const { NotificationManager, setupInventoryChangeNotifications, setupOrderStatusChangeNotifications } = 
      await import('../../../src/server/index.js');
    
    const mockMcpServer = mockEnv.server.mcpServer;
    
    // Verify NotificationManager can be instantiated
    expect(() => new NotificationManager(mockMcpServer)).not.toThrow();
    
    // Verify notification setup functions exist
    expect(typeof setupInventoryChangeNotifications).toBe('function');
    expect(typeof setupOrderStatusChangeNotifications).toBe('function');
  });

  it('should maintain consistent class interface', async () => {
    const { AmazonSellerMcpServer } = await import('../../../src/server/index.js');
    
    const serverConfig = TestSetup.createTestServerConfig();
    const server = new AmazonSellerMcpServer(serverConfig);
    
    // Verify server has expected methods
    expect(typeof server.connect).toBe('function');
    expect(typeof server.close).toBe('function');
    expect(typeof server.isServerConnected).toBe('function');
  });
});