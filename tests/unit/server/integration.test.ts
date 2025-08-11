/**
 * Integration tests for the MCP server, resources, and tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmazonSellerMcpServer } from '../../../src/server/server.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { z } from 'zod';
import { afterEach } from 'node:test';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    registerResource: vi.fn(),
    registerTool: vi.fn(),
  })),
  ResourceTemplate: vi.fn().mockImplementation((uriTemplate, options) => ({
    uriTemplate,
    options,
  })),
}));

// Mock transports
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({})),
}));

describe('MCP Server Integration', () => {
  let server: AmazonSellerMcpServer;

  beforeEach(async () => {
    const testSetup = TestSetup.createTestServer();
    server = testSetup.server;

    await server.connect({ type: 'stdio' });
  });

  afterEach(async () => {
    // Clean up after each test
    await server.close();
    vi.clearAllMocks();
  });

  it('should register and coordinate resources with tools', async () => {
    const testProduct = TestDataBuilder.createCatalogItem({ asin: 'B08TEST123' });

    const resourceHandler = async (uri: URL, params: Record<string, string>) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({
            productId: params.productId,
            name: testProduct.summaries[0].itemName,
          }),
          mimeType: 'application/json',
        },
      ],
    });

    server.registerResource(
      'product',
      'amazon-product://{productId}',
      {
        title: 'Amazon Product',
        description: 'Product information',
      },
      resourceHandler,
      'amazon-product://list',
      {
        productId: async (value) => ['123', '456', '789'].filter((id) => id.includes(value)),
      }
    );

    const toolHandler = async (input: { productId: string }) => ({
      content: [
        {
          type: 'resource_link' as const,
          uri: `amazon-product://${input.productId}`,
          name: `Product ${input.productId}`,
          description: 'Link to product information',
        },
      ],
    });

    server.registerTool(
      'get-product',
      {
        title: 'Get Product',
        description: 'Get product information',
        inputSchema: z.object({
          productId: z.string().describe('Product ID'),
        }),
      },
      toolHandler
    );

    expect(server.getResourceManager().isResourceRegistered('product')).toBe(true);
    expect(server.getToolManager().isToolRegistered('get-product')).toBe(true);

    const registerResourceMock = server.getMcpServer().registerResource as any;
    const registeredResourceHandler = registerResourceMock.mock.calls[0][3];

    const resourceResult = await registeredResourceHandler(new URL('amazon-product://123'), {
      productId: '123',
    });

    expect(resourceResult.contents[0].uri).toBe('amazon-product://123');
    expect(JSON.parse(resourceResult.contents[0].text)).toMatchObject({
      productId: '123',
      name: testProduct.summaries[0].itemName,
    });

    const registerToolMock = server.getMcpServer().registerTool as any;
    const registeredToolHandler = registerToolMock.mock.calls[0][2];

    const toolResult = await registeredToolHandler({ productId: '123' });

    expect(toolResult.content[0]).toMatchObject({
      type: 'resource_link',
      uri: 'amazon-product://123',
      name: 'Product 123',
      description: 'Link to product information',
    });
  });

  it('should handle errors in resource and tool handlers gracefully', async () => {
    const errorResourceHandler = async (_uri: URL, _params: Record<string, string>) => {
      throw new Error('Resource error');
    };

    server.registerResource(
      'error-resource',
      'error://{id}',
      {
        title: 'Error Resource',
        description: 'A resource that throws an error',
      },
      errorResourceHandler
    );

    const errorToolHandler = async (_input: { id: string }) => {
      throw new Error('Tool error');
    };

    server.registerTool(
      'error-tool',
      {
        title: 'Error Tool',
        description: 'A tool that throws an error',
        inputSchema: z.object({
          id: z.string(),
        }),
      },
      errorToolHandler
    );

    const registerResourceMock = server.getMcpServer().registerResource as any;
    const registeredResourceHandler = registerResourceMock.mock.calls[0][3];

    const resourceResult = await registeredResourceHandler(new URL('error://123'), { id: '123' });

    // The error handler should return an error response instead of throwing
    expect(resourceResult.contents[0].text).toContain('Resource error');

    const registerToolMock = server.getMcpServer().registerTool as any;
    const registeredToolHandler = registerToolMock.mock.calls[0][2];

    const toolResult = await registeredToolHandler({ id: '123' });

    expect(toolResult.isError).toBe(true);
    expect(toolResult.content[0].text).toContain('Tool error');
  });

  it('should cleanup resources when server is closed', async () => {
    expect(() => server.close()).not.toThrow();
  });
});
