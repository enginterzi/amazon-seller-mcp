/**
 * Inventory tools for Amazon Selling Partner API
 */

// Third-party dependencies
import { z } from 'zod';

// Internal imports
import { ToolRegistrationManager } from '../server/tools.js';
import {
  InventoryClient,
  GetInventoryParams,
  UpdateInventoryParams,
  SetInventoryReplenishmentParams,
} from '../api/inventory-client.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Register inventory tools with the tool manager
 *
 * @param toolManager Tool registration manager
 * @param authConfig Authentication configuration
 * @param providedInventoryClient Optional inventory client to use
 */
export function registerInventoryTools(
  toolManager: ToolRegistrationManager,
  authConfig: AuthConfig,
  providedInventoryClient?: InventoryClient
): void {
  // Use provided inventory client or create a new one
  const inventoryClient = providedInventoryClient || new InventoryClient(authConfig);

  // Register inventory retrieval tool
  toolManager.registerTool(
    'get-inventory',
    {
      title: 'Get Amazon Inventory',
      description: 'Retrieve inventory levels for your Amazon products',
      inputSchema: z.object({
        sellerSkus: z.array(z.string()).optional().describe('List of seller SKUs to filter by'),
        asins: z.array(z.string()).optional().describe('List of ASINs to filter by'),
        fulfillmentChannels: z
          .array(z.enum(['AMAZON', 'SELLER']))
          .optional()
          .describe('List of fulfillment channels to filter by'),
        startDateTime: z
          .string()
          .optional()
          .describe('Filter for items updated after this date-time (ISO format)'),
        endDateTime: z
          .string()
          .optional()
          .describe('Filter for items updated before this date-time (ISO format)'),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of results per page (1-100)'),
        nextToken: z.string().optional().describe('Token for pagination'),
      }),
    },
    async (input) => {
      try {
        const params: GetInventoryParams = {
          sellerSkus: input.sellerSkus,
          asins: input.asins,
          fulfillmentChannels: input.fulfillmentChannels,
          startDateTime: input.startDateTime ? new Date(input.startDateTime) : undefined,
          endDateTime: input.endDateTime ? new Date(input.endDateTime) : undefined,
          pageSize: input.pageSize,
          nextToken: input.nextToken,
        };

        const result = await inventoryClient.getInventory(params);

        // Format the response
        let responseText = `# Amazon Inventory\n\n`;

        if (result.items.length === 0) {
          responseText += `No inventory items found matching the criteria.\n`;
        } else {
          responseText += `Found ${result.items.length} inventory items\n\n`;

          // Add pagination info if available
          if (result.nextToken) {
            responseText += `Next page token: ${result.nextToken}\n\n`;
          }

          // Add inventory items
          responseText += `## Inventory Items\n\n`;

          result.items.forEach((item, index) => {
            responseText += `### ${index + 1}. ${item.sku}\n\n`;

            if (item.asin) {
              responseText += `**ASIN:** ${item.asin}\n\n`;
            }

            if (item.condition) {
              responseText += `**Condition:** ${item.condition}\n\n`;
            }

            // Add inventory levels by fulfillment channel
            responseText += `**Inventory Levels:**\n\n`;

            item.inventoryDetails.forEach((detail) => {
              responseText += `- **${detail.fulfillmentChannelCode}:** ${detail.quantity} units`;

              if (detail.reservedQuantity !== undefined) {
                responseText += ` (${detail.reservedQuantity} reserved)`;
              }

              if (detail.restockDate) {
                responseText += `\n  **Restock Date:** ${new Date(detail.restockDate).toLocaleDateString()}`;
              }

              // Add replenishment settings if available
              if (detail.replenishmentSettings) {
                responseText += `\n  **Replenishment Settings:**`;

                if (detail.replenishmentSettings.restockLevel !== undefined) {
                  responseText += `\n  - Restock Level: ${detail.replenishmentSettings.restockLevel}`;
                }

                if (detail.replenishmentSettings.targetLevel !== undefined) {
                  responseText += `\n  - Target Level: ${detail.replenishmentSettings.targetLevel}`;
                }

                if (detail.replenishmentSettings.maximumLevel !== undefined) {
                  responseText += `\n  - Maximum Level: ${detail.replenishmentSettings.maximumLevel}`;
                }

                if (detail.replenishmentSettings.leadTimeDays !== undefined) {
                  responseText += `\n  - Lead Time: ${detail.replenishmentSettings.leadTimeDays} days`;
                }
              }

              responseText += '\n\n';
            });

            responseText += `**Last Updated:** ${new Date(item.lastUpdatedTime).toLocaleString()}\n\n`;
            responseText += `Resource URI: amazon-inventory://${item.sku}\n\n`;
            responseText += `---\n\n`;
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving inventory: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register inventory update tool
  toolManager.registerTool(
    'update-inventory',
    {
      title: 'Update Amazon Inventory',
      description: 'Update inventory quantity for a product',
      inputSchema: z.object({
        sku: z.string().describe('Seller SKU for the product'),
        quantity: z.number().int().min(0).describe('New inventory quantity'),
        fulfillmentChannel: z.enum(['AMAZON', 'SELLER']).describe('Fulfillment channel'),
        restockDate: z
          .string()
          .optional()
          .describe('Restock date for future inventory (ISO format)'),
      }),
    },
    async (input) => {
      try {
        const params: UpdateInventoryParams = {
          sku: input.sku,
          quantity: input.quantity,
          fulfillmentChannel: input.fulfillmentChannel,
          restockDate: input.restockDate ? new Date(input.restockDate) : undefined,
        };

        const result = await inventoryClient.updateInventory(params);

        // Format the response
        let responseText = `# Inventory Update Result\n\n`;
        responseText += `**SKU:** ${result.sku}\n\n`;
        responseText += `**Fulfillment Channel:** ${result.fulfillmentChannel}\n\n`;
        responseText += `**Status:** ${result.status}\n\n`;

        if (result.status === 'FAILED') {
          responseText += `**Error Code:** ${result.errorCode || 'Unknown'}\n\n`;
          responseText += `**Error Message:** ${result.errorMessage || 'No error message provided'}\n\n`;
        } else {
          responseText += `Successfully updated inventory for SKU ${result.sku} to ${input.quantity} units.\n\n`;
          responseText += `Resource URI: amazon-inventory://${result.sku}\n\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating inventory: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register inventory replenishment settings tool
  toolManager.registerTool(
    'set-inventory-replenishment',
    {
      title: 'Set Inventory Replenishment Settings',
      description: 'Configure inventory replenishment settings for a product',
      inputSchema: z.object({
        sku: z.string().describe('Seller SKU for the product'),
        restockLevel: z
          .number()
          .int()
          .min(0)
          .describe('Restock level (minimum quantity before reordering)'),
        targetLevel: z
          .number()
          .int()
          .min(0)
          .describe('Target level (desired quantity after reordering)'),
        maximumLevel: z.number().int().min(0).optional().describe('Maximum inventory level'),
        leadTimeDays: z.number().int().min(1).optional().describe('Lead time in days'),
      }),
    },
    async (input) => {
      try {
        const params: SetInventoryReplenishmentParams = {
          sku: input.sku,
          restockLevel: input.restockLevel,
          targetLevel: input.targetLevel,
          maximumLevel: input.maximumLevel,
          leadTimeDays: input.leadTimeDays,
        };

        const result = await inventoryClient.setInventoryReplenishment(params);

        // Format the response
        let responseText = `# Inventory Replenishment Settings Result\n\n`;
        responseText += `**SKU:** ${result.sku}\n\n`;
        responseText += `**Status:** ${result.status}\n\n`;

        if (result.status === 'FAILED') {
          responseText += `**Error Code:** ${result.errorCode || 'Unknown'}\n\n`;
          responseText += `**Error Message:** ${result.errorMessage || 'No error message provided'}\n\n`;
        } else {
          responseText += `Successfully updated replenishment settings for SKU ${result.sku}.\n\n`;
          responseText += `**Restock Level:** ${input.restockLevel}\n\n`;
          responseText += `**Target Level:** ${input.targetLevel}\n\n`;

          if (input.maximumLevel !== undefined) {
            responseText += `**Maximum Level:** ${input.maximumLevel}\n\n`;
          }

          if (input.leadTimeDays !== undefined) {
            responseText += `**Lead Time:** ${input.leadTimeDays} days\n\n`;
          }

          responseText += `Resource URI: amazon-inventory://${result.sku}\n\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting inventory replenishment: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
