/**
 * Integration tests for the MCP server, resources, and tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer } from '../../../src/server/server.js';
import { AmazonRegion } from '../../../src/types/auth.js';
import { z } from 'zod';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
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
  };
});

// Mock transports
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: vi.fn().mockImplementation(() => ({})),
  };
});

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({})),
  };
});

describe('MCP Server Integration', () => {
  // Test configuration
  const testConfig = {
    name: 'test-server',
    version: '1.0.0',
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
    marketplaceId: 'ATVPDKIKX0DER',
    region: AmazonRegion.NA,
  };

  let server: AmazonSellerMcpServer;

  beforeEach(async () => {
    // Create a new server instance before each test
    server = new AmazonSellerMcpServer(testConfig);

    // Connect the server
    await server.connect({ type: 'stdio' });
  });

  afterEach(async () => {
    // Clean up after each test
    await server.close();
    vi.clearAllMocks();
  });

  it('should register and use resources and tools together', async () => {
    // Register a resource
    const resourceHandler = async (uri: URL, params: Record<string, string>) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ productId: params.productId, name: 'Test Product' }),
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

    // Register a tool that uses the resource
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

    // Verify that both the resource and tool are registered
    expect(server.getResourceManager().isResourceRegistered('product')).toBe(true);
    expect(server.getToolManager().isToolRegistered('get-product')).toBe(true);

    // Get the registered resource handler
    const registerResourceMock = server.getMcpServer().registerResource as any;
    const registeredResourceHandler = registerResourceMock.mock.calls[0][3];

    // Call the resource handler and verify the result
    const resourceResult = await registeredResourceHandler(new URL('amazon-product://123'), {
      productId: '123',
    });

    expect(resourceResult).toEqual({
      contents: [
        {
          uri: 'amazon-product://123',
          text: JSON.stringify({ productId: '123', name: 'Test Product' }),
          mimeType: 'application/json',
        },
      ],
    });

    // Get the registered tool handler
    const registerToolMock = server.getMcpServer().registerTool as any;
    const registeredToolHandler = registerToolMock.mock.calls[0][2];

    // Call the tool handler and verify the result
    const toolResult = await registeredToolHandler({ productId: '123' });

    expect(toolResult).toEqual({
      content: [
        {
          type: 'resource_link',
          uri: 'amazon-product://123',
          name: 'Product 123',
          description: 'Link to product information',
        },
      ],
    });
  });

  it('should handle errors in resource and tool handlers', async () => {
    // Register a resource with an error handler
    const errorResourceHandler = async (uri: URL, params: Record<string, string>) => {
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

    // Register a tool with an error handler
    const errorToolHandler = async (input: { id: string }) => {
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

    // Get the registered resource handler
    const registerResourceMock = server.getMcpServer().registerResource as any;
    const registeredResourceHandler = registerResourceMock.mock.calls[0][3];

    // Call the resource handler and expect it to return an error response
    const resourceResult = await registeredResourceHandler(new URL('error://123'), { id: '123' });
    expect(resourceResult.contents[0].uri).toBe('error://amazon-seller-mcp/error');
    expect(resourceResult.contents[0].text).toContain('Resource error');

    // Get the registered tool handler
    const registerToolMock = server.getMcpServer().registerTool as any;
    const registeredToolHandler = registerToolMock.mock.calls[0][2];

    // Call the tool handler and expect it to return an error response
    const toolResult = await registeredToolHandler({ id: '123' });

    expect(toolResult.isError).toBe(true);
    expect(toolResult.content[0].text).toContain('Tool error');
  });
});
