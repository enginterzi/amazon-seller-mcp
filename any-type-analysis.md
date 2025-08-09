# Any Type Usage Analysis

## Summary
Found 47 instances of `any` type usage across the codebase. These need to be categorized and replaced with specific types.

## Categories

### 1. Function Parameters (15 instances)
**Context**: Parameters in function signatures that use `any` type

**Files and Locations**:
- `src/utils/logger.ts`: Multiple logging functions with `meta: Record<string, any>` parameters
  - `error()`, `warn()`, `info()`, `http()`, `debug()` functions
  - `createChildLogger()`, `createRequestLogger()` functions
  - `Logger` class methods
- `src/utils/error-handler.ts`: Error constructors with `details?: any` parameters
  - All error class constructors (8 instances)
  - Recovery strategy functions with `context: any` parameters
- `src/server/tools.ts`: Tool handler with `input: any` parameter
- `src/server/server.ts`: `isInitializeRequest(body: any)` method
- `src/server/notifications.ts`: Event listener functions with `data: any` parameters

**Replacement Strategy**: 
- Create specific interfaces for metadata objects
- Define proper error detail types
- Create input schemas for tool handlers
- Define request body interfaces

### 2. Return Types (8 instances)
**Context**: Function return types using `any`

**Files and Locations**:
- `src/api/base-client.ts`: Generic type defaults `<T = any>` in API methods
  - `request<T = any>()`, `executeRequest<T = any>()`, `makeRequest<T = any>()`
- `src/utils/error-handler.ts`: Recovery functions returning `Promise<any>`
- `src/server/tools.ts`: `ToolHandler<T = any>` type definition
- `src/server/error-handler.ts`: `wrapToolHandlerWithErrorHandling<T = any>()`
- `src/types/api.ts`: `ApiResponse<T = any>` interface

**Replacement Strategy**:
- Use proper generic constraints instead of defaulting to `any`
- Define specific return type interfaces
- Create union types for multiple possible return types

### 3. Variable Declarations (8 instances)
**Context**: Variables explicitly typed as `any`

**Files and Locations**:
- `src/resources/catalog/catalog-resources.ts`: Array casting `(identifiers as any[])`
- `src/resources/inventory/inventory-resources.ts`: `filterParams: any`
- `src/resources/orders/orders-resources.ts`: `filterParams: any`
- `src/resources/reports/reports-resources.ts`: `filterParams: any`
- `src/server/resources.ts`: `templateOptions: any`
- `src/tools/orders-tools.ts`: `details: any`
- `src/tools/reports-tools.ts`: `content: any[]`

**Replacement Strategy**:
- Create specific interfaces for filter parameters
- Define proper content type arrays
- Use type assertions with specific types instead of `any`

### 4. Generic Type Parameters (6 instances)
**Context**: Generic constraints or defaults using `any`

**Files and Locations**:
- `src/api/base-client.ts`: Queue resolve/reject functions and Promise types
- `src/utils/error-handler.ts`: Constructor parameter arrays `Array<new (...args: any[]) => Error>`
- `src/server/tools.ts`: Tool handler map `Map<string, ToolHandler<any>>`
- `src/server/server.ts`: `registerTool<T = any>()`

**Replacement Strategy**:
- Use proper generic constraints
- Define specific constructor parameter types
- Create bounded type parameters

### 5. Record/Object Types (10 instances)
**Context**: Object properties using `Record<string, any>` or similar

**Files and Locations**:
- `src/api/catalog-client.ts`: `attributes`, `identifiers`, `relationships` properties
- `src/api/listings-client.ts`: `attributes` properties
- `src/utils/logger.ts`: Metadata objects in logging functions

**Replacement Strategy**:
- Create specific interfaces for Amazon API response structures
- Define metadata type interfaces
- Use index signatures with more specific value types

## Priority Order for Replacement

1. **High Priority**: Function parameters and return types (affects API contracts)
2. **Medium Priority**: Variable declarations (affects type safety)
3. **Low Priority**: Generic defaults and Record types (less breaking changes)

## Specific Type Definitions Needed

### Amazon API Types
```typescript
interface AmazonItemAttributes {
  [key: string]: string | number | boolean | string[];
}

interface AmazonItemIdentifiers {
  [marketplace: string]: Array<{
    identifier: string;
    identifierType: string;
    marketplaceId?: string;
  }>;
}

interface AmazonItemRelationships {
  [marketplace: string]: Array<{
    type: string;
    identifiers?: Array<{
      identifier: string;
      identifierType: string;
    }>;
  }>;
}
```

### Error Detail Types
```typescript
interface ErrorDetails {
  code?: string;
  statusCode?: number;
  requestId?: string;
  timestamp?: string;
  [key: string]: unknown;
}
```

### Logging Metadata Types
```typescript
interface LogMetadata {
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: string | number | boolean | undefined;
}
```

### Filter Parameter Types
```typescript
interface InventoryFilterParams {
  nextToken?: string;
  granularityType?: string;
  granularityId?: string;
  startDateTime?: string;
  endDateTime?: string;
  marketplaceIds?: string[];
}

interface OrdersFilterParams {
  nextToken?: string;
  marketplaceIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  orderStatuses?: string[];
}

interface ReportsFilterParams {
  nextToken?: string;
  reportTypes?: string[];
  processingStatuses?: string[];
  marketplaceIds?: string[];
  createdSince?: string;
  createdUntil?: string;
}
```