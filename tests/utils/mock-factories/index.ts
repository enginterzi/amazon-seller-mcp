/**
 * Mock factories index - exports all mock factories for easy importing
 */

// Base factory infrastructure
export {
  BaseMockFactory,
  MockFactoryRegistry,
  MockScenarioManager,
  TestIsolationUtils,
  MockUtils,
  type MockFactory,
  type MockScenario,
} from './base-factory.js';

// Axios mock factory
export {
  AxiosMockFactory,
  AxiosMockScenarios,
  type MockAxiosInstance,
  type MockAxiosStatic,
  type ResponseScenario,
  type ErrorScenario,
  type AxiosMockConfig,
} from './axios-factory.js';

// API client mock factories
export {
  BaseApiClientMockFactory,
  CatalogClientMockFactory,
  ListingsClientMockFactory,
  InventoryClientMockFactory,
  OrdersClientMockFactory,
  ReportsClientMockFactory,
  ApiResponseBuilders,
  type MockBaseApiClient,
  type MockCatalogClient,
  type MockListingsClient,
  type MockInventoryClient,
  type MockOrdersClient,
  type MockReportsClient,
  type ApiClientMockConfig,
} from './api-client-factory.js';

// Authentication mock factories
export {
  AmazonAuthMockFactory,
  CredentialManagerMockFactory,
  AuthMockScenarios,
  type MockAmazonAuth,
  type MockCredentialManager,
  type TokenScenario,
  type AuthErrorScenario,
  type AuthMockConfig,
} from './auth-factory.js';

// Server mock factories
export {
  McpServerMockFactory,
  NotificationServerMockFactory,
  AmazonSellerMcpServerMockFactory,
  ToolRegistrationManagerMockFactory,
  ResourceRegistrationManagerMockFactory,
  type MockMcpServer,
  type MockServerForNotifications,
  type MockAmazonSellerMcpServer,
  type MockToolRegistrationManager,
  type MockResourceRegistrationManager,
} from './server-factory.js';

/**
 * Convenience function to reset all registered factories
 * Note: Import the required classes directly when using this function
 */
export function resetAllFactories() {
  // Users should import MockFactoryRegistry and TestIsolationUtils directly
  // This is a placeholder function - actual implementation should be done by the user
  // Emit deprecation warning to stderr
  process.stderr.write(
    'WARNING: resetAllFactories: Please import MockFactoryRegistry and TestIsolationUtils directly to avoid circular dependencies\n'
  );
}
