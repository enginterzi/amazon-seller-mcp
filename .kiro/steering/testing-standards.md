---
inclusion: always
---

# Testing Standards & Best Practices

## Testing Infrastructure Requirements

### Centralized Mock System - MANDATORY
- **Always use mock factories** from `tests/utils/mock-factories/`
- **Never create inline mocks** - Use the centralized registry
- **Extend existing factories** rather than creating new ones
- **Follow factory patterns** for consistent mock behavior

```typescript
// ❌ WRONG - Inline mock creation
const mockApiClient = {
  getOrders: vi.fn().mockResolvedValue([]),
  updateOrder: vi.fn().mockResolvedValue({ success: true })
};

// ✅ CORRECT - Use centralized factory
import { createMockApiClient } from '../utils/mock-factories';

const mockApiClient = createMockApiClient({
  getOrders: [],
  updateOrder: { success: true }
});
```

### Test Structure Standards - MANDATORY
- **Maximum 2-level nesting** in describe blocks
- **Behavior-driven descriptions** - Focus on what the code does, not how
- **Use TestDataBuilder** for complex test data creation
- **Implement proper cleanup** using event cleanup utilities

```typescript
// ❌ WRONG - Deep nesting and implementation focus
describe('OrdersClient', () => {
  describe('constructor', () => {
    describe('when initialized with config', () => {
      describe('and config has valid credentials', () => {
        it('should set internal properties', () => {
          // Test implementation details
        });
      });
    });
  });
});

// ✅ CORRECT - Behavior-focused with max 2 levels
describe('OrdersClient', () => {
  describe('when processing orders', () => {
    it('should retrieve orders successfully with valid credentials', () => {
      // Test user behavior
    });
    
    it('should handle authentication errors gracefully', () => {
      // Test error scenarios
    });
  });
});
```

## Test Quality Requirements

### Test Reliability - ZERO FLAKY TESTS
- **No timing-dependent tests** - Use proper mocking instead of delays
- **Deterministic test data** - Use fixed data, not random values
- **Proper async handling** - Always await async operations
- **Clean state between tests** - Use beforeEach/afterEach for cleanup

### Test Coverage Standards
- **Minimum 80% line coverage** for all new code
- **Minimum 75% branch coverage** for all new code
- **Test error scenarios** - Don't just test happy paths
- **Test edge cases** - Boundary conditions and invalid inputs

### Mock Implementation Quality
```typescript
// ❌ WRONG - Inconsistent mock responses
const mockClient = {
  getData: vi.fn()
    .mockResolvedValueOnce({ data: 'first' })
    .mockResolvedValueOnce({ different: 'structure' })
    .mockRejectedValueOnce(new Error('random error'));
};

// ✅ CORRECT - Consistent, predictable mocks
const mockClient = createMockApiClient({
  getData: { data: 'consistent-response' }
});

// For error testing, use specific error mocks
const mockClientWithError = createMockApiClient({
  getData: new ApiError('Specific test error', 'TEST_ERROR')
});
```

## Test Organization Patterns

### File Structure - MANDATORY
- **Mirror source structure** in test directories
- **Use descriptive test file names** ending in `.test.ts`
- **Group related tests** in the same file
- **Separate unit and integration tests** clearly

### Test Data Management
- **Use TestDataBuilder** for complex objects
- **Create reusable test fixtures** in `tests/fixtures/`
- **Use meaningful test data** that reflects real scenarios
- **Avoid magic numbers** - Use named constants

```typescript
// ❌ WRONG - Magic numbers and unclear data
const testOrder = {
  id: '12345',
  amount: 99.99,
  status: 1
};

// ✅ CORRECT - Clear, meaningful test data
import { TestDataBuilder } from '../utils/test-data-builder';

const testOrder = TestDataBuilder.order()
  .withId('ORDER_001')
  .withAmount(99.99)
  .withStatus('PENDING')
  .build();
```

## Integration Testing Standards

### API Integration Tests
- **Mock external APIs** - Never call real Amazon SP-API in tests
- **Test error scenarios** - Network failures, rate limits, auth errors
- **Validate request/response formats** - Ensure proper data transformation
- **Test retry mechanisms** - Verify exponential backoff works

### MCP Integration Tests
- **Test tool registration** - Verify tools are properly exposed
- **Test resource access** - Ensure resources return correct data
- **Test notification delivery** - Verify real-time updates work
- **Test error propagation** - Ensure errors reach MCP clients properly

## Performance Testing Requirements

### Load Testing Patterns
- **Test with realistic data volumes** - Don't use tiny datasets
- **Measure memory usage** - Check for memory leaks
- **Test concurrent operations** - Verify thread safety
- **Monitor resource cleanup** - Ensure proper disposal

### Benchmark Standards
```typescript
// ✅ CORRECT - Performance test with proper measurement
describe('Performance: Catalog Search', () => {
  it('should handle 1000 concurrent searches within 5 seconds', async () => {
    const startTime = Date.now();
    const searches = Array(1000).fill(null).map(() => 
      catalogClient.search('test-query')
    );
    
    const results = await Promise.allSettled(searches);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(5000);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1000);
  });
});
```

## Test Maintenance Procedures

### Automated Test Health Monitoring
- **Run test health checks** weekly using `tests/validation/test-health-check.ts`
- **Monitor test pass rates** - Alert if below 95%
- **Track test execution time** - Identify slow tests
- **Review test coverage reports** - Ensure coverage doesn't decrease

### Test Refactoring Guidelines
- **Refactor tests when source code changes** - Keep tests aligned
- **Update mock factories** when APIs change
- **Remove obsolete tests** - Don't keep tests for removed features
- **Consolidate duplicate tests** - Eliminate redundant test cases

## CI/CD Integration Requirements

### GitHub Actions Integration
- **Run tests on every PR** - No exceptions
- **Enforce coverage thresholds** - Fail builds below thresholds
- **Run tests in parallel** - Optimize CI execution time
- **Generate coverage reports** - Make results visible

### Pre-commit Hook Requirements
```bash
#!/bin/sh
# Pre-commit hook - MANDATORY checks
npm run lint || exit 1
npm run format || exit 1
npm test || exit 1
npm run build || exit 1
echo "✅ All quality gates passed"
```

## Emergency Test Procedures

### When Tests Fail in CI
1. **Don't merge failing PRs** - Fix tests first
2. **Identify root cause** - Check test output and logs
3. **Fix systematically** - Address by test category
4. **Verify locally** - Ensure fixes work before pushing
5. **Update documentation** - If test patterns change

### Test Debt Management
- **Weekly test review** - Check for flaky or slow tests
- **Monthly mock updates** - Ensure mocks match current APIs
- **Quarterly test architecture review** - Evaluate testing patterns
- **Annual test suite optimization** - Remove obsolete tests, improve performance

Remember: **Tests are the safety net for refactoring and feature development**. Maintain them with the same rigor as production code to ensure long-term project health and developer confidence.