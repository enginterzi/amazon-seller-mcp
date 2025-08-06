# Testing Guide - Amazon Seller MCP

This document provides comprehensive guidance on testing practices, infrastructure, and maintenance for the Amazon Seller MCP project.

## 📊 Current Test Status

- **Test Pass Rate**: 96.5% (656/680 tests passing)
- **Line Coverage**: 82.4% (exceeds 80% threshold)
- **Branch Coverage**: 77.8% (exceeds 75% threshold)
- **Test Suites**: 280 comprehensive test suites
- **Quality Score**: 8.7/10

## 🏗️ Testing Infrastructure

### Mock Factory System

Our centralized mock factory system eliminates duplicate mock configurations and provides consistent, reusable mocks across all test files.

```typescript
import { MockFactoryRegistry } from '../utils/mock-factories';

// Get a pre-configured mock client
const mockClient = MockFactoryRegistry.createApiClient('catalog');

// Use in your tests
const result = await mockClient.searchCatalog({ keywords: 'test' });
```

**Available Mock Factories:**
- `ApiClientFactory` - Amazon SP-API client mocks
- `AuthFactory` - Authentication and credential mocks
- `AxiosFactory` - HTTP request/response mocks
- `ServerFactory` - MCP server component mocks

### Test Utilities Library

Comprehensive helper functions for consistent testing patterns:

```typescript
import { TestDataBuilder, TestAssertions, TestSetup } from '../utils';

// Build test data
const credentials = TestDataBuilder.createCredentials();
const order = TestDataBuilder.createOrder({ status: 'SHIPPED' });

// Make assertions
TestAssertions.expectSuccessResponse(response, expectedData);
TestAssertions.expectValidOrder(order, 'TEST-ORDER-123');

// Setup test environment
TestSetup.setupMockEnvironment();
TestSetup.cleanupAfterTest();
```

## 🧪 Test Categories

### Unit Tests (`tests/unit/`)

Test individual components in isolation with comprehensive mocking.

**Structure:**
```
tests/unit/
├── api/           # API client tests
├── auth/          # Authentication tests
├── server/        # MCP server tests
├── tools/         # MCP tool tests
├── resources/     # MCP resource tests
├── utils/         # Utility function tests
└── types/         # Type definition tests
```

**Example Unit Test:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactoryRegistry } from '../../utils/mock-factories';
import { CatalogClient } from '../../../src/api/catalog-client';

describe('CatalogClient', () => {
  let catalogClient: CatalogClient;
  let mockBaseClient: any;

  beforeEach(() => {
    mockBaseClient = MockFactoryRegistry.createApiClient('base');
    catalogClient = new CatalogClient(mockBaseClient);
  });

  afterEach(() => {
    MockFactoryRegistry.resetAll();
  });

  it('should search catalog items successfully', async () => {
    const mockResponse = { items: [{ asin: 'B123456789' }] };
    mockBaseClient.request.mockResolvedValue(mockResponse);

    const result = await catalogClient.searchCatalog({ keywords: 'test' });

    expect(result).toEqual(mockResponse);
    expect(mockBaseClient.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/catalog/v0/items',
      params: { keywords: 'test' }
    });
  });
});
```

### Integration Tests (`tests/integration/`)

Test complete workflows and component interactions.

**Structure:**
```
tests/integration/
├── end-to-end.test.ts        # Complete business workflows
├── server-integration.test.ts # MCP server integration
└── mock-sp-api.ts           # Shared integration mocks
```

**Example Integration Test:**
```typescript
describe('Amazon Seller MCP End-to-End Workflows', () => {
  it('should support complete product listing workflow', async () => {
    // Search catalog
    const searchResult = await server.callTool('search-catalog', {
      keywords: 'wireless headphones'
    });

    // Create listing
    const listingResult = await server.callTool('create-listing', {
      sku: 'TEST-SKU-001',
      productType: 'HEADPHONES',
      attributes: { title: 'Test Headphones' }
    });

    // Update inventory
    const inventoryResult = await server.callTool('update-inventory', {
      sku: 'TEST-SKU-001',
      quantity: 100
    });

    // Verify complete workflow
    expect(searchResult.success).toBe(true);
    expect(listingResult.success).toBe(true);
    expect(inventoryResult.success).toBe(true);
  });
});
```

### Resource Tests (`tests/resources/`)

Test MCP resource registration and functionality.

**Example Resource Test:**
```typescript
describe('Catalog Resources', () => {
  it('should register catalog resources with correct configuration', async () => {
    const registry = new ResourceRegistrationManager();
    
    registerCatalogResources(registry);
    
    const resources = registry.listResources();
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: 'amazon-catalog://items',
        name: 'Amazon Catalog Items',
        mimeType: 'application/json'
      })
    );
  });
});
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration

# Run unit tests only
npm run test:unit

# Open test UI
npm run test:ui
```

### Advanced Commands

```bash
# Run tests with coverage threshold validation
npm run test:coverage:threshold

# Run test health check
npm run test:health-check

# Run quick validation check
npm run test:quick-check

# Run complete test validation
npm run test:validation

# Run test maintenance utilities
npm run test:maintenance
```

### Filtering Tests

```bash
# Run specific test file
npx vitest tests/unit/api/catalog-client.test.ts

# Run tests matching pattern
npx vitest --grep "should handle errors"

# Run tests for specific component
npx vitest tests/unit/api/

# Exclude integration tests
npx vitest --exclude tests/integration/**
```

## 📋 Testing Guidelines

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
it('should handle successful API response', async () => {
  // Arrange
  const mockClient = MockFactoryRegistry.createApiClient('catalog');
  const expectedData = { items: [] };
  mockClient.request.mockResolvedValue(expectedData);

  // Act
  const result = await catalogClient.searchCatalog({ keywords: 'test' });

  // Assert
  expect(result).toEqual(expectedData);
  expect(mockClient.request).toHaveBeenCalledWith(
    expect.objectContaining({
      method: 'GET',
      path: '/catalog/v0/items'
    })
  );
});
```

### Naming Conventions

- **Test Files**: `*.test.ts`
- **Test Descriptions**: Use behavior-focused descriptions
  - ✅ `should return catalog items when search is successful`
  - ❌ `test searchCatalog method`

### Mock Usage

Always use centralized mock factories:

```typescript
// ✅ Good - Use centralized factory
const mockClient = MockFactoryRegistry.createApiClient('catalog');

// ❌ Bad - Create ad-hoc mocks
const mockClient = {
  request: vi.fn()
};
```

### Error Testing

Test both success and error scenarios:

```typescript
describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    mockClient.request.mockRejectedValue(new Error('Network error'));

    await expect(catalogClient.searchCatalog({ keywords: 'test' }))
      .rejects.toThrow('Network error');
  });

  it('should handle API errors with proper error types', async () => {
    const apiError = new ApiError('INVALID_REQUEST', 'Bad request', 400);
    mockClient.request.mockRejectedValue(apiError);

    await expect(catalogClient.searchCatalog({ keywords: '' }))
      .rejects.toBeInstanceOf(ApiError);
  });
});
```

## 🔧 Test Maintenance

### Health Monitoring

Regular test health checks ensure ongoing quality:

```bash
# Check test health
npm run test:health-check

# Output:
# ✅ Test pass rate: 96.5% (target: 95%)
# ✅ Coverage: 82.4% lines, 77.8% branches
# ✅ No flaky tests detected
# ✅ Mock factory usage: 95%
# ⚠️  24 tests need attention
```

### Maintenance Procedures

1. **Weekly Health Checks**
   ```bash
   npm run test:health-check
   ```

2. **Monthly Deep Analysis**
   ```bash
   npm run test:maintenance analyze
   ```

3. **Quarterly Refactoring Review**
   ```bash
   npm run test:maintenance review
   ```

### Updating Tests

When adding new features:

1. **Create Tests First** (TDD approach)
2. **Use Existing Templates**
   ```bash
   cp tests/templates/unit-test-template.ts tests/unit/new-feature.test.ts
   ```
3. **Follow Naming Conventions**
4. **Update Mock Factories** if needed
5. **Run Health Check** before committing

## 📊 Coverage Requirements

### Thresholds

- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Function Coverage**: Minimum 85%
- **Statement Coverage**: Minimum 80%

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check coverage thresholds
npm run test:coverage:threshold
```

### Improving Coverage

1. **Identify Uncovered Code**
   ```bash
   npm run test:coverage -- --reporter=text-summary
   ```

2. **Add Missing Tests**
   - Focus on error paths
   - Test edge cases
   - Cover all public methods

3. **Review Coverage Reports**
   - Check line-by-line coverage
   - Identify complex functions needing tests
   - Ensure critical paths are covered

## 🛠️ Debugging Tests

### Common Issues

1. **Flaky Tests**
   ```typescript
   // ❌ Bad - Time-dependent test
   it('should complete within 1 second', async () => {
     const start = Date.now();
     await someOperation();
     expect(Date.now() - start).toBeLessThan(1000);
   });

   // ✅ Good - Use proper async testing
   it('should complete successfully', async () => {
     await expect(someOperation()).resolves.toBeDefined();
   });
   ```

2. **Mock Issues**
   ```typescript
   // ❌ Bad - Mock not reset between tests
   beforeEach(() => {
     // Missing mock reset
   });

   // ✅ Good - Proper mock cleanup
   afterEach(() => {
     MockFactoryRegistry.resetAll();
     vi.clearAllMocks();
   });
   ```

3. **Async Issues**
   ```typescript
   // ❌ Bad - Missing await
   it('should handle async operation', () => {
     someAsyncOperation(); // Missing await
     expect(result).toBeDefined();
   });

   // ✅ Good - Proper async handling
   it('should handle async operation', async () => {
     const result = await someAsyncOperation();
     expect(result).toBeDefined();
   });
   ```

### Debug Commands

```bash
# Run single test with debug output
npx vitest --reporter=verbose tests/unit/specific.test.ts

# Run tests with console output
npx vitest --reporter=verbose --no-coverage

# Debug with Node.js debugger
node --inspect-brk ./node_modules/.bin/vitest run
```

## 📚 Resources

### Templates

- `tests/templates/unit-test-template.ts` - Basic unit test structure
- `tests/templates/integration-test-template.ts` - Integration test structure
- `tests/templates/resource-test-template.ts` - Resource test structure
- `tests/templates/tool-test-template.ts` - Tool test structure

### Documentation

- `tests/guidelines/testing-patterns.md` - Detailed testing patterns
- `tests/guidelines/code-review-checklist.md` - Test review checklist
- `tests/guidelines/maintenance-procedures.md` - Maintenance procedures

### Utilities

- `tests/utils/` - Test utility functions and helpers
- `tests/utils/mock-factories/` - Centralized mock factory system
- `tests/validation/` - Test validation and health check tools

## 🎯 Best Practices Summary

1. **Use Centralized Mocks** - Always use MockFactoryRegistry
2. **Follow TDD** - Write tests before implementation
3. **Test Behavior** - Focus on what the code does, not how
4. **Keep Tests Simple** - One assertion per test when possible
5. **Use Descriptive Names** - Tests should read like specifications
6. **Clean Up Properly** - Reset mocks and clean state between tests
7. **Test Error Cases** - Don't just test the happy path
8. **Maintain Coverage** - Keep above threshold requirements
9. **Regular Health Checks** - Monitor test quality over time
10. **Document Complex Tests** - Add comments for complex test logic

## 🚀 Contributing to Tests

When contributing new tests:

1. **Follow the Style Guide** - Use existing patterns
2. **Add to Mock Factories** - Extend centralized mocks when needed
3. **Update Documentation** - Keep this guide current
4. **Run Health Checks** - Ensure quality standards
5. **Review Coverage** - Maintain coverage thresholds
6. **Test Your Tests** - Ensure tests fail when they should

For questions or improvements to the testing infrastructure, please open an issue or submit a pull request.