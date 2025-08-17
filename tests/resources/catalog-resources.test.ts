/**
 * Tests for catalog resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerCatalogResources } from '../../src/resources/catalog/catalog-resources.js';
import type { AuthConfig } from '../../src/types/auth.js';

describe('Catalog Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let authConfig: AuthConfig;

  beforeEach(() => {
    // Create mock server and resource manager
    const mockServer = {
      registerResource: vi.fn(),
    } as Pick<McpServer, 'registerResource'>;
    resourceManager = new ResourceRegistrationManager(mockServer);

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

  it('should register catalog resources with correct configuration', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(2);
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-catalog',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Catalog Item',
        description: expect.any(String),
      }),
      expect.any(Function)
    );

    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-catalog-search',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Catalog Search',
        description: expect.any(String),
      }),
      expect.any(Function)
    );
  });

  it('should create resource templates with proper URI patterns', () => {
    // Act
    registerCatalogResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog://{asin}',
      'amazon-catalog://',
      expect.objectContaining({
        asin: expect.any(Function),
      })
    );

    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-catalog-search://{query}',
      'amazon-catalog-search://'
    );
  });
});
