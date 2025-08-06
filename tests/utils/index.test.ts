/**
 * Tests for the test utilities index exports
 */

import { describe, it, expect } from 'vitest';
import {
  TestDataBuilder,
  TestAssertions,
  TestSetup,
  MockEnvironment,
  TestComponentConfig,
  AxiosMockFactory,
  BaseApiClientMockFactory,
  AmazonAuthMockFactory,
  BaseMockFactory,
  TestIsolationUtils,
} from './index.js';

describe('Test Utilities Index', () => {
  it('should export TestDataBuilder', () => {
    expect(TestDataBuilder).toBeDefined();
    expect(typeof TestDataBuilder.createCredentials).toBe('function');
    expect(typeof TestDataBuilder.createApiResponse).toBe('function');
  });

  it('should export TestAssertions', () => {
    expect(TestAssertions).toBeDefined();
    expect(typeof TestAssertions.expectApiCall).toBe('function');
    expect(typeof TestAssertions.expectSuccessResponse).toBe('function');
  });

  it('should export TestSetup', () => {
    expect(TestSetup).toBeDefined();
    expect(typeof TestSetup.setupMockEnvironment).toBe('function');
    expect(typeof TestSetup.createTestAuthConfig).toBe('function');
  });

  it('should export mock factories', () => {
    expect(AxiosMockFactory).toBeDefined();
    expect(BaseApiClientMockFactory).toBeDefined();
    expect(AmazonAuthMockFactory).toBeDefined();
    expect(BaseMockFactory).toBeDefined();
    expect(TestIsolationUtils).toBeDefined();
  });

  it('should export types', () => {
    // Types are compile-time only, so we just verify they can be imported
    // This test will fail at compile time if types are not exported correctly
    const mockEnv: MockEnvironment = {} as any;
    const config: TestComponentConfig = {} as any;
    
    expect(mockEnv).toBeDefined();
    expect(config).toBeDefined();
  });
});