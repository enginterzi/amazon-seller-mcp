/**
 * Orders API client for Amazon Selling Partner API
 */

// Third-party dependencies
import { z } from 'zod';

// Internal imports
import { BaseApiClient } from './base-client.js';
import { ApiRequestOptions } from '../types/api.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Order status
 */
export type OrderStatus =
  | 'PENDING'
  | 'UNSHIPPED'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'CANCELED'
  | 'UNFULFILLABLE'
  | 'INVOICE_UNCONFIRMED'
  | 'PENDING_AVAILABILITY';

/**
 * Fulfillment channel
 */
export type FulfillmentChannel = 'AFN' | 'MFN';

/**
 * Payment method
 */
export type PaymentMethod = 'COD' | 'CVS' | 'Other';

/**
 * Order address
 */
export interface OrderAddress {
  /**
   * Name
   */
  name: string;

  /**
   * Address line 1
   */
  addressLine1: string;

  /**
   * Address line 2
   */
  addressLine2?: string;

  /**
   * Address line 3
   */
  addressLine3?: string;

  /**
   * City
   */
  city: string;

  /**
   * County
   */
  county?: string;

  /**
   * District
   */
  district?: string;

  /**
   * State or region
   */
  stateOrRegion: string;

  /**
   * Postal code
   */
  postalCode: string;

  /**
   * Country code
   */
  countryCode: string;

  /**
   * Phone
   */
  phone?: string;
}

/**
 * Money
 */
export interface Money {
  /**
   * Currency code
   */
  currencyCode: string;

  /**
   * Amount
   */
  amount: number;
}

/**
 * Order item
 */
export interface OrderItem {
  /**
   * ASIN
   */
  asin: string;

  /**
   * Seller SKU
   */
  sellerSku?: string;

  /**
   * Order item ID
   */
  orderItemId: string;

  /**
   * Title
   */
  title: string;

  /**
   * Quantity ordered
   */
  quantityOrdered: number;

  /**
   * Quantity shipped
   */
  quantityShipped?: number;

  /**
   * Item price
   */
  itemPrice?: Money;

  /**
   * Shipping price
   */
  shippingPrice?: Money;

  /**
   * Gift price
   */
  giftWrapPrice?: Money;

  /**
   * Tax collection
   */
  taxCollection?: {
    /**
     * Model
     */
    model: 'MarketplaceFacilitator' | 'Standard';

    /**
     * Responsible party
     */
    responsibleParty: 'Amazon Services, Inc.' | 'Seller';
  };

  /**
   * Item tax
   */
  itemTax?: Money;

  /**
   * Shipping tax
   */
  shippingTax?: Money;

  /**
   * Gift wrap tax
   */
  giftWrapTax?: Money;

  /**
   * Shipping discount
   */
  shippingDiscount?: Money;

  /**
   * Shipping discount tax
   */
  shippingDiscountTax?: Money;

  /**
   * Promotion discount
   */
  promotionDiscount?: Money;

  /**
   * Promotion discount tax
   */
  promotionDiscountTax?: Money;

  /**
   * COD fee
   */
  codFee?: Money;

  /**
   * COD fee discount
   */
  codFeeDiscount?: Money;

  /**
   * Is gift
   */
  isGift?: boolean;

  /**
   * Gift message
   */
  giftMessageText?: string;

  /**
   * Gift wrap level
   */
  giftWrapLevel?: string;

  /**
   * Condition
   */
  conditionNote?: string;

  /**
   * Condition ID
   */
  conditionId?: string;

  /**
   * Condition subtype ID
   */
  conditionSubtypeId?: string;

  /**
   * Scheduled delivery start date
   */
  scheduledDeliveryStartDate?: string;

  /**
   * Scheduled delivery end date
   */
  scheduledDeliveryEndDate?: string;

  /**
   * Product info
   */
  productInfo?: {
    /**
     * Number of items
     */
    numberOfItems?: number;
  };

  /**
   * Points granted
   */
  pointsGranted?: {
    /**
     * Points number
     */
    pointsNumber?: number;

    /**
     * Points monetary value
     */
    pointsMonetaryValue?: Money;
  };

  /**
   * Tax collection on item
   */
  itemTaxWithheld?: Money;

  /**
   * Tax collection on shipping
   */
  shippingTaxWithheld?: Money;

  /**
   * Tax collection on gift wrap
   */
  giftWrapTaxWithheld?: Money;

  /**
   * Tax collection on promotion
   */
  promotionTaxWithheld?: Money;

  /**
   * Tax collection on shipping discount
   */
  shippingDiscountTaxWithheld?: Money;

  /**
   * Tax collection on promotion discount
   */
  promotionDiscountTaxWithheld?: Money;
}

/**
 * Order
 */
export interface Order {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;

  /**
   * Seller order ID
   */
  sellerOrderId?: string;

  /**
   * Purchase date
   */
  purchaseDate: string;

  /**
   * Last update date
   */
  lastUpdateDate: string;

  /**
   * Order status
   */
  orderStatus: OrderStatus;

  /**
   * Fulfillment channel
   */
  fulfillmentChannel?: FulfillmentChannel;

  /**
   * Sales channel
   */
  salesChannel?: string;

  /**
   * Order channel
   */
  orderChannel?: string;

  /**
   * Ship service level
   */
  shipServiceLevel?: string;

  /**
   * Shipping address
   */
  shippingAddress?: OrderAddress;

  /**
   * Order total
   */
  orderTotal?: Money;

  /**
   * Number of items shipped
   */
  numberOfItemsShipped?: number;

  /**
   * Number of items unshipped
   */
  numberOfItemsUnshipped?: number;

  /**
   * Payment execution detail
   */
  paymentExecutionDetail?: Array<{
    /**
     * Payment method
     */
    paymentMethod: PaymentMethod;

    /**
     * Payment amount
     */
    payment: Money;
  }>;

  /**
   * Payment method
   */
  paymentMethod?: PaymentMethod;

  /**
   * Marketplace ID
   */
  marketplaceId: string;

  /**
   * Buyer info
   */
  buyerInfo?: {
    /**
     * Buyer email
     */
    buyerEmail?: string;

    /**
     * Buyer name
     */
    buyerName?: string;

    /**
     * Buyer county
     */
    buyerCounty?: string;

    /**
     * Buyer tax info
     */
    buyerTaxInfo?: {
      /**
       * Buyer tax type
       */
      taxingRegion?: string;

      /**
       * Buyer tax classifications
       */
      taxClassifications?: Array<{
        /**
         * Tax classification name
         */
        name: string;

        /**
         * Tax classification value
         */
        value: string;
      }>;
    };

    /**
     * Purchase order number
     */
    purchaseOrderNumber?: string;
  };

  /**
   * Shipment service level category
   */
  shipmentServiceLevelCategory?: string;

  /**
   * Order type
   */
  orderType?: string;

  /**
   * Earliest ship date
   */
  earliestShipDate?: string;

  /**
   * Latest ship date
   */
  latestShipDate?: string;

  /**
   * Earliest delivery date
   */
  earliestDeliveryDate?: string;

  /**
   * Latest delivery date
   */
  latestDeliveryDate?: string;

  /**
   * Is business order
   */
  isBusinessOrder?: boolean;

  /**
   * Is prime
   */
  isPrime?: boolean;

  /**
   * Is premium order
   */
  isPremiumOrder?: boolean;

  /**
   * Is global express enabled
   */
  isGlobalExpressEnabled?: boolean;

  /**
   * Is replacement order
   */
  isReplacementOrder?: boolean;

  /**
   * Replaced order ID
   */
  replacedOrderId?: string;

  /**
   * Promise response deadline
   */
  promiseResponseDueDate?: string;

  /**
   * Is estimated ship date set
   */
  isEstimatedShipDateSet?: boolean;

  /**
   * Is sold by AB
   */
  isSoldByAB?: boolean;

  /**
   * Is IBA
   */
  isIBA?: boolean;
}

/**
 * Parameters for retrieving orders
 */
export interface GetOrdersParams {
  /**
   * Created after date
   */
  createdAfter?: string;

  /**
   * Created before date
   */
  createdBefore?: string;

  /**
   * Last updated after date
   */
  lastUpdatedAfter?: string;

  /**
   * Last updated before date
   */
  lastUpdatedBefore?: string;

  /**
   * Order statuses
   */
  orderStatuses?: OrderStatus[];

  /**
   * Fulfillment channels
   */
  fulfillmentChannels?: FulfillmentChannel[];

  /**
   * Payment methods
   */
  paymentMethods?: PaymentMethod[];

  /**
   * Buyer email
   */
  buyerEmail?: string;

  /**
   * Seller order ID
   */
  sellerOrderId?: string;

  /**
   * Max results per page
   */
  maxResultsPerPage?: number;

  /**
   * Next token for pagination
   */
  nextToken?: string;

  /**
   * Amazon order IDs
   */
  amazonOrderIds?: string[];

  /**
   * Order item categories
   */
  itemCategories?: string[];

  /**
   * EasyShip shipment statuses
   */
  easyShipShipmentStatuses?: string[];
}

/**
 * Parameters for retrieving a single order
 */
export interface GetOrderParams {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;
}

/**
 * Parameters for retrieving order items
 */
export interface GetOrderItemsParams {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;

  /**
   * Next token for pagination
   */
  nextToken?: string;
}

/**
 * Order items result
 */
export interface OrderItemsResult {
  /**
   * Order items
   */
  orderItems: OrderItem[];

  /**
   * Next token for pagination
   */
  nextToken?: string;

  /**
   * Amazon order ID
   */
  amazonOrderId: string;
}

/**
 * Orders result
 */
export interface OrdersResult {
  /**
   * Orders
   */
  orders: Order[];

  /**
   * Next token for pagination
   */
  nextToken?: string;

  /**
   * Last updated before
   */
  lastUpdatedBefore?: string;

  /**
   * Created before
   */
  createdBefore?: string;
}

/**
 * Parameters for updating order status
 */
export interface UpdateOrderStatusParams {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;

  /**
   * Action to perform
   */
  action: 'CONFIRM' | 'SHIP' | 'CANCEL';

  /**
   * Additional details for the action
   */
  details?: {
    /**
     * Cancellation reason (required for CANCEL action)
     */
    cancellationReason?: string;

    /**
     * Shipping details (required for SHIP action)
     */
    shippingDetails?: {
      /**
       * Carrier code
       */
      carrierCode: string;

      /**
       * Tracking number
       */
      trackingNumber: string;

      /**
       * Ship date
       */
      shipDate: string;

      /**
       * Items to ship
       */
      items: Array<{
        /**
         * Order item ID
         */
        orderItemId: string;

        /**
         * Quantity
         */
        quantity: number;
      }>;
    };
  };
}

/**
 * Order update result
 */
export interface OrderUpdateResult {
  /**
   * Success
   */
  success: boolean;

  /**
   * Error message
   */
  errorMessage?: string;

  /**
   * Amazon order ID
   */
  amazonOrderId: string;
}

/**
 * Parameters for retrieving order buyer info
 */
export interface GetOrderBuyerInfoParams {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;
}

/**
 * Order buyer info
 */
export interface OrderBuyerInfo {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;

  /**
   * Buyer email
   */
  buyerEmail?: string;

  /**
   * Buyer name
   */
  buyerName?: string;

  /**
   * Buyer county
   */
  buyerCounty?: string;

  /**
   * Buyer tax info
   */
  buyerTaxInfo?: {
    /**
     * Taxing region
     */
    taxingRegion?: string;

    /**
     * Tax classifications
     */
    taxClassifications?: Array<{
      /**
       * Name
       */
      name: string;

      /**
       * Value
       */
      value: string;
    }>;
  };

  /**
   * Purchase order number
   */
  purchaseOrderNumber?: string;
}

/**
 * Parameters for retrieving order address
 */
export interface GetOrderAddressParams {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;
}

/**
 * Order address result
 */
export interface OrderAddressResult {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;

  /**
   * Shipping address
   */
  shippingAddress: OrderAddress;
}

/**
 * Parameters for retrieving order fulfillment
 */
export interface GetOrderFulfillmentParams {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;
}

/**
 * Fulfillment shipment item
 */
export interface FulfillmentShipmentItem {
  /**
   * Seller SKU
   */
  sellerSKU: string;

  /**
   * Order item ID
   */
  orderItemId: string;

  /**
   * Quantity shipped
   */
  quantityShipped: number;

  /**
   * Item price
   */
  itemPrice?: Money;

  /**
   * Shipping price
   */
  shippingPrice?: Money;

  /**
   * Gift wrap price
   */
  giftWrapPrice?: Money;
}

/**
 * Fulfillment shipment
 */
export interface FulfillmentShipment {
  /**
   * Amazon shipment ID
   */
  amazonShipmentId: string;

  /**
   * Fulfillment center ID
   */
  fulfillmentCenterId?: string;

  /**
   * Fulfillment shipment status
   */
  fulfillmentShipmentStatus?: string;

  /**
   * Shipping date
   */
  shippingDate?: string;

  /**
   * Estimated arrival date
   */
  estimatedArrivalDate?: string;

  /**
   * Shipping notes
   */
  shippingNotes?: string[];

  /**
   * Fulfillment shipment item
   */
  fulfillmentShipmentItem: FulfillmentShipmentItem[];
}

/**
 * Order fulfillment result
 */
export interface OrderFulfillmentResult {
  /**
   * Amazon order ID
   */
  amazonOrderId: string;

  /**
   * Fulfillment shipments
   */
  fulfillmentShipments: FulfillmentShipment[];
}

/**
 * Orders API client for Amazon Selling Partner API
 */
export class OrdersClient extends BaseApiClient {
  /**
   * API version
   */
  private readonly apiVersion = 'orders/v0';

  /**
   * Create a new OrdersClient instance
   *
   * @param authConfig Authentication configuration
   */
  constructor(authConfig: AuthConfig) {
    super(authConfig);
  }

  /**
   * Get orders
   *
   * @param params Parameters for retrieving orders
   * @returns Promise resolving to the orders result
   */
  public async getOrders(params: GetOrdersParams = {}): Promise<OrdersResult> {
    const {
      createdAfter,
      createdBefore,
      lastUpdatedAfter,
      lastUpdatedBefore,
      orderStatuses,
      fulfillmentChannels,
      paymentMethods,
      buyerEmail,
      sellerOrderId,
      maxResultsPerPage,
      nextToken,
      amazonOrderIds,
      itemCategories,
      easyShipShipmentStatuses,
    } = params;

    // Build query parameters
    const query: Record<string, string | string[] | number | undefined> = {
      MarketplaceIds: this.config.marketplaceId,
    };

    if (createdAfter) {
      query.CreatedAfter = createdAfter;
    }

    if (createdBefore) {
      query.CreatedBefore = createdBefore;
    }

    if (lastUpdatedAfter) {
      query.LastUpdatedAfter = lastUpdatedAfter;
    }

    if (lastUpdatedBefore) {
      query.LastUpdatedBefore = lastUpdatedBefore;
    }

    if (orderStatuses && orderStatuses.length > 0) {
      query.OrderStatuses = orderStatuses;
    }

    if (fulfillmentChannels && fulfillmentChannels.length > 0) {
      query.FulfillmentChannels = fulfillmentChannels;
    }

    if (paymentMethods && paymentMethods.length > 0) {
      query.PaymentMethods = paymentMethods;
    }

    if (buyerEmail) {
      query.BuyerEmail = buyerEmail;
    }

    if (sellerOrderId) {
      query.SellerOrderId = sellerOrderId;
    }

    if (maxResultsPerPage) {
      query.MaxResultsPerPage = Math.min(100, Math.max(1, maxResultsPerPage)); // Ensure maxResultsPerPage is between 1 and 100
    }

    if (nextToken) {
      query.NextToken = nextToken;
    }

    if (amazonOrderIds && amazonOrderIds.length > 0) {
      query.AmazonOrderIds = amazonOrderIds;
    }

    if (itemCategories && itemCategories.length > 0) {
      query.ItemCategories = itemCategories;
    }

    if (easyShipShipmentStatuses && easyShipShipmentStatuses.length > 0) {
      query.EasyShipShipmentStatuses = easyShipShipmentStatuses;
    }

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/orders`,
      query: query as Record<string, string | number | boolean | undefined>,
    };

    // Use cache for orders (30 seconds TTL)
    const cacheKey = `orders:${this.config.marketplaceId}:${JSON.stringify(query)}`;

    return this.withCache<OrdersResult>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: OrdersResult }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get a single order by Amazon order ID
   *
   * @param params Parameters for retrieving a single order
   * @returns Promise resolving to the order
   */
  public async getOrder(params: GetOrderParams): Promise<Order> {
    const { amazonOrderId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/orders/${amazonOrderId}`,
    };

    // Use cache for order (30 seconds TTL)
    const cacheKey = `order:${amazonOrderId}`;

    return this.withCache<Order>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: Order }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get order items
   *
   * @param params Parameters for retrieving order items
   * @returns Promise resolving to the order items result
   */
  public async getOrderItems(params: GetOrderItemsParams): Promise<OrderItemsResult> {
    const { amazonOrderId, nextToken } = params;

    // Build query parameters
    const query: Record<string, string | undefined> = {};

    if (nextToken) {
      query.NextToken = nextToken;
    }

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/orders/${amazonOrderId}/orderItems`,
      query,
    };

    // Use cache for order items (30 seconds TTL)
    const cacheKey = `orderItems:${amazonOrderId}:${nextToken || 'first'}`;

    return this.withCache<OrderItemsResult>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: OrderItemsResult }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Update order status
   *
   * @param params Parameters for updating order status
   * @returns Promise resolving to the order update result
   */
  public async updateOrderStatus(params: UpdateOrderStatusParams): Promise<OrderUpdateResult> {
    const { amazonOrderId, action, details } = params;

    // Validate update order status parameters
    this.validateUpdateOrderStatusParams(params);

    let path = '';
    let requestBody = {};

    // Build request based on action
    switch (action) {
      case 'CONFIRM':
        path = `/${this.apiVersion}/orders/${amazonOrderId}/confirmation`;
        break;

      case 'SHIP':
        if (!details?.shippingDetails) {
          throw new Error('Shipping details are required for SHIP action');
        }

        path = `/${this.apiVersion}/orders/${amazonOrderId}/shipment`;
        requestBody = {
          carrierCode: details.shippingDetails.carrierCode,
          trackingNumber: details.shippingDetails.trackingNumber,
          shipDate: details.shippingDetails.shipDate,
          items: details.shippingDetails.items,
        };
        break;

      case 'CANCEL':
        if (!details?.cancellationReason) {
          throw new Error('Cancellation reason is required for CANCEL action');
        }

        path = `/${this.apiVersion}/orders/${amazonOrderId}/cancellation`;
        requestBody = {
          cancellationReason: details.cancellationReason,
        };
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'POST',
      path,
      data: requestBody,
    };

    const response = await this.request<{ payload: OrderUpdateResult }>(requestOptions);

    // Clear cache for this order
    this.clearCache(`order:${amazonOrderId}`);
    this.clearCache(`orderItems:${amazonOrderId}:*`);

    return response.data.payload;
  }

  /**
   * Get order buyer info
   *
   * @param params Parameters for retrieving order buyer info
   * @returns Promise resolving to the order buyer info
   */
  public async getOrderBuyerInfo(params: GetOrderBuyerInfoParams): Promise<OrderBuyerInfo> {
    const { amazonOrderId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/orders/${amazonOrderId}/buyerInfo`,
    };

    // Use cache for order buyer info (30 seconds TTL)
    const cacheKey = `orderBuyerInfo:${amazonOrderId}`;

    return this.withCache<OrderBuyerInfo>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: OrderBuyerInfo }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get order address
   *
   * @param params Parameters for retrieving order address
   * @returns Promise resolving to the order address result
   */
  public async getOrderAddress(params: GetOrderAddressParams): Promise<OrderAddressResult> {
    const { amazonOrderId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/orders/${amazonOrderId}/address`,
    };

    // Use cache for order address (30 seconds TTL)
    const cacheKey = `orderAddress:${amazonOrderId}`;

    return this.withCache<OrderAddressResult>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: OrderAddressResult }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get order fulfillment
   *
   * @param params Parameters for retrieving order fulfillment
   * @returns Promise resolving to the order fulfillment result
   */
  public async getOrderFulfillment(
    params: GetOrderFulfillmentParams
  ): Promise<OrderFulfillmentResult> {
    const { amazonOrderId } = params;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/orders/${amazonOrderId}/fulfillment`,
    };

    // Use cache for order fulfillment (30 seconds TTL)
    const cacheKey = `orderFulfillment:${amazonOrderId}`;

    return this.withCache<OrderFulfillmentResult>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: OrderFulfillmentResult }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Validate update order status parameters
   *
   * @param params Parameters to validate
   * @throws Error if validation fails
   */
  private validateUpdateOrderStatusParams(params: UpdateOrderStatusParams): void {
    const { action } = params;

    // Define validation schema using zod
    const baseSchema = z.object({
      amazonOrderId: z.string().min(1, 'Amazon order ID is required'),
      action: z.enum(['CONFIRM', 'SHIP', 'CANCEL'], {
        errorMap: () => ({ message: 'Action must be one of: CONFIRM, SHIP, CANCEL' }),
      }),
    });

    // Additional validation based on action
    switch (action) {
      case 'SHIP': {
        const shipSchema = baseSchema.extend({
          details: z
            .object({
              shippingDetails: z
                .object({
                  carrierCode: z.string().min(1, 'Carrier code is required'),
                  trackingNumber: z.string().min(1, 'Tracking number is required'),
                  shipDate: z
                    .string()
                    .regex(
                      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/,
                      'Ship date must be in ISO 8601 format'
                    ),
                  items: z
                    .array(
                      z.object({
                        orderItemId: z.string().min(1, 'Order item ID is required'),
                        quantity: z.number().int().positive('Quantity must be a positive integer'),
                      })
                    )
                    .min(1, 'At least one item is required'),
                })
                .required(),
            })
            .required(),
        });

        try {
          shipSchema.parse(params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const formattedErrors = error.errors
              .map((err) => `${err.path.join('.')}: ${err.message}`)
              .join(', ');

            throw new Error(`Validation failed for SHIP action: ${formattedErrors}`);
          }
          throw error;
        }
        break;
      }

      case 'CANCEL': {
        const cancelSchema = baseSchema.extend({
          details: z
            .object({
              cancellationReason: z.string().min(1, 'Cancellation reason is required'),
            })
            .required(),
        });

        try {
          cancelSchema.parse(params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const formattedErrors = error.errors
              .map((err) => `${err.path.join('.')}: ${err.message}`)
              .join(', ');

            throw new Error(`Validation failed for CANCEL action: ${formattedErrors}`);
          }
          throw error;
        }
        break;
      }

      case 'CONFIRM': {
        // No additional validation needed for CONFIRM
        try {
          baseSchema.parse(params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const formattedErrors = error.errors
              .map((err) => `${err.path.join('.')}: ${err.message}`)
              .join(', ');

            throw new Error(`Validation failed for CONFIRM action: ${formattedErrors}`);
          }
          throw error;
        }
        break;
      }
    }
  }
}
