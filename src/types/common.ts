/**
 * Common type definitions used across the application
 */

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
  [key: string]: string | number | boolean | undefined;
}

/**
 * Request context for error recovery
 */
export interface ErrorRecoveryContext {
  /** Operation being attempted */
  operation: string;
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
  [key: string]: any;
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
