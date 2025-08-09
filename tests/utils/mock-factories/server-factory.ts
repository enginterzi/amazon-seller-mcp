/**
 * Server mock factory for creating MCP server mocks
 */
import { type Mock } from 'vitest';
import { BaseMockFactory } from './base-factory.js';

/**
 * Mock MCP server interface
 */
export interface MockMcpServer {
  registerTool: Mock;
  registerResource: Mock;
  setRequestHandler: Mock;
  connect: Mock;
  close: Mock;
  sendLoggingMessage: Mock;
  sendResourceUpdated: Mock;
  sendResourceListChanged: Mock;
  clearPendingNotifications: Mock;
}

/**
 * Mock server interface for NotificationManager (expects nested server property)
 */
export interface MockServerForNotifications {
  server: MockMcpServer;
}

/**
 * Mock Amazon Seller MCP Server interface
 */
export interface MockAmazonSellerMcpServer {
  registerTool: Mock;
  registerResource: Mock;
  connect: Mock;
  close: Mock;
  getMcpServer: Mock;
  setupNotifications: Mock;
  setupResources: Mock;
  setupTools: Mock;
}

/**
 * Mock factory for MCP server instances
 */
export class McpServerMockFactory extends BaseMockFactory<MockMcpServer> {
  constructor() {
    super('McpServerMockFactory');
  }

  create(overrides: Partial<MockMcpServer> = {}): MockMcpServer {
    const mockServer: MockMcpServer = {
      registerTool: this.createMockFn(),
      registerResource: this.createMockFn(),
      setRequestHandler: this.createMockFn(),
      connect: this.createMockFn().mockResolvedValue(undefined),
      close: this.createMockFn().mockResolvedValue(undefined),
      sendLoggingMessage: this.createMockFn().mockResolvedValue(undefined),
      sendResourceUpdated: this.createMockFn().mockResolvedValue(undefined),
      sendResourceListChanged: this.createMockFn().mockResolvedValue(undefined),
      clearPendingNotifications: this.createMockFn().mockResolvedValue(undefined),
      ...overrides,
    };

    this.instances.push(mockServer);
    return mockServer;
  }
}

/**
 * Mock factory for server instances used by NotificationManager
 */
export class NotificationServerMockFactory extends BaseMockFactory<MockServerForNotifications> {
  private mcpServerFactory: McpServerMockFactory;

  constructor() {
    super('NotificationServerMockFactory');
    this.mcpServerFactory = new McpServerMockFactory();
  }

  create(overrides: Partial<MockServerForNotifications> = {}): MockServerForNotifications {
    const mockMcpServer = this.mcpServerFactory.create();

    const mockServer: MockServerForNotifications = {
      server: mockMcpServer,
      ...overrides,
    };

    this.instances.push(mockServer);
    return mockServer;
  }

  reset(): void {
    super.reset();
    this.mcpServerFactory.reset();
  }
}

/**
 * Mock factory for Amazon Seller MCP Server instances
 */
export class AmazonSellerMcpServerMockFactory extends BaseMockFactory<MockAmazonSellerMcpServer> {
  private mcpServerFactory: McpServerMockFactory;

  constructor() {
    super('AmazonSellerMcpServerMockFactory');
    this.mcpServerFactory = new McpServerMockFactory();
  }

  create(overrides: Partial<MockAmazonSellerMcpServer> = {}): MockAmazonSellerMcpServer {
    const mockMcpServer = this.mcpServerFactory.create();

    const mockServer: MockAmazonSellerMcpServer = {
      registerTool: this.createMockFn().mockImplementation((name, options, handler) => {
        // Forward to the underlying MCP server mock
        return mockMcpServer.registerTool(name, options, handler);
      }),
      registerResource: this.createMockFn().mockImplementation((template, handler) => {
        // Forward to the underlying MCP server mock
        return mockMcpServer.registerResource(template, handler);
      }),
      connect: this.createMockFn().mockResolvedValue(undefined),
      close: this.createMockFn().mockResolvedValue(undefined),
      getMcpServer: this.createMockFn().mockReturnValue(mockMcpServer),
      setupNotifications: this.createMockFn().mockResolvedValue(undefined),
      setupResources: this.createMockFn().mockResolvedValue(undefined),
      setupTools: this.createMockFn().mockResolvedValue(undefined),
      ...overrides,
    };

    this.instances.push(mockServer);
    return mockServer;
  }

  /**
   * Create a mock server with specific tool registration behavior
   */
  createWithToolRegistration(
    toolRegistrationBehavior: 'success' | 'failure' | 'duplicate' = 'success'
  ): MockAmazonSellerMcpServer {
    const mockServer = this.create();

    switch (toolRegistrationBehavior) {
      case 'success':
        mockServer.registerTool.mockReturnValue(true);
        break;
      case 'failure':
        mockServer.registerTool.mockReturnValue(false);
        break;
      case 'duplicate':
        mockServer.registerTool.mockReturnValue(false); // Tool already registered
        break;
    }

    return mockServer;
  }

  /**
   * Create a mock server with specific resource registration behavior
   */
  createWithResourceRegistration(
    resourceRegistrationBehavior: 'success' | 'failure' | 'duplicate' = 'success'
  ): MockAmazonSellerMcpServer {
    const mockServer = this.create();

    switch (resourceRegistrationBehavior) {
      case 'success':
        mockServer.registerResource.mockReturnValue(true);
        break;
      case 'failure':
        mockServer.registerResource.mockReturnValue(false);
        break;
      case 'duplicate':
        mockServer.registerResource.mockReturnValue(false); // Resource already registered
        break;
    }

    return mockServer;
  }

  /**
   * Create a mock server with notification capabilities
   */
  createWithNotifications(): MockAmazonSellerMcpServer {
    const mockServer = this.create();
    const mockMcpServer = mockServer.getMcpServer();

    // Setup notification-related mocks
    mockMcpServer.sendLoggingMessage.mockResolvedValue(undefined);
    mockMcpServer.sendResourceUpdated.mockResolvedValue(undefined);
    mockMcpServer.sendResourceListChanged.mockResolvedValue(undefined);
    mockMcpServer.clearPendingNotifications.mockResolvedValue(undefined);

    return mockServer;
  }

  reset(): void {
    super.reset();
    this.mcpServerFactory.reset();
  }
}

/**
 * Mock factory for Tool Registration Manager
 */
export interface MockToolRegistrationManager {
  registerTool: Mock;
  isToolRegistered: Mock;
  getRegisteredTools: Mock;
  getToolHandler: Mock;
}

export class ToolRegistrationManagerMockFactory extends BaseMockFactory<MockToolRegistrationManager> {
  constructor() {
    super('ToolRegistrationManagerMockFactory');
  }

  create(overrides: Partial<MockToolRegistrationManager> = {}): MockToolRegistrationManager {
    const mockManager: MockToolRegistrationManager = {
      registerTool: this.createMockFn().mockReturnValue(true),
      isToolRegistered: this.createMockFn().mockReturnValue(false),
      getRegisteredTools: this.createMockFn().mockReturnValue([]),
      getToolHandler: this.createMockFn().mockImplementation((name: string) => {
        // Return a mock function that can be called as a tool handler
        return this.createMockFn().mockResolvedValue({
          content: [{ type: 'text', text: `Mock result for tool: ${name}` }],
        });
      }),
      ...overrides,
    };

    this.instances.push(mockManager);
    return mockManager;
  }
}

/**
 * Mock factory for Resource Registration Manager
 */
export interface MockResourceRegistrationManager {
  registerResource: Mock;
  isResourceRegistered: Mock;
  getRegisteredResources: Mock;
}

export class ResourceRegistrationManagerMockFactory extends BaseMockFactory<MockResourceRegistrationManager> {
  constructor() {
    super('ResourceRegistrationManagerMockFactory');
  }

  create(
    overrides: Partial<MockResourceRegistrationManager> = {}
  ): MockResourceRegistrationManager {
    const mockManager: MockResourceRegistrationManager = {
      registerResource: this.createMockFn().mockReturnValue(true),
      isResourceRegistered: this.createMockFn().mockReturnValue(false),
      getRegisteredResources: this.createMockFn().mockReturnValue([]),
      ...overrides,
    };

    this.instances.push(mockManager);
    return mockManager;
  }
}
