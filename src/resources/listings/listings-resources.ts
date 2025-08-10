/**
 * Listings resources for Amazon Selling Partner API
 */

import { ResourceRegistrationManager } from '../../server/resources.js';
import { ListingsClient } from '../../api/listings-client.js';
import { AuthConfig } from '../../types/auth.js';
import { error, info } from '../../utils/logger.js';

/**
 * Register listings resources with the resource manager
 *
 * @param resourceManager Resource registration manager
 * @param authConfig Authentication configuration
 */
export function registerListingsResources(
  resourceManager: ResourceRegistrationManager,
  authConfig: AuthConfig
): void {
  const listingsClient = new ListingsClient(authConfig);

  // Register listings collection resource
  resourceManager.registerResource(
    'amazon-listings',
    resourceManager.createResourceTemplate('amazon-listings://{sku}', 'amazon-listings://', {
      // Completion function for SKU parameter
      sku: async (value: string) => {
        if (!value || value.length < 2) {
          return [];
        }

        try {
          // Get all listings and filter by the partial SKU
          const result = await listingsClient.getListings({
            includedData: ['attributes'],
          });

          // Filter and return matching SKUs
          return result.listings
            .filter((listing) => listing.sku.toLowerCase().includes(value.toLowerCase()))
            .map((listing) => listing.sku)
            .slice(0, 10); // Limit to 10 results
        } catch (err) {
          error('Error completing SKU:', { error: err });
          return [];
        }
      },
    }),
    {
      title: 'Amazon Listings',
      description: 'Manage and view your Amazon product listings',
    },
    async (uri, params) => {
      try {
        const { sku } = params;

        // If SKU is provided, get a specific listing
        if (sku) {
          const listing = await listingsClient.getListing(sku, [
            'attributes',
            'issues',
            'offers',
            'fulfillmentAvailability',
            'procurement',
          ]);

          // Format the response as markdown
          let markdown = `# Amazon Listing: ${sku}\n\n`;

          // Add basic information
          markdown += `## Basic Information\n\n`;
          markdown += `**SKU:** ${listing.sku}\n\n`;
          markdown += `**Status:** ${listing.status}\n\n`;

          // Add identifiers
          markdown += `## Identifiers\n\n`;
          markdown += `**Marketplace ID:** ${listing.identifiers.marketplaceId}\n\n`;
          if (listing.identifiers.asin) {
            markdown += `**ASIN:** [${listing.identifiers.asin}](amazon-catalog://${listing.identifiers.asin})\n\n`;
          }
          markdown += `**Seller ID:** ${listing.identifiers.sellerId}\n\n`;

          // Add attributes if available
          if (listing.attributes && Object.keys(listing.attributes).length > 0) {
            markdown += `## Attributes\n\n`;
            Object.entries(listing.attributes).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                markdown += `**${key}:** ${JSON.stringify(value)}\n\n`;
              } else {
                markdown += `**${key}:** ${value}\n\n`;
              }
            });
          }

          // Add offers if available
          if (listing.offers && listing.offers.length > 0) {
            markdown += `## Offers\n\n`;
            listing.offers.forEach((offer, index) => {
              markdown += `### Offer ${index + 1}\n\n`;
              markdown += `**Price:** ${offer.price.amount} ${offer.price.currencyCode}\n\n`;
              markdown += `**Quantity:** ${offer.quantity}\n\n`;
            });
          }

          // Add fulfillment availability if available
          if (listing.fulfillmentAvailability && listing.fulfillmentAvailability.length > 0) {
            markdown += `## Fulfillment Availability\n\n`;
            listing.fulfillmentAvailability.forEach((availability) => {
              markdown += `- **${availability.fulfillmentChannelCode}:** ${availability.quantity} units\n`;
            });
            markdown += '\n';
          }

          // Add procurement information if available
          if (listing.procurement) {
            markdown += `## Procurement\n\n`;
            if (listing.procurement.costPrice) {
              markdown += `**Cost Price:** ${listing.procurement.costPrice.amount} ${listing.procurement.costPrice.currencyCode}\n\n`;
            }
          }

          // Add issues if available
          if (listing.issues && listing.issues.length > 0) {
            markdown += `## Issues\n\n`;
            listing.issues.forEach((issue, index) => {
              markdown += `### Issue ${index + 1}\n\n`;
              markdown += `**Code:** ${issue.code}\n\n`;
              markdown += `**Severity:** ${issue.severity}\n\n`;
              markdown += `**Message:** ${issue.message}\n\n`;
              if (issue.attributeNames && issue.attributeNames.length > 0) {
                markdown += `**Affected Attributes:** ${issue.attributeNames.join(', ')}\n\n`;
              }
            });
          }

          return {
            contents: [
              {
                uri: `amazon-listings://${sku}`,
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no SKU is provided, list all listings
        else {
          const result = await listingsClient.getListings({
            includedData: ['attributes', 'offers', 'fulfillmentAvailability'],
          });

          // Format the response as markdown
          let markdown = `# Amazon Listings\n\n`;

          if (result.listings.length === 0) {
            markdown += `No listings found.\n`;
          } else {
            markdown += `Found ${result.listings.length} listings\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              markdown += `[Next Page](amazon-listings://?nextToken=${encodeURIComponent(result.nextToken)})\n\n`;
            }

            // Add listings
            markdown += `## Listings\n\n`;
            result.listings.forEach((listing, index) => {
              markdown += `### ${index + 1}. [${listing.sku}](amazon-listings://${listing.sku})\n\n`;

              markdown += `**Status:** ${listing.status}\n\n`;

              if (listing.identifiers.asin) {
                markdown += `**ASIN:** [${listing.identifiers.asin}](amazon-catalog://${listing.identifiers.asin})\n\n`;
              }

              // Add price and quantity if available
              if (listing.offers && listing.offers.length > 0) {
                const offer = listing.offers[0];
                markdown += `**Price:** ${offer.price.amount} ${offer.price.currencyCode}\n\n`;
                markdown += `**Quantity:** ${offer.quantity}\n\n`;
              }

              // Add fulfillment availability if available
              if (listing.fulfillmentAvailability && listing.fulfillmentAvailability.length > 0) {
                markdown += `**Inventory:**\n`;
                listing.fulfillmentAvailability.forEach((availability) => {
                  markdown += `- ${availability.fulfillmentChannelCode}: ${availability.quantity} units\n`;
                });
                markdown += '\n';
              }

              markdown += `[View Details](amazon-listings://${listing.sku})\n\n`;
              markdown += `---\n\n`;
            });
          }

          return {
            contents: [
              {
                uri: 'amazon-listings://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error retrieving listings:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to retrieve listings: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  info('Registered listings resources');
}
