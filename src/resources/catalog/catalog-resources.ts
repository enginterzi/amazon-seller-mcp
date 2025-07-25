/**
 * Catalog resources for Amazon Selling Partner API
 */

import { ResourceRegistrationManager } from '../../server/resources.js';
import { CatalogClient } from '../../api/catalog-client.js';
import { AuthConfig } from '../../types/auth.js';

/**
 * Register catalog resources with the resource manager
 *
 * @param resourceManager Resource registration manager
 * @param authConfig Authentication configuration
 */
export function registerCatalogResources(
  resourceManager: ResourceRegistrationManager,
  authConfig: AuthConfig
): void {
  const catalogClient = new CatalogClient(authConfig);

  // Register catalog item resource
  resourceManager.registerResource(
    'amazon-catalog',
    resourceManager.createResourceTemplate('amazon-catalog://{asin}', 'amazon-catalog://', {
      // Completion function for ASIN parameter
      asin: async (value: string) => {
        if (!value || value.length < 2) {
          return [];
        }

        try {
          // Search for items matching the partial ASIN
          const result = await catalogClient.searchCatalogItems({
            keywords: value,
            pageSize: 10,
            includedData: ['identifiers', 'summaries'],
          });

          // Return matching ASINs
          return result.items.map((item) => item.asin);
        } catch (error) {
          console.error('Error completing ASIN:', error);
          return [];
        }
      },
    }),
    {
      title: 'Amazon Catalog Item',
      description: 'Retrieve detailed information about a product in the Amazon catalog',
    },
    async (uri, params) => {
      try {
        const { asin } = params;

        if (!asin) {
          throw new Error('ASIN is required');
        }

        // Get catalog item
        const item = await catalogClient.getCatalogItem({
          asin,
          includedData: [
            'attributes',
            'identifiers',
            'images',
            'productTypes',
            'relationships',
            'salesRanks',
            'summaries',
            'variations',
          ],
        });

        // Format the response as markdown
        let markdown = `# Amazon Catalog Item: ${asin}\n\n`;

        // Add summary information
        const summary = item.summaries && item.summaries.length > 0 ? item.summaries[0] : null;
        if (summary) {
          markdown += `## Summary\n\n`;
          if (summary.itemName) markdown += `**Title:** ${summary.itemName}\n\n`;
          if (summary.brandName) markdown += `**Brand:** ${summary.brandName}\n\n`;
          if (summary.manufacturer) markdown += `**Manufacturer:** ${summary.manufacturer}\n\n`;
          if (summary.modelNumber) markdown += `**Model:** ${summary.modelNumber}\n\n`;
          if (summary.colorName) markdown += `**Color:** ${summary.colorName}\n\n`;
        }

        // Add product types
        if (item.productTypes && Object.keys(item.productTypes).length > 0) {
          markdown += `## Product Types\n\n`;
          Object.entries(item.productTypes).forEach(([marketplace, type]) => {
            markdown += `- **${marketplace}:** ${type}\n`;
          });
          markdown += '\n';
        }

        // Add identifiers
        if (item.identifiers && Object.keys(item.identifiers).length > 0) {
          markdown += `## Identifiers\n\n`;
          Object.entries(item.identifiers).forEach(([marketplace, identifiers]) => {
            markdown += `### ${marketplace}\n\n`;
            identifiers.forEach((identifier) => {
              Object.entries(identifier).forEach(([key, value]) => {
                if (key !== 'marketplaceId') {
                  markdown += `- **${key}:** ${value}\n`;
                }
              });
            });
            markdown += '\n';
          });
        }

        // Add sales ranks if available
        if (item.salesRanks && Object.keys(item.salesRanks).length > 0) {
          markdown += `## Sales Ranks\n\n`;
          Object.entries(item.salesRanks).forEach(([marketplace, categories]) => {
            markdown += `### ${marketplace}\n\n`;
            categories.forEach((category) => {
              category.ranks.forEach((rank) => {
                markdown += `- **#${rank.rank}** in ${rank.title}\n`;
              });
            });
            markdown += '\n';
          });
        }

        // Add images if available
        if (item.images && Object.keys(item.images).length > 0) {
          markdown += `## Images\n\n`;
          Object.entries(item.images).forEach(([marketplace, images]) => {
            markdown += `### ${marketplace}\n\n`;
            images.forEach((image, index) => {
              markdown += `- [Image ${index + 1}](${image.link}) (${image.width}x${image.height})\n`;
            });
            markdown += '\n';
          });
        }

        // Add relationships if available
        if (item.relationships && Object.keys(item.relationships).length > 0) {
          markdown += `## Related Products\n\n`;
          Object.entries(item.relationships).forEach(([marketplace, relationships]) => {
            markdown += `### ${marketplace}\n\n`;
            relationships.forEach((relationship) => {
              markdown += `#### ${relationship.type}\n\n`;
              relationship.identifiers.forEach((identifier) => {
                markdown += `- [${identifier.identifier}](amazon-catalog://${identifier.identifier})\n`;
              });
              markdown += '\n';
            });
          });
        }

        // Add attributes if available
        if (item.attributes && Object.keys(item.attributes).length > 0) {
          markdown += `## Attributes\n\n`;
          Object.entries(item.attributes).forEach(([marketplace, attributes]) => {
            markdown += `### ${marketplace}\n\n`;
            Object.entries(attributes).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                markdown += `- **${key}:** ${JSON.stringify(value)}\n`;
              } else {
                markdown += `- **${key}:** ${value}\n`;
              }
            });
            markdown += '\n';
          });
        }

        return {
          contents: [
            {
              uri: `amazon-catalog://${asin}`,
              text: markdown,
              mimeType: 'text/markdown',
            },
          ],
        };
      } catch (error) {
        console.error('Error retrieving catalog item:', error);

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to retrieve catalog item: ${(error as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  // Register catalog search resource
  resourceManager.registerResource(
    'amazon-catalog-search',
    resourceManager.createResourceTemplate(
      'amazon-catalog-search://{query}',
      'amazon-catalog-search://'
    ),
    {
      title: 'Amazon Catalog Search',
      description: 'Search for products in the Amazon catalog',
    },
    async (uri, params) => {
      try {
        const { query } = params;

        if (!query) {
          throw new Error('Search query is required');
        }

        // Search catalog items
        const result = await catalogClient.searchCatalogItems({
          keywords: query,
          includedData: ['identifiers', 'summaries', 'images'],
          pageSize: 20,
        });

        // Format the response as markdown
        let markdown = `# Amazon Catalog Search: "${query}"\n\n`;

        if (result.numberOfResults === 0) {
          markdown += `No results found for "${query}"\n`;
        } else {
          markdown += `Found ${result.numberOfResults} results\n\n`;

          // Add pagination info if available
          if (result.pagination) {
            if (result.pagination.nextToken) {
              markdown += `[Next Page](amazon-catalog-search://${query}?nextToken=${encodeURIComponent(result.pagination.nextToken)})\n\n`;
            }
          }

          // Add refinements if available
          if (result.refinements) {
            if (result.refinements.brands && result.refinements.brands.length > 0) {
              markdown += `## Filter by Brand\n\n`;
              result.refinements.brands.forEach((brand) => {
                markdown += `- [${brand.name}](amazon-catalog-search://${query}?brandName=${encodeURIComponent(brand.name)}) (${brand.numberOfResults} products)\n`;
              });
              markdown += '\n';
            }

            if (
              result.refinements.classifications &&
              result.refinements.classifications.length > 0
            ) {
              markdown += `## Filter by Classification\n\n`;
              result.refinements.classifications.forEach((classification) => {
                markdown += `- [${classification.name}](amazon-catalog-search://${query}?classification=${encodeURIComponent(classification.name)}) (${classification.numberOfResults} products)\n`;
              });
              markdown += '\n';
            }
          }

          // Add items
          markdown += `## Results\n\n`;
          result.items.forEach((item, index) => {
            const summary = item.summaries && item.summaries.length > 0 ? item.summaries[0] : null;

            markdown += `### ${index + 1}. [${summary?.itemName || item.asin}](amazon-catalog://${item.asin})\n\n`;

            if (summary) {
              if (summary.brandName) markdown += `**Brand:** ${summary.brandName}\n\n`;
            }

            // Add image if available
            if (item.images && Object.keys(item.images).length > 0) {
              const firstMarketplace = Object.keys(item.images)[0];
              const images = item.images[firstMarketplace];
              if (images && images.length > 0) {
                markdown += `![Product Image](${images[0].link})\n\n`;
              }
            }

            markdown += `**ASIN:** ${item.asin}\n\n`;
            markdown += `[View Details](amazon-catalog://${item.asin})\n\n`;
            markdown += `---\n\n`;
          });
        }

        return {
          contents: [
            {
              uri: `amazon-catalog-search://${query}`,
              text: markdown,
              mimeType: 'text/markdown',
            },
          ],
        };
      } catch (error) {
        console.error('Error searching catalog:', error);

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to search catalog: ${(error as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  console.log('Registered catalog resources');
}
