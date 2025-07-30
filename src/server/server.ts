/**
 * Amazon Seller MCP Server implementation
 *
 * This file implements the MCP server for Amazon Selling Partner API
 * using the Model Context Protocol SDK.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AmazonRegion, AmazonCredentials } from '../types/auth.js';
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
   * HTTP server instance (for streamableHttp transport)
   */
  private httpServer: ReturnType<typeof createServer> | null = null;

  /**
   * Map to store transports by session ID (for streamableHttp)
   */
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();

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
      if (transportConfig.type === 'streamableHttp' && transportConfig.httpOptions) {
        await this.setupHttpTransport(transportConfig.httpOptions);
      } else {
        // Default to stdio transport
        this.transport = new StdioServerTransport();
        await this.server.connect(this.transport);
        console.log('STDIO transport initialized');
      }

      // Register all tools and resources after connecting
      await this.registerAllResources();
      await this.registerAllTools();

      this.isConnected = true;
      console.log('Server connected successfully');
    } catch (error) {
      console.error('Failed to connect server:', error);
      throw new Error(`Failed to connect server: ${(error as Error).message}`);
    }
  }

  /**
   * Sets up HTTP transport with proper request handling
   */
  private async setupHttpTransport(
    httpOptions: NonNullable<TransportConfig['httpOptions']>
  ): Promise<void> {
    const { port, host, enableDnsRebindingProtection, allowedHosts, sessionManagement } =
      httpOptions;

    // Create HTTP server
    this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, Last-Event-ID');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        await this.handleHttpRequest(req, res, {
          enableDnsRebindingProtection,
          allowedHosts,
          sessionManagement,
        });
      } catch (error) {
        console.error('Error handling HTTP request:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
              },
              id: null,
            })
          );
        }
      }
    });

    // Start HTTP server
    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(port, host, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`HTTP server started on ${host}:${port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Handles HTTP requests for streamable transport
   */
  private async handleHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
    options: {
      enableDnsRebindingProtection?: boolean;
      allowedHosts?: string[];
      sessionManagement?: boolean;
    }
  ): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string;

    // Handle POST requests (JSON-RPC)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const parsedBody = JSON.parse(body);
          await this.handleMcpRequest(req, res, parsedBody, sessionId, options);
        } catch (error) {
          console.error('Error parsing request body:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error',
              },
              id: null,
            })
          );
        }
      });
    }
    // Handle GET requests (SSE streams)
    else if (req.method === 'GET') {
      if (!sessionId || !this.transports.has(sessionId)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid or missing session ID');
        return;
      }

      const transport = this.transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    }
    // Handle DELETE requests (session termination)
    else if (req.method === 'DELETE') {
      if (!sessionId || !this.transports.has(sessionId)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid or missing session ID');
        return;
      }

      const transport = this.transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    }
    // Handle unsupported methods
    else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method not allowed');
    }
  }

  /**
   * Handles MCP JSON-RPC requests
   */
  private async handleMcpRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: any,
    sessionId: string | undefined,
    options: {
      enableDnsRebindingProtection?: boolean;
      allowedHosts?: string[];
      sessionManagement?: boolean;
    }
  ): Promise<void> {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && this.transports.has(sessionId)) {
      // Reuse existing transport
      transport = this.transports.get(sessionId)!;
    } else if (!sessionId && this.isInitializeRequest(parsedBody)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: options.sessionManagement ? () => randomUUID() : undefined,
        enableDnsRebindingProtection: options.enableDnsRebindingProtection,
        allowedHosts: options.allowedHosts,
        onsessioninitialized: (sessionId: string) => {
          console.log(`Session initialized with ID: ${sessionId}`);
          this.transports.set(sessionId, transport);
        },
        onsessionclosed: (sessionId: string) => {
          console.log(`Session closed: ${sessionId}`);
          this.transports.delete(sessionId);
        },
      });

      // Set up onclose handler
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && this.transports.has(sid)) {
          console.log(`Transport closed for session ${sid}`);
          this.transports.delete(sid);
        }
      };

      // Connect the transport to the MCP server
      await this.server.connect(transport);
    } else {
      // Invalid request
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        })
      );
      return;
    }

    // Handle the request with the transport
    await transport.handleRequest(req, res, parsedBody);
  }

  /**
   * Checks if a request is an initialize request
   */
  private isInitializeRequest(body: any): boolean {
    return body && body.method === 'initialize';
  }

  /**
   * Registers all available tools
   */
  async registerAllTools(): Promise<void> {
    console.log('Registering tools');

    // Register catalog tools
    await this.registerCatalogTools();

    // Register listings tools
    await this.registerListingsTools();

    // Register inventory tools
    await this.registerInventoryTools();

    // Register orders tools
    await this.registerOrdersTools();

    // Register reports tools
    await this.registerReportsTools();

    // Register AI-assisted tools
    await this.registerAiTools();
  }

  /**
   * Registers catalog tools
   */
  private async registerCatalogTools(): Promise<void> {
    console.log('Registering catalog tools');

    try {
      // Import and register catalog tools
      const { registerCatalogTools } = await import('../tools/catalog-tools.js');

      registerCatalogTools(this.toolManager, {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      });
    } catch (error) {
      console.error('Failed to register catalog tools:', error);
    }
  }

  /**
   * Registers listings tools
   */
  private async registerListingsTools(): Promise<void> {
    console.log('Registering listings tools');

    try {
      // Import and register listings tools
      const { registerListingsTools } = await import('../tools/listings-tools.js');

      registerListingsTools(this.toolManager, {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      });
    } catch (error) {
      console.error('Failed to register listings tools:', error);
    }
  }

  /**
   * Registers inventory tools
   */
  private async registerInventoryTools(): Promise<void> {
    console.log('Registering inventory tools');

    try {
      // Import and register inventory tools
      const { registerInventoryTools } = await import('../tools/inventory-tools.js');
      const { InventoryClient } = await import('../api/inventory-client.js');

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
    } catch (error) {
      console.error('Failed to register inventory tools:', error);
    }
  }

  /**
   * Registers orders tools
   */
  private async registerOrdersTools(): Promise<void> {
    console.log('Registering orders tools');

    try {
      // Import and register orders tools
      const { registerOrdersTools } = await import('../tools/orders-tools.js');
      const { OrdersClient } = await import('../api/orders-client.js');

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
    } catch (error) {
      console.error('Failed to register orders tools:', error);
    }
  }

  /**
   * Registers reports tools
   */
  private async registerReportsTools(): Promise<void> {
    console.log('Registering reports tools');

    try {
      // Import and register reports tools
      const { registerReportsTools } = await import('../tools/reports-tools.js');

      registerReportsTools(this.server, {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      });
    } catch (error) {
      console.error('Failed to register reports tools:', error);
    }
  }

  /**
   * Registers AI-assisted tools
   */
  private async registerAiTools(): Promise<void> {
    console.log('Registering AI-assisted tools');

    try {
      // Import and register AI tools
      const { registerAiTools } = await import('../tools/ai-tools.js');

      registerAiTools(this.toolManager, {
        credentials: this.config.credentials,
        region: this.config.region,
        marketplaceId: this.config.marketplaceId,
      });
    } catch (error) {
      console.error('Failed to register AI tools:', error);
    }
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
  async registerAllResources(): Promise<void> {
    console.log('Registering resources');

    // Register catalog resources
    await this.registerCatalogResources();

    // Register listings resources
    await this.registerListingsResources();

    // Register inventory resources
    await this.registerInventoryResources();

    // Register orders resources
    await this.registerOrdersResources();

    // Register reports resources
    await this.registerReportsResources();
  }

  /**
   * Registers catalog resources
   */
  private async registerCatalogResources(): Promise<void> {

    // Import and register catalog resources
    const { registerCatalogResources } = await import('../resources/catalog/catalog-resources.js');

    registerCatalogResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers listings resources
   */
  private async registerListingsResources(): Promise<void> {

    // Import and register listings resources
    const { registerListingsResources } = await import('../resources/listings/listings-resources.js');

    registerListingsResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers inventory resources
   */
  private async registerInventoryResources(): Promise<void> {

    // Import and register inventory resources
    const { registerInventoryResources } = await import('../resources/inventory/inventory-resources.js');

    registerInventoryResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers orders resources
   */
  private async registerOrdersResources(): Promise<void> {

    // Import and register orders resources
    const { registerOrdersResources } = await import('../resources/orders/orders-resources.js');

    registerOrdersResources(this.resourceManager, {
      credentials: this.config.credentials,
      region: this.config.region,
      marketplaceId: this.config.marketplaceId,
    });
  }

  /**
   * Registers reports resources
   */
  private async registerReportsResources(): Promise<void> {

    // Import and register reports resources
    const { registerReportsResources } = await import('../resources/reports/reports-resources.js');

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

    try {
      // Close all active transports
      for (const [sessionId, transport] of this.transports) {
        console.log(`Closing transport for session ${sessionId}`);
        await transport.close();
      }
      this.transports.clear();

      // Close HTTP server if it exists
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((error) => {
            if (error) {
              reject(error);
            } else {
              console.log('HTTP server closed');
              resolve();
            }
          });
        });
        this.httpServer = null;
      }

      // Close MCP server
      if (this.isConnected) {
        // MCP server doesn't have a close method, just mark as disconnected
        this.isConnected = false;
        console.log('Server closed successfully');
      }
    } catch (error) {
      console.error('Error closing server:', error);
      throw new Error(`Error closing server: ${(error as Error).message}`);
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
