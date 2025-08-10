/**
 * Tests for the Amazon Seller MCP Server - behavior-focused testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmazonSellerMcpServer, TransportConfig } from '../../../src/server/server.js';
import { AmazonRegion } from '../../../src/auth/index.js';
import { ResourceRegistrationManager } from '../../../src/server/resources.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      registerResource: vi.fn().mockResolvedValue(undefined),
      registerTool: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
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
  let server: AmazonSellerMcpServer;
  let testConfig: any;
  let cleanup: (() => Promise<void>) | null = null;

  beforeEach(async () => {
    const testEnv = await TestSetup.createServerTestEnvironment();
    server = testEnv.server;
    testConfig = TestSetup.createTestServerConfig();
    cleanup = testEnv.cleanup;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  it('should create server instance with valid configuration', () => {
    expect(server).toBeDefined();
    TestAssertions.expectValidRegionConfig(testConfig, AmazonRegion.NA);
    TestAssertions.expectValidCredentials(testConfig.credentials);
  });

  it('should support stdio transport configuration', async () => {
    const transportConfig: TransportConfig = { type: 'stdio' };

    expect(() => server.connect(transportConfig)).not.toThrow();
  });

  it('should support HTTP transport configuration', async () => {
    // Create a new server test environment with HTTP transport
    const httpTestEnv = await TestSetup.createHttpServerTestEnvironment();
    const httpServer = httpTestEnv.server;
    const transportConfig = httpTestEnv.transportConfig;

    try {
      await httpServer.connect(transportConfig);
      expect(httpServer.isServerConnected()).toBe(true);
    } finally {
      await httpTestEnv.cleanup();
    }
  });

  it('should provide connection state management capabilities', () => {
    expect(typeof server.isServerConnected).toBe('function');
    expect(typeof server.connect).toBe('function');
    expect(typeof server.close).toBe('function');
  });

  it('should provide tool and resource registration capabilities', () => {
    expect(server.getToolManager()).toBeDefined();
    expect(server.getResourceManager()).toBeDefined();
    expect(typeof server.registerTool).toBe('function');
    expect(typeof server.registerResource).toBe('function');
  });

  it('should provide access to underlying MCP server instance', () => {
    const mcpServer = server.getMcpServer();

    expect(mcpServer).toBeDefined();
    expect(typeof mcpServer.connect).toBe('function');
    expect(typeof mcpServer.close).toBe('function');
  });

  it('should handle connection failures gracefully', async () => {
    const mockConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
    server.getMcpServer().connect = mockConnect;

    await expect(server.connect({ type: 'stdio' })).rejects.toThrow(
      'Failed to connect server: Connection failed'
    );
    expect(mockConnect).toHaveBeenCalled();
  });

  it('should provide access to resource and tool management systems', () => {
    const resourceManager = server.getResourceManager();
    const toolManager = server.getToolManager();

    expect(resourceManager).toBeInstanceOf(ResourceRegistrationManager);
    expect(toolManager).toBeInstanceOf(ToolRegistrationManager);
  });

  it('should support multiple transport configurations', async () => {
    const stdioConfig: TransportConfig = { type: 'stdio' };

    // Test stdio configuration
    expect(() => server.connect(stdioConfig)).not.toThrow();

    // Test HTTP configuration with dynamic port
    const httpTestEnv = await TestSetup.createHttpServerTestEnvironment();
    const httpServer = httpTestEnv.server;
    const httpConfig = httpTestEnv.transportConfig;

    try {
      expect(() => httpServer.connect(httpConfig)).not.toThrow();
    } finally {
      await httpTestEnv.cleanup();
    }
  });
});
