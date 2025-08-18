/**
 * Common type definitions used across the application
 */

/**
 * Constants for common types
 */
export const COMMON_CONSTANTS = {
  /** JSON-RPC version for MCP requests */
  JSONRPC_VERSION: '2.0' as const,

  /** Default HTTP status codes */
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  } as const,

  /** Common error codes */
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  } as const,

  /** Default retry configuration */
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    shouldRetry: true,
  } as const,
} as const;

/**
 * Utility functions for common types
 */
export const CommonUtils = {
  /**
   * Creates a basic error details object
   */
  createErrorDetails: (code: string, statusCode?: number): ErrorDetails => ({
    code,
    statusCode,
    timestamp: new Date().toISOString(),
  }),

  /**
   * Creates a basic log metadata object
   */
  createLogMetadata: (operation: string, requestId?: string): LogMetadata => ({
    operation,
    requestId,
    timestamp: new Date().toISOString(),
  }),

  /**
   * Creates a basic MCP request body
   */
  createMcpRequest: (method: string, params?: Record<string, unknown>): McpRequestBody => ({
    jsonrpc: COMMON_CONSTANTS.JSONRPC_VERSION,
    method,
    params,
    id: Math.random().toString(36).substring(7),
  }),

  /**
   * Checks if an HTTP status code indicates success
   */
  isSuccessStatus: (statusCode: number): boolean => {
    return statusCode >= 200 && statusCode < 300;
  },

  /**
   * Checks if an HTTP status code indicates a client error
   */
  isClientError: (statusCode: number): boolean => {
    return statusCode >= 400 && statusCode < 500;
  },

  /**
   * Checks if an HTTP status code indicates a server error
   */
  isServerError: (statusCode: number): boolean => {
    return statusCode >= 500 && statusCode < 600;
  },
} as const;

/**
 * Error details for Amazon Seller MCP errors
 */
export interface ErrorDetails {
  /** Error code from Amazon API */
  code?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Request ID for tracking */
  requestId?: string;
  /** Timestamp when error occurred */
  timestamp?: string;
  /** HTTP headers from error response */
  headers?: Record<string, string>;
  /** Additional error context */
  [key: string]: unknown;
}

/**
 * Metadata for logging operations
 */
export interface LogMetadata {
  /** Request ID for correlation */
  requestId?: string;
  /** User ID if available */
  userId?: string;
  /** Operation being performed */
  operation?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** HTTP status code */
  statusCode?: number;
  /** Error code if applicable */
  errorCode?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Request context for error recovery
 */
export interface ErrorRecoveryContext {
  /** Operation function to retry */
  operation?: (() => Promise<unknown>) | string;
  /** Request parameters */
  params?: Record<string, unknown>;
  /** Retry attempt number */
  retryCount?: number;
  /** Maximum retries allowed */
  maxRetries?: number;
  /** Request ID for tracking */
  requestId?: string;
  /** Whether retry should be attempted */
  shouldRetry?: boolean;
  /** API request options */
  options?: Record<string, unknown>;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Tool input validation schema
 */
export interface ToolInput {
  /** Input parameters */
  [key: string]: unknown;
}

/**
 * MCP request body structure
 */
export interface McpRequestBody {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  /** Request method */
  method: string;
  /** Request parameters */
  params?: Record<string, unknown>;
  /** Request ID */
  id?: string | number;
}

/**
 * Event notification data
 */
export interface NotificationData {
  /** Event type */
  type: string;
  /** Event timestamp */
  timestamp: string;
  /** Event payload */
  payload: Record<string, unknown>;
  /** Source of the event */
  source?: string;
}

/**
 * HTTP request object for logging middleware
 */
export interface HttpRequest {
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** Client IP address */
  ip?: string;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
}

/**
 * HTTP response object for logging middleware
 */
export interface HttpResponse {
  /** HTTP status code */
  statusCode: number;
  /** Event listener registration */
  on(event: string, listener: () => void): void;
}
