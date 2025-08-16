/**
 * Listings tools for Amazon Selling Partner API
 */

// Third-party dependencies
import { z } from 'zod';

// Internal imports
import { ToolRegistrationManager } from '../server/tools.js';
import { ListingsClient, PutListingParams, DeleteListingParams } from '../api/listings-client.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Register listings tools with the tool manager
 *
 * @param toolManager Tool registration manager
 * @param authConfig Authentication configuration
 * @param providedListingsClient Optional listings client to use
 */
export function registerListingsTools(
  toolManager: ToolRegistrationManager,
  authConfig: AuthConfig,
  providedListingsClient?: ListingsClient
): void {
  // Use provided listings client or create a new one
  const listingsClient = providedListingsClient || new ListingsClient(authConfig);

  // Register listing creation tool
  toolManager.registerTool(
    'create-listing',
    {
      title: 'Create Amazon Listing',
      description: 'Create a new product listing on Amazon',
      inputSchema: z.object({
        sku: z.string().describe('Seller SKU for the product'),
        productType: z.string().describe('Amazon product type'),
        attributes: z.record(z.unknown()).describe('Product attributes'),
        requirements: z
          .array(
            z.object({
              type: z.string().describe('Requirement type'),
              value: z.string().describe('Requirement value'),
            })
          )
          .optional()
          .describe('Listing requirements'),
        fulfillmentAvailability: z
          .array(
            z.object({
              fulfillmentChannelCode: z
                .string()
                .describe('Fulfillment channel code (e.g., "AMAZON" or "SELLER")'),
              quantity: z.number().int().min(0).describe('Inventory quantity'),
            })
          )
          .optional()
          .describe('Fulfillment availability'),
      }),
    },
    async (input) => {
      try {
        const params: PutListingParams = {
          sku: input.sku,
          productType: input.productType,
          attributes: input.attributes,
          requirements: input.requirements,
          fulfillmentAvailability: input.fulfillmentAvailability,
        };

        const result = await listingsClient.putListing(params);

        // Format the response
        let responseText = `Listing creation submitted for SKU: ${input.sku}\n\n`;
        responseText += `Submission ID: ${result.submissionId}\n`;
        responseText += `Status: ${result.status}\n\n`;

        if (result.issues && result.issues.length > 0) {
          responseText += 'Issues:\n';
          result.issues.forEach((issue, index) => {
            responseText += `${index + 1}. [${issue.severity}] ${issue.code}: ${issue.message}\n`;
            if (issue.attributeNames && issue.attributeNames.length > 0) {
              responseText += `   Affected attributes: ${issue.attributeNames.join(', ')}\n`;
            }
          });
        } else if (result.status === 'ACCEPTED') {
          responseText += 'The listing was accepted without issues.\n';
          responseText += `Resource URI: amazon-listings://SELLER_ID/${input.sku}\n`;
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
              text: `Error creating listing: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register listing update tool
  toolManager.registerTool(
    'update-listing',
    {
      title: 'Update Amazon Listing',
      description: 'Update an existing product listing on Amazon',
      inputSchema: z.object({
        sku: z.string().describe('Seller SKU for the product'),
        productType: z.string().describe('Amazon product type'),
        attributes: z.record(z.unknown()).describe('Product attributes to update'),
        requirements: z
          .array(
            z.object({
              type: z.string().describe('Requirement type'),
              value: z.string().describe('Requirement value'),
            })
          )
          .optional()
          .describe('Listing requirements'),
        fulfillmentAvailability: z
          .array(
            z.object({
              fulfillmentChannelCode: z
                .string()
                .describe('Fulfillment channel code (e.g., "AMAZON" or "SELLER")'),
              quantity: z.number().int().min(0).describe('Inventory quantity'),
            })
          )
          .optional()
          .describe('Fulfillment availability'),
      }),
    },
    async (input) => {
      try {
        // First, check if the listing exists
        try {
          await listingsClient.getListing(input.sku);
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Listing with SKU ${input.sku} not found. Cannot update a non-existent listing.`,
              },
            ],
            isError: true,
          };
        }

        const params: PutListingParams = {
          sku: input.sku,
          productType: input.productType,
          attributes: input.attributes,
          requirements: input.requirements,
          fulfillmentAvailability: input.fulfillmentAvailability,
        };

        const result = await listingsClient.putListing(params);

        // Format the response
        let responseText = `Listing update submitted for SKU: ${input.sku}\n\n`;
        responseText += `Submission ID: ${result.submissionId}\n`;
        responseText += `Status: ${result.status}\n\n`;

        if (result.issues && result.issues.length > 0) {
          responseText += 'Issues:\n';
          result.issues.forEach((issue, index) => {
            responseText += `${index + 1}. [${issue.severity}] ${issue.code}: ${issue.message}\n`;
            if (issue.attributeNames && issue.attributeNames.length > 0) {
              responseText += `   Affected attributes: ${issue.attributeNames.join(', ')}\n`;
            }
          });
        } else if (result.status === 'ACCEPTED') {
          responseText += 'The listing update was accepted without issues.\n';
          responseText += `Resource URI: amazon-listings://SELLER_ID/${input.sku}\n`;
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
              text: `Error updating listing: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register listing deletion tool
  toolManager.registerTool(
    'delete-listing',
    {
      title: 'Delete Amazon Listing',
      description: 'Delete a product listing from Amazon',
      inputSchema: z.object({
        sku: z.string().describe('Seller SKU for the product to delete'),
        issueLocale: z.string().optional().describe('Locale for issue messages'),
      }),
    },
    async (input) => {
      try {
        const params: DeleteListingParams = {
          sku: input.sku,
          issueLocale: input.issueLocale,
        };

        const result = await listingsClient.deleteListing(params);

        // Format the response
        let responseText = `Listing deletion submitted for SKU: ${input.sku}\n\n`;
        responseText += `Submission ID: ${result.submissionId}\n`;
        responseText += `Status: ${result.status}\n\n`;

        if (result.issues && result.issues.length > 0) {
          responseText += 'Issues:\n';
          result.issues.forEach((issue, index) => {
            responseText += `${index + 1}. [${issue.severity}] ${issue.code}: ${issue.message}\n`;
            if (issue.attributeNames && issue.attributeNames.length > 0) {
              responseText += `   Affected attributes: ${issue.attributeNames.join(', ')}\n`;
            }
          });
        } else if (result.status === 'ACCEPTED') {
          responseText += 'The listing was successfully deleted.\n';
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
              text: `Error deleting listing: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
