---
inclusion: always
---

# AI Assistant Development Guidelines

## Code Generation Standards - MANDATORY

### TypeScript Code Generation
- **NEVER generate `any` types** - Always create proper interfaces and types
- **Always include proper imports** - Import all dependencies explicitly
- **Use strict TypeScript patterns** - Enable all strict mode compliance
- **Generate complete type definitions** - Don't leave types incomplete or implicit

```typescript
// ❌ WRONG - AI should never generate this
function processApiResponse(data: any): any {
  return data.items.map((item: any) => item.name);
}

// ✅ CORRECT - AI should always generate this
interface ApiResponse {
  items: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive';
  }>;
}

function processApiResponse(data: ApiResponse): string[] {
  return data.items.map((item) => item.name);
}
```

### Import Management Rules
- **Always organize imports** in the established order (Node.js, third-party, internal)
- **Remove unused imports** immediately when refactoring
- **Use explicit imports** - Import only what's needed
- **Check for import conflicts** before generating code

### Error Handling Patterns
```typescript
// ❌ WRONG - AI should avoid this pattern
try {
  await someOperation();
} catch (err: any) {
  console.log('Error:', err);
}

// ✅ CORRECT - AI should always use this pattern
try {
  await someOperation();
} catch (err: unknown) {
  if (err instanceof Error) {
    logger.error('Operation failed', { 
      message: err.message, 
      stack: err.stack 
    });
  } else {
    logger.error('Unknown error occurred', { 
      error: String(err) 
    });
  }
}
```

## Code Quality Enforcement

### Pre-Generation Checklist
Before generating any code, AI should consider:
1. **What types are needed?** - Define interfaces first
2. **What imports are required?** - Include all dependencies
3. **How should errors be handled?** - Use proper error typing
4. **What tests are needed?** - Consider test requirements
5. **Does this follow established patterns?** - Check existing codebase

### Code Review Self-Check
After generating code, AI should verify:
- **Zero `any` types used** - All types are explicit
- **All imports are used** - No unused imports
- **Error handling is proper** - Uses unknown type in catch blocks
- **Follows naming conventions** - Consistent with codebase
- **Includes necessary tests** - Test coverage considerations

## Testing Code Generation

### Test Structure Requirements
- **Use centralized mock factories** - Never generate inline mocks
- **Follow 2-level nesting maximum** - Keep test structure flat
- **Generate behavior-focused tests** - Test what the code does, not how
- **Include error scenario tests** - Don't just test happy paths

```typescript
// ❌ WRONG - AI should not generate inline mocks
describe('OrdersClient', () => {
  it('should process orders', async () => {
    const mockClient = {
      getOrders: vi.fn().mockResolvedValue([])
    };
    // Test implementation
  });
});

// ✅ CORRECT - AI should use centralized factories
import { createMockApiClient } from '../utils/mock-factories';

describe('OrdersClient', () => {
  describe('when processing orders', () => {
    it('should retrieve orders successfully', async () => {
      const mockClient = createMockApiClient({
        getOrders: []
      });
      // Test implementation
    });
  });
});
```

### Test Data Generation
- **Use TestDataBuilder** for complex objects
- **Generate realistic test data** - Not just placeholder values
- **Create deterministic tests** - No random values or timing dependencies
- **Include edge cases** - Boundary conditions and error scenarios

## Refactoring Guidelines

### Safe Refactoring Practices
When modifying existing code:
1. **Preserve existing functionality** - Don't change behavior
2. **Maintain test coverage** - Update tests to match changes
3. **Keep types strict** - Don't introduce `any` types during refactoring
4. **Clean up unused code** - Remove dead imports and variables
5. **Follow established patterns** - Don't introduce new patterns unnecessarily

### Incremental Improvements
- **Make small, focused changes** - One improvement at a time
- **Validate each change** - Ensure tests pass after each modification
- **Document significant changes** - Add comments for complex refactoring
- **Preserve git history** - Make changes that are easy to review

## Architecture Compliance

### Layer Separation
- **API Layer** (`src/api/`): Direct Amazon SP-API integration only
- **Service Layer** (`src/server/`): MCP protocol implementation
- **Tool Layer** (`src/tools/`): MCP tool handlers
- **Resource Layer** (`src/resources/`): MCP resource providers
- **Utility Layer** (`src/utils/`): Cross-cutting concerns

### Pattern Consistency
- **Follow existing patterns** - Don't invent new approaches
- **Use established abstractions** - Leverage base classes and utilities
- **Maintain interface contracts** - Don't break existing APIs
- **Respect dependency directions** - Higher layers depend on lower layers

## Performance Considerations

### Code Generation Efficiency
- **Use connection pooling** - Reuse HTTP connections
- **Implement caching** - Cache frequently accessed data
- **Avoid memory leaks** - Proper resource cleanup
- **Consider batch operations** - Reduce API calls where possible

### Resource Management
```typescript
// ✅ CORRECT - AI should generate proper resource cleanup
export class ApiClient {
  private readonly httpAgent: Agent;
  
  constructor() {
    this.httpAgent = new Agent({
      keepAlive: true,
      maxSockets: 10
    });
  }
  
  async destroy(): Promise<void> {
    this.httpAgent.destroy();
  }
}
```

## Security Best Practices

### Credential Handling
- **Never log credentials** - Use credential manager for all auth
- **Validate all inputs** - Use Zod schemas for validation
- **Sanitize data** - Clean data before API calls
- **Use proper OAuth flows** - Follow established auth patterns

### Input Validation
```typescript
// ✅ CORRECT - AI should always generate input validation
import { z } from 'zod';

const OrderSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(['pending', 'completed', 'cancelled'])
});

export async function processOrder(input: unknown): Promise<void> {
  const validatedOrder = OrderSchema.parse(input);
  // Process validated order
}
```

## Documentation Standards

### Code Documentation
- **Add JSDoc comments** for all public APIs
- **Include usage examples** in complex functions
- **Document error conditions** - What can go wrong and why
- **Explain business logic** - Why the code works this way

### README Updates
When generating new features:
- **Update API documentation** - Include new endpoints or tools
- **Add configuration examples** - Show how to use new features
- **Include troubleshooting** - Common issues and solutions
- **Update changelog** - Document what changed

## Quality Validation

### Pre-Commit Validation
Before suggesting any code changes, AI should mentally verify:
- **Lint check passes** - No ESLint errors
- **Types are complete** - No `any` types or missing interfaces
- **Imports are clean** - All imports used, properly organized
- **Tests are included** - Appropriate test coverage
- **Documentation is updated** - Public APIs documented

### Post-Generation Review
After generating code, AI should suggest:
- **Run quality checks** - `npm run lint && npm test && npm run build`
- **Review generated code** - Check for common issues
- **Validate test coverage** - Ensure adequate testing
- **Check performance impact** - Consider resource usage
- **Verify security** - No credential exposure or input validation issues

## Emergency Response

### When Quality Issues Are Detected
1. **Stop code generation** - Don't proceed with problematic patterns
2. **Identify root cause** - What pattern caused the issue?
3. **Suggest systematic fix** - Address the category of problems
4. **Validate solution** - Ensure fix doesn't break other code
5. **Update guidelines** - Learn from the issue

### Recovery Procedures
If AI generates code that causes quality issues:
1. **Acknowledge the problem** - Don't ignore or minimize issues
2. **Provide immediate fix** - Correct the specific problem
3. **Explain the root cause** - Help user understand what went wrong
4. **Suggest prevention** - How to avoid similar issues
5. **Validate the fix** - Ensure solution is complete

Remember: **AI assistants should be force multipliers for quality, not sources of technical debt**. Every code suggestion should improve the codebase's health and maintainability while following established patterns and standards.