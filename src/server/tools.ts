/**
 * Tool registration for the Amazon Seller MCP Server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { handleToolError } from './error-handler.js';

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
  inputSchema: z.ZodType<any>;
}

/**
 * Tool handler function
 */
export type ToolHandler<T = any> = (input: T) => Promise<{
  content: Array<{
    type: 'text' | 'resource_link';
    text?: string;
    uri?: string;
    name?: string;
    mimeType?: string;
    description?: string;
  }>;
  isError?: boolean;
}>;

/**
 * Tool registration manager
 */
export class ToolRegistrationManager {
  private server: McpServer;
  private registeredTools: Set<string> = new Set();

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
  registerTool<T = any>(
    name: string,
    options: ToolRegistrationOptions,
    handler: ToolHandler<T>
  ): boolean {
    // Check if the tool is already registered
    if (this.registeredTools.has(name)) {
      console.warn(`Tool '${name}' is already registered`);
      return false;
    }

    // Register the tool with the MCP server
    this.server.registerTool(
      name,
      {
        title: options.title,
        description: options.description,
        inputSchema: options.inputSchema,
      },
      async (input) => {
        try {
          return await handler(input);
        } catch (error) {
          console.error(`Error handling tool '${name}':`, error);

          // Use the error handler to create a standardized error response
          return handleToolError(error);
        }
      }
    );

    // Add the tool to the set of registered tools
    this.registeredTools.add(name);
    console.log(`Registered tool '${name}'`);

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
}
