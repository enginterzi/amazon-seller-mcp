# Amazon Seller MCP Client API Documentation

## Overview

The Amazon Seller MCP Client is a Node.js library that integrates the Model Context Protocol (MCP) with the Amazon Selling Partner API. This library enables AI agents to interact with Amazon Seller accounts through a standardized protocol, allowing for automated management of product listings, inventory, orders, and other seller operations.

## Installation

```bash
npm install amazon-seller-mcp-client
```

## Quick Start

```typescript
import { AmazonSellerMcpServer, AmazonRegion } from 'amazon-seller-mcp-client';

// Create a new MCP server instance
const server = new AmazonSellerMcpServer({
  name: 'amazon-seller-mcp',
  version: '1.0.0',
  credentials: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    refreshToken: 'YOUR_REFRESH_TOKEN',
    // Optional IAM credentials for request signing
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  },
  marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  region: AmazonRegion.NA, // North America region
});

// Connect to the MCP transport
await server.connect({
  type: 'stdio', // or 'streamableHttp'
});

// Register all tools and resources
server.registerAllTools();
server.registerAllResources();

// Handle process termination
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
```

## Core Components

### AmazonSellerMcpServer

The main server class that implements the MCP protocol for Amazon Selling Partner API.

```typescript
class AmazonSellerMcpServer {
  constructor(config: AmazonSellerMcpConfig);
  
  // Connect to the MCP transport
  async connect(transportConfig: TransportConfig): Promise<void>;
  
  // Register all available tools
  registerAllTools(): void;
  
  // Register all available resources
  registerAllResources(): void;
  
  // Register a custom tool
  registerTool<T = any>(
    name: string,
    options: ToolRegistrationOptions,
    handler: ToolHandler<T>
  ): boolean;
  
  // Register a custom resource
  registerResource(
    name: string,
    uriTemplate: string,
    options: { title: string; description: string },
    handler: (uri: URL, params: Record<string, string>) => Promise<{
      contents: Array<{
        uri: string;
        text: string;
        mimeType?: string;
      }>;
    }>,
    listTemplate?: string,
    completions?: Record<string, (value: string) => Promise<string[]>>
  ): boolean;
  
  // Get the tool registration manager
  getToolManager(): ToolRegistrationManager;
  
  // Get the notification manager
  getNotificationManager(): NotificationManager;
  
  // Get the resource registration manager
  getResourceManager(): ResourceRegistrationManager;
  
  // Close the server and clean up resources
  async close(): Promise<void>;
  
  // Check if the server is connected
  isServerConnected(): boolean;
  
  // Get the MCP server instance
  getMcpServer(): McpServer;
  
  // Get the server configuration
  getConfig(): AmazonSellerMcpConfig;
}
```

### Authentication

The authentication module handles OAuth 2.0 authentication with Amazon and AWS Signature V4 signing.

```typescript
class AmazonAuth {
  constructor(config: AuthConfig);
  
  // Get the current access token, refreshing if necessary
  async getAccessToken(): Promise<string>;
  
  // Refresh the access token using the refresh token
  async refreshAccessToken(): Promise<AuthTokens>;
  
  // Generate a signed request for the Amazon Selling Partner API
  async generateSecuredRequest(request: SignableRequest): Promise<SignableRequest>;
}
```

### API Clients

Base API client and specialized clients for different Amazon Selling Partner API endpoints.

```typescript
class BaseApiClient {
  constructor(authConfig: AuthConfig, apiConfig?: Partial<ApiClientConfig>);
  
  // Make an API request
  async request<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>>;
  
  // Clear the cache
  clearCache(cacheKey?: string): void;
}
```

## Configuration Types

### AmazonSellerMcpConfig

Configuration for the Amazon Seller MCP Server.

```typescript
interface AmazonSellerMcpConfig {
  // Server name
  name: string;
  
  // Server version
  version: string;
  
  // Amazon Selling Partner API credentials
  credentials: AmazonCredentials;
  
  // Amazon marketplace ID
  marketplaceId: string;
  
  // Amazon region
  region: AmazonRegion;
  
  // Whether to debounce notifications
  debouncedNotifications?: boolean;
}
```

### TransportConfig

Configuration for the MCP server transport.

```typescript
interface TransportConfig {
  // Transport type
  type: 'stdio' | 'streamableHttp';
  
  // HTTP options (required if type is 'streamableHttp')
  httpOptions?: {
    // HTTP port
    port: number;
    
    // HTTP host
    host: string;
    
    // Whether to enable DNS rebinding protection
    enableDnsRebindingProtection?: boolean;
    
    // Allowed hosts for CORS
    allowedHosts?: string[];
    
    // Whether to enable session management
    sessionManagement?: boolean;
  };
}
```

### AmazonCredentials

Amazon Selling Partner API credentials.

```typescript
interface AmazonCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
}
```

### AmazonRegion

Amazon Selling Partner API regions.

```typescript
enum AmazonRegion {
  NA = 'NA', // North America
  EU = 'EU', // Europe
  FE = 'FE', // Far East
}
```

## Tools and Resources

### Tools

The library provides tools for interacting with various aspects of Amazon Selling Partner API:

- **Catalog Tools**: Search and retrieve product catalog information
- **Listings Tools**: Create, update, and delete product listings
- **Inventory Tools**: Update and retrieve inventory levels
- **Orders Tools**: Process orders and update order status
- **Reports Tools**: Generate and retrieve reports
- **AI-assisted Tools**: Generate product descriptions and optimize listings

### Resources

The library provides resources for accessing Amazon Selling Partner API data:

- **Catalog Resources**: Product catalog information
- **Listings Resources**: Seller product listings
- **Inventory Resources**: Inventory levels and management
- **Orders Resources**: Order information and processing
- **Reports Resources**: Report generation and retrieval

## Error Handling

The library provides comprehensive error handling for API requests and authentication:

```typescript
class ApiError extends Error {
  type: ApiErrorType;
  statusCode?: number;
  details?: any;
  cause?: Error;
}

enum ApiErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

class AuthError extends Error {
  type: AuthErrorType;
  cause?: Error;
}

enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  REQUEST_SIGNING_FAILED = 'REQUEST_SIGNING_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

## Examples

### Creating a Server with HTTP Transport

```typescript
import { AmazonSellerMcpServer, AmazonRegion } from 'amazon-seller-mcp-client';

const server = new AmazonSellerMcpServer({
  name: 'amazon-seller-mcp',
  version: '1.0.0',
  credentials: {
    clientId: process.env.AMAZON_CLIENT_ID!,
    clientSecret: process.env.AMAZON_CLIENT_SECRET!,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
  },
  marketplaceId: process.env.AMAZON_MARKETPLACE_ID!,
  region: AmazonRegion.NA,
});

await server.connect({
  type: 'streamableHttp',
  httpOptions: {
    port: 3000,
    host: 'localhost',
  },
});

server.registerAllTools();
server.registerAllResources();

console.log('Server running at http://localhost:3000');
```

### Registering a Custom Tool

```typescript
import { AmazonSellerMcpServer, AmazonRegion } from 'amazon-seller-mcp-client';
import { z } from 'zod';

const server = new AmazonSellerMcpServer({
  // ... configuration
});

await server.connect({ type: 'stdio' });

server.registerTool(
  'custom-tool',
  {
    title: 'Custom Tool',
    description: 'A custom tool for demonstration',
    inputSchema: {
      param1: z.string().describe('First parameter'),
      param2: z.number().describe('Second parameter'),
    }
  },
  async ({ param1, param2 }) => {
    try {
      // Tool implementation
      return {
        content: [{ 
          type: 'text', 
          text: `Processed ${param1} with value ${param2}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error: ${error instanceof Error ? error.message : String(error)}` 
        }],
        isError: true
      };
    }
  }
);
```

### Registering a Custom Resource

```typescript
import { AmazonSellerMcpServer, AmazonRegion } from 'amazon-seller-mcp-client';

const server = new AmazonSellerMcpServer({
  // ... configuration
});

await server.connect({ type: 'stdio' });

server.registerResource(
  'custom-resource',
  'custom-resource://{id}',
  {
    title: 'Custom Resource',
    description: 'A custom resource for demonstration',
  },
  async (uri, { id }) => {
    try {
      // Resource implementation
      const data = { id, name: `Resource ${id}`, value: Math.random() };
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2),
          mimeType: 'application/json',
        }]
      };
    } catch (error) {
      throw new Error(`Failed to retrieve resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  'custom-resource://list',
  {
    id: async (value) => {
      // Provide completions for the 'id' parameter
      return ['1', '2', '3'].filter(id => id.startsWith(value));
    }
  }
);
```

## Advanced Usage

### Working with Notifications

```typescript
import { AmazonSellerMcpServer, AmazonRegion } from 'amazon-seller-mcp-client';

const server = new AmazonSellerMcpServer({
  // ... configuration
  debouncedNotifications: true, // Enable notification debouncing
});

await server.connect({ type: 'stdio' });

// Get the notification manager
const notificationManager = server.getNotificationManager();

// Send a notification
notificationManager.sendNotification({
  type: 'inventory_update',
  title: 'Inventory Updated',
  description: 'Inventory levels have changed',
  data: {
    sku: 'ABC123',
    oldQuantity: 10,
    newQuantity: 5,
  },
});
```

### Error Recovery

```typescript
import { AmazonSellerMcpServer, AmazonRegion, ApiError, ApiErrorType } from 'amazon-seller-mcp-client';

const server = new AmazonSellerMcpServer({
  // ... configuration
});

await server.connect({ type: 'stdio' });

// Register a tool with custom error handling
server.registerTool(
  'error-prone-tool',
  {
    title: 'Error-Prone Tool',
    description: 'A tool that demonstrates error handling',
    inputSchema: {
      shouldFail: z.boolean().describe('Whether the tool should fail'),
    }
  },
  async ({ shouldFail }) => {
    try {
      if (shouldFail) {
        throw new ApiError(
          'Tool failed as requested',
          ApiErrorType.VALIDATION_ERROR,
          400,
          { reason: 'User requested failure' }
        );
      }
      
      return {
        content: [{ 
          type: 'text', 
          text: 'Tool executed successfully' 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error: ${error instanceof Error ? error.message : String(error)}` 
        }],
        isError: true,
        errorDetails: error instanceof ApiError ? {
          code: error.type,
          message: error.message,
          details: error.details,
        } : undefined
      };
    }
  }
);
```

## Best Practices

1. **Credential Security**: Store credentials securely and never expose them in logs or error messages.
2. **Rate Limiting**: Be mindful of Amazon Selling Partner API rate limits and use the built-in rate limiting features.
3. **Error Handling**: Implement proper error handling to gracefully recover from API errors.
4. **Caching**: Use caching for frequently accessed data to reduce API calls.
5. **Testing**: Test your implementation thoroughly, especially error scenarios and edge cases.

## API Reference

For detailed API reference, see the TypeScript type definitions in the `dist` directory.