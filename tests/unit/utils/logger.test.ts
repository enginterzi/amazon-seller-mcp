/**
 * Tests for the logging system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as winston from 'winston';
import {
  LogLevel,
  Logger,
  configureLogger,
  getLogger,
  createLogger,
  redactSensitiveData,
  createRequestLogger,
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
    } as unknown as winston.Logger;

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

  it('should handle multiple occurrences of sensitive data', () => {
    const message = 'accessToken: abc123, refreshToken: xyz789, Email: test@example.com';
    const redactedMessage = redactSensitiveData(message);

    expect(redactedMessage).toContain('[REDACTED_ACCESSTOKEN]');
    expect(redactedMessage).toContain('[REDACTED_REFRESHTOKEN]');
    expect(redactedMessage).toContain('[REDACTED_EMAIL]');
    expect(redactedMessage).not.toContain('abc123');
    expect(redactedMessage).not.toContain('xyz789');
    expect(redactedMessage).not.toContain('test@example.com');
  });

  it('should handle empty patterns object', () => {
    const message = 'No sensitive data here';
    const redactedMessage = redactSensitiveData(message, {});

    expect(redactedMessage).toBe(message);
  });

  it('should handle messages with no sensitive data', () => {
    const message = 'This is a normal log message';
    const redactedMessage = redactSensitiveData(message);

    expect(redactedMessage).toBe(message);
  });
});

describe('Logger Class', () => {
  let logger: Logger;

  beforeEach(async () => {
    const winston = vi.mocked(await import('winston'));
    const mockWinstonLogger = {
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
    } as unknown as winston.Logger;

    winston.default.createLogger = vi.fn().mockReturnValue(mockWinstonLogger);
    logger = new Logger();
  });

  it('should create logger with default configuration', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with custom configuration', () => {
    const customLogger = new Logger({
      level: LogLevel.DEBUG,
      console: false,
      filePath: 'test.log',
    });

    expect(customLogger).toBeInstanceOf(Logger);
  });

  it('should provide all logging methods', () => {
    const testMetadata = { test: 'data' };

    expect(() => logger.error('Error message', testMetadata)).not.toThrow();
    expect(() => logger.warn('Warning message', testMetadata)).not.toThrow();
    expect(() => logger.info('Info message', testMetadata)).not.toThrow();
    expect(() => logger.http('HTTP message', testMetadata)).not.toThrow();
    expect(() => logger.debug('Debug message', testMetadata)).not.toThrow();
  });

  it('should create child logger', () => {
    const childMetadata = { component: 'test' };
    expect(() => logger.createChild(childMetadata)).not.toThrow();
  });

  it('should return winston logger instance', () => {
    const winstonLogger = logger.getWinstonLogger();
    expect(winstonLogger).toBeDefined();
  });
});

describe('Request Logger Middleware', () => {
  it('should create request logger middleware', () => {
    const middleware = createRequestLogger();
    expect(typeof middleware).toBe('function');
  });

  it('should handle request and response logging', () => {
    const middleware = createRequestLogger();

    const mockReq = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    const mockRes = {
      statusCode: 200,
      on: vi.fn((event, callback) => {
        if (event === 'finish') {
          // Simulate response finish
          setTimeout(callback, 10);
        }
      }),
    };

    const mockNext = vi.fn();

    expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('Logger Configuration Edge Cases', () => {
  it('should handle logger configuration with all options', () => {
    const config = {
      level: LogLevel.ERROR,
      console: true,
      filePath: 'app.log',
      redactSensitiveData: false,
      redactionPatterns: {
        custom: /test\d+/g,
      },
      formatter: winston.format.json(),
    };

    expect(() => createLogger(config)).not.toThrow();
  });

  it('should handle logger configuration with minimal options', () => {
    expect(() => createLogger({})).not.toThrow();
  });

  it('should handle different log levels', () => {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.HTTP, LogLevel.DEBUG];

    levels.forEach((level) => {
      expect(() => createLogger({ level })).not.toThrow();
    });
  });

  it('should handle logger with file output only', () => {
    const config = {
      console: false,
      filePath: 'test.log',
    };

    expect(() => createLogger(config)).not.toThrow();
  });
});

describe('Default Logger Initialization', () => {
  it('should initialize default logger when not configured', () => {
    // Clear any existing configuration
    configureLogger({ level: LogLevel.INFO });

    const logger = getLogger();
    expect(logger).toBeDefined();
  });

  it('should use configured logger when available', () => {
    const customConfig = {
      level: LogLevel.DEBUG,
      console: true,
    };

    configureLogger(customConfig);
    const logger = getLogger();
    expect(logger).toBeDefined();
  });

  it('should handle multiple calls to getLogger', () => {
    const logger1 = getLogger();
    const logger2 = getLogger();

    // Should return the same instance
    expect(logger1).toBe(logger2);
  });
});
