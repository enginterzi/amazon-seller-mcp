/**
 * Resource registration for the Amazon Seller MCP Server
 */

// Third-party dependencies
import {
  McpServer,
  ResourceTemplate,
  ListResourcesCallback,
  CompleteResourceTemplateCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';

// Internal imports
import { handleResourceError } from './error-handler.js';
import { getLogger } from '../utils/logger.js';

/**
 * Resource template options
 */
interface ResourceTemplateOptions {
  list: ListResourcesCallback | undefined;
  complete?: { [variable: string]: CompleteResourceTemplateCallback } | undefined;
  [key: string]: unknown;
}

/**
 * Extended resource template with completion methods
 */
interface ExtendedResourceTemplate extends ResourceTemplate {
  [key: string]: unknown;
}

/**
 * Normalizes MCP parameters to string values
 * Converts string arrays to their first element
 */
function normalizeParams(params: Record<string, string | string[]>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      normalized[key] = value[0] || '';
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

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
      getLogger().warn(`Resource '${name}' is already registered`);
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
          // Normalize params to ensure string values for backward compatibility
          const normalizedParams = normalizeParams(params);
          return await handler(uri, normalizedParams);
        } catch (error) {
          getLogger().error(`Error handling resource '${name}':`, {
            error: (error as Error).message,
          });

          // Use the error handler to create a standardized error response
          return handleResourceError(error);
        }
      }
    );

    // Add the resource to the set of registered resources
    this.registeredResources.add(name);
    getLogger().info(`Registered resource '${name}'`);

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
    const templateOptions: ResourceTemplateOptions = {
      list: undefined,
    };

    // Add list template if provided
    if (listTemplate) {
      // Create a simple list callback that returns the template
      templateOptions.list = () =>
        Promise.resolve({
          resources: [
            {
              uri: listTemplate,
              name: 'Resource List',
              description: 'List of available resources',
            },
          ],
        });
    }

    // Add completions if provided
    if (completions) {
      templateOptions.complete = completions;
    }

    const template = new ResourceTemplate(uriTemplate, templateOptions);

    // Expose completion methods directly on the template for easier testing
    if (completions) {
      const extendedTemplate = template as ExtendedResourceTemplate;
      for (const [key, completionFn] of Object.entries(completions)) {
        extendedTemplate[key] = completionFn;
      }
    }

    return template;
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
