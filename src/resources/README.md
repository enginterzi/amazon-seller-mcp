# Amazon Seller MCP Client Resources

This directory contains resource implementations for the Amazon Seller MCP Client.

Resources are MCP entities that represent Amazon Selling Partner API data structures. They are exposed through URI templates and can be accessed by AI agents through the MCP protocol.

## Resource Types

The following resource types are implemented:

- **Catalog Resources**: Product catalog information
- **Listings Resources**: Seller product listings
- **Inventory Resources**: Inventory levels and management
- **Orders Resources**: Order information and processing
- **Reports Resources**: Report generation and retrieval

## Resource URI Templates

Resources are accessed through URI templates with the following patterns:

- Catalog: `amazon-catalog://{asin}`
- Listings: `amazon-listings://{sellerId}/{sku}`
- Inventory: `amazon-inventory://{sellerId}/{sku}`
- Orders: `amazon-order://{orderId}`
- Reports: `amazon-report://{reportId}`

## Resource Registration

Resources are registered with the MCP server using the `registerResource` method. Each resource type has its own registration function in its respective directory.

Example:

```typescript
registerCatalogResources(
  resourceManager,
  {
    credentials: config.credentials,
    region: config.region,
    marketplaceId: config.marketplaceId
  }
);
```