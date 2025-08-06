# Test Code Review Checklist

## Overview

This checklist ensures consistent quality standards for test code in the Amazon Seller MCP Client project. Use this during code reviews to validate that tests follow established patterns, maintain high quality, and provide reliable coverage.

## Pre-Review Setup

- [ ] **Test files are in correct locations** following project structure
- [ ] **All tests run successfully** in local environment
- [ ] **Coverage reports are generated** and meet minimum thresholds
- [ ] **No test files are accidentally committed** with `.only` or `.skip`

## Test Structure and Organization

### File Organization
- [ ] **Test files mirror source structure** in appropriate test directories
- [ ] **File names follow naming conventions** (kebab-case with `.test.ts` suffix)
- [ ] **Imports are organized correctly** (Node.js built-ins, third-party, internal)
- [ ] **Test utilities and mock factories are imported** from centralized locations

### Test Structure
- [ ] **Describe blocks are properly nested** (maximum 2 levels)
- [ ] **Test names are descriptive** and explain the scenario being tested
- [ ] **Tests follow arrange-act-assert pattern** consistently
- [ ] **Setup and teardown are handled correctly** in `beforeEach`/`afterEach`

```typescript
// ✅ Good structure
describe('CatalogClient', () => {
  describe('product retrieval', () => {
    it('should return product data for valid existing ASIN', async () => {
      // Arrange
      const asin = 'B123456789';
      const expectedProduct = TestDataBuilder.createProduct({ asin });
      mockApiClient.get.mockResolvedValue(expectedProduct);

      // Act
      const result = await catalogClient.getProduct(asin);

      // Assert
      TestAssertions.expectSuccessResponse(result, expectedProduct);
    });
  });
});
```

## Mock Usage and Test Isolation

### Mock Factory Usage
- [ ] **Mock factories are used consistently** instead of manual mock creation
- [ ] **Mocks are reset between tests** to ensure isolation
- [ ] **Mock behavior is configured appropriately** for each test scenario
- [ ] **Mock verification is meaningful** and tests actual behavior

### Test Isolation
- [ ] **Tests don't depend on each other** and can run in any order
- [ ] **External dependencies are properly mocked** using factories
- [ ] **Test data is generated fresh** for each test using builders
- [ ] **No shared mutable state** between tests

```typescript
// ✅ Good mock usage
beforeEach(() => {
  mockApiClient = ApiClientMockFactory.create();
  mockAuth = AuthMockFactory.create();
  catalogClient = new CatalogClient(mockApiClient, mockAuth);
});

// ❌ Bad: Manual mock creation
beforeEach(() => {
  mockApiClient = {
    get: vi.fn(),
    post: vi.fn(),
    // ... manual setup
  };
});
```

## Test Coverage and Completeness

### Coverage Requirements
- [ ] **Unit tests achieve 80%+ line coverage** for the component under test
- [ ] **All public methods are tested** with various input scenarios
- [ ] **Edge cases and error conditions are covered** comprehensively
- [ ] **Integration tests cover critical workflows** end-to-end

### Scenario Coverage
- [ ] **Happy path scenarios are tested** with valid inputs
- [ ] **Error scenarios are tested** with appropriate error handling
- [ ] **Edge cases are identified and tested** (empty inputs, boundary values)
- [ ] **Authentication and authorization scenarios** are covered where applicable

```typescript
// ✅ Comprehensive coverage
describe('inventory updates', () => {
  it('should update inventory quantity for valid SKU', async () => {
    // Happy path test
  });

  it('should handle invalid SKU format gracefully', async () => {
    // Error handling test
  });

  it('should handle empty quantity values', async () => {
    // Edge case test
  });

  it('should handle authentication failures', async () => {
    // Auth error test
  });
});
```

## Behavior-Focused Testing

### Testing Approach
- [ ] **Tests focus on behavior** rather than implementation details
- [ ] **Public API contracts are verified** instead of internal methods
- [ ] **Expected outputs and side effects are tested** appropriately
- [ ] **Implementation details are not tested directly** (private methods, internal state)

### Assertion Quality
- [ ] **Custom assertions are used** where appropriate (`TestAssertions.*`)
- [ ] **Assertions are specific and meaningful** rather than generic
- [ ] **Error messages are descriptive** and help with debugging
- [ ] **Object matching uses appropriate matchers** (`expect.objectContaining`, etc.)

```typescript
// ✅ Good: Testing behavior
it('should return product data for valid ASIN', async () => {
  const result = await catalogClient.getProduct('B123456789');
  TestAssertions.expectSuccessResponse(result, expectedProduct);
});

// ❌ Bad: Testing implementation
it('should call authenticateRequest method', () => {
  const spy = vi.spyOn(client, 'authenticateRequest');
  client.makeRequest('/test');
  expect(spy).toHaveBeenCalled();
});
```

## Error Handling and Edge Cases

### Error Testing
- [ ] **All error types are tested** that the component can throw
- [ ] **Error messages are validated** for clarity and usefulness
- [ ] **Error recovery mechanisms are tested** where applicable
- [ ] **Async error handling is tested correctly** with proper `await expect().rejects`

### Edge Case Coverage
- [ ] **Boundary values are tested** (empty strings, null, undefined)
- [ ] **Invalid input formats are tested** with appropriate validation
- [ ] **Network failures and timeouts are simulated** and tested
- [ ] **Rate limiting scenarios are tested** where applicable

```typescript
// ✅ Good error testing
it('should handle API rate limiting gracefully', async () => {
  const rateLimitError = TestDataBuilder.createApiError('RateLimitExceeded');
  mockApiClient.get.mockRejectedValue(rateLimitError);

  await expect(catalogClient.getProduct('B123456789'))
    .rejects.toThrow('Rate limit exceeded');
});
```

## Test Data and Builders

### Test Data Quality
- [ ] **Test data builders are used** instead of hardcoded values
- [ ] **Test data is realistic and representative** of production data
- [ ] **Data relationships are maintained** between related entities
- [ ] **Random data is used appropriately** for property-based testing

### Builder Usage
- [ ] **Builders provide sensible defaults** that work for most tests
- [ ] **Builders allow customization** for specific test scenarios
- [ ] **Builder methods are chainable** and easy to use
- [ ] **Complex data structures use nested builders** appropriately

```typescript
// ✅ Good test data usage
const product = TestDataBuilder.createProduct({
  asin: 'B123456789',
  title: 'Test Product',
  price: 29.99
});

const orders = TestDataBuilder.createOrdersList(5, {
  status: 'Unshipped'
});
```

## Performance and Resource Usage

### Performance Considerations
- [ ] **Tests complete within reasonable time** (< 5 seconds for unit tests)
- [ ] **Bulk operations are tested efficiently** without excessive setup
- [ ] **Memory usage is reasonable** for test data and mocks
- [ ] **Concurrent test execution is supported** without conflicts

### Resource Management
- [ ] **External resources are cleaned up** in `afterEach` hooks
- [ ] **Large test data sets are generated efficiently** using builders
- [ ] **Mock cleanup is handled properly** to prevent memory leaks
- [ ] **File system operations are mocked** to avoid I/O overhead

## MCP-Specific Testing

### Tool Testing
- [ ] **Tool registration is tested** with correct metadata
- [ ] **Input validation is comprehensive** for all parameters
- [ ] **Output formatting follows MCP protocol** requirements
- [ ] **Error responses are properly formatted** for MCP clients

### Resource Testing
- [ ] **URI pattern matching is tested** thoroughly
- [ ] **Resource templates are validated** for correctness
- [ ] **Content formatting is appropriate** for MIME types
- [ ] **Resource listing functionality works** correctly

### Integration Testing
- [ ] **End-to-end workflows are tested** through MCP protocol
- [ ] **Tool and resource interactions are verified** in integration tests
- [ ] **Server startup and shutdown are tested** properly
- [ ] **Protocol compliance is validated** for all operations

## Code Quality and Maintainability

### Code Style
- [ ] **TypeScript types are used correctly** throughout tests
- [ ] **Code formatting follows project standards** (Prettier configuration)
- [ ] **ESLint rules are followed** without violations
- [ ] **Comments explain complex test scenarios** where needed

### Maintainability
- [ ] **Test code is DRY** with appropriate use of helpers and utilities
- [ ] **Magic numbers and strings are avoided** in favor of constants
- [ ] **Test setup is reusable** across similar test files
- [ ] **Refactoring-friendly patterns are used** to minimize test brittleness

## Documentation and Comments

### Test Documentation
- [ ] **Complex test scenarios are documented** with comments
- [ ] **Test purpose is clear** from names and structure
- [ ] **Setup requirements are documented** where non-obvious
- [ ] **Known limitations or assumptions are noted** in comments

### Template Usage
- [ ] **Test templates are used as starting points** for new test files
- [ ] **Template instructions are followed** and removed after customization
- [ ] **Consistent patterns are maintained** across the test suite
- [ ] **Guidelines are referenced** when making testing decisions

## Common Anti-Patterns to Avoid

### ❌ Implementation Testing
- [ ] **No testing of private methods** or internal implementation details
- [ ] **No testing of method calls** unless they're part of the public contract
- [ ] **No testing of internal state** that's not exposed through public API
- [ ] **No brittle assertions** that break with minor refactoring

### ❌ Poor Test Structure
- [ ] **No deeply nested describe blocks** (max 2 levels)
- [ ] **No testing multiple behaviors** in a single test
- [ ] **No complex test setup** that's hard to understand
- [ ] **No shared mutable state** between tests

### ❌ Inadequate Coverage
- [ ] **No missing error scenarios** for exception handling
- [ ] **No missing edge cases** for boundary conditions
- [ ] **No missing integration scenarios** for component interactions
- [ ] **No missing performance considerations** for critical paths

## Review Completion Checklist

### Final Validation
- [ ] **All tests pass** in CI environment
- [ ] **Coverage thresholds are met** for the changed code
- [ ] **No test-specific linting errors** are present
- [ ] **Performance impact is acceptable** for test execution time

### Documentation Updates
- [ ] **README files are updated** if testing approach changes
- [ ] **Guidelines are updated** if new patterns are introduced
- [ ] **Templates are updated** if new requirements are added
- [ ] **Examples are provided** for complex testing scenarios

## Severity Guidelines

### 🔴 Critical Issues (Must Fix)
- Tests don't run or fail consistently
- Security vulnerabilities in test code
- Tests that break CI/CD pipeline
- Missing coverage for critical business logic

### 🟡 Important Issues (Should Fix)
- Anti-patterns that reduce maintainability
- Missing error scenario coverage
- Performance issues in test execution
- Inconsistent use of testing patterns

### 🟢 Minor Issues (Nice to Fix)
- Code style inconsistencies
- Missing documentation for complex tests
- Opportunities for better test organization
- Minor performance optimizations

## Review Sign-off

**Reviewer:** ________________  
**Date:** ________________  
**Overall Assessment:** ________________

### Summary
- [ ] **All critical issues addressed**
- [ ] **Test quality meets project standards**
- [ ] **Coverage requirements satisfied**
- [ ] **Ready for merge**

### Notes
_Space for additional comments, suggestions, or follow-up items_

---

## Quick Reference

### Essential Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- catalog-client.test.ts

# Run tests in watch mode
npm run test:watch
```

### Key Files to Check
- `tests/utils/` - Test utilities and mock factories
- `tests/templates/` - Test templates for consistency
- `tests/guidelines/` - Testing patterns and standards
- `vitest.config.ts` - Test configuration and coverage settings

### Coverage Thresholds
- **Unit Tests**: 80% line coverage minimum
- **Integration Tests**: 100% critical path coverage
- **Overall Project**: 75% combined coverage minimum