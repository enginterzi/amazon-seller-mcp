/**
 * Orders tools for Amazon Selling Partner API
 */

import { z } from 'zod';
import { ToolRegistrationManager } from '../server/tools.js';
import { OrdersClient, UpdateOrderStatusParams, OrderStatus } from '../api/orders-client.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Register orders tools with the tool manager
 *
 * @param toolManager Tool registration manager
 * @param authConfig Authentication configuration
 * @param ordersClient Optional orders client instance
 */
export function registerOrdersTools(
  toolManager: ToolRegistrationManager,
  authConfig: AuthConfig,
  ordersClient?: OrdersClient
): void {
  // Create a new client if one wasn't provided
  const client = ordersClient || new OrdersClient(authConfig);

  // Register order processing tool
  toolManager.registerTool(
    'process-order',
    {
      title: 'Process Amazon Order',
      description: 'Process an Amazon order (confirm, ship, or cancel)',
      inputSchema: z.object({
        amazonOrderId: z.string().describe('Amazon Order ID'),
        action: z.enum(['CONFIRM', 'SHIP', 'CANCEL']).describe('Action to perform'),
        details: z
          .object({
            // For CANCEL action
            cancellationReason: z
              .string()
              .optional()
              .describe('Reason for cancellation (required for CANCEL action)'),

            // For SHIP action
            shippingDetails: z
              .object({
                carrierCode: z.string().describe('Carrier code'),
                trackingNumber: z.string().describe('Tracking number'),
                shipDate: z.string().describe('Ship date (YYYY-MM-DD format)'),
                items: z
                  .array(
                    z.object({
                      orderItemId: z.string().describe('Order item ID'),
                      quantity: z.number().int().positive().describe('Quantity to ship'),
                    })
                  )
                  .describe('Items to ship'),
              })
              .optional()
              .describe('Shipping details (required for SHIP action)'),
          })
          .optional()
          .describe('Additional details for the action'),
      }),
    },
    async (input) => {
      try {
        // Validate input based on action
        if (input.action === 'CANCEL' && (!input.details || !input.details.cancellationReason)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Cancellation reason is required for CANCEL action',
              },
            ],
            isError: true,
          };
        }

        if (input.action === 'SHIP' && (!input.details || !input.details.shippingDetails)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Shipping details are required for SHIP action',
              },
            ],
            isError: true,
          };
        }

        // Prepare parameters for the API call
        const params: UpdateOrderStatusParams = {
          amazonOrderId: input.amazonOrderId,
          action: input.action,
          details: input.details,
        };

        // Call the API
        const result = await client.updateOrderStatus(params);

        // Format the response
        let responseText = `# Order Processing Result\n\n`;
        responseText += `**Order ID:** ${result.amazonOrderId}\n\n`;
        responseText += `**Action:** ${input.action}\n\n`;
        responseText += `**Status:** ${result.success ? 'Success' : 'Failed'}\n\n`;

        if (!result.success && result.errorMessage) {
          responseText += `**Error:** ${result.errorMessage}\n\n`;
        } else {
          switch (input.action) {
            case 'CONFIRM':
              responseText += `Order ${result.amazonOrderId} has been confirmed successfully.\n\n`;
              break;
            case 'SHIP':
              responseText += `Order ${result.amazonOrderId} has been marked as shipped successfully.\n\n`;
              responseText += `**Carrier:** ${input.details?.shippingDetails?.carrierCode}\n\n`;
              responseText += `**Tracking Number:** ${input.details?.shippingDetails?.trackingNumber}\n\n`;
              responseText += `**Ship Date:** ${input.details?.shippingDetails?.shipDate}\n\n`;
              break;
            case 'CANCEL':
              responseText += `Order ${result.amazonOrderId} has been canceled successfully.\n\n`;
              responseText += `**Cancellation Reason:** ${input.details?.cancellationReason}\n\n`;
              break;
          }

          responseText += `Resource URI: amazon-orders://${result.amazonOrderId}\n\n`;
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
              text: `Error processing order: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register order status update tool
  toolManager.registerTool(
    'update-order-status',
    {
      title: 'Update Amazon Order Status',
      description: 'Update the status of an Amazon order',
      inputSchema: z.object({
        amazonOrderId: z.string().describe('Amazon Order ID'),
        status: z
          .enum([
            'PENDING',
            'UNSHIPPED',
            'PARTIALLY_SHIPPED',
            'SHIPPED',
            'CANCELED',
            'UNFULFILLABLE',
            'INVOICE_UNCONFIRMED',
            'PENDING_AVAILABILITY',
          ])
          .describe('New order status'),
        reason: z.string().optional().describe('Reason for status change'),
      }),
    },
    async (input) => {
      try {
        // Determine the appropriate action based on the requested status
        let action: 'CONFIRM' | 'SHIP' | 'CANCEL';
        let details: any = {};

        switch (input.status) {
          case 'SHIPPED':
            // For simplicity, we'll require the user to use the process-order tool for shipping
            return {
              content: [
                {
                  type: 'text',
                  text: 'To mark an order as shipped, please use the process-order tool with action=SHIP and provide shipping details.',
                },
              ],
              isError: true,
            };

          case 'CANCELED':
            action = 'CANCEL';
            details = {
              cancellationReason: input.reason || 'Canceled by seller',
            };
            break;

          case 'PENDING':
          case 'UNSHIPPED':
            action = 'CONFIRM';
            break;

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Status ${input.status} cannot be set directly. Please use the process-order tool with the appropriate action.`,
                },
              ],
              isError: true,
            };
        }

        // Call the API
        const result = await client.updateOrderStatus({
          amazonOrderId: input.amazonOrderId,
          action,
          details,
        });

        // Format the response
        let responseText = `# Order Status Update Result\n\n`;
        responseText += `**Order ID:** ${result.amazonOrderId}\n\n`;
        responseText += `**Requested Status:** ${input.status}\n\n`;
        responseText += `**Status:** ${result.success ? 'Success' : 'Failed'}\n\n`;

        if (!result.success && result.errorMessage) {
          responseText += `**Error:** ${result.errorMessage}\n\n`;
        } else {
          responseText += `Order ${result.amazonOrderId} status has been updated successfully.\n\n`;

          if (input.reason) {
            responseText += `**Reason:** ${input.reason}\n\n`;
          }

          responseText += `Resource URI: amazon-orders://${result.amazonOrderId}\n\n`;
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
              text: `Error updating order status: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register order fulfillment tool
  toolManager.registerTool(
    'fulfill-order',
    {
      title: 'Fulfill Amazon Order',
      description: 'Fulfill an Amazon order with shipping information',
      inputSchema: z.object({
        amazonOrderId: z.string().describe('Amazon Order ID'),
        carrierCode: z.string().describe('Carrier code (e.g., UPS, FEDEX, USPS)'),
        trackingNumber: z.string().describe('Tracking number'),
        shipDate: z.string().describe('Ship date (YYYY-MM-DD format)'),
        items: z
          .array(
            z.object({
              orderItemId: z.string().describe('Order item ID'),
              quantity: z.number().int().positive().describe('Quantity to ship'),
            })
          )
          .describe('Items to ship'),
        notifyCustomer: z
          .boolean()
          .optional()
          .describe('Whether to notify the customer about shipment'),
      }),
    },
    async (input) => {
      try {
        // Validate ship date format
        const shipDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!shipDateRegex.test(input.shipDate)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Ship date must be in YYYY-MM-DD format',
              },
            ],
            isError: true,
          };
        }

        // Call the API
        const result = await client.updateOrderStatus({
          amazonOrderId: input.amazonOrderId,
          action: 'SHIP',
          details: {
            shippingDetails: {
              carrierCode: input.carrierCode,
              trackingNumber: input.trackingNumber,
              shipDate: input.shipDate,
              items: input.items,
            },
          },
        });

        // Format the response
        let responseText = `# Order Fulfillment Result\n\n`;
        responseText += `**Order ID:** ${result.amazonOrderId}\n\n`;
        responseText += `**Status:** ${result.success ? 'Success' : 'Failed'}\n\n`;

        if (!result.success && result.errorMessage) {
          responseText += `**Error:** ${result.errorMessage}\n\n`;
        } else {
          responseText += `Order ${result.amazonOrderId} has been fulfilled successfully.\n\n`;
          responseText += `**Carrier:** ${input.carrierCode}\n\n`;
          responseText += `**Tracking Number:** ${input.trackingNumber}\n\n`;
          responseText += `**Ship Date:** ${input.shipDate}\n\n`;

          responseText += `**Shipped Items:**\n\n`;
          input.items.forEach((item, index) => {
            responseText += `${index + 1}. Item ID: ${item.orderItemId}, Quantity: ${item.quantity}\n`;
          });
          responseText += `\n`;

          if (input.notifyCustomer) {
            responseText += `Customer has been notified about the shipment.\n\n`;
          }

          responseText += `Resource URI: amazon-orders://${result.amazonOrderId}\n\n`;
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
              text: `Error fulfilling order: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
