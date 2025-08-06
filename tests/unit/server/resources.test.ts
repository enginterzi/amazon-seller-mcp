/**
 * Tests for the resource registration functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

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
  let resourceManager: ResourceRegistrationManager;
  let mockEnv: MockEnvironment;
  let mockServer: any;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
    mockServer = {
      registerResource: vi.fn(),
    };
    resourceManager = new ResourceRegistrationManager(mockServer);
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should create resource template with URI pattern', () => {
    const template = resourceManager.createResourceTemplate(
      'amazon-catalog://{asin}',
      'amazon-catalog://list',
      {
        asin: async (value) => ['B01234567', 'B07654321'].filter((asin) => asin.includes(value)),
      }
    );

    expect(template).toBeDefined();
    expect(template.uriTemplate).toBe('amazon-catalog://{asin}');
  });

  it('should register resource successfully', () => {
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

  it('should prevent duplicate resource registration', () => {
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

    const firstResult = resourceManager.registerResource(
      'catalog-item',
      template,
      options,
      handler
    );
    expect(firstResult).toBe(true);
    expect(mockServer.registerResource).toHaveBeenCalledTimes(1);

    const secondResult = resourceManager.registerResource(
      'catalog-item',
      template,
      options,
      handler
    );
    expect(secondResult).toBe(false);
    expect(mockServer.registerResource).toHaveBeenCalledTimes(1);
  });

  it('should handle resource handler errors appropriately', async () => {
    const template = resourceManager.createResourceTemplate('amazon-catalog://{asin}');
    const options = {
      title: 'Amazon Catalog Item',
      description: "Product details from Amazon's catalog",
    };
    const handler = async (uri: URL, params: Record<string, string>) => {
      throw new Error('Test error');
    };

    resourceManager.registerResource('catalog-item', template, options, handler);

    const registeredHandler = mockServer.registerResource.mock.calls[0][3];

    const result = await registeredHandler(new URL('amazon-catalog://B01234567'), { asin: 'B01234567' });

    expect(result.contents[0].text).toContain('Test error');
    expect(result.contents[0].uri).toBe('error://amazon-seller-mcp/error');
  });
});
