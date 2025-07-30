/**
 * Tests for the Amazon Seller MCP Server
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer, TransportConfig } from '../../../src/server/server.js';
import { AmazonRegion } from '../../../src/types/auth.js';
import { z } from 'zod';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';

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

describe('AmazonSellerMcpServer', () => {
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

  beforeEach(() => {
    // Create a new server instance before each test
    server = new AmazonSellerMcpServer(testConfig);
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  it('should create a server instance with the provided configuration', () => {
    expect(server).toBeDefined();
    expect(server.getConfig()).toEqual(testConfig);
  });

  it('should connect to stdio transport', async () => {
    const transportConfig = {
      type: 'stdio' as const,
    };

    await server.connect(transportConfig);

    expect(server.isServerConnected()).toBe(true);
  });

  it('should connect to streamableHttp transport', async () => {
    const transportConfig = {
      type: 'streamableHttp' as const,
      httpOptions: {
        port: 3000,
        host: 'localhost',
      },
    };

    await server.connect(transportConfig);

    expect(server.isServerConnected()).toBe(true);
  });

  it('should close the server', async () => {
    // First connect the server
    await server.connect({ type: 'stdio' });
    expect(server.isServerConnected()).toBe(true);

    // Then close it
    await server.close();
    expect(server.isServerConnected()).toBe(false);
  });

  it('should register tools and resources', async () => {
    // These methods are placeholders in the current implementation
    // Just verify they don't throw errors
    await expect(server.registerAllTools()).resolves.not.toThrow();
    await expect(server.registerAllResources()).resolves.not.toThrow();
  });

  it('should register a resource', async () => {
    const handler = async (uri: URL, params: Record<string, string>) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ asin: params.asin }),
          mimeType: 'application/json',
        },
      ],
    });

    const result = server.registerResource(
      'test-resource',
      'test://{param}',
      {
        title: 'Test Resource',
        description: 'A test resource',
      },
      handler,
      'test://list',
      {
        param: async (value) => ['value1', 'value2'],
      }
    );

    expect(result).toBe(true);
    expect(server.getResourceManager().isResourceRegistered('test-resource')).toBe(true);
  });

  it('should register a tool', async () => {
    const options = {
      title: 'Test Tool',
      description: 'A test tool',
      inputSchema: z.object({
        param: z.string().describe('Test parameter'),
      }),
    };

    const handler = async (input: any) => ({
      content: [
        {
          type: 'text' as const,
          text: `Executed with param: ${input.param}`,
        },
      ],
    });

    const result = server.registerTool('test-tool', options, handler);

    expect(result).toBe(true);
    expect(server.getToolManager().isToolRegistered('test-tool')).toBe(true);
  });

  it('should expose the MCP server instance', () => {
    const mcpServer = server.getMcpServer();
    expect(mcpServer).toBeDefined();
  });

  it('should handle connection errors', async () => {
    // Mock the connect method to throw an error
    const mockConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
    server.getMcpServer().connect = mockConnect;

    // Attempt to connect and expect it to throw
    await expect(server.connect({ type: 'stdio' })).rejects.toThrow(
      'Failed to connect server: Connection failed'
    );

    expect(mockConnect).toHaveBeenCalled();
  });

  it('should handle disconnection errors', async () => {
    // First connect the server
    await server.connect({ type: 'stdio' });

    // Mock the close method to throw an error by mocking the HTTP server close
    const originalHttpServer = (server as any).httpServer;
    (server as any).httpServer = {
      close: (callback: (error?: Error) => void) => {
        callback(new Error('Disconnection failed'));
      },
    };

    // Attempt to close and expect it to throw
    await expect(server.close()).rejects.toThrow('Error closing server: Disconnection failed');

    // Restore original state
    (server as any).httpServer = originalHttpServer;
  });

  it('should provide access to resource and tool managers', () => {
    const resourceManager = server.getResourceManager();
    const toolManager = server.getToolManager();

    expect(resourceManager).toBeInstanceOf(ResourceRegistrationManager);
    expect(toolManager).toBeInstanceOf(ToolRegistrationManager);
  });

  it('should handle different transport configurations', async () => {
    // Test with stdio transport
    const stdioConfig: TransportConfig = { type: 'stdio' };
    await server.connect(stdioConfig);
    expect(server.isServerConnected()).toBe(true);
    await server.close();

    // Test with HTTP transport - use a different port to avoid conflicts
    const httpConfig: TransportConfig = {
      type: 'streamableHttp',
      httpOptions: {
        port: 0, // Use port 0 to let the system assign an available port
        host: 'localhost',
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost'],
        sessionManagement: true,
      },
    };
    await server.connect(httpConfig);
    expect(server.isServerConnected()).toBe(true);
    await server.close();
  }, 10000); // Increase timeout to 10 seconds
});
