/**
 * Tests for listings resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerListingsResources } from '../../src/resources/listings/listings-resources.js';
import { ListingsClient } from '../../src/api/listings-client.js';
import { AuthConfig } from '../../src/types/auth.js';

// Mock the ListingsClient
vi.mock('../../src/api/listings-client.js', () => {
  return {
    ListingsClient: vi.fn().mockImplementation(() => {
      return {
        getListings: vi.fn(),
        getListing: vi.fn(),
      };
    }),
  };
});

describe('Listings Resources', () => {
  let resourceManager: ResourceRegistrationManager;
  let mockMcpServer: any;
  let authConfig: AuthConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock MCP server
    mockMcpServer = {
      registerResource: vi.fn(),
    };

    // Create resource manager with mock server
    resourceManager = new ResourceRegistrationManager(mockMcpServer as any);

    // Spy on resource manager methods
    vi.spyOn(resourceManager, 'registerResource');
    vi.spyOn(resourceManager, 'createResourceTemplate');

    // Create auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER', // US marketplace
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register listings resources', () => {
    // Register listings resources
    registerListingsResources(resourceManager, authConfig);

    // Verify that ListingsClient was instantiated with the correct auth config
    expect(ListingsClient).toHaveBeenCalledWith(authConfig);

    // Verify that registerResource was called for the listings resource
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-listings',
      expect.any(Object), // ResourceTemplate
      expect.objectContaining({
        title: 'Amazon Listings',
        description: 'Manage and view your Amazon product listings',
      }),
      expect.any(Function) // Handler function
    );

    // Verify that createResourceTemplate was called with the correct parameters
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-listings://{sku}',
      'amazon-listings://',
      expect.objectContaining({
        sku: expect.any(Function), // Completion function
      })
    );
  });
});
