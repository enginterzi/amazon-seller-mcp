# Technology Stack & Build System

## Tech Stack

- **Runtime**: Node.js 18.0.0+ (ES2022 modules)
- **Language**: TypeScript 5.2.2+ with strict mode
- **Module System**: ESM (ES Modules) with NodeNext resolution
- **Protocol**: Model Context Protocol (MCP) SDK v1.16.0
- **API Integration**: Amazon Selling Partner API via amazon-sp-api v0.7.0
- **HTTP Client**: Axios v1.6.0 with connection pooling
- **Authentication**: OAuth 2.0 + AWS Signature V4
- **Validation**: Zod v3.22.4 for schema validation
- **Caching**: node-cache v5.1.2 for performance optimization
- **Logging**: Winston v3.11.0 for structured logging

## Development Tools

- **Testing**: Vitest v3.2.4 with coverage reporting
- **Linting**: ESLint v8.52.0 with TypeScript plugin
- **Formatting**: Prettier v3.0.3 (single quotes, 100 char width, 2 spaces)
- **Type Checking**: TypeScript compiler with declaration generation
- **Documentation**: JSDoc with TypeScript integration

## Build System

### Common Commands

```bash
# Build the project
npm run build

# Run tests
npm test
npm run test:watch

# Linting and formatting
npm run lint
npm run format

# Generate documentation
npm run docs
npm run build:docs

# Development workflow
npm run prepare      # Pre-commit build
npm run prepublishOnly  # Pre-publish build
```

### Build Configuration

- **Output**: `dist/` directory with declaration files
- **Source Maps**: Enabled for debugging
- **Module Format**: ES modules with .js extensions
- **Target**: ES2022 for modern Node.js compatibility

## Environment Configuration

### Required Environment Variables

```bash
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REFRESH_TOKEN=Atzr|IwEBIxxxxx
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
```

### Optional Configuration

```bash
AWS_ACCESS_KEY_ID=your_access_key     # For IAM signing
AWS_SECRET_ACCESS_KEY=your_secret     # For IAM signing
LOG_LEVEL=info                        # debug, info, warn, error
CACHE_ENABLED=true                    # Enable/disable caching
RATE_LIMIT_ENABLED=true              # Enable/disable rate limiting
```

## Performance Features

- **Connection Pooling**: Reuse HTTP connections for better performance
- **Intelligent Caching**: Configurable TTL for frequently accessed data
- **Rate Limiting**: Built-in Amazon SP-API rate limit compliance
- **Error Recovery**: Automatic retry with exponential backoff
- **Memory Management**: Efficient resource cleanup and garbage collection