/**
 * Tool registration for the Amazon Seller MCP Server
 */

// Third-party dependencies
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodSchema, ZodRawShape } from 'zod';

// Internal imports
import { handleToolError } from './error-handler.js';
import { warn, error, info } from '../utils/logger.js';

/**
 * JSON Schema definition for tool input validation
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  [key: string]: unknown;
}

/**
 * Tool registration options
 */
export interface ToolRegistrationOptions {
  /**
   * Tool title
   */
  title: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Input schema for the tool
   */
  inputSchema: ZodSchema | ZodRawShape;
}

/**
 * Tool handler function
 */
export type ToolHandler<T = unknown> = (input: T) => Promise<{
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
}>;

/**
 * Tool registration manager
 */
export class ToolRegistrationManager {
  private server: McpServer;
  private registeredTools: Set<string> = new Set();
  private toolHandlers: Map<string, ToolHandler<unknown>> = new Map();

  /**
   * Creates a new tool registration manager
   * @param server MCP server instance
   */
  constructor(server: McpServer) {
    this.server = server;
  }

  /**
   * Registers a tool with the MCP server
   *
   * @param name Tool name
   * @param options Tool registration options
   * @param handler Tool handler function
   * @returns True if the tool was registered, false if it was already registered
   */
  registerTool<T = unknown>(
    name: string,
    options: ToolRegistrationOptions,
    handler: ToolHandler<T>
  ): boolean {
    // Check if the tool is already registered
    if (this.registeredTools.has(name)) {
      warn(`Tool '${name}' is already registered`);
      return false;
    }

    // Register the tool with the MCP server
    this.server.registerTool(
      name,
      {
        title: options.title,
        description: options.description,
        inputSchema: ('shape' in options.inputSchema
          ? options.inputSchema.shape
          : options.inputSchema) as ZodRawShape,
      },
      async (input: unknown) => {
        try {
          const result = await handler(input as T);
          return result;
        } catch (err) {
          error(`Error handling tool '${name}':`, { error: err });

          // Use the error handler to create a standardized error response
          return handleToolError(err);
        }
      }
    );

    // Add the tool to the set of registered tools
    this.registeredTools.add(name);

    // Store the handler for direct access (useful for testing)
    this.toolHandlers.set(name, handler as ToolHandler<unknown>);

    info(`Registered tool '${name}'`);

    return true;
  }

  /**
   * Gets the list of registered tool names
   * @returns Array of registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.registeredTools);
  }

  /**
   * Checks if a tool is registered
   * @param name Tool name
   * @returns True if the tool is registered, false otherwise
   */
  isToolRegistered(name: string): boolean {
    return this.registeredTools.has(name);
  }

  /**
   * Gets a tool handler for direct invocation (primarily for testing)
   * @param name Tool name
   * @returns Tool handler function
   * @throws Error if the tool is not registered
   */
  getToolHandler<T = unknown>(name: string): ToolHandler<T> {
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Tool '${name}' is not registered`);
    }
    return handler as ToolHandler<T>;
  }
}
