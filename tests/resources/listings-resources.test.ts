/**
 * Tests for listings resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerListingsResources } from '../../src/resources/listings/listings-resources.js';

describe('Listings Resources', () => {
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

  it('should register listings resources with correct configuration', () => {
    // Act
    registerListingsResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-listings',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Listings',
        description: expect.any(String),
      }),
      expect.any(Function)
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-listings://{sku}',
      'amazon-listings://',
      expect.objectContaining({
        sku: expect.any(Function),
      })
    );
  });
});
