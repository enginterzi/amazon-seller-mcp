# Testing Patterns and Guidelines

## Overview

This document establishes comprehensive testing standards for the Amazon Seller MCP Client project. These guidelines ensure consistent, maintainable, and effective tests that focus on behavior rather than implementation details.

## Core Testing Principles

### 1. Behavior-Driven Testing

**Focus on What, Not How**
- Test user-facing behavior and public API contracts
- Verify expected outputs and side effects
- Avoid testing internal implementation details

```typescript
// ❌ Bad: Testing implementation details
it('should call authenticateRequest method', () => {
  const spy = vi.spyOn(client, 'authenticateRequest');
  client.makeRequest('/test');
  expect(spy).toHaveBeenCalled();
});

// ✅ Good: Testing behavior
it('should return product data for valid ASIN', async () => {
  const mockResponse = TestDataBuilder.createProductResponse();
  mockApiClient.get.mockResolvedValue(mockResponse);
  
  const result = await catalogClient.getProduct('B123456789');
  
  TestAssertions.expectSuccessResponse(result, mockResponse.data);
});
```

### 2. Test Structure and Organization

**Flat Structure with Descriptive Names**
- Maximum two levels of describe blocks
- Use clear, descriptive test names that eliminate need for deep nesting
- Group related tests logically, not hierarchically

```typescript
// ❌ Bad: Deep nesting
describe('CatalogClient', () => {
  describe('getProduct', () => {
    describe('when ASIN is valid', () => {
      describe('and product exists', () => {
        it('should return product data', () => {});
      });
    });
  });
});

// ✅ Good: Flat structure with descriptive names
describe('CatalogClient', () => {
  describe('product retrieval', () => {
    it('should return product data for valid existing ASIN', async () => {});
    it('should throw NotFoundError for non-existent ASIN', async () => {});
    it('should handle API rate limiting gracefully', async () => {});
  });
});
```

### 3. Mock Factory Usage

**Centralized and Reusable Mocks**
- Use mock factories for consistent mock setup
- Customize base mocks for specific test scenarios
- Reset mocks between tests for isolation

```typescript
// ✅ Good: Using mock factories
describe('OrdersClient', () => {
  let ordersClient: OrdersClient;
  let mockApiClient: MockedApiClient;
  let mockAuth: MockedAuth;

  beforeEach(() => {
    mockApiClient = ApiClientMockFactory.create();
    mockAuth = AuthMockFactory.create();
    ordersClient = new OrdersClient(mockApiClient, mockAuth);
  });

  it('should fetch orders for date range', async () => {
    const mockOrders = TestDataBuilder.createOrdersList(3);
    mockApiClient.get.mockResolvedValue({ data: mockOrders });

    const result = await ordersClient.getOrders({
      createdAfter: '2024-01-01',
      createdBefore: '2024-01-31'
    });

    TestAssertions.expectSuccessResponse(result, mockOrders);
  });
});
```

## Test Categories and Standards

### Unit Tests

**Purpose**: Test individual components in isolation
**Location**: `tests/unit/`
**Coverage Target**: 80% line coverage minimum

**Standards**:
- Mock all external dependencies
- Test public API contracts only
- Focus on edge cases and error conditions
- Use descriptive test names that explain the scenario

```typescript
describe('InventoryClient', () => {
  let inventoryClient: InventoryClient;
  let mockDependencies: MockDependencies;

  beforeEach(() => {
    mockDependencies = TestSetup.setupMockEnvironment();
    inventoryClient = TestSetup.createInventoryClient(mockDependencies);
  });

  describe('inventory updates', () => {
    it('should update inventory quantity for valid SKU', async () => {
      // Arrange
      const sku = 'TEST-SKU-001';
      const quantity = 50;
      const expectedResponse = TestDataBuilder.createInventoryUpdateResponse();
      mockDependencies.apiClient.put.mockResolvedValue(expectedResponse);

      // Act
      const result = await inventoryClient.updateQuantity(sku, quantity);

      // Assert
      TestAssertions.expectSuccessResponse(result, expectedResponse.data);
      expect(mockDependencies.apiClient.put).toHaveBeenCalledWith(
        '/inventory/v1/listings/TEST-SKU-001',
        { quantity }
      );
    });

    it('should handle invalid SKU format gracefully', async () => {
      const invalidSku = '';
      
      await expect(inventoryClient.updateQuantity(invalidSku, 10))
        .rejects.toThrow('SKU cannot be empty');
    });
  });
});
```

### Integration Tests

**Purpose**: Test component interactions and workflows
**Location**: `tests/integration/`
**Coverage Target**: 100% critical path coverage

**Standards**:
- Use real implementations where possible
- Mock only external services (Amazon API)
- Test complete user workflows
- Verify end-to-end functionality

```typescript
describe('Order Processing Workflow', () => {
  let server: AmazonSellerMcpServer;
  let mockSpApi: MockSpApi;

  beforeEach(async () => {
    mockSpApi = TestSetup.createMockSpApi();
    server = await TestSetup.createTestServer({ spApi: mockSpApi });
  });

  it('should process order fulfillment workflow', async () => {
    // Arrange
    const orderId = 'ORDER-123';
    mockSpApi.setupOrderScenario('fulfillable-order', orderId);

    // Act
    const orderDetails = await server.handleToolCall('get_order', { orderId });
    const fulfillmentResult = await server.handleToolCall('fulfill_order', {
      orderId,
      trackingNumber: 'TRACK-456'
    });

    // Assert
    TestAssertions.expectSuccessResponse(orderDetails, expect.objectContaining({
      orderId,
      status: 'Unshipped'
    }));
    TestAssertions.expectSuccessResponse(fulfillmentResult, expect.objectContaining({
      orderId,
      status: 'Shipped'
    }));
  });
});
```

### Resource Tests

**Purpose**: Test MCP resource functionality
**Location**: `tests/resources/`

**Standards**:
- Mock API clients consistently
- Test resource registration and handling
- Verify resource response formats
- Test resource URI patterns

```typescript
describe('CatalogResources', () => {
  let catalogResources: CatalogResources;
  let mockCatalogClient: MockedCatalogClient;

  beforeEach(() => {
    mockCatalogClient = CatalogClientMockFactory.create();
    catalogResources = new CatalogResources(mockCatalogClient);
  });

  describe('product resource handling', () => {
    it('should handle product resource URI correctly', async () => {
      const asin = 'B123456789';
      const uri = `amazon://catalog/products/${asin}`;
      const mockProduct = TestDataBuilder.createProduct({ asin });
      mockCatalogClient.getProduct.mockResolvedValue(mockProduct);

      const result = await catalogResources.readResource({ uri });

      expect(result).toEqual({
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(mockProduct, null, 2)
        }]
      });
    });
  });
});
```

### Tool Tests

**Purpose**: Test MCP tool functionality
**Location**: `tests/unit/tools/`

**Standards**:
- Mock API clients using factories
- Test tool registration and execution
- Verify tool input/output contracts
- Test error handling scenarios

```typescript
describe('ListingsTools', () => {
  let listingsTools: ListingsTools;
  let mockListingsClient: MockedListingsClient;

  beforeEach(() => {
    mockListingsClient = ListingsClientMockFactory.create();
    listingsTools = new ListingsTools(mockListingsClient);
  });

  describe('create listing tool', () => {
    it('should create listing with valid input', async () => {
      const input = TestDataBuilder.createListingInput();
      const expectedListing = TestDataBuilder.createListing();
      mockListingsClient.createListing.mockResolvedValue(expectedListing);

      const result = await listingsTools.createListing(input);

      TestAssertions.expectToolSuccess(result, expectedListing);
    });

    it('should validate required fields', async () => {
      const invalidInput = { sku: '' }; // Missing required fields

      const result = await listingsTools.createListing(invalidInput);

      TestAssertions.expectToolError(result, 'ValidationError');
    });
  });
});
```

## Mock Factory Patterns

### Basic Factory Usage

```typescript
// Create default mock
const mockClient = ApiClientMockFactory.create();

// Create mock with overrides
const mockClient = ApiClientMockFactory.create({
  baseURL: 'https://custom-api.com',
  timeout: 5000
});

// Create multiple mocks
const mockClients = ApiClientMockFactory.createMultiple(3);
```

### Advanced Mock Scenarios

```typescript
// Configure specific behavior
const mockAuth = AuthMockFactory.create();
mockAuth.getAccessToken.mockImplementation(async () => {
  if (Date.now() > tokenExpiry) {
    throw new TokenExpiredError('Token expired');
  }
  return 'valid-token';
});

// Setup error scenarios
const mockClient = ApiClientMockFactory.create();
mockClient.get.mockRejectedValueOnce(new RateLimitError('Rate limit exceeded'));
mockClient.get.mockResolvedValueOnce(TestDataBuilder.createSuccessResponse());
```

## Test Data Management

### Using Test Data Builders

```typescript
// Create realistic test data
const product = TestDataBuilder.createProduct({
  asin: 'B123456789',
  title: 'Test Product',
  price: 29.99
});

// Create collections
const orders = TestDataBuilder.createOrdersList(5, {
  status: 'Unshipped'
});

// Create error scenarios
const apiError = TestDataBuilder.createApiError('RateLimitExceeded', {
  retryAfter: 60
});
```

### Data Consistency

- Use builders for all test data creation
- Maintain realistic relationships between entities
- Use consistent identifiers across related tests
- Generate random data for property-based testing

## Assertion Patterns

### Custom Assertions

```typescript
// API response assertions
TestAssertions.expectSuccessResponse(result, expectedData);
TestAssertions.expectErrorResponse(result, 'ValidationError');

// Mock verification
TestAssertions.expectApiCall(mockClient.get, {
  url: '/orders/v0/orders',
  params: { marketplaceIds: ['ATVPDKIKX0DER'] }
});

// Tool result assertions
TestAssertions.expectToolSuccess(result, expectedOutput);
TestAssertions.expectToolError(result, 'InvalidInput');
```

### Standard Expectations

```typescript
// Async operations
await expect(asyncOperation()).resolves.toEqual(expectedResult);
await expect(asyncOperation()).rejects.toThrow(ExpectedError);

// Object matching
expect(result).toEqual(expect.objectContaining({
  id: expect.any(String),
  timestamp: expect.any(Date)
}));

// Array assertions
expect(results).toHaveLength(3);
expect(results).toEqual(expect.arrayContaining([
  expect.objectContaining({ status: 'active' })
]));
```

## Error Testing Patterns

### Exception Testing

```typescript
it('should handle network timeouts gracefully', async () => {
  mockApiClient.get.mockRejectedValue(new TimeoutError('Request timeout'));

  await expect(client.getData()).rejects.toThrow(TimeoutError);
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining('Request timeout')
  );
});
```

### Error Recovery Testing

```typescript
it('should retry failed requests with exponential backoff', async () => {
  mockApiClient.get
    .mockRejectedValueOnce(new NetworkError('Connection failed'))
    .mockRejectedValueOnce(new NetworkError('Connection failed'))
    .mockResolvedValueOnce(TestDataBuilder.createSuccessResponse());

  const result = await client.getDataWithRetry();

  expect(mockApiClient.get).toHaveBeenCalledTimes(3);
  TestAssertions.expectSuccessResponse(result, expect.any(Object));
});
```

## Performance Testing

### Async Operation Testing

```typescript
it('should complete operation within reasonable time', async () => {
  const startTime = Date.now();
  
  await client.performOperation();
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(1000); // 1 second max
});
```

### Memory Usage Testing

```typescript
it('should not leak memory during bulk operations', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform bulk operation
  await client.processBulkData(largeDataSet);
  
  // Force garbage collection if available
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max increase
});
```

## Common Anti-Patterns to Avoid

### ❌ Testing Implementation Details

```typescript
// Don't test private methods or internal state
it('should set internal flag', () => {
  client.processData();
  expect(client._internalFlag).toBe(true); // ❌ Bad
});

// Don't test method calls unless they're part of the contract
it('should call helper method', () => {
  const spy = vi.spyOn(client, 'helperMethod');
  client.publicMethod();
  expect(spy).toHaveBeenCalled(); // ❌ Bad
});
```

### ❌ Overly Complex Test Setup

```typescript
// Don't create complex setup that's hard to understand
beforeEach(async () => {
  // 50 lines of complex setup
  // Multiple nested mocks
  // Complex data structures
}); // ❌ Bad
```

### ❌ Testing Multiple Behaviors in One Test

```typescript
// Don't test multiple unrelated behaviors
it('should handle everything', async () => {
  // Test creation
  // Test validation
  // Test error handling
  // Test cleanup
}); // ❌ Bad
```

### ❌ Brittle Assertions

```typescript
// Don't make assertions that break with minor changes
expect(result).toEqual({
  id: 123,
  name: 'Test',
  createdAt: '2024-01-15T10:30:00.000Z', // ❌ Brittle timestamp
  metadata: {
    version: '1.0.0', // ❌ Brittle version
    internal: { /* complex internal structure */ } // ❌ Internal details
  }
});
```

## Best Practices Summary

1. **Focus on Behavior**: Test what the code does, not how it does it
2. **Use Mock Factories**: Centralize mock creation for consistency
3. **Keep Tests Simple**: One behavior per test, clear arrange-act-assert
4. **Descriptive Names**: Test names should explain the scenario
5. **Proper Isolation**: Reset mocks and state between tests
6. **Error Testing**: Test both happy path and error conditions
7. **Realistic Data**: Use builders to create consistent test data
8. **Custom Assertions**: Create domain-specific assertion helpers
9. **Performance Awareness**: Consider test execution time and resource usage
10. **Documentation**: Comment complex test scenarios and edge cases

## Code Review Checklist

When reviewing test code, ensure:

- [ ] Tests focus on behavior, not implementation
- [ ] Mock factories are used consistently
- [ ] Test structure is flat with descriptive names
- [ ] All edge cases and error conditions are covered
- [ ] Test data is created using builders
- [ ] Custom assertions are used appropriately
- [ ] Tests are isolated and don't depend on each other
- [ ] Performance considerations are addressed
- [ ] Documentation explains complex scenarios
- [ ] Anti-patterns are avoided