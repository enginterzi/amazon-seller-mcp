/**
 * Comprehensive tests for all Amazon Seller MCP resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerCatalogResources } from '../../src/resources/catalog/catalog-resources.js';
import { registerListingsResources } from '../../src/resources/listings/listings-resources.js';
import { registerInventoryResources } from '../../src/resources/inventory/inventory-resources.js';
import { registerOrdersResources } from '../../src/resources/orders/orders-resources.js';
import { registerReportsResources } from '../../src/resources/reports/reports-resources.js';

describe('Amazon Seller MCP Resources', () => {
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

  it('should register all resources without errors', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);
    registerListingsResources(resourceManager, authConfig);
    registerInventoryResources(resourceManager, authConfig);
    registerOrdersResources(resourceManager, authConfig);
    registerReportsResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(11);
  });

  it('should register resources with proper configuration', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-catalog',
      expect.anything(),
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
      }),
      expect.any(Function)
    );
  });

  it('should create resource templates with proper URI patterns', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);
    registerListingsResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog://{asin}',
      'amazon-catalog://',
      expect.objectContaining({
        asin: expect.any(Function),
      })
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
