# Project Structure & Organization

## Directory Structure

```
src/
├── api/                    # Amazon SP-API client implementations
│   ├── base-client.ts      # Base API client with common functionality
│   ├── catalog-client.ts   # Catalog API operations
│   ├── inventory-client.ts # Inventory management API
│   ├── listings-client.ts  # Product listings API
│   ├── orders-client.ts    # Orders processing API
│   └── reports-client.ts   # Reports and analytics API
├── auth/                   # Authentication and credential management
│   ├── amazon-auth.ts      # OAuth 2.0 and AWS Signature V4
│   └── credential-manager.ts # Secure credential storage
├── server/                 # MCP server implementation
│   ├── server.ts          # Main MCP server class
│   ├── tools.ts           # Tool registration and management
│   ├── resources.ts       # Resource registration and management
│   ├── notifications.ts   # Base notification system
│   ├── inventory-notifications.ts # Inventory change notifications
│   └── order-notifications.ts    # Order status notifications
├── tools/                  # MCP tool implementations
│   ├── catalog-tools.ts    # Product search and catalog tools
│   ├── listings-tools.ts   # Listing management tools
│   ├── inventory-tools.ts  # Inventory update tools
│   ├── orders-tools.ts     # Order processing tools
│   ├── reports-tools.ts    # Report generation tools
│   └── ai-tools.ts         # AI-assisted content generation
├── resources/              # MCP resource implementations
│   ├── catalog/           # Catalog resource handlers
│   ├── listings/          # Listings resource handlers
│   ├── inventory/         # Inventory resource handlers
│   ├── orders/            # Orders resource handlers
│   └── reports/           # Reports resource handlers
├── types/                  # TypeScript type definitions
│   ├── api.ts             # API-related types
│   ├── auth.ts            # Authentication types
│   └── index.ts           # Type exports
├── utils/                  # Utility functions and helpers
│   ├── cache-manager.ts    # Caching functionality
│   ├── connection-pool.ts  # HTTP connection pooling
│   ├── error-handler.ts    # Error handling utilities
│   └── logger.ts           # Structured logging
└── index.ts               # Main library exports
```

## Architecture Patterns

### Layered Architecture

1. **API Layer** (`src/api/`): Direct Amazon SP-API integration
2. **Service Layer** (`src/server/`): MCP protocol implementation
3. **Tool Layer** (`src/tools/`): MCP tool handlers
4. **Resource Layer** (`src/resources/`): MCP resource providers
5. **Utility Layer** (`src/utils/`): Cross-cutting concerns

### Module Organization

- **Single Responsibility**: Each module handles one specific domain
- **Dependency Injection**: Configuration passed through constructors
- **Interface Segregation**: Separate interfaces for different concerns
- **Export Consistency**: All modules export through `index.ts` files

## File Naming Conventions

- **Kebab Case**: All file names use kebab-case (e.g., `base-client.ts`)
- **Descriptive Names**: File names clearly indicate their purpose
- **Type Suffixes**: Interface files end with appropriate suffixes
- **Test Files**: Test files mirror source structure in `tests/` directory

## Code Organization Principles

### Class Structure

```typescript
export class ExampleClass {
  // Private properties first
  private readonly config: Config;
  
  // Constructor
  constructor(config: Config) {
    this.config = config;
  }
  
  // Public methods
  public async publicMethod(): Promise<Result> {
    // Implementation
  }
  
  // Private methods last
  private helperMethod(): void {
    // Implementation
  }
}
```

### Import Organization

```typescript
// Node.js built-ins first
import { URL } from 'url';

// Third-party dependencies
import axios from 'axios';
import { z } from 'zod';

// Internal imports (relative paths)
import { BaseClient } from './base-client.js';
import type { ApiConfig } from '../types/api.js';
```

### Error Handling Pattern

- Custom error classes extend base `Error`
- Errors include type, message, and optional details
- Consistent error propagation through promise chains
- Graceful degradation for non-critical failures

### Testing Structure

```
tests/
├── unit/                  # Unit tests mirror src/ structure
│   ├── api/
│   ├── auth/
│   ├── server/
│   ├── tools/
│   └── utils/
├── integration/           # Integration tests
├── mocks/                 # Mock implementations
└── resources/             # Test resource files
```

## Configuration Management

- Environment variables for runtime configuration
- Type-safe configuration objects
- Default values with override capability
- Validation at startup with clear error messages

## Documentation Standards

- JSDoc comments for all public APIs
- README files in complex subdirectories
- Inline comments for complex business logic
- Type annotations serve as documentation