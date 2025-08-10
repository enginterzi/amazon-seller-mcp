/**
 * Tests for inventory resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerInventoryResources } from '../../src/resources/inventory/inventory-resources.js';
import type { AuthConfig } from '../../src/types/auth.js';

describe('Inventory Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: AuthConfig;

  beforeEach(() => {
    // Create mock server and resource manager
    const mockServer = {
      registerResource: vi.fn(),
    };
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Spy on resource manager methods
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');

    // Create test auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: 'NA',
      marketplaceId: 'ATVPDKIKX0DER',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register inventory resources with correct configuration', () => {
    // Act
    registerInventoryResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-inventory',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Inventory',
        description: expect.any(String),
      }),
      expect.any(Function)
    );

    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-inventory-filter',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Inventory Filter',
        description: expect.any(String),
      }),
      expect.any(Function)
    );
  });

  it('should create resource templates with proper URI patterns', () => {
    // Act
    registerInventoryResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-inventory://{sku}',
      'amazon-inventory://',
      expect.objectContaining({
        sku: expect.any(Function),
      })
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-inventory-filter://{filter}',
      'amazon-inventory-filter://'
    );
  });
});
