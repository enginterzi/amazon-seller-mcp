/**
 * Tests for the logging system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as winston from 'winston';
import {
  LogLevel,
  configureLogger,
  getLogger,
  createLogger,
  redactSensitiveData,
  error,
  warn,
  info,
  debug,
  createChildLogger,
} from '../../../src/utils/logger.js';
import { TestSetup } from '../../utils/test-setup.js';

// Mock winston using centralized approach
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(),
    format: {
      combine: vi.fn().mockReturnValue({}),
      timestamp: vi.fn().mockReturnValue({}),
      json: vi.fn().mockReturnValue({}),
      printf: vi.fn().mockReturnValue({}),
      colorize: vi.fn().mockReturnValue({}),
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn(),
    },
    config: {
      npm: {
        levels: {
          error: 0,
          warn: 1,
          info: 2,
          http: 3,
          verbose: 4,
          debug: 5,
          silly: 6,
        },
      },
    },
  },
  format: {
    combine: vi.fn().mockReturnValue({}),
    timestamp: vi.fn().mockReturnValue({}),
    json: vi.fn().mockReturnValue({}),
    printf: vi.fn().mockReturnValue({}),
    colorize: vi.fn().mockReturnValue({}),
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn(),
  },
  config: {
    npm: {
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      },
    },
  },
}));

describe('Logger System', () => {
  let mockLogger: winston.Logger;
  let testEnv: ReturnType<typeof TestSetup.setupTestEnvironment>;

  beforeEach(async () => {
    testEnv = TestSetup.setupTestEnvironment();

    // Setup winston mocks using centralized approach
    const winston = vi.mocked(await import('winston'));

    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      http: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnValue({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        http: vi.fn(),
        debug: vi.fn(),
      }),
    };

    winston.default.createLogger = vi.fn().mockReturnValue(mockLogger);
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  it('should create logger instance successfully', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
  });

  it('should create logger with file configuration', () => {
    const logger = createLogger({ filePath: 'test.log' });
    expect(logger).toBeDefined();
  });

  it('should create logger with console disabled', () => {
    const logger = createLogger({ console: false });
    expect(logger).toBeDefined();
  });

  it('should create logger with custom formatter', () => {
    const formatter = winston.format.combine();
    const logger = createLogger({ formatter });
    expect(logger).toBeDefined();
  });

  it('should configure and retrieve default logger', () => {
    const config = { level: LogLevel.DEBUG };
    configureLogger(config);

    const logger = getLogger();
    expect(logger).toBeDefined();
  });

  it('should provide logging functions that execute without errors', () => {
    const testMetadata = { meta: 'data' };

    expect(() => error('Error message', testMetadata)).not.toThrow();
    expect(() => warn('Warning message', testMetadata)).not.toThrow();
    expect(() => info('Info message', testMetadata)).not.toThrow();
    expect(() => debug('Debug message', testMetadata)).not.toThrow();
  });

  it('should create child logger successfully', () => {
    const childMetadata = { component: 'test' };
    expect(() => createChildLogger(childMetadata)).not.toThrow();
  });

  it('should redact sensitive authentication data from messages', () => {
    const sensitiveMessage =
      'accessToken: "abc123", refreshToken: "xyz789", clientSecret: "secret123"';
    const redactedMessage = redactSensitiveData(sensitiveMessage);

    expect(redactedMessage).toContain('[REDACTED_ACCESSTOKEN]');
    expect(redactedMessage).toContain('[REDACTED_REFRESHTOKEN]');
    expect(redactedMessage).toContain('[REDACTED_CLIENTSECRET]');
    expect(redactedMessage).not.toContain('abc123');
    expect(redactedMessage).not.toContain('xyz789');
    expect(redactedMessage).not.toContain('secret123');
  });

  it('should redact credit card numbers from messages', () => {
    const messageWithCreditCard = 'Credit card: 1234 5678 9012 3456';
    const redactedMessage = redactSensitiveData(messageWithCreditCard);

    expect(redactedMessage).toContain('[REDACTED_CREDITCARD]');
    expect(redactedMessage).not.toContain('1234 5678 9012 3456');
  });

  it('should redact email addresses from messages', () => {
    const messageWithEmail = 'Email: test@example.com';
    const redactedMessage = redactSensitiveData(messageWithEmail);

    expect(redactedMessage).toContain('[REDACTED_EMAIL]');
    expect(redactedMessage).not.toContain('test@example.com');
  });

  it('should redact phone numbers from messages', () => {
    const messageWithPhone = 'Phone: (123) 456-7890';
    const redactedMessage = redactSensitiveData(messageWithPhone);

    expect(redactedMessage).toContain('[REDACTED_PHONE]');
    expect(redactedMessage).not.toContain('(123) 456-7890');
  });

  it('should support custom redaction patterns', () => {
    const messageWithCustomData = 'Custom: sensitive123';
    const customPatterns = {
      custom: /sensitive\d+/g,
    };

    const redactedMessage = redactSensitiveData(messageWithCustomData, customPatterns);

    expect(redactedMessage).toContain('[REDACTED_CUSTOM]');
    expect(redactedMessage).not.toContain('sensitive123');
  });
});
