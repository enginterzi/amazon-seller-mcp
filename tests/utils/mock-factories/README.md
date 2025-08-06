# Centralized Mock Factory System

This directory contains a centralized mock factory system for creating standardized, reusable mocks across the test suite. The system provides consistent mocking patterns for axios, API clients, and authentication components.

## Overview

The mock factory system consists of four main components:

1. **Base Factory Infrastructure** (`base-factory.ts`) - Core interfaces and utilities
2. **Axios Mock Factory** (`axios-factory.ts`) - HTTP request mocking
3. **API Client Mock Factories** (`api-client-factory.ts`) - Amazon SP-API client mocking
4. **Authentication Mock Factory** (`auth-factory.ts`) - Authentication and credential mocking

## Quick Start

```typescript
import { 
  AxiosMockFactory, 
  CatalogClientMockFactory, 
  AmazonAuthMockFactory 
} from '../utils/mock-factories/index.js';

// Create mock factories
const axiosFactory = new AxiosMockFactory();
const catalogFactory = new CatalogClientMockFactory();
const authFactory = new AmazonAuthMockFactory();

// Create mock instances
const mockAxios = axiosFactory.create();
const mockCatalogClient = catalogFactory.create();
const mockAuth = authFactory.create();

// Configure mock behaviors
axiosFactory.mockSuccess(mockAxios, { data: { success: true } });
catalogFactory.mockGetCatalogItem(mockCatalogClient, 'B123', { asin: 'B123' });
authFactory.mockGetAccessToken(mockAuth, 'test-token');
```

## Factory Types

### Base Factory Infrastructure

- **`BaseMockFactory<T>`** - Abstract base class for all mock factories
- **`MockFactoryRegistry`** - Singleton registry for managing multiple factories
- **`MockScenarioManager`** - Manages different test scenarios
- **`TestIsolationUtils`** - Utilities for test cleanup and isolation
- **`MockUtils`** - Common mock utilities (sequential, delayed, fail-after patterns)

### Axios Mock Factory

Creates standardized axios mocks with configurable response scenarios:

```typescript
const factory = new AxiosMockFactory();
const mockAxios = factory.create();

// Success response
factory.mockSuccess(mockAxios, { 
  data: { message: 'success' }, 
  status: 200 
});

// Error response
factory.mockError(mockAxios, {
  message: 'Request failed',
  status: 500,
  responseData: { error: 'Server error' }
});

// HTTP-specific errors
factory.mockHttpError(mockAxios, 404, { error: 'Not found' });
factory.mockNetworkError(mockAxios, 'ECONNRESET');
factory.mockTimeoutError(mockAxios);

// Response sequences
factory.mockSequence(mockAxios, [
  { data: { first: true } },
  { message: 'Second fails', status: 500 },
  { data: { third: true } }
]);
```

### API Client Mock Factories

Creates mocks for Amazon SP-API clients:

```typescript
// Catalog Client
const catalogFactory = new CatalogClientMockFactory();
const mockCatalog = catalogFactory.create();

catalogFactory.mockGetCatalogItem(mockCatalog, 'B123456789', {
  asin: 'B123456789',
  attributes: { item_name: ['Test Product'] }
});

// Listings Client
const listingsFactory = new ListingsClientMockFactory();
const mockListings = listingsFactory.create();

listingsFactory.mockGetListing(mockListings, 'TEST-SKU', {
  sku: 'TEST-SKU',
  status: 'ACTIVE'
});

// Orders Client
const ordersFactory = new OrdersClientMockFactory();
const mockOrders = ordersFactory.create();

ordersFactory.mockGetOrder(mockOrders, 'ORDER-123', {
  orderId: 'ORDER-123',
  orderStatus: 'SHIPPED'
});
```

### Authentication Mock Factory

Creates mocks for authentication components:

```typescript
const authFactory = new AmazonAuthMockFactory();
const mockAuth = authFactory.create();

// Token retrieval
authFactory.mockGetAccessToken(mockAuth, 'access-token-123');

// Token refresh
authFactory.mockRefreshAccessToken(mockAuth, {
  accessToken: 'new-token',
  expiresIn: 3600
});

// Request signing
authFactory.mockSignRequest(mockAuth, {
  addHeaders: { 'X-Custom': 'value' }
});

// Error scenarios
authFactory.mockAuthError(mockAuth, 'getAccessToken', {
  message: 'Invalid credentials',
  type: 'INVALID_CREDENTIALS',
  statusCode: 401
});

// Token expiration flow
authFactory.mockTokenExpiration(mockAuth, {
  expiredToken: 'old-token',
  newToken: 'fresh-token'
});
```

## Pre-configured Scenarios

The system includes pre-configured scenarios for common use cases:

### Axios Scenarios

```typescript
import { AxiosMockScenarios } from '../utils/mock-factories/index.js';

// Success scenarios
const success = AxiosMockScenarios.success({ data: 'test' });
const created = AxiosMockScenarios.created({ id: 123 });
const noContent = AxiosMockScenarios.noContent();

// Error scenarios
const badRequest = AxiosMockScenarios.badRequest('Invalid input');
const unauthorized = AxiosMockScenarios.unauthorized();
const notFound = AxiosMockScenarios.notFound();
const serverError = AxiosMockScenarios.serverError();
const networkError = AxiosMockScenarios.networkError('ECONNRESET');
const timeout = AxiosMockScenarios.timeout();
```

### Authentication Scenarios

```typescript
import { AuthMockScenarios } from '../utils/mock-factories/index.js';

// Valid authentication
const validAuth = AuthMockScenarios.validAuth('my-token');

// Error scenarios
const expiredToken = AuthMockScenarios.expiredToken('old-token');
const refreshFailure = AuthMockScenarios.refreshFailure();
const invalidCredentials = AuthMockScenarios.invalidCredentials();
const networkError = AuthMockScenarios.networkError();
const rateLimitError = AuthMockScenarios.rateLimitError();
```

## Response Builders

Utility functions for creating consistent API responses:

```typescript
import { ApiResponseBuilders } from '../utils/mock-factories/index.js';

// Success response
const success = ApiResponseBuilders.success({ data: 'test' }, 200);

// Paginated response
const paginated = ApiResponseBuilders.paginated([{ id: 1 }, { id: 2 }], 'next-token');

// Submission response
const submission = ApiResponseBuilders.submission('SUB-123', 'ACCEPTED');

// Empty response
const empty = ApiResponseBuilders.empty();
```

## Test Setup Patterns

### Basic Setup

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AxiosMockFactory } from '../utils/mock-factories/index.js';

describe('My Test Suite', () => {
  let factory: AxiosMockFactory;
  let mockAxios: MockAxiosStatic;

  beforeEach(() => {
    factory = new AxiosMockFactory();
    mockAxios = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  it('should handle successful requests', async () => {
    factory.mockSuccess(mockAxios, { data: { success: true } });
    
    const result = await mockAxios.request({});
    expect(result.data).toEqual({ success: true });
  });
});
```

### Registry-based Setup

```typescript
import { MockFactoryRegistry, TestIsolationUtils } from '../utils/mock-factories/index.js';

describe('Complex Test Suite', () => {
  let registry: MockFactoryRegistry;

  beforeEach(() => {
    registry = MockFactoryRegistry.getInstance();
    
    // Register factories
    registry.register(new AxiosMockFactory());
    registry.register(new AmazonAuthMockFactory());
  });

  afterEach(() => {
    TestIsolationUtils.resetAll();
  });

  it('should work with registered factories', () => {
    const axiosFactory = registry.get('axios-factory');
    const mockAxios = axiosFactory?.create();
    
    // Use mock...
  });
});
```

## Advanced Features

### Mock Sequences

Configure mocks to return different responses on subsequent calls:

```typescript
// Token refresh sequence
authFactory.mockAuthSequence(mockAuth, 'getAccessToken', [
  'first-token',
  'second-token',
  new Error('Third call fails'),
  'recovery-token'
]);
```

### Delayed Responses

Simulate network delays:

```typescript
axiosFactory.mockSuccess(mockAxios, {
  data: { delayed: true },
  delay: 100 // 100ms delay
});
```

### One-time vs Persistent Mocks

```typescript
// One-time response
factory.mockSuccess(mockAxios, { data: 'once' }, { once: true });

// Persistent response (default)
factory.mockSuccess(mockAxios, { data: 'always' });
```

### Method-specific Mocking

```typescript
// Mock specific HTTP method
factory.mockSuccess(mockAxios, { data: 'post-data' }, { method: 'post' });

// Mock specific API client method
baseFactory.mockSuccess(mockClient, 'request', { data: 'test' });
```

## Best Practices

1. **Use Factory Reset**: Always call `factory.reset()` in `afterEach` to ensure test isolation
2. **Prefer Specific Factories**: Use specific client factories (CatalogClientMockFactory) over generic ones when possible
3. **Configure Before Use**: Set up mock behaviors before using the mocks in your tests
4. **Use Pre-configured Scenarios**: Leverage built-in scenarios for common use cases
5. **Test Error Paths**: Use error scenarios to test error handling code
6. **Keep Mocks Simple**: Don't over-configure mocks - only mock what your test needs

## Migration from Existing Mocks

To migrate from existing manual mocks:

1. Replace manual mock setup with factory creation
2. Use factory methods instead of direct mock configuration
3. Replace cleanup code with `factory.reset()`
4. Use pre-configured scenarios where applicable

### Before (Manual Mock)

```typescript
const mockAxios = vi.fn();
mockAxios.request = vi.fn().mockResolvedValue({
  data: { success: true },
  status: 200,
  headers: {}
});
```

### After (Factory Mock)

```typescript
const factory = new AxiosMockFactory();
const mockAxios = factory.create();
factory.mockSuccess(mockAxios, { data: { success: true } });
```

## Testing the Mock Factories

The mock factories themselves are thoroughly tested. Run the tests with:

```bash
npm test -- tests/utils/mock-factories/ --run
```

This ensures the mock factories work correctly and maintain consistent behavior across the test suite.