/**
 * Amazon Selling Partner API response types
 */

/**
 * Amazon item attributes structure
 */
export interface AmazonItemAttributes {
  /** Product title */
  title?: string;
  /** Product description */
  description?: string;
  /** Brand name */
  brand?: string;
  /** Product dimensions */
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  /** Product images */
  images?: Array<{
    variant: string;
    link: string;
  }>;
  /** Additional attributes */
  [key: string]: string | number | boolean | object | undefined;
}

/**
 * Amazon item identifiers structure
 */
export interface AmazonItemIdentifiers {
  [marketplace: string]: Array<{
    identifier: string;
    identifierType: string;
    marketplaceId?: string;
  }>;
}

/**
 * Amazon item relationships structure
 */
export interface AmazonItemRelationships {
  [marketplace: string]: Array<{
    type: string;
    identifiers?: Array<{
      identifier: string;
      identifierType: string;
    }>;
  }>;
}

/**
 * Amazon catalog item response
 */
export interface AmazonCatalogItem {
  /** Item ASIN */
  asin: string;
  /** Item attributes */
  attributes?: AmazonItemAttributes;
  /** Item identifiers */
  identifiers?: AmazonItemIdentifiers;
  /** Item relationships */
  relationships?: AmazonItemRelationships;
  /** Sales ranks */
  salesRanks?: {
    [marketplace: string]: Array<{
      rank: number;
      title: string;
    }>;
  };
}

/**
 * Amazon listings item response
 */
export interface AmazonListingsItem {
  /** SKU */
  sku: string;
  /** Product type */
  productType: string;
  /** Item attributes */
  attributes: AmazonItemAttributes;
  /** Status */
  status?: string;
  /** Fulfillment availability */
  fulfillmentAvailability?: Array<{
    fulfillmentChannelCode: string;
    quantity?: number;
  }>;
}

/**
 * Amazon inventory summary response
 */
export interface AmazonInventorySummary {
  /** ASIN */
  asin?: string;
  /** SKU */
  sellerSku?: string;
  /** Condition */
  condition?: string;
  /** Inventory details */
  inventoryDetails?: {
    fulfillableQuantity?: number;
    inboundWorkingQuantity?: number;
    inboundShippedQuantity?: number;
    inboundReceivingQuantity?: number;
  };
}

/**
 * Amazon order response
 */
export interface AmazonOrder {
  /** Amazon order ID */
  amazonOrderId: string;
  /** Purchase date */
  purchaseDate: string;
  /** Order status */
  orderStatus: string;
  /** Order total */
  orderTotal?: {
    currencyCode: string;
    amount: string;
  };
  /** Marketplace ID */
  marketplaceId: string;
  /** Shipping address */
  shippingAddress?: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateOrRegion?: string;
    postalCode?: string;
    countryCode?: string;
  };
}

/**
 * Amazon report response
 */
export interface AmazonReport {
  /** Report ID */
  reportId: string;
  /** Report type */
  reportType: string;
  /** Processing status */
  processingStatus: string;
  /** Created time */
  createdTime: string;
  /** Report document ID */
  reportDocumentId?: string;
}

/**
 * Filter parameters for inventory resources
 */
export interface InventoryFilterParams {
  /** Next token for pagination */
  nextToken?: string;
  /** Granularity type */
  granularityType?: string;
  /** Granularity ID */
  granularityId?: string;
  /** Start date time */
  startDateTime?: string | Date;
  /** End date time */
  endDateTime?: string | Date;
  /** Marketplace IDs */
  marketplaceIds?: string[];
  /** Seller SKUs */
  sellerSkus?: string[];
  /** ASINs */
  asins?: string[];
  /** Fulfillment channels */
  fulfillmentChannels?: string[];
}

/**
 * Filter parameters for orders resources
 */
export interface OrdersFilterParams {
  /** Next token for pagination */
  nextToken?: string;
  /** Marketplace IDs */
  marketplaceIds?: string[];
  /** Created after date */
  createdAfter?: string;
  /** Created before date */
  createdBefore?: string;
  /** Order statuses */
  orderStatuses?: string[];
  /** Fulfillment channels */
  fulfillmentChannels?: string[];
  /** Buyer email */
  buyerEmail?: string;
}

/**
 * Filter parameters for reports resources
 */
export interface ReportsFilterParams {
  /** Next token for pagination */
  nextToken?: string;
  /** Report types */
  reportTypes?: string[];
  /** Processing statuses */
  processingStatuses?: string[];
  /** Marketplace IDs */
  marketplaceIds?: string[];
  /** Created since date */
  createdSince?: string;
  /** Created until date */
  createdUntil?: string;
}

/**
 * Tool content response structure
 */
export interface ToolContentResponse {
  /** Content type */
  type: 'text' | 'image' | 'resource' | 'resource_link';
  /** Content text */
  text?: string;
  /** Content data */
  data?: string;
  /** MIME type for non-text content */
  mimeType?: string;
  /** Resource URI for resource_link type */
  uri?: string;
  /** Resource name for resource_link type */
  name?: string;
  /** Resource description for resource_link type */
  description?: string;
}

/**
 * Order update details
 */
export interface OrderUpdateDetails {
  /** Tracking number */
  trackingNumber?: string;
  /** Carrier code */
  carrierCode?: string;
  /** Shipping date */
  shippingDate?: string;
  /** Cancellation reason */
  cancellationReason?: string;
  /** Additional notes */
  notes?: string;
}
