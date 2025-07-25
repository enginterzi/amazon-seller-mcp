/**
 * Resource registration for the Amazon Seller MCP Server
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { handleResourceError } from './error-handler.js';

/**
 * Base resource registration options
 */
export interface ResourceRegistrationOptions {
  /**
   * Resource title
   */
  title: string;

  /**
   * Resource description
   */
  description: string;
}

/**
 * Resource handler function
 */
export type ResourceHandler = (
  uri: URL,
  params: Record<string, string>
) => Promise<{
  contents: Array<{
    uri: string;
    text: string;
    mimeType?: string;
  }>;
}>;

/**
 * Resource completion function
 */
export type ResourceCompletionFunction = (value: string) => Promise<string[]>;

/**
 * Resource completions configuration
 */
export interface ResourceCompletions {
  [param: string]: ResourceCompletionFunction;
}

/**
 * Resource registration manager
 */
export class ResourceRegistrationManager {
  private server: McpServer;
  private registeredResources: Set<string> = new Set();

  /**
   * Creates a new resource registration manager
   * @param server MCP server instance
   */
  constructor(server: McpServer) {
    this.server = server;
  }

  /**
   * Registers a resource with the MCP server
   *
   * @param name Resource name
   * @param template Resource template
   * @param options Resource registration options
   * @param handler Resource handler function
   * @returns True if the resource was registered, false if it was already registered
   */
  registerResource(
    name: string,
    template: ResourceTemplate,
    options: ResourceRegistrationOptions,
    handler: ResourceHandler
  ): boolean {
    // Check if the resource is already registered
    if (this.registeredResources.has(name)) {
      console.warn(`Resource '${name}' is already registered`);
      return false;
    }

    // Register the resource with the MCP server
    this.server.registerResource(
      name,
      template,
      {
        title: options.title,
        description: options.description,
      },
      async (uri, params) => {
        try {
          return await handler(uri, params);
        } catch (error) {
          console.error(`Error handling resource '${name}':`, error);

          // Use the error handler to create a standardized error response
          return handleResourceError(error);
        }
      }
    );

    // Add the resource to the set of registered resources
    this.registeredResources.add(name);
    console.log(`Registered resource '${name}'`);

    return true;
  }

  /**
   * Creates a resource template
   *
   * @param uriTemplate URI template string
   * @param listTemplate Optional list template string
   * @param completions Optional completions configuration
   * @returns Resource template
   */
  createResourceTemplate(
    uriTemplate: string,
    listTemplate?: string,
    completions?: ResourceCompletions
  ): ResourceTemplate {
    const templateOptions: {
      list?: string;
      complete?: Record<string, ResourceCompletionFunction>;
    } = {};

    // Add list template if provided
    if (listTemplate) {
      templateOptions.list = listTemplate;
    }

    // Add completions if provided
    if (completions) {
      templateOptions.complete = completions;
    }

    return new ResourceTemplate(uriTemplate, templateOptions);
  }

  /**
   * Gets the list of registered resource names
   * @returns Array of registered resource names
   */
  getRegisteredResources(): string[] {
    return Array.from(this.registeredResources);
  }

  /**
   * Checks if a resource is registered
   * @param name Resource name
   * @returns True if the resource is registered, false otherwise
   */
  isResourceRegistered(name: string): boolean {
    return this.registeredResources.has(name);
  }
}
