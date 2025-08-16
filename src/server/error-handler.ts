/**
 * Error handling utilities for MCP server
 *
 * This file contains functions for translating errors to MCP error responses
 * and handling errors in MCP tools and resources.
 */

import { AmazonSellerMcpError, translateToMcpErrorResponse } from '../utils/error-handler.js';
import { getLogger } from '../utils/logger.js';

/**
 * Handle an error in an MCP tool
 *
 * @param error Error to handle
 * @returns MCP tool error response
 */
export function handleToolError(error: unknown): {
  content: Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'resource_link';
        uri: string;
        name: string;
        mimeType?: string;
        description?: string;
      }
  >;
  isError: boolean;
  errorDetails?: {
    code: string;
    message: string;
    details?: unknown;
  };
} {
  getLogger().error('Tool error:', {
    error: error instanceof Error ? error.message : String(error),
  });

  // If it's an AmazonSellerMcpError, translate it to an MCP error response
  if (error instanceof AmazonSellerMcpError) {
    return translateToMcpErrorResponse(error);
  }

  // If it's an Error, create a generic error response
  if (error instanceof Error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
      errorDetails: {
        code: 'UNKNOWN_ERROR',
        message: error.message,
      },
    };
  }

  // For other types of errors, create a generic error response
  return {
    content: [
      {
        type: 'text',
        text: `An unknown error occurred: ${String(error)}`,
      },
    ],
    isError: true,
    errorDetails: {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    },
  };
}

/**
 * Handle an error in an MCP resource
 *
 * @param error Error to handle
 * @returns MCP resource error response
 */
export function handleResourceError(error: unknown): {
  contents: Array<{
    uri: string;
    text: string;
    mimeType?: string;
  }>;
} {
  getLogger().error('Resource error:', {
    error: error instanceof Error ? error.message : String(error),
  });

  // Create an error URI
  const errorUri = 'error://amazon-seller-mcp/error';

  // If it's an AmazonSellerMcpError, use its properties
  if (error instanceof AmazonSellerMcpError) {
    return {
      contents: [
        {
          uri: errorUri,
          text: JSON.stringify(
            {
              error: true,
              code: error.code,
              message: error.message,
              details: error.details,
            },
            null,
            2
          ),
          mimeType: 'application/json',
        },
      ],
    };
  }

  // If it's an Error, create a generic error response
  if (error instanceof Error) {
    return {
      contents: [
        {
          uri: errorUri,
          text: JSON.stringify(
            {
              error: true,
              code: 'UNKNOWN_ERROR',
              message: error.message,
            },
            null,
            2
          ),
          mimeType: 'application/json',
        },
      ],
    };
  }

  // For other types of errors, create a generic error response
  return {
    contents: [
      {
        uri: errorUri,
        text: JSON.stringify(
          {
            error: true,
            code: 'UNKNOWN_ERROR',
            message: String(error),
          },
          null,
          2
        ),
        mimeType: 'application/json',
      },
    ],
  };
}

/**
 * Wrap a tool handler with error handling
 *
 * @param handler Tool handler function
 * @returns Wrapped tool handler function
 */
export function wrapToolHandlerWithErrorHandling<T = any>(
  handler: (params: T) => Promise<{
    content: Array<
      | {
          type: 'text';
          text: string;
        }
      | {
          type: 'resource_link';
          uri: string;
          name: string;
          mimeType?: string;
          description?: string;
        }
    >;
    isError?: boolean;
  }>
): (params: T) => Promise<{
  content: Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'resource_link';
        uri: string;
        name: string;
        mimeType?: string;
        description?: string;
      }
  >;
  isError?: boolean;
}> {
  return async (params: T) => {
    try {
      return await handler(params);
    } catch (error) {
      return handleToolError(error);
    }
  };
}

/**
 * Wrap a resource handler with error handling
 *
 * @param handler Resource handler function
 * @returns Wrapped resource handler function
 */
export function wrapResourceHandlerWithErrorHandling(
  handler: (
    uri: URL,
    params: Record<string, string>
  ) => Promise<{
    contents: Array<{
      uri: string;
      text: string;
      mimeType?: string;
    }>;
  }>
): (
  uri: URL,
  params: Record<string, string>
) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
    mimeType?: string;
  }>;
}> {
  return async (uri: URL, params: Record<string, string>) => {
    try {
      return await handler(uri, params);
    } catch (error) {
      return handleResourceError(error);
    }
  };
}
