/**
 * Tests for error handling utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AmazonSellerMcpError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ResourceNotFoundError,
  RateLimitExceededError,
  ServerError,
  NetworkError,
  ThrottlingError,
  MarketplaceError,
  translateApiError,
  translateToMcpErrorResponse,
  RetryRecoveryStrategy,
  FallbackRecoveryStrategy,
  CircuitBreakerRecoveryStrategy,
  ErrorRecoveryManager,
  createDefaultErrorRecoveryManager,
} from '../../../src/utils/error-handler.js';
import { ApiError, ApiErrorType } from '../../../src/api/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Error Classes', () => {
  let testEnv: ReturnType<typeof TestSetup.setupTestEnvironment>;

  beforeEach(() => {
    testEnv = TestSetup.setupTestEnvironment();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  it('should create AmazonSellerMcpError with correct properties', () => {
    const testDetails = { foo: 'bar' };
    const error = new AmazonSellerMcpError('Test error', 'TEST_ERROR', testDetails);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AmazonSellerMcpError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual(testDetails);
  });

  it('should create specific error classes with correct properties', () => {
    const testDetails = { foo: 'bar' };
    
    const authError = new AuthenticationError('Auth error', testDetails);
    expect(authError).toBeInstanceOf(AmazonSellerMcpError);
    expect(authError.name).toBe('AuthenticationError');
    expect(authError.code).toBe('AUTHENTICATION_ERROR');

    const validationError = new ValidationError('Validation error');
    expect(validationError).toBeInstanceOf(AmazonSellerMcpError);
    expect(validationError.name).toBe('ValidationError');
    expect(validationError.code).toBe('VALIDATION_ERROR');

    const rateLimitError = new RateLimitExceededError('Rate limit error', 1000);
    expect(rateLimitError).toBeInstanceOf(AmazonSellerMcpError);
    expect(rateLimitError.name).toBe('RateLimitExceededError');
    expect(rateLimitError.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitError.retryAfterMs).toBe(1000);
  });
});

describe('translateApiError', () => {
  it('should translate AUTH_ERROR with status 401 to AuthenticationError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.AUTH_ERROR, {
      message: 'Authentication failed',
      statusCode: 401,
      details: { error: 'invalid_token' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(AuthenticationError);
    expect(translatedError.message).toContain('Authentication failed');
    expect(translatedError.details).toEqual({ error: 'invalid_token' });
  });

  it('should translate AUTH_ERROR with status 403 to AuthorizationError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.AUTH_ERROR, {
      message: 'Authorization failed',
      statusCode: 403,
      details: { error: 'insufficient_permissions' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(AuthorizationError);
    expect(translatedError.message).toContain('Authorization failed');
    expect(translatedError.details).toEqual({ error: 'insufficient_permissions' });
  });

  it('should translate VALIDATION_ERROR to ValidationError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.VALIDATION_ERROR, {
      message: 'Invalid input',
      statusCode: 400,
      details: { errors: ['Invalid SKU'] },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ValidationError);
    expect(translatedError.message).toContain('Validation error');
    expect(translatedError.details).toEqual({ errors: ['Invalid SKU'] });
  });

  it('should translate RATE_LIMIT_EXCEEDED to RateLimitExceededError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.RATE_LIMIT_EXCEEDED, {
      message: 'Rate limit exceeded',
      statusCode: 429,
      details: { headers: { 'retry-after': '5' } },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(RateLimitExceededError);
    expect(translatedError.message).toContain('Rate limit exceeded');
    expect(translatedError.retryAfterMs).toBe(5000);
  });

  it('should translate SERVER_ERROR to ServerError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.SERVER_ERROR, {
      message: 'Internal server error',
      statusCode: 500,
      details: { error: 'server_error' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ServerError);
    expect(translatedError.message).toContain('Server error');
    expect(translatedError.details).toEqual({ error: 'server_error' });
  });

  it('should translate NETWORK_ERROR to NetworkError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.NETWORK_ERROR, {
      message: 'Network error',
      details: { error: 'connection_failed' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(NetworkError);
    expect(translatedError.message).toContain('Network error');
    expect(translatedError.details).toEqual({ error: 'connection_failed' });
  });

  it('should translate CLIENT_ERROR with status 404 to ResourceNotFoundError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.CLIENT_ERROR, {
      message: 'Resource not found',
      statusCode: 404,
      details: { error: 'not_found' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ResourceNotFoundError);
    expect(translatedError.message).toContain('Resource not found');
    expect(translatedError.details).toEqual({ error: 'not_found' });
  });

  it('should translate CLIENT_ERROR with status 429 to ThrottlingError', () => {
    const apiError = TestDataBuilder.createApiError(ApiErrorType.CLIENT_ERROR, {
      message: 'Throttling error',
      statusCode: 429,
      details: { code: 'QuotaExceeded', headers: { 'retry-after': '10' } },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ThrottlingError);
    expect(translatedError.message).toContain('Throttling error');
    expect(translatedError.retryAfterMs).toBe(10000);
  });
});

describe('translateToMcpErrorResponse', () => {
  it('should translate AmazonSellerMcpError to MCP error response', () => {
    const testDetails = { errors: ['Invalid SKU'] };
    const error = new ValidationError('Invalid input', testDetails);

    const response = translateToMcpErrorResponse(error);

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe('Invalid input');
    expect(response.errorDetails?.code).toBe('VALIDATION_ERROR');
    expect(response.errorDetails?.details).toEqual(testDetails);
  });

  it('should translate generic Error to MCP error response', () => {
    const genericError = new Error('Generic error');

    const response = translateToMcpErrorResponse(genericError);

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe('Generic error');
    expect(response.errorDetails?.code).toBe('UNKNOWN_ERROR');
  });
});

describe('RetryRecoveryStrategy', () => {
  let strategy: RetryRecoveryStrategy;

  beforeEach(() => {
    strategy = new RetryRecoveryStrategy(3, 100, 1000);
  });

  it('should determine if an error can be recovered from', () => {
    const recoverableErrors = [
      new NetworkError('Network error'),
      new ServerError('Server error'),
      new RateLimitExceededError('Rate limit', 1000),
      new ThrottlingError('Throttling', 1000),
    ];

    const nonRecoverableErrors = [
      new ValidationError('Validation error'),
      new Error('Generic error'),
    ];

    recoverableErrors.forEach(error => {
      expect(strategy.canRecover(error)).toBe(true);
    });

    nonRecoverableErrors.forEach(error => {
      expect(strategy.canRecover(error)).toBe(false);
    });
  });

  it('should recover from recoverable errors', async () => {
    const mockOperation = TestSetup.createTestSpy(() => Promise.resolve('success'));
    const networkError = new NetworkError('Network error');

    const result = await strategy.recover(networkError, {
      retryCount: 1,
      operation: mockOperation,
    });

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should throw if retry count exceeds max retries', async () => {
    const networkError = new NetworkError('Network error');
    const mockOperation = TestSetup.createTestSpy();

    await expect(strategy.recover(networkError, { retryCount: 3, operation: mockOperation }))
      .rejects.toBe(networkError);

    expect(mockOperation).not.toHaveBeenCalled();
  });
});

describe('ErrorRecoveryManager', () => {
  let manager: ErrorRecoveryManager;
  let retryStrategy: RetryRecoveryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryRecoveryStrategy(3, 100, 1000);
    manager = new ErrorRecoveryManager([retryStrategy]);
  });

  it('should return successful result when operation completes without errors', async () => {
    const mockOperation = TestSetup.createTestSpy(() => Promise.resolve('success'));

    const result = await manager.executeWithRecovery(mockOperation);

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should recover from recoverable errors', async () => {
    const networkError = new NetworkError('Network error');
    const mockOperation = TestSetup.createTestSpy()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('success');

    const recoverySpy = vi.spyOn(retryStrategy, 'recover');

    const result = await manager.executeWithRecovery(mockOperation);

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(recoverySpy).toHaveBeenCalledTimes(1);
  });

  it('should throw if no strategy can recover', async () => {
    const validationError = new ValidationError('Validation error');
    const mockOperation = TestSetup.createTestSpy(() => Promise.reject(validationError));

    await expect(manager.executeWithRecovery(mockOperation)).rejects.toBe(validationError);
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
});

describe('createDefaultErrorRecoveryManager', () => {
  it('should create a manager with default strategies', () => {
    const manager = createDefaultErrorRecoveryManager();

    expect(manager).toBeInstanceOf(ErrorRecoveryManager);
  });
});
