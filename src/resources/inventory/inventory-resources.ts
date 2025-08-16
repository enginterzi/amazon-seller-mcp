/**
 * Inventory resources for Amazon Selling Partner API
 */

import { ResourceRegistrationManager } from '../../server/resources.js';
import { InventoryClient } from '../../api/inventory-client.js';
import { AuthConfig } from '../../types/auth.js';
import { error, info } from '../../utils/logger.js';

/**
 * Register inventory resources with the resource manager
 *
 * @param resourceManager Resource registration manager
 * @param authConfig Authentication configuration
 */
export function registerInventoryResources(
  resourceManager: ResourceRegistrationManager,
  authConfig: AuthConfig
): void {
  const inventoryClient = new InventoryClient(authConfig);

  // Register inventory collection resource
  const inventoryTemplate = resourceManager.createResourceTemplate(
    'amazon-inventory://{sku}',
    'amazon-inventory://',
    {
      // Completion function for SKU parameter
      sku: async (value: string) => {
        if (!value || value.length < 2) {
          return [];
        }

        try {
          // Get all inventory items and filter by the partial SKU
          const result = await inventoryClient.getInventory();

          // Filter and return matching SKUs
          return result.items
            .filter((item) => item.sku.toLowerCase().includes(value.toLowerCase()))
            .map((item) => item.sku)
            .slice(0, 10); // Limit to 10 results
        } catch (err) {
          error('Error completing SKU:', { error: err });
          return [];
        }
      },
    }
  );

  resourceManager.registerResource(
    'amazon-inventory',
    inventoryTemplate,
    {
      title: 'Amazon Inventory',
      description: 'Manage and view your Amazon inventory levels',
    },
    async (uri, params) => {
      try {
        const { sku } = params;

        // If SKU is provided, get a specific inventory item
        if (sku) {
          const inventoryItem = await inventoryClient.getInventoryBySku(sku);

          // Format the response as markdown
          let markdown = `# Amazon Inventory: ${sku}\n\n`;

          // Add basic information
          markdown += `## Basic Information\n\n`;
          markdown += `**SKU:** ${inventoryItem.sku}\n\n`;

          if (inventoryItem.asin) {
            markdown += `**ASIN:** [${inventoryItem.asin}](amazon-catalog://${inventoryItem.asin})\n\n`;
          }

          if (inventoryItem.condition) {
            markdown += `**Condition:** ${inventoryItem.condition}\n\n`;
          }

          markdown += `**Last Updated:** ${new Date(inventoryItem.lastUpdatedTime).toLocaleString()}\n\n`;

          // Add inventory details
          markdown += `## Inventory Details\n\n`;

          inventoryItem.inventoryDetails.forEach((detail) => {
            markdown += `### ${detail.fulfillmentChannelCode} Fulfillment\n\n`;
            markdown += `**Available Quantity:** ${detail.quantity}\n\n`;

            if (detail.reservedQuantity !== undefined) {
              markdown += `**Reserved Quantity:** ${detail.reservedQuantity}\n\n`;
            }

            if (detail.restockDate) {
              markdown += `**Restock Date:** ${new Date(detail.restockDate).toLocaleDateString()}\n\n`;
            }

            // Add replenishment settings if available
            if (detail.replenishmentSettings) {
              markdown += `#### Replenishment Settings\n\n`;

              if (detail.replenishmentSettings.restockLevel !== undefined) {
                markdown += `**Restock Level:** ${detail.replenishmentSettings.restockLevel}\n\n`;
              }

              if (detail.replenishmentSettings.targetLevel !== undefined) {
                markdown += `**Target Level:** ${detail.replenishmentSettings.targetLevel}\n\n`;
              }

              if (detail.replenishmentSettings.maximumLevel !== undefined) {
                markdown += `**Maximum Level:** ${detail.replenishmentSettings.maximumLevel}\n\n`;
              }

              if (detail.replenishmentSettings.leadTimeDays !== undefined) {
                markdown += `**Lead Time:** ${detail.replenishmentSettings.leadTimeDays} days\n\n`;
              }
            }
          });

          return {
            contents: [
              {
                uri: `amazon-inventory://${sku}`,
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no SKU is provided, list all inventory items
        else {
          // Get query parameters from the URI
          const url = new URL(uri.toString());
          const fulfillmentChannels = url.searchParams.get('fulfillmentChannels')?.split(',') as
            | Array<'AMAZON' | 'SELLER'>
            | undefined;
          const nextToken = url.searchParams.get('nextToken') || undefined;

          // Get inventory with optional filters
          const result = await inventoryClient.getInventory({
            fulfillmentChannels,
            nextToken,
          });

          // Format the response as markdown
          let markdown = `# Amazon Inventory\n\n`;

          if (result.items.length === 0) {
            markdown += `No inventory items found.\n`;
          } else {
            markdown += `Found ${result.items.length} inventory items\n\n`;

            // Add filtering options
            markdown += `## Filter Options\n\n`;
            markdown += `- [All Inventory](amazon-inventory://)\n`;
            markdown += `- [Amazon Fulfilled](amazon-inventory://?fulfillmentChannels=AMAZON)\n`;
            markdown += `- [Seller Fulfilled](amazon-inventory://?fulfillmentChannels=SELLER)\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              const nextPageUrl = new URL(uri.toString());
              nextPageUrl.searchParams.set('nextToken', result.nextToken);
              markdown += `[Next Page](${nextPageUrl.toString()})\n\n`;
            }

            // Add inventory items
            markdown += `## Inventory Items\n\n`;

            result.items.forEach((item, index) => {
              markdown += `### ${index + 1}. [${item.sku}](amazon-inventory://${item.sku})\n\n`;

              if (item.asin) {
                markdown += `**ASIN:** [${item.asin}](amazon-catalog://${item.asin})\n\n`;
              }

              if (item.condition) {
                markdown += `**Condition:** ${item.condition}\n\n`;
              }

              // Add inventory levels by fulfillment channel
              markdown += `**Inventory Levels:**\n`;

              item.inventoryDetails.forEach((detail) => {
                markdown += `- ${detail.fulfillmentChannelCode}: ${detail.quantity} units`;

                if (detail.reservedQuantity !== undefined) {
                  markdown += ` (${detail.reservedQuantity} reserved)`;
                }

                if (detail.restockDate) {
                  markdown += ` - Restock Date: ${new Date(detail.restockDate).toLocaleDateString()}`;
                }

                markdown += '\n';
              });

              markdown += `\n**Last Updated:** ${new Date(item.lastUpdatedTime).toLocaleString()}\n\n`;
              markdown += `[View Details](amazon-inventory://${item.sku})\n\n`;
              markdown += `---\n\n`;
            });
          }

          return {
            contents: [
              {
                uri: 'amazon-inventory://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error retrieving inventory:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to retrieve inventory: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  // Register inventory filter resource
  const inventoryFilterTemplate = resourceManager.createResourceTemplate(
    'amazon-inventory-filter://{filter}',
    'amazon-inventory-filter://'
  );

  resourceManager.registerResource(
    'amazon-inventory-filter',
    inventoryFilterTemplate,
    {
      title: 'Amazon Inventory Filter',
      description: 'Filter and view your Amazon inventory by various criteria',
    },
    async (uri, params) => {
      try {
        const { filter } = params;

        // Parse the filter string to determine the filter type and value
        let filterType: string;
        let filterValue: string;

        // Handle URL-encoded filter parameter from the URI path
        let filterParam = filter;
        if (!filterParam) {
          // Extract filter from URI path if not in params
          const pathParts = uri.pathname.split('/').filter((part) => part);
          if (pathParts.length > 0) {
            filterParam = decodeURIComponent(pathParts[pathParts.length - 1]);
          }
        }

        if (filterParam && filterParam.includes(':')) {
          [filterType, filterValue] = filterParam.split(':', 2);
        } else {
          // Default to showing filter options
          filterType = '';
          filterValue = '';
        }

        // If a specific filter is provided
        if (filterType && filterValue) {
          // Get query parameters from the URI
          const url = new URL(uri.toString());
          const nextToken = url.searchParams.get('nextToken') || undefined;

          // Prepare filter parameters
          const filterParams: Record<string, unknown> = { nextToken };

          // Apply the appropriate filter
          switch (filterType.toLowerCase()) {
            case 'sku':
              filterParams.sellerSkus = [filterValue];
              break;
            case 'asin':
              filterParams.asins = [filterValue];
              break;
            case 'channel':
              if (['AMAZON', 'SELLER'].includes(filterValue.toUpperCase())) {
                filterParams.fulfillmentChannels = [filterValue.toUpperCase()];
              }
              break;
            case 'date':
              // Format should be YYYY-MM-DD
              try {
                const date = new Date(filterValue);
                if (isNaN(date.getTime())) {
                  throw new Error(`Invalid date format. Use YYYY-MM-DD.`);
                }
                filterParams.startDateTime = new Date(date.setHours(0, 0, 0, 0));
                filterParams.endDateTime = new Date(date.setHours(23, 59, 59, 999));
              } catch {
                throw new Error(`Invalid date format. Use YYYY-MM-DD.`);
              }
              break;
            default:
              throw new Error(`Unknown filter type: ${filterType}`);
          }

          // Get filtered inventory
          const result = await inventoryClient.getInventory(filterParams);

          // Format the response as markdown
          let markdown = `# Amazon Inventory: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Filter - ${filterValue}\n\n`;

          if (result.items.length === 0) {
            markdown += `No inventory items found matching the filter.\n`;
          } else {
            markdown += `Found ${result.items.length} inventory items\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              const nextPageUrl = new URL(uri.toString());
              nextPageUrl.searchParams.set('nextToken', result.nextToken);
              markdown += `[Next Page](${nextPageUrl.toString()})\n\n`;
            }

            // Add inventory items
            markdown += `## Inventory Items\n\n`;

            result.items.forEach((item, index) => {
              markdown += `### ${index + 1}. [${item.sku}](amazon-inventory://${item.sku})\n\n`;

              if (item.asin) {
                markdown += `**ASIN:** [${item.asin}](amazon-catalog://${item.asin})\n\n`;
              }

              // Add inventory levels by fulfillment channel
              markdown += `**Inventory Levels:**\n`;

              item.inventoryDetails.forEach((detail) => {
                markdown += `- ${detail.fulfillmentChannelCode}: ${detail.quantity} units`;

                if (detail.reservedQuantity !== undefined) {
                  markdown += ` (${detail.reservedQuantity} reserved)`;
                }

                markdown += '\n';
              });

              markdown += `\n**Last Updated:** ${new Date(item.lastUpdatedTime).toLocaleString()}\n\n`;
              markdown += `[View Details](amazon-inventory://${item.sku})\n\n`;
              markdown += `---\n\n`;
            });
          }

          return {
            contents: [
              {
                uri: `amazon-inventory-filter://${encodeURIComponent(filterType + ':' + filterValue)}`,
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no specific filter is provided, show filter options
        else {
          // Format the response as markdown
          let markdown = `# Amazon Inventory Filters\n\n`;
          markdown += `Use these filters to narrow down your inventory view:\n\n`;

          markdown += `## Filter by SKU\n\n`;
          markdown += `Enter a SKU to filter by: [amazon-inventory-filter://sku:YOUR_SKU]\n\n`;

          markdown += `## Filter by ASIN\n\n`;
          markdown += `Enter an ASIN to filter by: [amazon-inventory-filter://asin:YOUR_ASIN]\n\n`;

          markdown += `## Filter by Fulfillment Channel\n\n`;
          markdown += `- [Amazon Fulfilled](amazon-inventory-filter://channel:AMAZON)\n`;
          markdown += `- [Seller Fulfilled](amazon-inventory-filter://channel:SELLER)\n\n`;

          markdown += `## Filter by Update Date\n\n`;
          markdown += `Enter a date (YYYY-MM-DD) to filter by: [amazon-inventory-filter://date:YYYY-MM-DD]\n\n`;

          markdown += `## View All Inventory\n\n`;
          markdown += `- [View All Inventory](amazon-inventory://)\n`;

          return {
            contents: [
              {
                uri: 'amazon-inventory-filter://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error filtering inventory:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to filter inventory: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  info('Registered inventory resources');
}
