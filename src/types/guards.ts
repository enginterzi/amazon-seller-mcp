/**
 * Type guard functions for runtime type checking
 */

import type {
  AmazonCatalogItem,
  AmazonListingsItem,
  AmazonInventorySummary,
  AmazonOrder,
  AmazonReport,
  InventoryFilterParams,
  OrdersFilterParams,
  ReportsFilterParams,
  AmazonItemAttributes,
  AmazonItemIdentifiers,
  AmazonItemRelationships,
  ToolContentResponse,
  OrderUpdateDetails,
} from './amazon-api.js';
import type {
  ErrorDetails,
  LogMetadata,
  ErrorRecoveryContext,
  McpRequestBody,
  NotificationData,
  HttpRequest,
  HttpResponse,
  ToolInput,
} from './common.js';

/**
 * Type guard for Amazon item attributes
 */
export function isAmazonItemAttributes(obj: unknown): obj is AmazonItemAttributes {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const attrs = obj as Record<string, unknown>;

  // Check Amazon API format attributes
  if (attrs.item_name !== undefined) {
    if (!Array.isArray(attrs.item_name)) {
      return false;
    }
    for (const item of attrs.item_name) {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const itemObj = item as Record<string, unknown>;
      if (typeof itemObj.value !== 'string' || typeof itemObj.language_tag !== 'string') {
        return false;
      }
    }
  }

  if (attrs.brand !== undefined) {
    // Support both legacy format (string) and Amazon API format (array)
    if (typeof attrs.brand === 'string') {
      // Legacy format - valid
    } else if (Array.isArray(attrs.brand)) {
      // Amazon API format
      for (const brand of attrs.brand) {
        if (typeof brand !== 'object' || brand === null) {
          return false;
        }
        const brandObj = brand as Record<string, unknown>;
        if (typeof brandObj.value !== 'string' || typeof brandObj.language_tag !== 'string') {
          return false;
        }
      }
    } else {
      return false;
    }
  }

  if (attrs.list_price !== undefined) {
    if (!Array.isArray(attrs.list_price)) {
      return false;
    }
    for (const price of attrs.list_price) {
      if (typeof price !== 'object' || price === null) {
        return false;
      }
      const priceObj = price as Record<string, unknown>;
      if (typeof priceObj.value !== 'number' || typeof priceObj.currency !== 'string') {
        return false;
      }
    }
  }

  // Check legacy format properties
  if (attrs.title !== undefined && typeof attrs.title !== 'string') {
    return false;
  }
  if (attrs.description !== undefined && typeof attrs.description !== 'string') {
    return false;
  }

  // Check dimensions structure if present
  if (attrs.dimensions !== undefined) {
    if (typeof attrs.dimensions !== 'object' || attrs.dimensions === null) {
      return false;
    }
    const dims = attrs.dimensions as Record<string, unknown>;
    if (dims.length !== undefined && typeof dims.length !== 'number') {
      return false;
    }
    if (dims.width !== undefined && typeof dims.width !== 'number') {
      return false;
    }
    if (dims.height !== undefined && typeof dims.height !== 'number') {
      return false;
    }
    if (dims.weight !== undefined && typeof dims.weight !== 'number') {
      return false;
    }
  }

  // Check images array structure if present
  if (attrs.images !== undefined) {
    if (!Array.isArray(attrs.images)) {
      return false;
    }
    for (const image of attrs.images) {
      if (typeof image !== 'object' || image === null) {
        return false;
      }
      const img = image as Record<string, unknown>;
      if (typeof img.variant !== 'string' || typeof img.link !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type guard for Amazon item identifiers
 */
export function isAmazonItemIdentifiers(obj: unknown): obj is AmazonItemIdentifiers {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const identifiers = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(identifiers)) {
    if (typeof key !== 'string' || !Array.isArray(value)) {
      return false;
    }

    for (const identifier of value) {
      if (typeof identifier !== 'object' || identifier === null) {
        return false;
      }
      const id = identifier as Record<string, unknown>;
      if (typeof id.identifier !== 'string' || typeof id.identifierType !== 'string') {
        return false;
      }
      if (id.marketplaceId !== undefined && typeof id.marketplaceId !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type guard for Amazon item relationships
 */
export function isAmazonItemRelationships(obj: unknown): obj is AmazonItemRelationships {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const relationships = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(relationships)) {
    if (typeof key !== 'string' || !Array.isArray(value)) {
      return false;
    }

    for (const relationship of value) {
      if (typeof relationship !== 'object' || relationship === null) {
        return false;
      }
      const rel = relationship as Record<string, unknown>;
      if (typeof rel.type !== 'string') {
        return false;
      }

      if (rel.identifiers !== undefined) {
        if (!Array.isArray(rel.identifiers)) {
          return false;
        }
        for (const identifier of rel.identifiers) {
          if (typeof identifier !== 'object' || identifier === null) {
            return false;
          }
          const id = identifier as Record<string, unknown>;
          if (typeof id.identifier !== 'string' || typeof id.identifierType !== 'string') {
            return false;
          }
        }
      }
    }
  }

  return true;
}

/**
 * Type guard for Amazon catalog item
 */
export function isAmazonCatalogItem(obj: unknown): obj is AmazonCatalogItem {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const item = obj as Record<string, unknown>;

  // Check required ASIN property
  if (typeof item.asin !== 'string') {
    return false;
  }

  // Check optional properties
  if (item.attributes !== undefined && !isAmazonItemAttributes(item.attributes)) {
    return false;
  }
  if (item.identifiers !== undefined && !isAmazonItemIdentifiers(item.identifiers)) {
    return false;
  }
  if (item.relationships !== undefined && !isAmazonItemRelationships(item.relationships)) {
    return false;
  }

  // Check salesRanks structure if present
  if (item.salesRanks !== undefined) {
    if (typeof item.salesRanks !== 'object' || item.salesRanks === null) {
      return false;
    }
    const salesRanks = item.salesRanks as Record<string, unknown>;
    for (const [key, value] of Object.entries(salesRanks)) {
      if (typeof key !== 'string' || !Array.isArray(value)) {
        return false;
      }
      for (const rank of value) {
        if (typeof rank !== 'object' || rank === null) {
          return false;
        }
        const r = rank as Record<string, unknown>;
        if (typeof r.rank !== 'number' || typeof r.title !== 'string') {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Type guard for Amazon listings item
 */
export function isAmazonListingsItem(obj: unknown): obj is AmazonListingsItem {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const item = obj as Record<string, unknown>;

  // Check required properties
  if (typeof item.sku !== 'string' || typeof item.productType !== 'string') {
    return false;
  }

  if (!isAmazonItemAttributes(item.attributes)) {
    return false;
  }

  // Check optional properties
  if (item.status !== undefined && typeof item.status !== 'string') {
    return false;
  }

  if (item.fulfillmentAvailability !== undefined) {
    if (!Array.isArray(item.fulfillmentAvailability)) {
      return false;
    }
    for (const availability of item.fulfillmentAvailability) {
      if (typeof availability !== 'object' || availability === null) {
        return false;
      }
      const avail = availability as Record<string, unknown>;
      if (typeof avail.fulfillmentChannelCode !== 'string') {
        return false;
      }
      if (avail.quantity !== undefined && typeof avail.quantity !== 'number') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type guard for Amazon inventory summary
 */
export function isAmazonInventorySummary(obj: unknown): obj is AmazonInventorySummary {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const summary = obj as Record<string, unknown>;

  // Check optional properties
  if (summary.asin !== undefined && typeof summary.asin !== 'string') {
    return false;
  }
  if (summary.sellerSku !== undefined && typeof summary.sellerSku !== 'string') {
    return false;
  }
  if (summary.condition !== undefined && typeof summary.condition !== 'string') {
    return false;
  }

  // Check inventoryDetails structure if present
  if (summary.inventoryDetails !== undefined) {
    if (typeof summary.inventoryDetails !== 'object' || summary.inventoryDetails === null) {
      return false;
    }
    const details = summary.inventoryDetails as Record<string, unknown>;
    if (
      details.fulfillableQuantity !== undefined &&
      typeof details.fulfillableQuantity !== 'number'
    ) {
      return false;
    }
    if (
      details.inboundWorkingQuantity !== undefined &&
      typeof details.inboundWorkingQuantity !== 'number'
    ) {
      return false;
    }
    if (
      details.inboundShippedQuantity !== undefined &&
      typeof details.inboundShippedQuantity !== 'number'
    ) {
      return false;
    }
    if (
      details.inboundReceivingQuantity !== undefined &&
      typeof details.inboundReceivingQuantity !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for Amazon order
 */
export function isAmazonOrder(obj: unknown): obj is AmazonOrder {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const order = obj as Record<string, unknown>;

  // Check required properties
  if (
    typeof order.amazonOrderId !== 'string' ||
    typeof order.purchaseDate !== 'string' ||
    typeof order.orderStatus !== 'string' ||
    typeof order.marketplaceId !== 'string'
  ) {
    return false;
  }

  // Check optional orderTotal structure
  if (order.orderTotal !== undefined) {
    if (typeof order.orderTotal !== 'object' || order.orderTotal === null) {
      return false;
    }
    const total = order.orderTotal as Record<string, unknown>;
    if (typeof total.currencyCode !== 'string' || typeof total.amount !== 'string') {
      return false;
    }
  }

  // Check optional shippingAddress structure
  if (order.shippingAddress !== undefined) {
    if (typeof order.shippingAddress !== 'object' || order.shippingAddress === null) {
      return false;
    }
    const address = order.shippingAddress as Record<string, unknown>;
    if (address.name !== undefined && typeof address.name !== 'string') {
      return false;
    }
    if (address.addressLine1 !== undefined && typeof address.addressLine1 !== 'string') {
      return false;
    }
    if (address.addressLine2 !== undefined && typeof address.addressLine2 !== 'string') {
      return false;
    }
    if (address.city !== undefined && typeof address.city !== 'string') {
      return false;
    }
    if (address.stateOrRegion !== undefined && typeof address.stateOrRegion !== 'string') {
      return false;
    }
    if (address.postalCode !== undefined && typeof address.postalCode !== 'string') {
      return false;
    }
    if (address.countryCode !== undefined && typeof address.countryCode !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for Amazon report
 */
export function isAmazonReport(obj: unknown): obj is AmazonReport {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const report = obj as Record<string, unknown>;

  // Check required properties
  if (
    typeof report.reportId !== 'string' ||
    typeof report.reportType !== 'string' ||
    typeof report.processingStatus !== 'string' ||
    typeof report.createdTime !== 'string'
  ) {
    return false;
  }

  // Check optional properties
  if (report.reportDocumentId !== undefined && typeof report.reportDocumentId !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for inventory filter parameters
 */
export function isInventoryFilterParams(obj: unknown): obj is InventoryFilterParams {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const params = obj as Record<string, unknown>;

  // Check optional string properties
  if (params.nextToken !== undefined && typeof params.nextToken !== 'string') {
    return false;
  }
  if (params.granularityType !== undefined && typeof params.granularityType !== 'string') {
    return false;
  }
  if (params.granularityId !== undefined && typeof params.granularityId !== 'string') {
    return false;
  }

  // Check optional date properties
  if (
    params.startDateTime !== undefined &&
    typeof params.startDateTime !== 'string' &&
    !(params.startDateTime instanceof Date)
  ) {
    return false;
  }
  if (
    params.endDateTime !== undefined &&
    typeof params.endDateTime !== 'string' &&
    !(params.endDateTime instanceof Date)
  ) {
    return false;
  }

  // Check optional array properties
  if (params.marketplaceIds !== undefined) {
    if (
      !Array.isArray(params.marketplaceIds) ||
      !params.marketplaceIds.every((id) => typeof id === 'string')
    ) {
      return false;
    }
  }
  if (params.sellerSkus !== undefined) {
    if (
      !Array.isArray(params.sellerSkus) ||
      !params.sellerSkus.every((sku) => typeof sku === 'string')
    ) {
      return false;
    }
  }
  if (params.asins !== undefined) {
    if (!Array.isArray(params.asins) || !params.asins.every((asin) => typeof asin === 'string')) {
      return false;
    }
  }
  if (params.fulfillmentChannels !== undefined) {
    if (
      !Array.isArray(params.fulfillmentChannels) ||
      !params.fulfillmentChannels.every((channel) => typeof channel === 'string')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for orders filter parameters
 */
export function isOrdersFilterParams(obj: unknown): obj is OrdersFilterParams {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const params = obj as Record<string, unknown>;

  // Check optional string properties
  if (params.nextToken !== undefined && typeof params.nextToken !== 'string') {
    return false;
  }
  if (params.createdAfter !== undefined && typeof params.createdAfter !== 'string') {
    return false;
  }
  if (params.createdBefore !== undefined && typeof params.createdBefore !== 'string') {
    return false;
  }
  if (params.buyerEmail !== undefined && typeof params.buyerEmail !== 'string') {
    return false;
  }

  // Check optional array properties
  if (params.marketplaceIds !== undefined) {
    if (
      !Array.isArray(params.marketplaceIds) ||
      !params.marketplaceIds.every((id) => typeof id === 'string')
    ) {
      return false;
    }
  }
  if (params.orderStatuses !== undefined) {
    if (
      !Array.isArray(params.orderStatuses) ||
      !params.orderStatuses.every((status) => typeof status === 'string')
    ) {
      return false;
    }
  }
  if (params.fulfillmentChannels !== undefined) {
    if (
      !Array.isArray(params.fulfillmentChannels) ||
      !params.fulfillmentChannels.every((channel) => typeof channel === 'string')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for reports filter parameters
 */
export function isReportsFilterParams(obj: unknown): obj is ReportsFilterParams {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const params = obj as Record<string, unknown>;

  // Check optional string properties
  if (params.nextToken !== undefined && typeof params.nextToken !== 'string') {
    return false;
  }
  if (params.createdSince !== undefined && typeof params.createdSince !== 'string') {
    return false;
  }
  if (params.createdUntil !== undefined && typeof params.createdUntil !== 'string') {
    return false;
  }

  // Check optional array properties
  if (params.reportTypes !== undefined) {
    if (
      !Array.isArray(params.reportTypes) ||
      !params.reportTypes.every((type) => typeof type === 'string')
    ) {
      return false;
    }
  }
  if (params.processingStatuses !== undefined) {
    if (
      !Array.isArray(params.processingStatuses) ||
      !params.processingStatuses.every((status) => typeof status === 'string')
    ) {
      return false;
    }
  }
  if (params.marketplaceIds !== undefined) {
    if (
      !Array.isArray(params.marketplaceIds) ||
      !params.marketplaceIds.every((id) => typeof id === 'string')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for tool content response
 */
export function isToolContentResponse(obj: unknown): obj is ToolContentResponse {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const response = obj as Record<string, unknown>;

  // Check required type property
  if (
    typeof response.type !== 'string' ||
    !['text', 'image', 'resource', 'resource_link'].includes(response.type)
  ) {
    return false;
  }

  // Check optional properties
  if (response.text !== undefined && typeof response.text !== 'string') {
    return false;
  }
  if (response.data !== undefined && typeof response.data !== 'string') {
    return false;
  }
  if (response.mimeType !== undefined && typeof response.mimeType !== 'string') {
    return false;
  }
  if (response.uri !== undefined && typeof response.uri !== 'string') {
    return false;
  }
  if (response.name !== undefined && typeof response.name !== 'string') {
    return false;
  }
  if (response.description !== undefined && typeof response.description !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for order update details
 */
export function isOrderUpdateDetails(obj: unknown): obj is OrderUpdateDetails {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const details = obj as Record<string, unknown>;

  // Check optional properties
  if (details.trackingNumber !== undefined && typeof details.trackingNumber !== 'string') {
    return false;
  }
  if (details.carrierCode !== undefined && typeof details.carrierCode !== 'string') {
    return false;
  }
  if (details.shippingDate !== undefined && typeof details.shippingDate !== 'string') {
    return false;
  }
  if (details.cancellationReason !== undefined && typeof details.cancellationReason !== 'string') {
    return false;
  }
  if (details.notes !== undefined && typeof details.notes !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for error details
 */
export function isErrorDetails(obj: unknown): obj is ErrorDetails {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const error = obj as Record<string, unknown>;

  // Check optional properties
  if (error.code !== undefined && typeof error.code !== 'string') {
    return false;
  }
  if (error.statusCode !== undefined && typeof error.statusCode !== 'number') {
    return false;
  }
  if (error.requestId !== undefined && typeof error.requestId !== 'string') {
    return false;
  }
  if (error.timestamp !== undefined && typeof error.timestamp !== 'string') {
    return false;
  }

  // Check headers structure if present
  if (error.headers !== undefined) {
    if (typeof error.headers !== 'object' || error.headers === null) {
      return false;
    }
    const headers = error.headers as Record<string, unknown>;
    for (const [key, value] of Object.entries(headers)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Type guard for log metadata
 */
export function isLogMetadata(obj: unknown): obj is LogMetadata {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const metadata = obj as Record<string, unknown>;

  // Check optional properties
  if (metadata.requestId !== undefined && typeof metadata.requestId !== 'string') {
    return false;
  }
  if (metadata.userId !== undefined && typeof metadata.userId !== 'string') {
    return false;
  }
  if (metadata.operation !== undefined && typeof metadata.operation !== 'string') {
    return false;
  }
  if (metadata.duration !== undefined && typeof metadata.duration !== 'number') {
    return false;
  }
  if (metadata.statusCode !== undefined && typeof metadata.statusCode !== 'number') {
    return false;
  }
  if (metadata.errorCode !== undefined && typeof metadata.errorCode !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for error recovery context
 */
export function isErrorRecoveryContext(obj: unknown): obj is ErrorRecoveryContext {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const context = obj as Record<string, unknown>;

  // Check optional properties
  if (
    context.operation !== undefined &&
    typeof context.operation !== 'function' &&
    typeof context.operation !== 'string'
  ) {
    return false;
  }

  if (context.params !== undefined) {
    if (typeof context.params !== 'object' || context.params === null) {
      return false;
    }
  }

  if (context.retryCount !== undefined && typeof context.retryCount !== 'number') {
    return false;
  }
  if (context.maxRetries !== undefined && typeof context.maxRetries !== 'number') {
    return false;
  }
  if (context.requestId !== undefined && typeof context.requestId !== 'string') {
    return false;
  }
  if (context.shouldRetry !== undefined && typeof context.shouldRetry !== 'boolean') {
    return false;
  }

  if (context.options !== undefined) {
    if (typeof context.options !== 'object' || context.options === null) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for MCP request body
 */
export function isMcpRequestBody(obj: unknown): obj is McpRequestBody {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const request = obj as Record<string, unknown>;

  // Check required properties
  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return false;
  }

  // Check optional properties
  if (request.params !== undefined) {
    if (typeof request.params !== 'object' || request.params === null) {
      return false;
    }
  }

  if (
    request.id !== undefined &&
    typeof request.id !== 'string' &&
    typeof request.id !== 'number'
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard for notification data
 */
export function isNotificationData(obj: unknown): obj is NotificationData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const notification = obj as Record<string, unknown>;

  // Check required properties
  if (typeof notification.type !== 'string' || typeof notification.timestamp !== 'string') {
    return false;
  }

  if (typeof notification.payload !== 'object' || notification.payload === null) {
    return false;
  }

  // Check optional properties
  if (notification.source !== undefined && typeof notification.source !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard for HTTP request
 */
export function isHttpRequest(obj: unknown): obj is HttpRequest {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const request = obj as Record<string, unknown>;

  // Check required properties
  if (typeof request.method !== 'string' || typeof request.url !== 'string') {
    return false;
  }

  if (typeof request.headers !== 'object' || request.headers === null) {
    return false;
  }

  // Check optional properties
  if (request.ip !== undefined && typeof request.ip !== 'string') {
    return false;
  }

  // Validate headers structure
  const headers = request.headers as Record<string, unknown>;
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key !== 'string') {
      return false;
    }
    if (value !== undefined && typeof value !== 'string' && !Array.isArray(value)) {
      return false;
    }
    if (Array.isArray(value) && !value.every((v) => typeof v === 'string')) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard for HTTP response
 */
export function isHttpResponse(obj: unknown): obj is HttpResponse {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const response = obj as Record<string, unknown>;

  // Check required properties
  if (typeof response.statusCode !== 'number') {
    return false;
  }

  if (typeof response.on !== 'function') {
    return false;
  }

  return true;
}

/**
 * Type guard for tool input
 */
export function isToolInput(obj: unknown): obj is ToolInput {
  return typeof obj === 'object' && obj !== null;
}
