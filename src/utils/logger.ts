/**
 * Logging system for Amazon Seller MCP Client
 *
 * This file contains the logging system implementation, including:
 * - Configurable logging levels
 * - Sensitive data redaction
 * - Log formatting
 */

import winston from 'winston';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /**
   * Log level
   * @default 'info'
   */
  level?: LogLevel;

  /**
   * Whether to log to console
   * @default true
   */
  console?: boolean;

  /**
   * File path to log to
   * @default undefined (no file logging)
   */
  filePath?: string;

  /**
   * Whether to redact sensitive data
   * @default true
   */
  redactSensitiveData?: boolean;

  /**
   * Custom redaction patterns
   * Each key is a field name to redact, and the value is the pattern to match
   */
  redactionPatterns?: Record<string, RegExp>;

  /**
   * Custom formatter function
   */
  formatter?: winston.Logform.Format;
}

/**
 * Default redaction patterns for sensitive data
 */
const DEFAULT_REDACTION_PATTERNS: Record<string, RegExp> = {
  // Authentication related
  accessToken: /(?<=accessToken["']?\s*[:=]\s*["']?)[\w\-\.]+(?=["']?)/gi,
  refreshToken: /(?<=refreshToken["']?\s*[:=]\s*["']?)[\w\-\.]+(?=["']?)/gi,
  clientSecret: /(?<=clientSecret["']?\s*[:=]\s*["']?)[\w\-\.]+(?=["']?)/gi,
  secretAccessKey: /(?<=secretAccessKey["']?\s*[:=]\s*["']?)[\w\-\.]+(?=["']?)/gi,

  // Credit card related
  creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,

  // Personal information
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,

  // Amazon specific
  sellerAuthToken: /(?<=sellerAuthToken["']?\s*[:=]\s*["']?)[\w\-\.]+(?=["']?)/gi,
};

/**
 * Redact sensitive data from log messages
 *
 * @param message Log message
 * @param patterns Redaction patterns
 * @returns Redacted message
 */
export function redactSensitiveData(
  message: string,
  patterns: Record<string, RegExp> = DEFAULT_REDACTION_PATTERNS
): string {
  let redactedMessage = message;

  // Apply each redaction pattern
  Object.entries(patterns).forEach(([key, pattern]) => {
    redactedMessage = redactedMessage.replace(pattern, `[REDACTED_${key.toUpperCase()}]`);
  });

  return redactedMessage;
}

/**
 * Create a Winston logger instance
 *
 * @param config Logger configuration
 * @returns Winston logger instance
 */
export function createLogger(config: LoggerConfig = {}): winston.Logger {
  const {
    level = LogLevel.INFO,
    console = true,
    filePath,
    redactSensitiveData: shouldRedact = true,
    redactionPatterns = DEFAULT_REDACTION_PATTERNS,
    formatter,
  } = config;

  // Create transports
  const transports: winston.transport[] = [];

  // Add console transport if enabled
  if (console) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            // Redact sensitive data if enabled
            const finalMessage = shouldRedact
              ? redactSensitiveData(String(message), redactionPatterns)
              : message;

            // Format metadata
            const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';

            return `${timestamp} [${level}]: ${finalMessage}${metaString}`;
          })
        ),
      })
    );
  }

  // Add file transport if file path is provided
  if (filePath) {
    transports.push(
      new winston.transports.File({
        filename: filePath,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );
  }

  // Create logger
  const logger = winston.createLogger({
    level,
    levels: winston.config.npm.levels,
    format: formatter || winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports,
  });

  return logger;
}

/**
 * Default logger instance
 */
let defaultLogger = createLogger();

/**
 * Configure the default logger
 *
 * @param config Logger configuration
 */
export function configureLogger(config: LoggerConfig): void {
  defaultLogger = createLogger(config);
}

/**
 * Get the default logger instance
 *
 * @returns Default logger instance
 */
export function getLogger(): winston.Logger {
  return defaultLogger;
}

/**
 * Log an error message
 *
 * @param message Error message
 * @param meta Additional metadata
 */
export function error(message: string, meta: Record<string, any> = {}): void {
  defaultLogger.error(message, meta);
}

/**
 * Log a warning message
 *
 * @param message Warning message
 * @param meta Additional metadata
 */
export function warn(message: string, meta: Record<string, any> = {}): void {
  defaultLogger.warn(message, meta);
}

/**
 * Log an info message
 *
 * @param message Info message
 * @param meta Additional metadata
 */
export function info(message: string, meta: Record<string, any> = {}): void {
  defaultLogger.info(message, meta);
}

/**
 * Log an HTTP message
 *
 * @param message HTTP message
 * @param meta Additional metadata
 */
export function http(message: string, meta: Record<string, any> = {}): void {
  defaultLogger.http(message, meta);
}

/**
 * Log a debug message
 *
 * @param message Debug message
 * @param meta Additional metadata
 */
export function debug(message: string, meta: Record<string, any> = {}): void {
  defaultLogger.debug(message, meta);
}

/**
 * Create a child logger with additional metadata
 *
 * @param meta Default metadata to include with all log messages
 * @returns Child logger
 */
export function createChildLogger(meta: Record<string, any>): winston.Logger {
  return defaultLogger.child(meta);
}

/**
 * Create a request logger middleware for HTTP requests
 *
 * @returns Request logger middleware
 */
export function createRequestLogger() {
  return (req: any, res: any, next: () => void) => {
    const start = Date.now();

    // Log request
    http(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;

      http(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  };
}

export default {
  LogLevel,
  configureLogger,
  getLogger,
  createLogger,
  error,
  warn,
  info,
  http,
  debug,
  createChildLogger,
  createRequestLogger,
  redactSensitiveData,
};
