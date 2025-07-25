/**
 * Amazon Seller MCP Server implementation
 *
 * This file implements the MCP server for Amazon Selling Partner API
 * using the Model Context Protocol SDK.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AmazonRegion, AmazonCredentials, REGION_ENDPOINTS } from '../types/auth.js';
import { ResourceRegistrationManager } from './resources.js';
import { ToolRegistrationManager, ToolRegistrationOptions, ToolHandler } from './tools.js';
import { NotificationManager } from './notifications.js';
import { setupInventoryChangeNotifications } from './inventory-notifications.js';
import { setupOrderStatusChangeNotifications } from './order-notifications.js';
import {
  wrapToolHandlerWithErrorHandling,
  wrapResourceHandlerWithErrorHandling,
} from './error-handler.js';
import { configureCacheManager, CacheConfig } from '../utils/cache-manager.js';
import { configureConnectionPool, ConnectionPoolConfig } from '../utils/connection-pool.js';
import { z } from 'zod';

/**
 * Configuration for the Amazon Seller MCP Server
 */
export interface AmazonSellerMcpConfig {
  /**
   * Server name
   */
  name: string;

  /**
   * Server version
   */
  version: string;

  /**
   * Amazon Selling Partner API credentials
   */
  credentials: AmazonCredentials;

  /**
   * Amazon marketplace ID
   */
  marketplaceId: string;

  /**
   * Amazon region
   */
  region: AmazonRegion;

  /**
   * Whether to debounce notifications
   */
  debouncedNotifications?: boolean;

  /**
   * Cache configuration
   */
  cacheConfig?: CacheConfig;

  /**
   * Connection pool configuration
   */
  connectionPoolConfig?: ConnectionPoolConfig;
}

/**
 * Transport configuration for the MCP server
 */
export interface TransportConfig {
  /**
   * Transport type
   */
  type: 'stdio' | 'streamableHttp';

  /**
   * HTTP options (required if type is 'streamableHttp')
   */
  httpOptions?: {
    /**
     * HTTP port
     */
    port: number;

    /**
     * HTTP host
     */
    host: string;

    /**
     * Whether to enable DNS rebinding protection
     */
    enableDnsRebindingProtection?: boolean;

    /**
     * Allowed hosts for CORS
     */
    allowedHosts?: string[];

    /**
     * Whether to enable session management
     */
    sessionManagement?: boolean;
  };
}

/**
 * Amazon Seller MCP Server class
 * Implements the MCP protocol for Amazon Selling Partner API
 */
export class AmazonSellerMcpServer {
  /**
   * MCP server instance
   */
  private server: McpServer;

  /**
   * Server configuration
   */
  private config: AmazonSellerMcpConfig;

  /**
   * Transport instance
   */
  private transport: StdioServerTransport | StreamableHTTPServerTransport | null = null;

  /**
   * Whether the server is connected
   */
  private isConnected: boolean = false;

  /**
   * Resource registration manager
   */
  private resourceManager: ResourceRegistrationManager;

  /**
   * Tool registration manager
   */
  private toolManager: ToolRegistrationManager;

  /**
   * Notification manager
   */
  private notificationManager: NotificationManager;

  /**
   * Creates a new instance of the Amazon Seller MCP Server
   * @param config Server configuration
   */
  constructor(config: AmazonSellerMcpConfig) {
    this.config = config;

    // Configure cache manager if provided
    if (config.cacheConfig) {
      configureCacheManager(config.cacheConfig);
    }

    // Configure connection pool if provided
    if (config.connectionPoolConfig) {
      configureConnectionPool(config.connectionPoolConfig);
    }

    // Create MCP server instance
    this.server = new McpServer({
      name: config.name,
      version: config.version,
      description: `Amazon Selling Partner API MCP Server for marketplace ${config.marketplaceId} in region ${config.region}`,
    });

    // Create resource registration manager
    this.resourceManager = new ResourceRegistrationManager(this.server);

    // Create tool registration manager
    this.toolManager = new ToolRegistrationManager(this.server);

    // Create notification manager
    this.notificationManager = new NotificationManager(this.server, {
      debounced: config.debouncedNotifications,
      debounceTime: 1000, // 1 second debounce time
    });

    console.log(`Initialized Amazon Seller MCP Server: ${config.name} v${config.version}`);
  }

  /**
   * Connects the server to the specified transport
   * @param transportConfig Transport configuration
   */
  async connect(transportConfig: TransportConfig): Promise<void> {
    console.log(`Connecting to ${transportConfig.type} transport`);

    try {
      // Create transport based on configuration
      if (transportConfig.type === 'streamableHttp' && transportConfig.httpOptions) {
        const { port, host, enableDnsRebindingProtection, allowedHosts, sessionManagement } =
          transportConfig.httpOptions;

        this.transport = new StreamableHTTPServerTransport({
          port,
          host,
          enableDnsRebindingProtection,
          allowedHosts,
          sessionManagement,
        });

        console.log(`HTTP server starting on ${host}:${port}`);
      } else {
        // Default to stdio transport
        this.transport = new StdioServerTransport();
        console.log('STDIO transport initialized');
      }

      // Connect the server to the transport
      await this.server.connect(this.transport);

      this.isConnected = true;
      console.log('Server connected successfully');
    } catch (error) {
      console.error('Failed to connect server:', error);
      throw new Error(`Failed to connect server: ${(error as Error).message}`);
    }
  }

  /**
   * Registers all available tools
   */
  registerAllTools(): void {
    console.log('Registering tools');

    // Register catalog tools
    this.registerCatalogTools();

    // Register listings tools
    this.registerListingsTools();

    // Register inventory tools
    this.registerInventoryTools();

    // Register orders tools
    this.registerOrdersTools();

    // Register reports tools
    this.registerReportsTools();

    // Register AI-assisted tools
    this.registerAiTools();
  }

  /**
   * Registers catalog tools
   */
  private registerCatalogTools(): void {
    console.log('Registering catalog tools');

    // Import and register catalog tools
    const { registerCatalogTools } = require('../tools/catalog-tools.js');

    registerCatalogTools(this.toolManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers listings tools
   */
  private registerListingsTools(): void {
    console.log('Registering listings tools');

    // Import and register listings tools
    const { registerListingsTools } = require('../tools/listings-tools.js');

    registerListingsTools(this.toolManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers inventory tools
   */
  private registerInventoryTools(): void {
    console.log('Registering inventory tools');

    // Import and register inventory tools
    const { registerInventoryTools } = require('../tools/inventory-tools.js');
    const { InventoryClient } = require('../api/inventory-client.js');

    // Create inventory client
    const inventoryClient = new InventoryClient({
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });

    // Set up inventory change notifications
    setupInventoryChangeNotifications(inventoryClient, this.notificationManager);

    // Register inventory tools
    registerInventoryTools(
      this.toolManager,
      {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      },
      inventoryClient
    );
  }

  /**
   * Registers orders tools
   */
  private registerOrdersTools(): void {
    console.log('Registering orders tools');

    // Import and register orders tools
    const { registerOrdersTools } = require('../tools/orders-tools.js');
    const { OrdersClient } = require('../api/orders-client.js');

    // Create orders client
    const ordersClient = new OrdersClient({
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });

    // Set up order status change notifications
    setupOrderStatusChangeNotifications(ordersClient, this.notificationManager);

    // Register orders tools
    registerOrdersTools(
      this.toolManager,
      {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      },
      ordersClient
    );
  }

  /**
   * Registers reports tools
   */
  private registerReportsTools(): void {
    console.log('Registering reports tools');

    // Import and register reports tools
    const { registerReportsTools } = require('../tools/reports-tools.js');

    registerReportsTools(this.server, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers AI-assisted tools
   */
  private registerAiTools(): void {
    console.log('Registering AI-assisted tools');

    // Import and register AI tools
    const { registerAiTools } = require('../tools/ai-tools.js');

    registerAiTools(
      this.toolManager,
      {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      },
      this.server
    );
  }

  /**
   * Registers a tool with the MCP server
   *
   * @param name Tool name
   * @param options Tool registration options
   * @param handler Tool handler function
   * @returns True if the tool was registered, false if it was already registered
   */
  registerTool<T = any>(
    name: string,
    options: ToolRegistrationOptions,
    handler: ToolHandler<T>
  ): boolean {
    // Wrap the handler with error handling
    const wrappedHandler = wrapToolHandlerWithErrorHandling(handler);

    return this.toolManager.registerTool(name, options, wrappedHandler);
  }

  /**
   * Gets the tool registration manager
   */
  getToolManager(): ToolRegistrationManager {
    return this.toolManager;
  }

  /**
   * Gets the notification manager
   */
  getNotificationManager(): NotificationManager {
    return this.notificationManager;
  }

  /**
   * Registers all available resources
   */
  registerAllResources(): void {
    console.log('Registering resources');

    // Register catalog resources
    this.registerCatalogResources();

    // Register listings resources
    this.registerListingsResources();

    // Register inventory resources
    this.registerInventoryResources();

    // Register orders resources
    this.registerOrdersResources();

    // Register reports resources
    this.registerReportsResources();
  }

  /**
   * Registers catalog resources
   */
  private registerCatalogResources(): void {
    console.log('Registering catalog resources');

    // Import and register catalog resources
    const { registerCatalogResources } = require('../resources/catalog/catalog-resources.js');

    registerCatalogResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers listings resources
   */
  private registerListingsResources(): void {
    console.log('Registering listings resources');

    // Import and register listings resources
    const { registerListingsResources } = require('../resources/listings/listings-resources.js');

    registerListingsResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers inventory resources
   */
  private registerInventoryResources(): void {
    console.log('Registering inventory resources');

    // Import and register inventory resources
    const { registerInventoryResources } = require('../resources/inventory/inventory-resources.js');

    registerInventoryResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers orders resources
   */
  private registerOrdersResources(): void {
    console.log('Registering orders resources');

    // Import and register orders resources
    const { registerOrdersResources } = require('../resources/orders/orders-resources.js');

    registerOrdersResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers reports resources
   */
  private registerReportsResources(): void {
    console.log('Registering reports resources');

    // Import and register reports resources
    const { registerReportsResources } = require('../resources/reports/reports-resources.js');

    registerReportsResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers a resource with the MCP server
   *
   * @param name Resource name
   * @param uriTemplate URI template string
   * @param options Resource registration options
   * @param handler Resource handler function
   * @param listTemplate Optional list template string
   * @param completions Optional completions configuration
   * @returns True if the resource was registered, false if it was already registered
   */
  registerResource(
    name: string,
    uriTemplate: string,
    options: { title: string; description: string },
    handler: (
      uri: URL,
      params: Record<string, string>
    ) => Promise<{
      contents: Array<{
        uri: string;
        text: string;
        mimeType?: string;
      }>;
    }>,
    listTemplate?: string,
    completions?: Record<string, (value: string) => Promise<string[]>>
  ): boolean {
    const template = this.resourceManager.createResourceTemplate(
      uriTemplate,
      listTemplate,
      completions
    );

    // Wrap the handler with error handling
    const wrappedHandler = wrapResourceHandlerWithErrorHandling(handler);

    return this.resourceManager.registerResource(name, template, options, wrappedHandler);
  }

  /**
   * Gets the resource registration manager
   */
  getResourceManager(): ResourceRegistrationManager {
    return this.resourceManager;
  }

  /**
   * Closes the server and cleans up resources
   */
  async close(): Promise<void> {
    console.log('Closing server');

    if (this.isConnected && this.server) {
      try {
        await this.server.disconnect();
        this.isConnected = false;
        console.log('Server disconnected successfully');
      } catch (error) {
        console.error('Error disconnecting server:', error);
        throw new Error(`Error disconnecting server: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Checks if the server is connected
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Gets the MCP server instance
   */
  getMcpServer(): McpServer {
    return this.server;
  }

  /**
   * Gets the server configuration
   */
  getConfig(): AmazonSellerMcpConfig {
    return { ...this.config };
  }
}
