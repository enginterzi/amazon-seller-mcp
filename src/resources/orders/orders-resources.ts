/**
 * Orders resources for Amazon Selling Partner API
 */

import { ResourceRegistrationManager } from '../../server/resources.js';
import { OrdersClient } from '../../api/orders-client.js';
import { AuthConfig } from '../../types/auth.js';
import { error, info, warn } from '../../utils/logger.js';

/**
 * Register orders resources with the resource manager
 *
 * @param resourceManager Resource registration manager
 * @param authConfig Authentication configuration
 */
export function registerOrdersResources(
  resourceManager: ResourceRegistrationManager,
  authConfig: AuthConfig
): void {
  const ordersClient = new OrdersClient(authConfig);

  // Register orders collection resource
  resourceManager.registerResource(
    'amazon-orders',
    resourceManager.createResourceTemplate('amazon-orders://{amazonOrderId}', 'amazon-orders://', {
      // Completion function for amazonOrderId parameter
      amazonOrderId: async (value: string) => {
        if (!value || value.length < 3) {
          return [];
        }

        try {
          // Get all orders and filter by the partial order ID
          const result = await ordersClient.getOrders();

          // Filter and return matching order IDs
          return result.orders
            .filter((order) => order.amazonOrderId.toLowerCase().includes(value.toLowerCase()))
            .map((order) => order.amazonOrderId)
            .slice(0, 10); // Limit to 10 results
        } catch (err) {
          error('Error completing Amazon Order ID:', { error: err });
          return [];
        }
      },
    }),
    {
      title: 'Amazon Orders',
      description: 'View and manage your Amazon orders',
    },
    async (uri, params) => {
      try {
        const { amazonOrderId } = params;

        // If amazonOrderId is provided, get a specific order
        if (amazonOrderId) {
          const order = await ordersClient.getOrder({ amazonOrderId });
          const orderItems = await ordersClient.getOrderItems({ amazonOrderId });

          // Format the response as markdown
          let markdown = `# Amazon Order: ${amazonOrderId}\n\n`;

          // Add basic information
          markdown += `## Order Information\n\n`;
          markdown += `**Order ID:** ${order.amazonOrderId}\n\n`;

          if (order.sellerOrderId) {
            markdown += `**Seller Order ID:** ${order.sellerOrderId}\n\n`;
          }

          markdown += `**Purchase Date:** ${new Date(order.purchaseDate).toLocaleString()}\n\n`;
          markdown += `**Last Updated:** ${new Date(order.lastUpdateDate).toLocaleString()}\n\n`;
          markdown += `**Order Status:** ${order.orderStatus}\n\n`;

          if (order.fulfillmentChannel) {
            markdown += `**Fulfillment Channel:** ${order.fulfillmentChannel}\n\n`;
          }

          if (order.salesChannel) {
            markdown += `**Sales Channel:** ${order.salesChannel}\n\n`;
          }

          if (order.orderTotal) {
            markdown += `**Order Total:** ${order.orderTotal.amount} ${order.orderTotal.currencyCode}\n\n`;
          }

          if (order.shipmentServiceLevelCategory) {
            markdown += `**Shipment Service Level:** ${order.shipmentServiceLevelCategory}\n\n`;
          }

          // Add shipping information if available
          if (order.shippingAddress) {
            markdown += `## Shipping Information\n\n`;
            markdown += `**Name:** ${order.shippingAddress.name}\n\n`;
            markdown += `**Address:** ${order.shippingAddress.addressLine1}`;

            if (order.shippingAddress.addressLine2) {
              markdown += `, ${order.shippingAddress.addressLine2}`;
            }

            if (order.shippingAddress.addressLine3) {
              markdown += `, ${order.shippingAddress.addressLine3}`;
            }

            markdown += `\n\n`;
            markdown += `**City:** ${order.shippingAddress.city}\n\n`;
            markdown += `**State/Region:** ${order.shippingAddress.stateOrRegion}\n\n`;
            markdown += `**Postal Code:** ${order.shippingAddress.postalCode}\n\n`;
            markdown += `**Country:** ${order.shippingAddress.countryCode}\n\n`;

            if (order.shippingAddress.phone) {
              markdown += `**Phone:** ${order.shippingAddress.phone}\n\n`;
            }
          }

          // Add buyer information if available
          if (order.buyerInfo) {
            markdown += `## Buyer Information\n\n`;

            if (order.buyerInfo.buyerName) {
              markdown += `**Name:** ${order.buyerInfo.buyerName}\n\n`;
            }

            if (order.buyerInfo.buyerEmail) {
              markdown += `**Email:** ${order.buyerInfo.buyerEmail}\n\n`;
            }

            if (order.buyerInfo.buyerCounty) {
              markdown += `**County:** ${order.buyerInfo.buyerCounty}\n\n`;
            }

            if (order.buyerInfo.purchaseOrderNumber) {
              markdown += `**Purchase Order Number:** ${order.buyerInfo.purchaseOrderNumber}\n\n`;
            }
          }

          // Add order items
          markdown += `## Order Items\n\n`;

          if (orderItems.orderItems.length === 0) {
            markdown += `No items found for this order.\n\n`;
          } else {
            orderItems.orderItems.forEach((item, index) => {
              markdown += `### ${index + 1}. ${item.title}\n\n`;

              if (item.asin) {
                markdown += `**ASIN:** [${item.asin}](amazon-catalog://${item.asin})\n\n`;
              }

              if (item.sellerSku) {
                markdown += `**SKU:** [${item.sellerSku}](amazon-inventory://${item.sellerSku})\n\n`;
              }

              markdown += `**Quantity Ordered:** ${item.quantityOrdered}\n\n`;

              if (item.quantityShipped !== undefined) {
                markdown += `**Quantity Shipped:** ${item.quantityShipped}\n\n`;
              }

              if (item.itemPrice) {
                markdown += `**Item Price:** ${item.itemPrice.amount} ${item.itemPrice.currencyCode}\n\n`;
              }

              if (item.shippingPrice) {
                markdown += `**Shipping Price:** ${item.shippingPrice.amount} ${item.shippingPrice.currencyCode}\n\n`;
              }

              if (item.itemTax) {
                markdown += `**Item Tax:** ${item.itemTax.amount} ${item.itemTax.currencyCode}\n\n`;
              }

              if (item.shippingTax) {
                markdown += `**Shipping Tax:** ${item.shippingTax.amount} ${item.shippingTax.currencyCode}\n\n`;
              }

              if (item.promotionDiscount) {
                markdown += `**Promotion Discount:** ${item.promotionDiscount.amount} ${item.promotionDiscount.currencyCode}\n\n`;
              }

              markdown += `---\n\n`;
            });
          }

          // Add fulfillment information if available
          try {
            const fulfillment = await ordersClient.getOrderFulfillment({ amazonOrderId });

            if (fulfillment.fulfillmentShipments && fulfillment.fulfillmentShipments.length > 0) {
              markdown += `## Fulfillment Information\n\n`;

              fulfillment.fulfillmentShipments.forEach((shipment, index) => {
                markdown += `### Shipment ${index + 1}\n\n`;
                markdown += `**Amazon Shipment ID:** ${shipment.amazonShipmentId}\n\n`;

                if (shipment.fulfillmentCenterId) {
                  markdown += `**Fulfillment Center ID:** ${shipment.fulfillmentCenterId}\n\n`;
                }

                if (shipment.fulfillmentShipmentStatus) {
                  markdown += `**Status:** ${shipment.fulfillmentShipmentStatus}\n\n`;
                }

                if (shipment.shippingDate) {
                  markdown += `**Shipping Date:** ${new Date(shipment.shippingDate).toLocaleString()}\n\n`;
                }

                if (shipment.estimatedArrivalDate) {
                  markdown += `**Estimated Arrival:** ${new Date(shipment.estimatedArrivalDate).toLocaleString()}\n\n`;
                }

                if (shipment.shippingNotes && shipment.shippingNotes.length > 0) {
                  markdown += `**Shipping Notes:**\n\n`;
                  shipment.shippingNotes.forEach((note) => {
                    markdown += `- ${note}\n`;
                  });
                  markdown += `\n`;
                }

                markdown += `**Items:**\n\n`;

                shipment.fulfillmentShipmentItem.forEach((item, itemIndex) => {
                  markdown += `${itemIndex + 1}. **${item.sellerSKU}** - Quantity: ${item.quantityShipped}\n`;
                });

                markdown += `\n`;
              });
            }
          } catch (err) {
            // Fulfillment information is optional, so we'll just skip it if there's an error
            warn(`Could not retrieve fulfillment information for order ${amazonOrderId}:`, {
              error: err,
            });
          }

          // Add actions section
          markdown += `## Actions\n\n`;
          markdown += `- [Confirm Order](amazon-order-action://${amazonOrderId}/confirm)\n`;
          markdown += `- [Ship Order](amazon-order-action://${amazonOrderId}/ship)\n`;
          markdown += `- [Cancel Order](amazon-order-action://${amazonOrderId}/cancel)\n\n`;

          return {
            contents: [
              {
                uri: `amazon-orders://${amazonOrderId}`,
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no amazonOrderId is provided, list all orders
        else {
          // Get query parameters from the URI
          const url = new URL(uri.toString());
          const orderStatuses = url.searchParams.get('orderStatuses')?.split(',') as
            | Array<
                | 'PENDING'
                | 'UNSHIPPED'
                | 'PARTIALLY_SHIPPED'
                | 'SHIPPED'
                | 'CANCELED'
                | 'UNFULFILLABLE'
                | 'INVOICE_UNCONFIRMED'
                | 'PENDING_AVAILABILITY'
              >
            | undefined;
          const fulfillmentChannels = url.searchParams.get('fulfillmentChannels')?.split(',') as
            | Array<'AFN' | 'MFN'>
            | undefined;
          const createdAfter = url.searchParams.get('createdAfter') || undefined;
          const createdBefore = url.searchParams.get('createdBefore') || undefined;
          const nextToken = url.searchParams.get('nextToken') || undefined;

          // Get orders with optional filters
          const result = await ordersClient.getOrders({
            orderStatuses,
            fulfillmentChannels,
            createdAfter,
            createdBefore,
            nextToken,
          });

          // Format the response as markdown
          let markdown = `# Amazon Orders\n\n`;

          if (result.orders.length === 0) {
            markdown += `No orders found.\n`;
          } else {
            markdown += `Found ${result.orders.length} orders\n\n`;

            // Add filtering options
            markdown += `## Filter Options\n\n`;
            markdown += `- [All Orders](amazon-orders://)\n`;
            markdown += `- [Pending Orders](amazon-orders://?orderStatuses=PENDING)\n`;
            markdown += `- [Unshipped Orders](amazon-orders://?orderStatuses=UNSHIPPED)\n`;
            markdown += `- [Shipped Orders](amazon-orders://?orderStatuses=SHIPPED)\n`;
            markdown += `- [Canceled Orders](amazon-orders://?orderStatuses=CANCELED)\n`;
            markdown += `- [Amazon Fulfilled](amazon-orders://?fulfillmentChannels=AFN)\n`;
            markdown += `- [Seller Fulfilled](amazon-orders://?fulfillmentChannels=MFN)\n\n`;

            // Add date range filters
            markdown += `## Date Range Filters\n\n`;
            markdown += `- [Last 24 Hours](amazon-orders://?createdAfter=${encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())})\n`;
            markdown += `- [Last 7 Days](amazon-orders://?createdAfter=${encodeURIComponent(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())})\n`;
            markdown += `- [Last 30 Days](amazon-orders://?createdAfter=${encodeURIComponent(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())})\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              const nextPageUrl = new URL(uri.toString());
              nextPageUrl.searchParams.set('nextToken', result.nextToken);
              markdown += `[Next Page](${nextPageUrl.toString()})\n\n`;
            }

            // Add orders
            markdown += `## Orders\n\n`;

            result.orders.forEach((order, index) => {
              markdown += `### ${index + 1}. [Order ${order.amazonOrderId}](amazon-orders://${order.amazonOrderId})\n\n`;

              markdown += `**Purchase Date:** ${new Date(order.purchaseDate).toLocaleString()}\n\n`;
              markdown += `**Status:** ${order.orderStatus}\n\n`;

              if (order.orderTotal) {
                markdown += `**Total:** ${order.orderTotal.amount} ${order.orderTotal.currencyCode}\n\n`;
              }

              if (order.fulfillmentChannel) {
                markdown += `**Fulfillment:** ${order.fulfillmentChannel === 'AFN' ? 'Amazon' : 'Seller'}\n\n`;
              }

              if (order.shipmentServiceLevelCategory) {
                markdown += `**Shipping Service:** ${order.shipmentServiceLevelCategory}\n\n`;
              }

              if (
                order.numberOfItemsShipped !== undefined &&
                order.numberOfItemsUnshipped !== undefined
              ) {
                markdown += `**Items:** ${order.numberOfItemsShipped} shipped, ${order.numberOfItemsUnshipped} unshipped\n\n`;
              }

              markdown += `[View Details](amazon-orders://${order.amazonOrderId})\n\n`;
              markdown += `---\n\n`;
            });
          }

          return {
            contents: [
              {
                uri: 'amazon-orders://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error retrieving orders:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to retrieve orders: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  // Register order action resource
  resourceManager.registerResource(
    'amazon-order-action',
    resourceManager.createResourceTemplate('amazon-order-action://{amazonOrderId}/{action}'),
    {
      title: 'Amazon Order Actions',
      description: 'Perform actions on Amazon orders',
    },
    async (uri, params) => {
      try {
        const { amazonOrderId, action } = params;

        if (!amazonOrderId || !action) {
          throw new Error('Order ID and action are required');
        }

        // Format the response as markdown based on the action
        let markdown = '';

        switch (action.toLowerCase()) {
          case 'confirm':
            markdown = `# Confirm Order: ${amazonOrderId}\n\n`;
            markdown += `Use this form to confirm the order.\n\n`;
            markdown += `**Order ID:** ${amazonOrderId}\n\n`;
            markdown += `To confirm this order, use the \`confirm-order\` tool with the following parameters:\n\n`;
            markdown += '```json\n';
            markdown += `{\n  "amazonOrderId": "${amazonOrderId}"\n}`;
            markdown += '\n```\n\n';
            break;

          case 'ship':
            markdown = `# Ship Order: ${amazonOrderId}\n\n`;
            markdown += `Use this form to mark the order as shipped.\n\n`;
            markdown += `**Order ID:** ${amazonOrderId}\n\n`;
            markdown += `To ship this order, use the \`ship-order\` tool with the following parameters:\n\n`;
            markdown += '```json\n';
            markdown += `{\n`;
            markdown += `  "amazonOrderId": "${amazonOrderId}",\n`;
            markdown += `  "carrierCode": "CARRIER_CODE",\n`;
            markdown += `  "trackingNumber": "TRACKING_NUMBER",\n`;
            markdown += `  "shipDate": "YYYY-MM-DD",\n`;
            markdown += `  "items": [\n`;
            markdown += `    {\n`;
            markdown += `      "orderItemId": "ORDER_ITEM_ID",\n`;
            markdown += `      "quantity": 1\n`;
            markdown += `    }\n`;
            markdown += `  ]\n`;
            markdown += `}`;
            markdown += '\n```\n\n';

            // Get order items to help with the form
            try {
              const orderItems = await ordersClient.getOrderItems({ amazonOrderId });

              if (orderItems.orderItems.length > 0) {
                markdown += `## Order Items\n\n`;
                markdown += `Use these item IDs in the shipping form:\n\n`;

                orderItems.orderItems.forEach((item, index) => {
                  markdown += `${index + 1}. **Item ID:** ${item.orderItemId}\n`;
                  markdown += `   **Title:** ${item.title}\n`;
                  markdown += `   **Quantity:** ${item.quantityOrdered}\n\n`;
                });
              }
            } catch (err) {
              warn(`Could not retrieve order items for order ${amazonOrderId}:`, { error: err });
            }
            break;

          case 'cancel':
            markdown = `# Cancel Order: ${amazonOrderId}\n\n`;
            markdown += `Use this form to cancel the order.\n\n`;
            markdown += `**Order ID:** ${amazonOrderId}\n\n`;
            markdown += `To cancel this order, use the \`cancel-order\` tool with the following parameters:\n\n`;
            markdown += '```json\n';
            markdown += `{\n`;
            markdown += `  "amazonOrderId": "${amazonOrderId}",\n`;
            markdown += `  "cancellationReason": "REASON_FOR_CANCELLATION"\n`;
            markdown += `}`;
            markdown += '\n```\n\n';
            markdown += `**Note:** Only orders that have not been shipped can be canceled.\n\n`;
            break;

          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        markdown += `[Back to Order](amazon-orders://${amazonOrderId})\n\n`;

        return {
          contents: [
            {
              uri: uri.toString(),
              text: markdown,
              mimeType: 'text/markdown',
            },
          ],
        };
      } catch (err) {
        error('Error processing order action:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to process order action: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  // Register order filter resource
  resourceManager.registerResource(
    'amazon-order-filter',
    resourceManager.createResourceTemplate(
      'amazon-order-filter://{filter}',
      'amazon-order-filter://'
    ),
    {
      title: 'Amazon Order Filter',
      description: 'Filter and view your Amazon orders by various criteria',
    },
    async (uri, params) => {
      try {
        const { filter } = params;

        // Parse the filter string to determine the filter type and value
        let filterType: string;
        let filterValue: string;

        if (filter && filter.includes(':')) {
          [filterType, filterValue] = filter.split(':', 2);
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
            case 'status':
              if (
                [
                  'PENDING',
                  'UNSHIPPED',
                  'PARTIALLY_SHIPPED',
                  'SHIPPED',
                  'CANCELED',
                  'UNFULFILLABLE',
                  'INVOICE_UNCONFIRMED',
                  'PENDING_AVAILABILITY',
                ].includes(filterValue.toUpperCase())
              ) {
                filterParams.orderStatuses = [filterValue.toUpperCase()];
              }
              break;
            case 'channel':
              if (['AFN', 'MFN'].includes(filterValue.toUpperCase())) {
                filterParams.fulfillmentChannels = [filterValue.toUpperCase()];
              }
              break;
            case 'buyer':
              filterParams.buyerEmail = filterValue;
              break;
            case 'date':
              // Format should be YYYY-MM-DD
              try {
                const date = new Date(filterValue);
                filterParams.createdAfter = new Date(date.setHours(0, 0, 0, 0)).toISOString();
                filterParams.createdBefore = new Date(date.setHours(23, 59, 59, 999)).toISOString();
              } catch {
                throw new Error(`Invalid date format. Use YYYY-MM-DD.`);
              }
              break;
            default:
              throw new Error(`Unknown filter type: ${filterType}`);
          }

          // Get filtered orders
          const result = await ordersClient.getOrders(filterParams);

          // Format the response as markdown
          let markdown = `# Amazon Orders: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Filter - ${filterValue}\n\n`;

          if (result.orders.length === 0) {
            markdown += `No orders found matching the filter.\n`;
          } else {
            markdown += `Found ${result.orders.length} orders\n\n`;

            // Add pagination info if available
            if (result.nextToken) {
              const nextPageUrl = new URL(uri.toString());
              nextPageUrl.searchParams.set('nextToken', result.nextToken);
              markdown += `[Next Page](${nextPageUrl.toString()})\n\n`;
            }

            // Add orders
            markdown += `## Orders\n\n`;

            result.orders.forEach((order, index) => {
              markdown += `### ${index + 1}. [Order ${order.amazonOrderId}](amazon-orders://${order.amazonOrderId})\n\n`;

              markdown += `**Purchase Date:** ${new Date(order.purchaseDate).toLocaleString()}\n\n`;
              markdown += `**Status:** ${order.orderStatus}\n\n`;

              if (order.orderTotal) {
                markdown += `**Total:** ${order.orderTotal.amount} ${order.orderTotal.currencyCode}\n\n`;
              }

              if (order.fulfillmentChannel) {
                markdown += `**Fulfillment:** ${order.fulfillmentChannel === 'AFN' ? 'Amazon' : 'Seller'}\n\n`;
              }

              markdown += `[View Details](amazon-orders://${order.amazonOrderId})\n\n`;
              markdown += `---\n\n`;
            });
          }

          return {
            contents: [
              {
                uri: uri.toString(),
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
        // If no specific filter is provided, show filter options
        else {
          // Format the response as markdown
          let markdown = `# Amazon Order Filters\n\n`;
          markdown += `Use these filters to narrow down your orders view:\n\n`;

          markdown += `## Filter by Status\n\n`;
          markdown += `- [Pending Orders](amazon-order-filter://status:PENDING)\n`;
          markdown += `- [Unshipped Orders](amazon-order-filter://status:UNSHIPPED)\n`;
          markdown += `- [Partially Shipped Orders](amazon-order-filter://status:PARTIALLY_SHIPPED)\n`;
          markdown += `- [Shipped Orders](amazon-order-filter://status:SHIPPED)\n`;
          markdown += `- [Canceled Orders](amazon-order-filter://status:CANCELED)\n\n`;

          markdown += `## Filter by Fulfillment Channel\n\n`;
          markdown += `- [Amazon Fulfilled](amazon-order-filter://channel:AFN)\n`;
          markdown += `- [Seller Fulfilled](amazon-order-filter://channel:MFN)\n\n`;

          markdown += `## Filter by Buyer\n\n`;
          markdown += `Enter a buyer email to filter by: [amazon-order-filter://buyer:example@example.com]\n\n`;

          markdown += `## Filter by Date\n\n`;
          markdown += `Enter a date (YYYY-MM-DD) to filter by: [amazon-order-filter://date:YYYY-MM-DD]\n\n`;

          markdown += `## View All Orders\n\n`;
          markdown += `- [View All Orders](amazon-orders://)\n`;

          return {
            contents: [
              {
                uri: 'amazon-order-filter://',
                text: markdown,
                mimeType: 'text/markdown',
              },
            ],
          };
        }
      } catch (err) {
        error('Error filtering orders:', { error: err });

        return {
          contents: [
            {
              uri: uri.toString(),
              text: `# Error\n\nFailed to filter orders: ${(err as Error).message}`,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    }
  );

  info('Registered orders resources');
}
