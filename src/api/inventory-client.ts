/**
 * Inventory API client for Amazon Selling Partner API
 */

import { BaseApiClient } from './base-client.js';
import { ApiRequestOptions } from '../types/api.js';
import { AuthConfig } from '../types/auth.js';
import { z } from 'zod';

/**
 * Parameters for retrieving inventory
 */
export interface GetInventoryParams {
  /**
   * List of seller SKUs to filter by (optional)
   */
  sellerSkus?: string[];

  /**
   * Marketplace ID (defaults to the one in config)
   */
  marketplaceId?: string;

  /**
   * List of ASINs to filter by (optional)
   */
  asins?: string[];

  /**
   * List of fulfillment channels to filter by (optional)
   */
  fulfillmentChannels?: Array<'AMAZON' | 'SELLER'>;

  /**
   * Date-time filter for items updated after this time
   */
  startDateTime?: Date;

  /**
   * Date-time filter for items updated before this time
   */
  endDateTime?: Date;

  /**
   * Page size (1-100)
   */
  pageSize?: number;

  /**
   * Page token for pagination
   */
  nextToken?: string;
}

/**
 * Parameters for updating inventory
 */
export interface UpdateInventoryParams {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Inventory quantity
   */
  quantity: number;

  /**
   * Fulfillment channel ('AMAZON' or 'SELLER')
   */
  fulfillmentChannel: 'AMAZON' | 'SELLER';

  /**
   * Restock date (optional, for future inventory)
   */
  restockDate?: Date;
}

/**
 * Parameters for setting inventory replenishment settings
 */
export interface SetInventoryReplenishmentParams {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Restock level (minimum quantity before reordering)
   */
  restockLevel: number;

  /**
   * Target level (desired quantity after reordering)
   */
  targetLevel: number;

  /**
   * Maximum inventory level
   */
  maximumLevel?: number;

  /**
   * Lead time in days
   */
  leadTimeDays?: number;
}

/**
 * Inventory item
 */
export interface InventoryItem {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * ASIN
   */
  asin?: string;

  /**
   * Condition of the item
   */
  condition?: string;

  /**
   * Inventory details by fulfillment channel
   */
  inventoryDetails: Array<{
    /**
     * Fulfillment channel code ('AMAZON' or 'SELLER')
     */
    fulfillmentChannelCode: 'AMAZON' | 'SELLER';

    /**
     * Available quantity
     */
    quantity: number;

    /**
     * Reserved quantity (e.g., for pending orders)
     */
    reservedQuantity?: number;

    /**
     * Restock date (for future inventory)
     */
    restockDate?: string;

    /**
     * Replenishment settings
     */
    replenishmentSettings?: {
      /**
       * Restock level (minimum quantity before reordering)
       */
      restockLevel?: number;

      /**
       * Target level (desired quantity after reordering)
       */
      targetLevel?: number;

      /**
       * Maximum inventory level
       */
      maximumLevel?: number;

      /**
       * Lead time in days
       */
      leadTimeDays?: number;
    };
  }>;

  /**
   * Last updated timestamp
   */
  lastUpdatedTime: string;
}

/**
 * Inventory details
 */
export interface InventoryDetails {
  /**
   * Inventory items
   */
  items: InventoryItem[];

  /**
   * Next token for pagination
   */
  nextToken?: string;
}

/**
 * Inventory update result
 */
export interface InventoryUpdateResult {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Fulfillment channel
   */
  fulfillmentChannel: 'AMAZON' | 'SELLER';

  /**
   * Update status
   */
  status: 'SUCCESSFUL' | 'FAILED';

  /**
   * Error message (if status is FAILED)
   */
  errorMessage?: string;

  /**
   * Error code (if status is FAILED)
   */
  errorCode?: string;
}

/**
 * Inventory replenishment update result
 */
export interface InventoryReplenishmentUpdateResult {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Update status
   */
  status: 'SUCCESSFUL' | 'FAILED';

  /**
   * Error message (if status is FAILED)
   */
  errorMessage?: string;

  /**
   * Error code (if status is FAILED)
   */
  errorCode?: string;
}

/**
 * Inventory API client for Amazon Selling Partner API
 */
export class InventoryClient extends BaseApiClient {
  /**
   * API version
   */
  private readonly apiVersion = 'fba/inventory/v1';

  /**
   * Original authentication configuration
   */
  private readonly authConfig: AuthConfig;

  /**
   * Create a new InventoryClient instance
   *
   * @param authConfig Authentication configuration
   */
  constructor(authConfig: AuthConfig) {
    super(authConfig);
    this.authConfig = authConfig;
  }

  /**
   * Gets the client configuration
   *
   * @returns Authentication configuration
   */
  public getConfig(): AuthConfig {
    return { ...this.authConfig };
  }

  /**
   * Get inventory
   *
   * @param params Parameters for retrieving inventory
   * @returns Promise resolving to the inventory details
   */
  public async getInventory(params: GetInventoryParams = {}): Promise<InventoryDetails> {
    const {
      sellerSkus,
      marketplaceId = this.config.marketplaceId,
      asins,
      fulfillmentChannels,
      startDateTime,
      endDateTime,
      pageSize,
      nextToken,
    } = params;

    // Build query parameters
    const query: Record<string, string | string[] | number | undefined> = {
      marketplaceId,
    };

    if (sellerSkus && sellerSkus.length > 0) {
      query.sellerSkus = sellerSkus;
    }

    if (asins && asins.length > 0) {
      query.asins = asins;
    }

    if (fulfillmentChannels && fulfillmentChannels.length > 0) {
      query.fulfillmentChannels = fulfillmentChannels;
    }

    if (startDateTime) {
      query.startDateTime = startDateTime.toISOString();
    }

    if (endDateTime) {
      query.endDateTime = endDateTime.toISOString();
    }

    if (pageSize) {
      query.pageSize = Math.min(100, Math.max(1, pageSize)); // Ensure pageSize is between 1 and 100
    }

    if (nextToken) {
      query.nextToken = nextToken;
    }

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/inventories`,
      query: query as Record<string, string | number | boolean | undefined>,
    };

    // Use cache for inventory (30 seconds TTL - shorter than listings because inventory changes frequently)
    const cacheKey = `inventory:${marketplaceId}:${sellerSkus?.join(',') || 'all'}:${asins?.join(',') || 'all'}:${fulfillmentChannels?.join(',') || 'all'}:${nextToken || 'first'}`;

    return this.withCache<InventoryDetails>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: InventoryDetails }>(requestOptions);
        return response.data.payload;
      },
      30 // 30 seconds TTL
    );
  }

  /**
   * Get inventory for a specific SKU
   *
   * @param sku Seller SKU
   * @returns Promise resolving to the inventory item
   */
  public async getInventoryBySku(sku: string): Promise<InventoryItem> {
    const result = await this.getInventory({ sellerSkus: [sku] });

    if (!result.items || result.items.length === 0) {
      throw new Error(`Inventory for SKU ${sku} not found`);
    }

    return result.items[0];
  }

  /**
   * Update inventory quantity
   *
   * @param params Parameters for updating inventory
   * @param emitNotification Whether to emit a notification event (default: true)
   *                        Note: This parameter is used by the notification system when it overrides this method
   * @returns Promise resolving to the update result
   */
  public async updateInventory(
    params: UpdateInventoryParams,
    emitNotification: boolean = true
  ): Promise<InventoryUpdateResult> {
    const { sku, quantity, fulfillmentChannel, restockDate } = params;

    // Validate inventory data
    this.validateInventoryUpdateData(params);

    // Build request body
    const requestBody = {
      inventory: {
        sku,
        fulfillmentChannel,
        quantity,
        ...(restockDate && { restockDate: restockDate.toISOString() }),
      },
    };

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'PUT',
      path: `/${this.apiVersion}/inventories/${sku}`,
      query: {
        marketplaceId: this.config.marketplaceId,
      },
      data: requestBody,
    };

    const response = await this.request<{ payload: InventoryUpdateResult }>(requestOptions);

    // Clear cache for this SKU
    this.clearCache(`inventory:*:${sku}:*`);

    return response.data.payload;
  }

  /**
   * Set inventory replenishment settings
   *
   * @param params Parameters for setting inventory replenishment settings
   * @returns Promise resolving to the update result
   */
  public async setInventoryReplenishment(
    params: SetInventoryReplenishmentParams
  ): Promise<InventoryReplenishmentUpdateResult> {
    const { sku, restockLevel, targetLevel, maximumLevel, leadTimeDays } = params;

    // Validate replenishment data
    this.validateReplenishmentData(params);

    // Build request body
    const requestBody = {
      replenishmentSettings: {
        restockLevel,
        targetLevel,
        ...(maximumLevel !== undefined && { maximumLevel }),
        ...(leadTimeDays !== undefined && { leadTimeDays }),
      },
    };

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'PUT',
      path: `/${this.apiVersion}/inventories/${sku}/replenishment`,
      query: {
        marketplaceId: this.config.marketplaceId,
      },
      data: requestBody,
    };

    const response = await this.request<{ payload: InventoryReplenishmentUpdateResult }>(
      requestOptions
    );

    // Clear cache for this SKU
    this.clearCache(`inventory:*:${sku}:*`);

    return response.data.payload;
  }

  /**
   * Validate inventory update data
   *
   * @param params Inventory update parameters to validate
   * @throws Error if validation fails
   */
  private validateInventoryUpdateData(params: UpdateInventoryParams): void {
    // Define validation schema using zod
    const inventoryUpdateSchema = z.object({
      sku: z.string().min(1, 'SKU is required'),
      quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
      fulfillmentChannel: z.enum(['AMAZON', 'SELLER'], {
        errorMap: () => ({ message: "Fulfillment channel must be either 'AMAZON' or 'SELLER'" }),
      }),
      restockDate: z.date().optional(),
    });

    try {
      // Validate against schema
      inventoryUpdateSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors
        const formattedErrors = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        throw new Error(`Inventory update validation failed: ${formattedErrors}`);
      }
      throw error;
    }
  }

  /**
   * Validate replenishment data
   *
   * @param params Replenishment parameters to validate
   * @throws Error if validation fails
   */
  private validateReplenishmentData(params: SetInventoryReplenishmentParams): void {
    // Define validation schema using zod
    const replenishmentSchema = z
      .object({
        sku: z.string().min(1, 'SKU is required'),
        restockLevel: z.number().int().min(0, 'Restock level must be a non-negative integer'),
        targetLevel: z.number().int().min(0, 'Target level must be a non-negative integer'),
        maximumLevel: z
          .number()
          .int()
          .min(0, 'Maximum level must be a non-negative integer')
          .optional(),
        leadTimeDays: z.number().int().min(1, 'Lead time must be a positive integer').optional(),
      })
      .refine((data) => data.targetLevel >= data.restockLevel, {
        message: 'Target level must be greater than or equal to restock level',
        path: ['targetLevel'],
      })
      .refine((data) => !data.maximumLevel || data.maximumLevel >= data.targetLevel, {
        message: 'Maximum level must be greater than or equal to target level',
        path: ['maximumLevel'],
      });

    try {
      // Validate against schema
      replenishmentSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors
        const formattedErrors = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        throw new Error(`Replenishment settings validation failed: ${formattedErrors}`);
      }
      throw error;
    }
  }
}
