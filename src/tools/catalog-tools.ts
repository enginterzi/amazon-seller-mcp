/**
 * Catalog tools for Amazon Selling Partner API
 */

import { z } from 'zod';
import { ToolRegistrationManager } from '../server/tools.js';
import {
  CatalogClient,
  SearchCatalogItemsParams,
  GetCatalogItemParams,
} from '../api/catalog-client.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Register catalog tools with the tool manager
 *
 * @param toolManager Tool registration manager
 * @param authConfig Authentication configuration
 */
export function registerCatalogTools(
  toolManager: ToolRegistrationManager,
  authConfig: AuthConfig
): void {
  const catalogClient = new CatalogClient(authConfig);

  // Register search catalog tool
  toolManager.registerTool(
    'search-catalog',
    {
      title: 'Search Amazon Catalog',
      description: 'Search for products in the Amazon catalog',
      inputSchema: z.object({
        keywords: z.string().describe('Search keywords'),
        brandNames: z.array(z.string()).optional().describe('List of brand names to filter by'),
        pageSize: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe('Number of results per page (1-20)'),
        pageToken: z.string().optional().describe('Token for pagination'),
        includedData: z
          .array(
            z.enum([
              'attributes',
              'identifiers',
              'images',
              'productTypes',
              'relationships',
              'salesRanks',
              'summaries',
              'variations',
            ])
          )
          .optional()
          .describe('Data to include in the response'),
        locale: z.string().optional().describe('Locale for localized fields'),
      }),
    },
    async (input) => {
      try {
        const params: SearchCatalogItemsParams = {
          keywords: input.keywords,
          brandNames: input.brandNames,
          pageSize: input.pageSize,
          pageToken: input.pageToken,
          includedData: input.includedData,
          locale: input.locale,
        };

        const result = await catalogClient.searchCatalogItems(params);

        // Format the response
        let responseText = `Found ${result.numberOfResults} products matching "${input.keywords}"\n\n`;

        // Add pagination info if available
        if (result.pagination) {
          if (result.pagination.nextToken) {
            responseText += `Next page token: ${result.pagination.nextToken}\n`;
          }
          if (result.pagination.previousToken) {
            responseText += `Previous page token: ${result.pagination.previousToken}\n`;
          }
          responseText += '\n';
        }

        // Add refinements if available
        if (result.refinements) {
          if (result.refinements.brands && result.refinements.brands.length > 0) {
            responseText += 'Available brand filters:\n';
            result.refinements.brands.forEach((brand) => {
              responseText += `- ${brand.name} (${brand.numberOfResults} products)\n`;
            });
            responseText += '\n';
          }

          if (result.refinements.classifications && result.refinements.classifications.length > 0) {
            responseText += 'Available classification filters:\n';
            result.refinements.classifications.forEach((classification) => {
              responseText += `- ${classification.name} (${classification.numberOfResults} products)\n`;
            });
            responseText += '\n';
          }
        }

        // Add items
        responseText += 'Products:\n';
        result.items.forEach((item, index) => {
          const summary = item.summaries && item.summaries.length > 0 ? item.summaries[0] : null;

          responseText += `${index + 1}. ASIN: ${item.asin}\n`;
          if (summary) {
            if (summary.itemName) responseText += `   Title: ${summary.itemName}\n`;
            if (summary.brandName) responseText += `   Brand: ${summary.brandName}\n`;
          }
          responseText += `   Resource URI: amazon-catalog://${item.asin}\n\n`;
        });

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
              text: `Error searching catalog: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register catalog item retrieval tool
  toolManager.registerTool(
    'get-catalog-item',
    {
      title: 'Get Amazon Catalog Item',
      description: 'Retrieve detailed information about a product in the Amazon catalog',
      inputSchema: z.object({
        asin: z.string().describe('Amazon Standard Identification Number (ASIN)'),
        includedData: z
          .array(
            z.enum([
              'attributes',
              'identifiers',
              'images',
              'productTypes',
              'relationships',
              'salesRanks',
              'summaries',
              'variations',
            ])
          )
          .optional()
          .describe('Data to include in the response'),
        locale: z.string().optional().describe('Locale for localized fields'),
      }),
    },
    async (input) => {
      try {
        const params: GetCatalogItemParams = {
          asin: input.asin,
          includedData: input.includedData,
          locale: input.locale,
        };

        const item = await catalogClient.getCatalogItem(params);

        // Format the response
        let responseText = `Catalog Item: ${input.asin}\n\n`;

        // Add summary information
        const summary = item.summaries && item.summaries.length > 0 ? item.summaries[0] : null;
        if (summary) {
          if (summary.itemName) responseText += `Title: ${summary.itemName}\n`;
          if (summary.brandName) responseText += `Brand: ${summary.brandName}\n`;
          if (summary.manufacturer) responseText += `Manufacturer: ${summary.manufacturer}\n`;
          if (summary.modelNumber) responseText += `Model: ${summary.modelNumber}\n`;
          if (summary.colorName) responseText += `Color: ${summary.colorName}\n`;
          responseText += '\n';
        }

        // Add product types
        if (item.productTypes) {
          responseText += 'Product Types:\n';
          Object.entries(item.productTypes).forEach(([marketplace, type]) => {
            responseText += `- ${marketplace}: ${type}\n`;
          });
          responseText += '\n';
        }

        // Add sales ranks if available
        if (item.salesRanks) {
          responseText += 'Sales Ranks:\n';
          Object.entries(item.salesRanks).forEach(([category, ranks]) => {
            responseText += `- ${category}:\n`;
            ranks.forEach((rank) => {
              responseText += `  - #${rank.rank} in ${rank.title}\n`;
            });
          });
          responseText += '\n';
        }

        // Add images if available
        if (item.images) {
          responseText += 'Images:\n';
          Object.entries(item.images).forEach(([marketplace, images]) => {
            responseText += `- ${marketplace}:\n`;
            images.forEach((image, index) => {
              responseText += `  - Image ${index + 1}: ${image.width}x${image.height} - ${image.link}\n`;
            });
          });
          responseText += '\n';
        }

        // Add link to resource
        responseText += `Resource URI: amazon-catalog://${item.asin}\n`;

        // Add full JSON data
        responseText += '\nFull Item Data:\n```json\n';
        responseText += JSON.stringify(item, null, 2);
        responseText += '\n```\n';

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
              text: `Error retrieving catalog item: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
