# TypeScript `any` Type Prevention Guidelines

## Overview
This document establishes strict guidelines to prevent the proliferation of TypeScript `any` types in the codebase. The use of `any` types undermines type safety and should be avoided in favor of proper type definitions.

## Mandatory Rules - ZERO TOLERANCE

### 1. Source Code Files - NO `any` TYPES ALLOWED
- **NEVER use `any` type** in production source code (`src/**/*.ts`)
- **Always define proper interfaces** for complex objects
- **Use `unknown` instead of `any`** when the type is truly unknown
- **Create specific type unions** instead of using `any`

### 2. Acceptable Alternatives to `any`

```typescript
// ❌ WRONG - Using any
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

// ✅ CORRECT - Using unknown when type is truly unknown
function processUnknownData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'someProperty' in data) {
    return (data as { someProperty: string }).someProperty;
  }
  throw new Error('Invalid data structure');
}
```

### 3. Constructor Signatures - LIMITED EXCEPTIONS
The ONLY acceptable use of `any` in source code is for constructor signatures of error classes:

```typescript
// ✅ ACCEPTABLE - Constructor signature for error classes
private recoverableErrors: Array<new (...args: any[]) => AmazonSellerMcpError>;
```

### 4. Test Files - MINIMIZE `any` USAGE
- **Prefer centralized mock factories** over inline `any` types
- **Use proper type assertions** instead of `any`
- **Create test-specific interfaces** when needed

```typescript
// ❌ WRONG - Inline any in tests
const mockClient = {
  getData: vi.fn().mockResolvedValue({} as any)
};

// ✅ CORRECT - Use centralized mock factory
import { createMockApiClient } from '../utils/mock-factories';
const mockClient = createMockApiClient({
  getData: { data: 'test-response' }
});
```

## Implementation Guidelines

### 1. Interface-First Development
- **Define interfaces before implementation**
- **Use generic types** for reusable components
- **Create type unions** for multiple possible types
- **Leverage utility types** (Partial, Pick, Omit, etc.)

### 2. Error Handling Types
```typescript
// ✅ CORRECT - Proper error typing
try {
  await someOperation();
} catch (err: unknown) {
  if (err instanceof Error) {
    logger.error('Operation failed', { message: err.message });
  } else {
    logger.error('Unknown error', { error: String(err) });
  }
}
```

### 3. API Response Typing
```typescript
// ✅ CORRECT - Define API response interfaces
interface ApiResponse<T> {
  data: T;
  statusCode: number;
  headers: Record<string, string>;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
}
```

### 4. Event Handler Typing
```typescript
// ✅ CORRECT - Proper event handler typing
interface EventHandler<T = unknown> {
  (event: T): void | Promise<void>;
}
```

## Quality Gates

### 1. Pre-commit Validation
- **ESLint rule**: `@typescript-eslint/no-explicit-any` must be enforced
- **Zero `any` types allowed** in source files
- **Build must pass** with strict TypeScript configuration

### 2. Code Review Checklist
- [ ] No `any` types in source code
- [ ] Proper interfaces defined for complex objects
- [ ] Generic types used appropriately
- [ ] Error handling uses proper typing
- [ ] Test mocks use centralized factories

### 3. CI/CD Integration
```bash
# Fail build if any types found in source files
npm run lint -- --max-warnings 0 src/
```

## Migration Strategy for Existing `any` Types

### 1. Prioritization
1. **Critical**: Source files (`src/**/*.ts`)
2. **Important**: Test utilities and factories
3. **Lower priority**: Individual test files

### 2. Replacement Patterns
```typescript
// Pattern 1: Replace with proper interface
// Before: data: any
// After: data: ApiResponseData

// Pattern 2: Replace with generic
// Before: handler: (input: any) => any
// After: handler: <T>(input: T) => Promise<Result<T>>

// Pattern 3: Replace with unknown + type guards
// Before: value: any
// After: value: unknown (with proper type checking)
```

## Enforcement Mechanisms

### 1. ESLint Configuration
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error"
  }
}
```

### 2. TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 3. Pre-commit Hook
```bash
#!/bin/sh
# Check for any types in source files
if grep -r "any" src/ --include="*.ts" | grep -v "// any" | grep -v "Clear existing timeout if any"; then
  echo "❌ Found 'any' types in source files. Please use proper typing."
  exit 1
fi
```

## Success Metrics

### 1. Target Goals
- **Source files**: 0 `any` types (except constructor signatures)
- **Test files**: < 50 `any` types total
- **New code**: 0 `any` types in all new files

### 2. Monitoring
- **Weekly reports** on `any` type count
- **Trend analysis** to ensure decreasing usage
- **Code review metrics** tracking `any` type rejections

## Emergency Procedures

### 1. If `any` Types Are Introduced
1. **Immediate action**: Create GitHub issue
2. **Block merge**: Until proper typing is implemented
3. **Root cause analysis**: Why was `any` used?
4. **Update guidelines**: If new pattern discovered

### 2. Legacy Code Cleanup
- **Quarterly sprints** dedicated to `any` type elimination
- **Incremental approach**: Fix one module at a time
- **Test coverage**: Ensure changes don't break functionality

## Remember
**Type safety is not optional**. Every `any` type is a potential runtime error waiting to happen. Invest the time to create proper types - your future self and teammates will thank you.