/**
 * Tests for inventory resources registration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import { registerInventoryResources } from '../../../src/resources/inventory/inventory-resources.js';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

describe('Inventory Resources Registration', () => {
  let mockEnv: MockEnvironment;
  let resourceManager: ResourceRegistrationManager;
  let authConfig: any;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
    resourceManager = new ResourceRegistrationManager(mockEnv.server.mcpServer);
    authConfig = TestSetup.createTestAuthConfig();
    
    // Setup spy for resource registration
    vi.spyOn(resourceManager, 'registerResource');
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should register inventory resources without errors', () => {
    expect(() => {
      registerInventoryResources(resourceManager, authConfig);
    }).not.toThrow();
  });

  it('should register amazon-inventory resource', () => {
    registerInventoryResources(resourceManager, authConfig);
    
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-inventory',
      expect.any(Object),
      expect.objectContaining({
        title: 'Amazon Inventory',
        description: 'Manage and view your Amazon inventory levels',
      }),
      expect.any(Function)
    );
  });

  it('should register amazon-inventory-filter resource', () => {
    registerInventoryResources(resourceManager, authConfig);
    
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-inventory-filter',
      expect.any(Object),
      expect.objectContaining({
        title: 'Amazon Inventory Filter',
        description: 'Filter and view your Amazon inventory by various criteria',
      }),
      expect.any(Function)
    );
  });

  it('should register exactly two resources', () => {
    registerInventoryResources(resourceManager, authConfig);
    
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);
  });
});