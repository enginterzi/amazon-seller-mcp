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

// Mock winston
vi.mock('winston', async () => {
  const actual = await vi.importActual('winston');
  return {
    ...actual,
    createLogger: vi.fn().mockImplementation(() => ({
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
    })),
    format: {
      ...actual.format,
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
  };
});

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with default configuration', () => {
      createLogger();

      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.transports.Console).toHaveBeenCalled();
      expect(winston.transports.File).not.toHaveBeenCalled();
    });

    it('should create a logger with file transport when filePath is provided', () => {
      createLogger({ filePath: 'test.log' });

      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.transports.Console).toHaveBeenCalled();
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test.log',
        })
      );
    });

    it('should create a logger without console transport when console is false', () => {
      createLogger({ console: false });

      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.transports.Console).not.toHaveBeenCalled();
    });

    it('should create a logger with custom formatter when provided', () => {
      const formatter = winston.format.combine();
      createLogger({ formatter });

      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          format: formatter,
        })
      );
    });
  });

  describe('configureLogger and getLogger', () => {
    it('should configure the default logger', () => {
      const config = { level: LogLevel.DEBUG };
      configureLogger(config);

      expect(winston.createLogger).toHaveBeenCalled();
      const logger = getLogger();
      expect(logger).toBeDefined();
    });
  });

  describe('logging methods', () => {
    it('should call the corresponding winston methods', () => {
      const mockLogger = createLogger();
      vi.spyOn(winston, 'createLogger').mockReturnValue(mockLogger);

      configureLogger({});

      error('Error message', { meta: 'data' });
      expect(mockLogger.error).toHaveBeenCalledWith('Error message', { meta: 'data' });

      warn('Warning message', { meta: 'data' });
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', { meta: 'data' });

      info('Info message', { meta: 'data' });
      expect(mockLogger.info).toHaveBeenCalledWith('Info message', { meta: 'data' });

      debug('Debug message', { meta: 'data' });
      expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', { meta: 'data' });
    });
  });

  describe('createChildLogger', () => {
    it('should create a child logger with additional metadata', () => {
      const mockLogger = createLogger();
      vi.spyOn(winston, 'createLogger').mockReturnValue(mockLogger);

      configureLogger({});

      createChildLogger({ component: 'test' });
      expect(mockLogger.child).toHaveBeenCalledWith({ component: 'test' });
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact sensitive data from log messages', () => {
      const message = 'accessToken: "abc123", refreshToken: "xyz789", clientSecret: "secret123"';
      const redacted = redactSensitiveData(message);

      expect(redacted).toContain('[REDACTED_ACCESSTOKEN]');
      expect(redacted).toContain('[REDACTED_REFRESHTOKEN]');
      expect(redacted).toContain('[REDACTED_CLIENTSECRET]');
      expect(redacted).not.toContain('abc123');
      expect(redacted).not.toContain('xyz789');
      expect(redacted).not.toContain('secret123');
    });

    it('should redact credit card numbers', () => {
      const message = 'Credit card: 1234 5678 9012 3456';
      const redacted = redactSensitiveData(message);

      expect(redacted).toContain('[REDACTED_CREDITCARD]');
      expect(redacted).not.toContain('1234 5678 9012 3456');
    });

    it('should redact email addresses', () => {
      const message = 'Email: test@example.com';
      const redacted = redactSensitiveData(message);

      expect(redacted).toContain('[REDACTED_EMAIL]');
      expect(redacted).not.toContain('test@example.com');
    });

    it('should redact phone numbers', () => {
      const message = 'Phone: (123) 456-7890';
      const redacted = redactSensitiveData(message);

      expect(redacted).toContain('[REDACTED_PHONE]');
      expect(redacted).not.toContain('(123) 456-7890');
    });

    it('should use custom redaction patterns when provided', () => {
      const message = 'Custom: sensitive123';
      const patterns = {
        custom: /sensitive\d+/g,
      };

      const redacted = redactSensitiveData(message, patterns);

      expect(redacted).toContain('[REDACTED_CUSTOM]');
      expect(redacted).not.toContain('sensitive123');
    });
  });
});
