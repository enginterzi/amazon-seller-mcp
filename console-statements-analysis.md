# Console Statements Analysis and Categorization

## Summary
Total console statements found: **127 instances** across multiple file types

## Categorization by File Type

### 1. Production Code (src/) - **78 instances**
These need to be replaced with Winston logger calls:

#### src/server/server.ts - **35 instances**
- **console.log**: Server initialization, connection status, tool/resource registration (25 instances)
- **console.error**: Error handling for server operations (7 instances)  
- **console.warn**: Transport closure warnings (3 instances)

#### src/server/notifications.ts - **12 instances**
- **console.log**: Notification manager initialization, fallback logging (3 instances)
- **console.error**: Error handling for notification delivery (9 instances)

#### src/server/resources.ts - **3 instances**
- **console.warn**: Resource already registered warning (1 instance)
- **console.error**: Resource handling errors (1 instance)
- **console.log**: Resource registration confirmation (1 instance)

#### src/server/error-handler.ts - **2 instances**
- **console.error**: Tool and resource error logging (2 instances)

#### src/server/order-notifications.ts - **6 instances**
- **console.log**: Monitoring status messages (4 instances)
- **console.error**: Error handling for order monitoring (2 instances)

#### src/api/reports-client.ts - **1 instance**
- **console.warn**: GZIP compression warning (1 instance)

#### src/test-maintenance.ts - **2 instances**
- **console.warn**: Test metrics loading/saving warnings (2 instances)

### 2. Test Files (tests/) - **25 instances**
These need evaluation - some should be removed, others replaced with test output methods:

#### tests/validation/health-checker.ts - **17 instances**
- **console.log**: Health check reporting and output formatting (17 instances)
- **Purpose**: CLI tool output for test health reporting - LEGITIMATE USAGE

#### tests/utils/vitest-maintenance-plugin.ts - **2 instances**
- **console.log**: Plugin initialization (1 instance)
- **console.warn**: Test issue warnings (2 instances)

#### tests/utils/mock-factories/index.ts - **1 instance**
- **console.warn**: Deprecation warning (1 instance)

#### tests/utils/mock-factories/base-factory.ts - **1 instance**
- **console.warn**: Cleanup task failure warning (1 instance)

#### tests/utils/event-cleanup.ts - **1 instance**
- **console.warn**: Event emitter cleanup warning (1 instance)

#### tests/utils/test-setup.ts - **1 instance**
- **console.warn**: Server cleanup warning (1 instance)

#### tests/utils/test-maintenance.ts - **2 instances**
- **console.warn**: Test metrics warnings (2 instances)

### 3. Utility Scripts (scripts/) - **24 instances**
These are legitimate CLI tool usage and should be preserved:

#### scripts/test-maintenance.js - **22 instances**
- **console.log**: CLI output, health reports, usage information (18 instances)
- **console.error**: Error reporting (4 instances)
- **Purpose**: CLI tool - LEGITIMATE USAGE

#### scripts/generate-docs.js - **4 instances**
- **console.log**: Build process status messages (4 instances)
- **Purpose**: Build script - LEGITIMATE USAGE

### 4. Examples (examples/) - **17 instances**
These are legitimate usage for demonstration purposes:

#### examples/notifications/index.ts - **11 instances**
- **console.log**: Example output and demonstration (9 instances)
- **console.error**: Error handling in examples (2 instances)
- **Purpose**: Educational examples - LEGITIMATE USAGE

#### examples/custom-extensions/index.ts - **4 instances**
- **console.log**: Example output (3 instances)
- **console.error**: Error handling (1 instance)
- **Purpose**: Educational examples - LEGITIMATE USAGE

#### examples/basic/index.ts - **3 instances**
- **console.log**: Example output (2 instances)
- **console.error**: Error handling (1 instance)
- **Purpose**: Educational examples - LEGITIMATE USAGE

## Replacement Strategy

### Production Code (78 instances) - REPLACE WITH WINSTON LOGGER
- Import Winston logger from `src/utils/logger.ts`
- Replace `console.log` with `logger.info`
- Replace `console.error` with `logger.error`
- Replace `console.warn` with `logger.warn`
- Maintain appropriate log levels and context

### Test Files (25 instances) - EVALUATE AND CLEAN
- **Keep**: CLI tools like health-checker.ts (legitimate output)
- **Remove**: Unnecessary debug console statements in test utilities
- **Replace**: Test-specific console usage with appropriate test output methods

### Utility Scripts (24 instances) - PRESERVE
- These are legitimate CLI tools that need console output
- No changes required

### Examples (17 instances) - PRESERVE  
- These are educational examples showing proper usage
- No changes required

## Files Requiring Changes

### High Priority (Production Code):
1. `src/server/server.ts` - 35 console statements
2. `src/server/notifications.ts` - 12 console statements  
3. `src/server/order-notifications.ts` - 6 console statements
4. `src/server/resources.ts` - 3 console statements
5. `src/server/error-handler.ts` - 2 console statements
6. `src/api/reports-client.ts` - 1 console statement
7. `src/test-maintenance.ts` - 2 console statements

### Medium Priority (Test Files):
1. `tests/utils/vitest-maintenance-plugin.ts` - 2 console statements
2. `tests/utils/mock-factories/index.ts` - 1 console statement
3. `tests/utils/mock-factories/base-factory.ts` - 1 console statement
4. `tests/utils/event-cleanup.ts` - 1 console statement
5. `tests/utils/test-setup.ts` - 1 console statement
6. `tests/utils/test-maintenance.ts` - 2 console statements

### No Changes Required:
- All files in `scripts/` (CLI tools)
- All files in `examples/` (educational examples)
- `tests/validation/health-checker.ts` (CLI tool)