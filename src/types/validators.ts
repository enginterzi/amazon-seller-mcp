/**
 * Runtime validation functions using Zod schemas for Amazon API types
 */

import { z } from 'zod';
import type {
  AmazonCatalogItem,
  AmazonListingsItem,
  AmazonInventorySummary,
  AmazonOrder,
  AmazonReport,
  InventoryFilterParams,
  OrdersFilterParams,
  ReportsFilterParams,
} from './amazon-api.js';

/**
 * Custom error class for type validation failures
 */
export class TypeValidationError extends Error {
  constructor(
    message: string,
    public readonly typeName: string,
    public readonly validationErrors: z.ZodError
  ) {
    super(message);
    this.name = 'TypeValidationError';
  }
}

/**
 * Zod schema for Amazon item attributes
 * Supports both Amazon API format (arrays) and legacy format (simple strings)
 */
export const AmazonItemAttributesSchema = z
  .object({
    // Amazon API format: arrays of localized values
    item_name: z
      .array(
        z.object({
          value: z.string(),
          language_tag: z.string(),
        })
      )
      .optional(),
    brand: z
      .union([
        z.string(), // Legacy format
        z.array(
          z.object({
            value: z.string(),
            language_tag: z.string(),
          })
        ), // Amazon API format
      ])
      .optional(),
    list_price: z
      .array(
        z.object({
          value: z.number(),
          currency: z.string(),
        })
      )
      .optional(),
    // Legacy simple format for backward compatibility
    title: z.string().optional(),
    description: z.string().optional(),
    dimensions: z
      .object({
        length: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
      })
      .optional(),
    images: z
      .array(
        z.object({
          variant: z.string(),
          link: z.string(),
        })
      )
      .optional(),
  })
  .catchall(
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.unknown()),
      z.object({}),
      z.undefined(),
    ])
  );

/**
 * Zod schema for Amazon item identifiers
 */
export const AmazonItemIdentifiersSchema = z.record(
  z.string(),
  z.array(
    z.object({
      identifier: z.string(),
      identifierType: z.string(),
      marketplaceId: z.string().optional(),
    })
  )
);

/**
 * Zod schema for Amazon item relationships
 */
export const AmazonItemRelationshipsSchema = z.record(
  z.string(),
  z.array(
    z.object({
      type: z.string(),
      identifiers: z
        .array(
          z.object({
            identifier: z.string(),
            identifierType: z.string(),
          })
        )
        .optional(),
    })
  )
);

/**
 * Zod schema for Amazon catalog item
 */
export const AmazonCatalogItemSchema = z.object({
  asin: z.string().min(1),
  attributes: AmazonItemAttributesSchema.optional(),
  identifiers: AmazonItemIdentifiersSchema.optional(),
  relationships: AmazonItemRelationshipsSchema.optional(),
  salesRanks: z
    .record(
      z.string(),
      z.array(
        z.object({
          rank: z.number(),
          title: z.string(),
        })
      )
    )
    .optional(),
});

/**
 * Zod schema for Amazon listings item
 */
export const AmazonListingsItemSchema = z.object({
  sku: z.string().min(1),
  productType: z.string().min(1),
  attributes: AmazonItemAttributesSchema,
  status: z.string().optional(),
  fulfillmentAvailability: z
    .array(
      z.object({
        fulfillmentChannelCode: z.string(),
        quantity: z.number().optional(),
      })
    )
    .optional(),
});

/**
 * Zod schema for Amazon inventory summary
 */
export const AmazonInventorySummarySchema = z.object({
  asin: z.string().optional(),
  sellerSku: z.string().optional(),
  condition: z.string().optional(),
  inventoryDetails: z
    .object({
      fulfillableQuantity: z.number().optional(),
      inboundWorkingQuantity: z.number().optional(),
      inboundShippedQuantity: z.number().optional(),
      inboundReceivingQuantity: z.number().optional(),
    })
    .optional(),
});

/**
 * Zod schema for Amazon order
 */
export const AmazonOrderSchema = z.object({
  amazonOrderId: z.string().min(1),
  purchaseDate: z.string(),
  orderStatus: z.string(),
  orderTotal: z
    .object({
      currencyCode: z.string(),
      amount: z.string(),
    })
    .optional(),
  marketplaceId: z.string(),
  shippingAddress: z
    .object({
      name: z.string().optional(),
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      stateOrRegion: z.string().optional(),
      postalCode: z.string().optional(),
      countryCode: z.string().optional(),
    })
    .optional(),
});

/**
 * Zod schema for Amazon report
 */
export const AmazonReportSchema = z.object({
  reportId: z.string().min(1),
  reportType: z.string().min(1),
  processingStatus: z.string(),
  createdTime: z.string(),
  reportDocumentId: z.string().optional(),
});

/**
 * Zod schema for inventory filter parameters
 */
export const InventoryFilterParamsSchema = z.object({
  nextToken: z.string().optional(),
  granularityType: z.string().optional(),
  granularityId: z.string().optional(),
  startDateTime: z.union([z.string(), z.date()]).optional(),
  endDateTime: z.union([z.string(), z.date()]).optional(),
  marketplaceIds: z.array(z.string()).optional(),
  sellerSkus: z.array(z.string()).optional(),
  asins: z.array(z.string()).optional(),
  fulfillmentChannels: z.array(z.string()).optional(),
});

/**
 * Zod schema for orders filter parameters
 */
export const OrdersFilterParamsSchema = z.object({
  nextToken: z.string().optional(),
  marketplaceIds: z.array(z.string()).optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  orderStatuses: z.array(z.string()).optional(),
  fulfillmentChannels: z.array(z.string()).optional(),
  buyerEmail: z.string().optional(),
});

/**
 * Zod schema for reports filter parameters
 */
export const ReportsFilterParamsSchema = z.object({
  nextToken: z.string().optional(),
  reportTypes: z.array(z.string()).optional(),
  processingStatuses: z.array(z.string()).optional(),
  marketplaceIds: z.array(z.string()).optional(),
  createdSince: z.string().optional(),
  createdUntil: z.string().optional(),
});

/**
 * Validates Amazon catalog item data
 */
export function validateAmazonCatalogItem(data: unknown): AmazonCatalogItem {
  try {
    return AmazonCatalogItemSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError('Invalid Amazon catalog item data', 'AmazonCatalogItem', error);
    }
    throw error;
  }
}

/**
 * Validates Amazon listings item data
 */
export function validateAmazonListingsItem(data: unknown): AmazonListingsItem {
  try {
    return AmazonListingsItemSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError(
        'Invalid Amazon listings item data',
        'AmazonListingsItem',
        error
      );
    }
    throw error;
  }
}

/**
 * Validates Amazon inventory summary data
 */
export function validateAmazonInventorySummary(data: unknown): AmazonInventorySummary {
  try {
    return AmazonInventorySummarySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError(
        'Invalid Amazon inventory summary data',
        'AmazonInventorySummary',
        error
      );
    }
    throw error;
  }
}

/**
 * Validates Amazon order data
 */
export function validateAmazonOrder(data: unknown): AmazonOrder {
  try {
    return AmazonOrderSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError('Invalid Amazon order data', 'AmazonOrder', error);
    }
    throw error;
  }
}

/**
 * Validates Amazon report data
 */
export function validateAmazonReport(data: unknown): AmazonReport {
  try {
    return AmazonReportSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError('Invalid Amazon report data', 'AmazonReport', error);
    }
    throw error;
  }
}

/**
 * Validates inventory filter parameters
 */
export function validateInventoryFilterParams(data: unknown): InventoryFilterParams {
  try {
    return InventoryFilterParamsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError(
        'Invalid inventory filter parameters',
        'InventoryFilterParams',
        error
      );
    }
    throw error;
  }
}

/**
 * Validates orders filter parameters
 */
export function validateOrdersFilterParams(data: unknown): OrdersFilterParams {
  try {
    return OrdersFilterParamsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError(
        'Invalid orders filter parameters',
        'OrdersFilterParams',
        error
      );
    }
    throw error;
  }
}

/**
 * Validates reports filter parameters
 */
export function validateReportsFilterParams(data: unknown): ReportsFilterParams {
  try {
    return ReportsFilterParamsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TypeValidationError(
        'Invalid reports filter parameters',
        'ReportsFilterParams',
        error
      );
    }
    throw error;
  }
}
