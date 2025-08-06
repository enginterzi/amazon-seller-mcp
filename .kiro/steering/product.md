---
inclusion: always
---

# Amazon Seller MCP Client - Development Guidelines

## Product Context

This is an MCP (Model Context Protocol) server that bridges AI agents with Amazon's Selling Partner API. The system enables automated Amazon seller operations through standardized MCP tools and resources.

## Core Domains

- **Catalog**: Product search, ASIN lookup, category browsing
- **Listings**: Product listing creation, updates, optimization
- **Inventory**: Stock management, quantity updates, FBA operations
- **Orders**: Order processing, fulfillment, status tracking
- **Reports**: Sales analytics, performance metrics, financial data

## Development Principles

### API Integration Patterns
- All Amazon SP-API calls must go through the appropriate client in `src/api/`
- Use the base client for common functionality (auth, rate limiting, error handling)
- Implement proper error recovery with exponential backoff
- Cache frequently accessed data using the cache manager

### MCP Implementation Standards
- Tools should be atomic operations with clear input/output schemas
- Resources should provide read-only access to Amazon data
- Notifications should be used for real-time updates (inventory changes, order status)
- All MCP handlers must include proper error handling and validation

### Security Requirements
- Never log or expose sensitive credentials or tokens
- Use the credential manager for all authentication operations
- Implement proper OAuth 2.0 flow with automatic token refresh
- Validate all inputs using Zod schemas

### Performance Guidelines
- Leverage connection pooling for HTTP requests
- Implement intelligent caching with appropriate TTL values
- Respect Amazon's rate limits and implement backoff strategies
- Use batch operations where possible to reduce API calls

## Code Conventions

### Error Handling
- Use custom error classes that extend the base Error
- Include error codes, messages, and contextual details
- Implement graceful degradation for non-critical failures
- Log errors with appropriate severity levels

### Async Operations
- All API operations must be async/await
- Implement proper timeout handling
- Use Promise.allSettled for parallel operations
- Handle race conditions in concurrent operations

### Data Validation
- Validate all external inputs using Zod schemas
- Sanitize data before sending to Amazon APIs
- Implement type guards for runtime type checking
- Use strict TypeScript configuration

## Testing Requirements

- Unit tests for all business logic
- Integration tests for API interactions
- Mock Amazon SP-API responses for consistent testing
- Test error scenarios and edge cases
- Maintain high test coverage (>90%)

## AI Assistant Guidelines

When working with this codebase:
- Focus on Amazon seller business logic and workflows
- Ensure all operations respect Amazon's terms of service
- Implement proper rate limiting and error recovery
- Use the existing patterns for API clients and MCP handlers
- Prioritize data accuracy and seller account safety