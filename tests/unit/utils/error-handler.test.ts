/**
 * Tests for error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import { ApiError, ApiErrorType } from '../../../src/types/api.js';

describe('Error Classes', () => {
  it('should create AmazonSellerMcpError with correct properties', () => {
    const error = new AmazonSellerMcpError('Test error', 'TEST_ERROR', { foo: 'bar' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AmazonSellerMcpError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ foo: 'bar' });
  });

  it('should create specific error classes with correct properties', () => {
    const authError = new AuthenticationError('Auth error', { foo: 'bar' });
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
    const apiError = new ApiError('Authentication failed', ApiErrorType.AUTH_ERROR, 401, {
      error: 'invalid_token',
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(AuthenticationError);
    expect(translatedError.message).toContain('Authentication failed');
    expect(translatedError.details).toEqual({ error: 'invalid_token' });
  });

  it('should translate AUTH_ERROR with status 403 to AuthorizationError', () => {
    const apiError = new ApiError('Authorization failed', ApiErrorType.AUTH_ERROR, 403, {
      error: 'insufficient_permissions',
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(AuthorizationError);
    expect(translatedError.message).toContain('Authorization failed');
    expect(translatedError.details).toEqual({ error: 'insufficient_permissions' });
  });

  it('should translate VALIDATION_ERROR to ValidationError', () => {
    const apiError = new ApiError('Invalid input', ApiErrorType.VALIDATION_ERROR, 400, {
      errors: ['Invalid SKU'],
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ValidationError);
    expect(translatedError.message).toContain('Validation error');
    expect(translatedError.details).toEqual({ errors: ['Invalid SKU'] });
  });

  it('should translate RATE_LIMIT_EXCEEDED to RateLimitExceededError', () => {
    const apiError = new ApiError('Rate limit exceeded', ApiErrorType.RATE_LIMIT_EXCEEDED, 429, {
      headers: { 'retry-after': '5' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(RateLimitExceededError);
    expect(translatedError.message).toContain('Rate limit exceeded');
    expect(translatedError.retryAfterMs).toBe(5000);
  });

  it('should translate SERVER_ERROR to ServerError', () => {
    const apiError = new ApiError('Internal server error', ApiErrorType.SERVER_ERROR, 500, {
      error: 'server_error',
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ServerError);
    expect(translatedError.message).toContain('Server error');
    expect(translatedError.details).toEqual({ error: 'server_error' });
  });

  it('should translate NETWORK_ERROR to NetworkError', () => {
    const apiError = new ApiError('Network error', ApiErrorType.NETWORK_ERROR, undefined, {
      error: 'connection_failed',
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(NetworkError);
    expect(translatedError.message).toContain('Network error');
    expect(translatedError.details).toEqual({ error: 'connection_failed' });
  });

  it('should translate CLIENT_ERROR with status 404 to ResourceNotFoundError', () => {
    const apiError = new ApiError('Resource not found', ApiErrorType.CLIENT_ERROR, 404, {
      error: 'not_found',
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ResourceNotFoundError);
    expect(translatedError.message).toContain('Resource not found');
    expect(translatedError.details).toEqual({ error: 'not_found' });
  });

  it('should translate CLIENT_ERROR with status 429 to ThrottlingError', () => {
    const apiError = new ApiError('Throttling error', ApiErrorType.CLIENT_ERROR, 429, {
      code: 'QuotaExceeded',
      headers: { 'retry-after': '10' },
    });

    const translatedError = translateApiError(apiError);

    expect(translatedError).toBeInstanceOf(ThrottlingError);
    expect(translatedError.message).toContain('Throttling error');
    expect(translatedError.retryAfterMs).toBe(10000);
  });
});

describe('translateToMcpErrorResponse', () => {
  it('should translate AmazonSellerMcpError to MCP error response', () => {
    const error = new ValidationError('Invalid input', { errors: ['Invalid SKU'] });

    const response = translateToMcpErrorResponse(error);

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe('Invalid input');
    expect(response.errorDetails?.code).toBe('VALIDATION_ERROR');
    expect(response.errorDetails?.details).toEqual({ errors: ['Invalid SKU'] });
  });

  it('should translate generic Error to MCP error response', () => {
    const error = new Error('Generic error');

    const response = translateToMcpErrorResponse(error);

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
    expect(strategy.canRecover(new NetworkError('Network error'))).toBe(true);
    expect(strategy.canRecover(new ServerError('Server error'))).toBe(true);
    expect(strategy.canRecover(new RateLimitExceededError('Rate limit', 1000))).toBe(true);
    expect(strategy.canRecover(new ThrottlingError('Throttling', 1000))).toBe(true);
    expect(strategy.canRecover(new ValidationError('Validation error'))).toBe(false);
    expect(strategy.canRecover(new Error('Generic error'))).toBe(false);
  });

  it('should recover from recoverable errors', async () => {
    const operation = vi.fn().mockResolvedValueOnce('success');

    const result = await strategy.recover(new NetworkError('Network error'), {
      retryCount: 1,
      operation,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw if retry count exceeds max retries', async () => {
    const error = new NetworkError('Network error');
    const operation = vi.fn();

    await expect(strategy.recover(error, { retryCount: 3, operation })).rejects.toBe(error);

    expect(operation).not.toHaveBeenCalled();
  });
});

describe('ErrorRecoveryManager', () => {
  let manager: ErrorRecoveryManager;
  let retryStrategy: RetryRecoveryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryRecoveryStrategy(3, 100, 1000);
    manager = new ErrorRecoveryManager([retryStrategy]);
  });

  it('should execute operation successfully', async () => {
    const operation = vi.fn().mockResolvedValueOnce('success');

    const result = await manager.executeWithRecovery(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should recover from recoverable errors', async () => {
    const error = new NetworkError('Network error');
    const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success');

    const spy = vi.spyOn(retryStrategy, 'recover');

    const result = await manager.executeWithRecovery(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should throw if no strategy can recover', async () => {
    const error = new ValidationError('Validation error');
    const operation = vi.fn().mockRejectedValueOnce(error);

    await expect(manager.executeWithRecovery(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('createDefaultErrorRecoveryManager', () => {
  it('should create a manager with default strategies', () => {
    const manager = createDefaultErrorRecoveryManager();

    expect(manager).toBeInstanceOf(ErrorRecoveryManager);
  });
});
