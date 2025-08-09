/**
 * Tests for reports resources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../src/server/resources.js';
import { registerReportsResources } from '../../src/resources/reports/reports-resources.js';

describe('Reports Resources', () => {
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

  it('should register reports resources with correct configuration', () => {
    // Act
    registerReportsResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.registerResource).toHaveBeenCalledTimes(3);
    expect(resourceManager.registerResource).toHaveBeenCalledWith(
      'amazon-reports',
      expect.anything(),
      expect.objectContaining({
        title: 'Amazon Reports',
        description: expect.any(String),
      }),
      expect.any(Function)
    );
  });

  it('should create resource templates with proper URI patterns', () => {
    // Act
    registerReportsResources(resourceManager, authConfig);

    // Assert
    expect(resourceManager.createResourceTemplate).toHaveBeenCalledWith(
      'amazon-reports://{reportId}',
      'amazon-reports://',
      expect.objectContaining({
        reportId: expect.any(Function),
      })
    );
  });
});
