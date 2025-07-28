# Amazon Seller MCP Client Setup Guide

This guide provides detailed instructions for installing, configuring, and troubleshooting the Amazon Seller MCP Client. The client enables AI agents to interact with Amazon Seller accounts through the Model Context Protocol (MCP).

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
  - [Amazon Selling Partner API Setup](#amazon-selling-partner-api-setup)
  - [Environment Variables](#environment-variables)
  - [Configuration Options](#configuration-options)
- [Running the Client](#running-the-client)
  - [Basic Usage](#basic-usage)
  - [HTTP Server Mode](#http-server-mode)
  - [Custom Tools and Resources](#custom-tools-and-resources)
- [Troubleshooting](#troubleshooting)
  - [Common Errors](#common-errors)
  - [Authentication Issues](#authentication-issues)
  - [Rate Limiting and Throttling](#rate-limiting-and-throttling)
  - [Network and Connection Issues](#network-and-connection-issues)
  - [Debugging Tips](#debugging-tips)
- [Advanced Configuration](#advanced-configuration)
  - [Logging](#logging)
  - [Error Recovery](#error-recovery)
  - [Caching](#caching)

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Amazon Selling Partner API credentials

### Install from npm

```bash
npm install amazon-seller-mcp
```

Or using yarn:

```bash
yarn add amazon-seller-mcp
```

### Install from Source

1. Clone the repository:

```bash
git clone https://github.com/your-organization/amazon-seller-mcp.git
cd amazon-seller-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the package:

```bash
npm run build
```

## Configuration

### Amazon Selling Partner API Setup

Before using the client, you need to set up your Amazon Selling Partner API credentials:

1. Register as an Amazon Selling Partner API Developer:
   - Go to the [Amazon Developer Services Portal](https://developer.amazonservices.com/)
   - Create a developer account if you don't have one
   - Register a new application

2. Create an IAM User and Role (for request signing):
   - Go to the [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Create a new IAM user with programmatic access
   - Create a new IAM role with the appropriate permissions
   - Note your Access Key ID, Secret Access Key, and Role ARN

3. Generate OAuth Credentials:
   - In the Amazon Developer Services Portal, create OAuth credentials
   - Configure the OAuth redirect URLs
   - Note your Client ID and Client Secret

4. Generate a Refresh Token:
   - Use the LWA (Login with Amazon) authorization flow to generate a refresh token
   - Store this refresh token securely

### Environment Variables

Create a `.env` file in your project root with the following variables:

```
# Amazon Selling Partner API Credentials
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REFRESH_TOKEN=your_refresh_token

# AWS Credentials (Optional, but recommended for request signing)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_ROLE_ARN=your_role_arn

# Amazon Marketplace Configuration
# ATVPDKIKX0DER = US, A1F83G8C2ARO7P = UK, etc.
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER

# Server Configuration
HOST=localhost
PORT=3000

# Logging Configuration
LOG_LEVEL=info  # debug, info, warn, error
```

### Configuration Options

The `AmazonSellerMcpServer` constructor accepts the following configuration options:

```typescript
interface AmazonSellerMcpConfig {
  // Server name
  name: string;
  
  // Server version
  version: string;
  
  // Amazon Selling Partner API credentials
  credentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    roleArn?: string;
  };
  
  // Amazon marketplace ID
  marketplaceId: string;
  
  // Amazon region (NA, EU, FE)
  region: AmazonRegion;
  
  // Whether to debounce notifications
  debouncedNotifications?: boolean;
}
```

## Running the Client

### Basic Usage

Create a basic script to run the client:

```typescript
import { AmazonSellerMcpServer, AmazonRegion } from 'amazon-seller-mcp';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Create a new MCP server instance
    const server = new AmazonSellerMcpServer({
      name: 'amazon-seller-mcp',
      version: '1.0.0',
      credentials: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
        refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        roleArn: process.env.AWS_ROLE_ARN,
      },
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      region: AmazonRegion.NA,
    });

    // Connect to the MCP transport (stdio for CLI usage)
    await server.connect({
      type: 'stdio',
    });

    // Register all tools and resources
    server.registerAllTools();
    server.registerAllResources();

    console.log('Server started successfully!');
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
```

Run the script:

```bash
node your-script.js
```

### HTTP Server Mode

To run the client as an HTTP server:

```typescript
// Connect to the MCP transport (HTTP server)
await server.connect({
  type: 'streamableHttp',
  httpOptions: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    enableDnsRebindingProtection: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    sessionManagement: true,
  },
});
```

### Custom Tools and Resources

You can register custom tools and resources:

```typescript
import { z } from 'zod';

// Register a custom tool
server.registerTool(
  'custom-pricing-tool',
  {
    title: 'Custom Pricing Tool',
    description: 'Analyze and update product pricing',
    inputSchema: {
      sku: z.string().describe('Product SKU'),
      marketAnalysis: z.boolean().default(true).describe('Include market analysis'),
    }
  },
  async ({ sku, marketAnalysis }) => {
    try {
      // Tool implementation
      return {
        content: [{ 
          type: 'text', 
          text: `Pricing analysis for SKU: ${sku}` 
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

## Troubleshooting

### Common Errors

#### Error: Invalid credentials

**Symptoms:**
- Authentication errors when connecting to Amazon Selling Partner API
- Error messages containing "Invalid credentials" or "Authentication failed"

**Solutions:**
1. Verify that your Client ID, Client Secret, and Refresh Token are correct
2. Check if your refresh token has expired (they typically last 1 year)
3. Regenerate your refresh token if necessary
4. Ensure your IAM user has the correct permissions

#### Error: Access denied

**Symptoms:**
- Authorization errors when accessing specific API endpoints
- Error messages containing "Access denied" or "Insufficient permissions"

**Solutions:**
1. Verify that your IAM role has the correct permissions
2. Check if your application has been approved for the specific API sections you're trying to access
3. Review the Amazon Selling Partner API documentation for required permissions

#### Error: Rate limit exceeded

**Symptoms:**
- Requests failing with 429 status code
- Error messages containing "Rate limit exceeded" or "Too many requests"

**Solutions:**
1. Implement proper request throttling (the client has built-in retry mechanisms)
2. Reduce the frequency of your API calls
3. Use the built-in caching mechanisms to avoid redundant requests
4. Consider using batch operations where available

### Authentication Issues

If you're experiencing authentication issues:

1. **Check Credentials:**
   - Verify all credentials are correct and properly formatted
   - Ensure there are no extra spaces or special characters

2. **Token Refresh:**
   - The client automatically refreshes tokens, but if you're still having issues:
   - Manually generate a new refresh token
   - Update your environment variables or configuration

3. **Request Signing:**
   - Ensure your AWS credentials are correct
   - Verify that your IAM role has the correct permissions
   - Check if your system clock is synchronized (important for request signing)

### Rate Limiting and Throttling

Amazon Selling Partner API has strict rate limits. The client implements several strategies to handle this:

1. **Automatic Retry:**
   - The client automatically retries requests with exponential backoff
   - You can configure the retry parameters in the error recovery manager

2. **Circuit Breaker:**
   - The client implements a circuit breaker pattern to prevent cascading failures
   - If too many requests fail, the circuit opens and fast-fails requests for a period

3. **Manual Handling:**
   - If you're still experiencing issues, consider implementing additional throttling:
   ```typescript
   // Create a custom error recovery manager with more conservative settings
   const errorRecoveryManager = new ErrorRecoveryManager();
   errorRecoveryManager.addStrategy(new RetryRecoveryStrategy(5, 2000, 60000));
   errorRecoveryManager.addStrategy(new CircuitBreakerRecoveryStrategy(3, 120000));
   
   // Use the custom manager in your API client
   const apiClient = new BaseApiClient(authConfig, {
     errorRecoveryManager,
     maxRetries: 5,
     retryDelay: 2000,
   });
   ```

### Network and Connection Issues

If you're experiencing network or connection issues:

1. **Check Connectivity:**
   - Verify that your system can connect to the Amazon Selling Partner API endpoints
   - Check if there are any firewall or proxy settings blocking the connection

2. **Timeout Settings:**
   - Adjust the timeout settings in the API client:
   ```typescript
   const apiClient = new BaseApiClient(authConfig, {
     timeoutMs: 30000, // 30 seconds
   });
   ```

3. **DNS Issues:**
   - If you're experiencing DNS resolution issues, try using IP addresses instead of hostnames
   - Check if your DNS resolver is functioning correctly

### Debugging Tips

1. **Enable Debug Logging:**
   - Set the `LOG_LEVEL` environment variable to `debug`
   - This will output detailed logs of all requests and responses

2. **Inspect Request/Response:**
   - Use the logging system to inspect the raw request and response data
   - Look for any errors or unexpected values

3. **Test with Sandbox:**
   - Use the Amazon Selling Partner API sandbox environment for testing
   - This allows you to test your integration without affecting real data

4. **Check API Status:**
   - Verify that the Amazon Selling Partner API is operational
   - Check the [Amazon Selling Partner API Status](https://developer.amazonservices.com/api-status) page

## Advanced Configuration

### Logging

The client uses Winston for logging. You can configure the logging level and format:

```typescript
import { configureLogger } from 'amazon-seller-mcp/utils';

// Configure the logger
configureLogger({
  level: 'debug', // debug, info, warn, error
  format: 'json', // json, simple
  redactSensitiveData: true, // Redact sensitive data in logs
});
```

### Error Recovery

You can customize the error recovery strategies:

```typescript
import {
  ErrorRecoveryManager,
  RetryRecoveryStrategy,
  CircuitBreakerRecoveryStrategy,
  FallbackRecoveryStrategy,
} from 'amazon-seller-mcp/utils';

// Create a custom error recovery manager
const errorRecoveryManager = new ErrorRecoveryManager();

// Add retry strategy
errorRecoveryManager.addStrategy(
  new RetryRecoveryStrategy(
    3, // Max retries
    1000, // Base delay in ms
    30000 // Max delay in ms
  )
);

// Add circuit breaker strategy
errorRecoveryManager.addStrategy(
  new CircuitBreakerRecoveryStrategy(
    5, // Failure threshold
    60000, // Reset timeout in ms
    [ServerError, NetworkError] // Error types that can trip the circuit
  )
);

// Add fallback strategy
errorRecoveryManager.addStrategy(
  new FallbackRecoveryStrategy(
    async (error, context) => {
      // Fallback implementation
      return { fallback: true };
    },
    [ResourceNotFoundError] // Error types that can be recovered from
  )
);

// Use the custom manager in your API client
const apiClient = new BaseApiClient(authConfig, {
  errorRecoveryManager,
});
```

### Caching

The client implements advanced caching strategies to reduce API calls and improve performance. You can configure the caching behavior:

```typescript
import { configureCacheManager } from 'amazon-seller-mcp';

// Configure the cache manager
configureCacheManager({
  defaultTtl: 300, // Default time to live in seconds
  checkPeriod: 120, // Check period for expired items in seconds
  maxEntries: 1000, // Maximum number of entries in the cache
  persistent: true, // Enable persistent caching to disk
  persistentDir: '/path/to/cache', // Directory for persistent cache
  collectStats: true, // Collect cache statistics
});

// Use the cache in your code
import { getCacheManager } from 'amazon-seller-mcp';

const cacheManager = getCacheManager();

// Get a value from the cache
const value = await cacheManager.get('catalog:ASIN123');

// Set a value in the cache
await cacheManager.set('catalog:ASIN123', catalogData, 600); // 10 minutes TTL

// Delete a value from the cache
await cacheManager.del('catalog:ASIN123');

// Clear the entire cache
await cacheManager.clear();

// Get cache statistics
const stats = cacheManager.getStats();
console.log(`Cache hit ratio: ${stats.hitRatio * 100}%`);

// Execute a function with caching
const result = await cacheManager.withCache(
  'catalog:ASIN123',
  async () => {
    // Expensive operation to fetch catalog data
    return fetchCatalogData('ASIN123');
  },
  600 // 10 minutes TTL
);
```

### Connection Pooling

The client uses connection pooling to improve performance by reusing HTTP connections. You can configure the connection pool:

```typescript
import { configureConnectionPool } from 'amazon-seller-mcp';

// Configure the connection pool
configureConnectionPool({
  maxSockets: 10, // Maximum number of sockets per host
  maxFreeSockets: 5, // Maximum number of free sockets to keep alive
  timeout: 60000, // Socket timeout in milliseconds (1 minute)
  keepAliveTimeout: 60000, // Keep-alive timeout in milliseconds (1 minute)
  keepAlive: true, // Enable connection reuse
});

// Get the connection pool in your code
import { getConnectionPool } from 'amazon-seller-mcp';

const connectionPool = getConnectionPool();

// Get connection pool statistics
const stats = connectionPool.getStats();
console.log(`Active connections: ${stats.activeSockets}`);
```

### Request Batching

The client can batch similar requests together to reduce API calls:

```typescript
import { BaseApiClient } from 'amazon-seller-mcp';

// The client automatically batches similar requests that occur within a short time window
// This is particularly useful for high-volume operations

// Example of how batching works internally:
const result1 = await apiClient.getCatalogItem('ASIN123'); // Makes API call
const result2 = await apiClient.getCatalogItem('ASIN123'); // Uses batched result if within batch window

// You can configure the server with performance optimizations:
import { AmazonSellerMcpServer } from 'amazon-seller-mcp';

const server = new AmazonSellerMcpServer({
  name: 'amazon-seller-mcp',
  version: '1.0.0',
  credentials: { /* ... */ },
  marketplaceId: 'ATVPDKIKX0DER',
  region: AmazonRegion.NA,
  // Performance optimization configurations
  cacheConfig: {
    defaultTtl: 300,
    maxEntries: 1000,
    persistent: true,
  },
  connectionPoolConfig: {
    maxSockets: 10,
    keepAlive: true,
  },
});
```

---

For more information, refer to the [API Documentation](./API.md) and [Examples](./examples/).

If you encounter any issues not covered in this guide, please open an issue on the GitHub repository or contact support.