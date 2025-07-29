/**
 * Tests for the resource registration functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerResource: vi.fn(),
    })),
    ResourceTemplate: vi.fn().mockImplementation((uriTemplate, options) => ({
      uriTemplate,
      options,
    })),
  };
});

describe('ResourceRegistrationManager', () => {
  // Mock server
  const mockServer = {
    registerResource: vi.fn(),
  };

  let resourceManager: ResourceRegistrationManager;

  beforeEach(() => {
    // Create a new resource manager before each test
    resourceManager = new ResourceRegistrationManager(mockServer as any);

    // Clear mock calls
    vi.clearAllMocks();
  });

  it('should create a resource template', () => {
    const template = resourceManager.createResourceTemplate(
      'amazon-catalog://{asin}',
      'amazon-catalog://list',
      {
        asin: async (value) => ['B01234567', 'B07654321'].filter((asin) => asin.includes(value)),
      }
    );

    expect(template).toBeDefined();
  });

  it('should register a resource', () => {
    const template = resourceManager.createResourceTemplate('amazon-catalog://{asin}');
    const options = {
      title: 'Amazon Catalog Item',
      description: "Product details from Amazon's catalog",
    };
    const handler = async (uri: URL, params: Record<string, string>) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ asin: params.asin }),
          mimeType: 'application/json',
        },
      ],
    });

    const result = resourceManager.registerResource('catalog-item', template, options, handler);

    expect(result).toBe(true);
    expect(mockServer.registerResource).toHaveBeenCalledWith(
      'catalog-item',
      template,
      options,
      expect.any(Function)
    );
    expect(resourceManager.isResourceRegistered('catalog-item')).toBe(true);
    expect(resourceManager.getRegisteredResources()).toContain('catalog-item');
  });

  it('should not register the same resource twice', () => {
    const template = resourceManager.createResourceTemplate('amazon-catalog://{asin}');
    const options = {
      title: 'Amazon Catalog Item',
      description: "Product details from Amazon's catalog",
    };
    const handler = async (uri: URL, params: Record<string, string>) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ asin: params.asin }),
          mimeType: 'application/json',
        },
      ],
    });

    // Register the resource first time
    const firstResult = resourceManager.registerResource(
      'catalog-item',
      template,
      options,
      handler
    );
    expect(firstResult).toBe(true);
    expect(mockServer.registerResource).toHaveBeenCalledTimes(1);

    // Try to register the same resource again
    const secondResult = resourceManager.registerResource(
      'catalog-item',
      template,
      options,
      handler
    );
    expect(secondResult).toBe(false);
    expect(mockServer.registerResource).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should handle resource handler errors', async () => {
    const template = resourceManager.createResourceTemplate('amazon-catalog://{asin}');
    const options = {
      title: 'Amazon Catalog Item',
      description: "Product details from Amazon's catalog",
    };
    const handler = async (uri: URL, params: Record<string, string>) => {
      throw new Error('Test error');
    };

    // Register the resource
    resourceManager.registerResource('catalog-item', template, options, handler);

    // Get the handler function that was passed to registerResource
    const registeredHandler = mockServer.registerResource.mock.calls[0][3];

    // Call the handler and expect it to throw
    const result = await registeredHandler(new URL('amazon-catalog://B01234567'), {
      asin: 'B01234567',
    });
    expect(result.contents[0].uri).toBe('error://amazon-seller-mcp/error');
    expect(result.contents[0].text).toContain('Test error');
  });
});
