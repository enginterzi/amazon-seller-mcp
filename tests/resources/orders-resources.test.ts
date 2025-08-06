/**
 * Tests for orders resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerOrdersResources } from '../../src/resources/orders/orders-resources.js';

describe('Orders Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: any;

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

  it('should register orders resources with correct configuration', () => {
    // Act
    registerOrdersResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(3);
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-orders',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Orders',
        description: expect.any(String),
      }),
      expect.any(Function)
    );
    
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-order-action',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Order Actions',
        description: expect.any(String),
      }),
      expect.any(Function)
    );
  });

  it('should create resource templates with proper URI patterns', () => {
    // Act
    registerOrdersResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-orders://{amazonOrderId}',
      'amazon-orders://',
      expect.objectContaining({
        amazonOrderId: expect.any(Function),
      })
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-order-action://{amazonOrderId}/{action}'
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-order-filter://{filter}',
      'amazon-order-filter://'
    );
  });
});
