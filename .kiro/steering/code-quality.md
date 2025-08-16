---
inclusion: always
---

# Code Quality & Development Standards

## Critical Quality Gates

### TypeScript Strictness - MANDATORY
- **NEVER use `any` type** - Always define proper interfaces and types
- **Use strict TypeScript configuration** - Enable all strict mode options
- **Type all function parameters and return values** explicitly
- **Use type guards** for runtime type checking instead of type assertions
- **Define interfaces** for all complex objects and API responses

> **📋 See detailed guidelines**: [TypeScript `any` Type Prevention Guidelines](./typescript-any-prevention.md)

```typescript
// ❌ WRONG - Using any type
function processData(data: any): any {
  return data.someProperty;
}

// ✅ CORRECT - Proper typing
interface ApiResponse {
  someProperty: string;
  status: number;
}

function processData(data: ApiResponse): string {
  return data.someProperty;
}
```

### Import Management - MANDATORY
- **Remove unused imports immediately** - Don't leave dead code
- **Organize imports consistently** using the established pattern:
  1. Node.js built-ins
  2. Third-party dependencies  
  3. Internal imports (relative paths)
- **Use explicit imports** - Import only what you need
- **Avoid wildcard imports** unless absolutely necessary

### Variable and Code Cleanup - MANDATORY
- **Remove unused variables immediately** - Use underscore prefix for intentionally unused parameters
- **Clean up console statements** - Use proper logging instead of console.log
- **Remove commented code** - Use git history instead of commented blocks
- **Delete temporary files** - Don't commit debugging or temporary files

## Linting and Formatting - ZERO TOLERANCE

### ESLint Rules - MUST PASS
- **Zero lint errors allowed** in any commit
- **Fix lint warnings** before committing
- **Use block scopes** in switch statements to avoid `no-case-declarations`
- **Escape regex characters properly** - Remove unnecessary escapes

### Prettier Formatting - AUTOMATIC
- **Run `npm run format`** before every commit
- **Configure editor** to format on save
- **Follow project Prettier config**:
  - Single quotes
  - 100 character width
  - 2 spaces indentation
  - Trailing commas where valid

## Error Handling Standards

### Proper Error Types
```typescript
// ❌ WRONG - Generic catch with any
try {
  await apiCall();
} catch (err: any) {
  logger.error('Error occurred', err);
}

// ✅ CORRECT - Proper error typing
try {
  await apiCall();
} catch (err: unknown) {
  if (err instanceof Error) {
    logger.error('API call failed', { message: err.message, stack: err.stack });
  } else {
    logger.error('Unknown error occurred', { error: String(err) });
  }
}
```

### Switch Statement Patterns
```typescript
// ❌ WRONG - No block scope
switch (type) {
  case 'A':
    const result = processA();
    return result;
  case 'B':
    const result = processB(); // Error: redeclaration
    return result;
}

// ✅ CORRECT - Block scopes
switch (type) {
  case 'A': {
    const result = processA();
    return result;
  }
  case 'B': {
    const result = processB();
    return result;
  }
}
```

## Development Workflow Requirements

### Pre-Commit Checklist - MANDATORY
1. **Run `npm run lint`** - Must pass with zero errors
2. **Run `npm run format`** - Apply consistent formatting
3. **Run `npm test`** - All tests must pass
4. **Run `npm run build`** - Build must succeed
5. **Review changes** - No unused code, proper types, clean imports

### Code Review Standards
- **Type safety verification** - No `any` types allowed
- **Import cleanliness** - No unused imports
- **Error handling review** - Proper error types and handling
- **Test coverage check** - New code must have tests
- **Documentation update** - Update docs for public API changes

## Testing Quality Standards

### Test Structure Requirements
- **Use centralized mock factories** from `tests/utils/mock-factories/`
- **Follow behavior-driven patterns** - Test user behavior, not implementation
- **Maximum 2-level nesting** in test suites
- **Proper cleanup** - Use event cleanup utilities
- **Stable tests** - No flaky or timing-dependent tests

### Mock Implementation Standards
```typescript
// ❌ WRONG - Inline mocks
const mockClient = {
  getData: vi.fn().mockResolvedValue({ data: 'test' })
};

// ✅ CORRECT - Use centralized factories
import { createMockApiClient } from '../utils/mock-factories';

const mockClient = createMockApiClient({
  getData: { data: 'test' }
});
```

## Performance and Maintainability

### Code Organization
- **Single responsibility** - One concern per module
- **Proper abstraction layers** - Follow established architecture
- **Consistent naming** - Use kebab-case for files, camelCase for variables
- **Clear interfaces** - Define contracts between modules

### Resource Management
- **Clean up resources** - Close connections, clear timers
- **Use connection pooling** - Reuse HTTP connections
- **Implement caching** - Cache frequently accessed data
- **Handle memory leaks** - Proper event listener cleanup

## Enforcement Mechanisms

### Automated Checks
- **GitHub Actions** - CI/CD pipeline enforces all quality gates
- **Pre-commit hooks** - Local validation before commits
- **Coverage thresholds** - Maintain 80% line coverage, 75% branch coverage
- **Lint baseline** - Track and prevent regression

### Manual Review Process
- **Code review checklist** - Use established quality criteria
- **Architecture review** - Ensure patterns are followed
- **Security review** - Validate credential handling and input sanitization
- **Performance review** - Check for potential bottlenecks

## Emergency Procedures

### When Quality Gates Fail
1. **Stop development** - Don't proceed with failing builds
2. **Identify root cause** - Use lint output and test results
3. **Fix systematically** - Address errors by category
4. **Validate fixes** - Run full test suite and build
5. **Document lessons** - Update steering rules if needed

### Technical Debt Management
- **Weekly quality reviews** - Check lint baseline and test pass rates
- **Monthly refactoring** - Address accumulated technical debt
- **Quarterly architecture review** - Evaluate patterns and practices
- **Annual quality assessment** - Comprehensive codebase health check

Remember: **Quality is not negotiable**. These standards exist to prevent the massive cleanup effort that was required. Follow them consistently to maintain a healthy, maintainable codebase.