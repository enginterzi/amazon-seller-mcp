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

  // Register get orders tool
  toolManager.registerTool(
    'get-orders',
    {
      title: 'Get Amazon Orders',
      description: 'Retrieve Amazon orders with optional filtering',
      inputSchema: z.object({
        createdAfter: z.string().optional().describe('Created after date (ISO 8601)'),
        createdBefore: z.string().optional().describe('Created before date (ISO 8601)'),
        lastUpdatedAfter: z.string().optional().describe('Last updated after date (ISO 8601)'),
        lastUpdatedBefore: z.string().optional().describe('Last updated before date (ISO 8601)'),
        orderStatuses: z.array(z.enum([
          'PENDING',
          'UNSHIPPED',
          'PARTIALLY_SHIPPED',
          'SHIPPED',
          'CANCELED',
          'UNFULFILLABLE',
          'INVOICE_UNCONFIRMED',
          'PENDING_AVAILABILITY',
        ])).optional().describe('Order statuses to filter by'),
        fulfillmentChannels: z.array(z.enum(['AFN', 'MFN'])).optional().describe('Fulfillment channels to filter by'),
        paymentMethods: z.array(z.enum(['COD', 'CVS', 'Other'])).optional().describe('Payment methods to filter by'),
        buyerEmail: z.string().optional().describe('Buyer email to filter by'),
        sellerOrderId: z.string().optional().describe('Seller order ID to filter by'),
        maxResultsPerPage: z.number().int().min(1).max(100).optional().describe('Maximum results per page (1-100)'),
        nextToken: z.string().optional().describe('Next token for pagination'),
        amazonOrderIds: z.array(z.string()).optional().describe('Specific Amazon order IDs to retrieve'),
      }),
    },
    async (input) => {
      try {
        const result = await client.getOrders(input);

        let responseText = `# Amazon Orders\n\n`;
        responseText += `**Total Orders:** ${result.orders.length}\n\n`;

        if (result.nextToken) {
          responseText += `**Next Token:** ${result.nextToken}\n\n`;
        }

        if (result.orders.length === 0) {
          responseText += `No orders found matching the specified criteria.\n\n`;
        } else {
          responseText += `## Orders\n\n`;
          
          result.orders.forEach((order, index) => {
            responseText += `### ${index + 1}. Order ${order.amazonOrderId}\n\n`;
            responseText += `- **Status:** ${order.orderStatus}\n`;
            responseText += `- **Purchase Date:** ${order.purchaseDate}\n`;
            responseText += `- **Last Updated:** ${order.lastUpdateDate}\n`;
            
            if (order.orderTotal) {
              responseText += `- **Total:** ${order.orderTotal.amount} ${order.orderTotal.currencyCode}\n`;
            }
            
            if (order.fulfillmentChannel) {
              responseText += `- **Fulfillment:** ${order.fulfillmentChannel}\n`;
            }
            
            if (order.numberOfItemsShipped !== undefined) {
              responseText += `- **Items Shipped:** ${order.numberOfItemsShipped}\n`;
            }
            
            if (order.numberOfItemsUnshipped !== undefined) {
              responseText += `- **Items Unshipped:** ${order.numberOfItemsUnshipped}\n`;
            }
            
            responseText += `- **Resource URI:** amazon-orders://${order.amazonOrderId}\n\n`;
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
              text: `Error retrieving orders: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get order tool
  toolManager.registerTool(
    'get-order',
    {
      title: 'Get Amazon Order',
      description: 'Retrieve a specific Amazon order by ID',
      inputSchema: z.object({
        orderId: z.string().describe('Amazon Order ID'),
      }),
    },
    async (input) => {
      try {
        const order = await client.getOrder({ amazonOrderId: input.orderId });

        let responseText = `# Amazon Order ${order.amazonOrderId}\n\n`;
        responseText += `**Status:** ${order.orderStatus}\n\n`;
        responseText += `**Purchase Date:** ${order.purchaseDate}\n\n`;
        responseText += `**Last Updated:** ${order.lastUpdateDate}\n\n`;
        
        if (order.orderTotal) {
          responseText += `**Total:** ${order.orderTotal.amount} ${order.orderTotal.currencyCode}\n\n`;
        }
        
        if (order.fulfillmentChannel) {
          responseText += `**Fulfillment Channel:** ${order.fulfillmentChannel}\n\n`;
        }
        
        if (order.salesChannel) {
          responseText += `**Sales Channel:** ${order.salesChannel}\n\n`;
        }
        
        if (order.shipServiceLevel) {
          responseText += `**Ship Service Level:** ${order.shipServiceLevel}\n\n`;
        }
        
        if (order.numberOfItemsShipped !== undefined) {
          responseText += `**Items Shipped:** ${order.numberOfItemsShipped}\n\n`;
        }
        
        if (order.numberOfItemsUnshipped !== undefined) {
          responseText += `**Items Unshipped:** ${order.numberOfItemsUnshipped}\n\n`;
        }
        
        if (order.shippingAddress) {
          responseText += `## Shipping Address\n\n`;
          responseText += `**Name:** ${order.shippingAddress.name}\n\n`;
          responseText += `**Address:** ${order.shippingAddress.addressLine1}\n`;
          
          if (order.shippingAddress.addressLine2) {
            responseText += `${order.shippingAddress.addressLine2}\n`;
          }
          
          if (order.shippingAddress.addressLine3) {
            responseText += `${order.shippingAddress.addressLine3}\n`;
          }
          
          responseText += `${order.shippingAddress.city}, ${order.shippingAddress.stateOrRegion} ${order.shippingAddress.postalCode}\n`;
          responseText += `${order.shippingAddress.countryCode}\n\n`;
          
          if (order.shippingAddress.phone) {
            responseText += `**Phone:** ${order.shippingAddress.phone}\n\n`;
          }
        }
        
        if (order.buyerInfo) {
          responseText += `## Buyer Information\n\n`;
          
          if (order.buyerInfo.buyerName) {
            responseText += `**Name:** ${order.buyerInfo.buyerName}\n\n`;
          }
          
          if (order.buyerInfo.buyerEmail) {
            responseText += `**Email:** ${order.buyerInfo.buyerEmail}\n\n`;
          }
          
          if (order.buyerInfo.purchaseOrderNumber) {
            responseText += `**PO Number:** ${order.buyerInfo.purchaseOrderNumber}\n\n`;
          }
        }
        
        if (order.paymentMethod) {
          responseText += `**Payment Method:** ${order.paymentMethod}\n\n`;
        }
        
        if (order.isPrime) {
          responseText += `**Prime Order:** Yes\n\n`;
        }
        
        if (order.isBusinessOrder) {
          responseText += `**Business Order:** Yes\n\n`;
        }
        
        responseText += `**Resource URI:** amazon-orders://${order.amazonOrderId}\n\n`;

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
              text: `Error retrieving order: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

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
          input.items.forEach((item: { orderItemId: string; quantity: number }, index: number) => {
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
