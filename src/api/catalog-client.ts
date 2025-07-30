/**
 * Catalog API client for Amazon Selling Partner API
 */

import { BaseApiClient } from './base-client.js';
import { ApiRequestOptions } from '../types/api.js';
import { AuthConfig } from '../types/auth.js';

/**
 * Parameters for retrieving a catalog item
 */
export interface GetCatalogItemParams {
  /**
   * Amazon Standard Identification Number (ASIN)
   */
  asin: string;

  /**
   * List of included data sets
   */
  includedData?: Array<
    | 'attributes'
    | 'identifiers'
    | 'images'
    | 'productTypes'
    | 'relationships'
    | 'salesRanks'
    | 'summaries'
    | 'variations'
  >;

  /**
   * Locale for localized fields
   */
  locale?: string;
}

/**
 * Parameters for searching catalog items
 */
export interface SearchCatalogItemsParams {
  /**
   * Search keywords
   */
  keywords?: string;

  /**
   * List of brand names
   */
  brandNames?: string[];

  /**
   * List of classification IDs
   */
  classificationIds?: string[];

  /**
   * Page size (1-20)
   */
  pageSize?: number;

  /**
   * Page token for pagination
   */
  pageToken?: string;

  /**
   * List of included data sets
   */
  includedData?: Array<
    | 'attributes'
    | 'identifiers'
    | 'images'
    | 'productTypes'
    | 'relationships'
    | 'salesRanks'
    | 'summaries'
    | 'variations'
  >;

  /**
   * Locale for localized fields
   */
  locale?: string;
}

/**
 * Catalog item image
 */
export interface CatalogItemImage {
  /**
   * Image URL
   */
  link: string;

  /**
   * Image height
   */
  height: number;

  /**
   * Image width
   */
  width: number;
}

/**
 * Catalog item sales rank
 */
export interface CatalogItemSalesRank {
  /**
   * Sales rank title
   */
  title: string;

  /**
   * Sales rank link
   */
  link: string;

  /**
   * Sales rank
   */
  rank: number;
}

/**
 * Catalog item summary
 */
export interface CatalogItemSummary {
  /**
   * Marketplace ID
   */
  marketplaceId: string;

  /**
   * Brand name
   */
  brandName?: string;

  /**
   * Color name
   */
  colorName?: string;

  /**
   * Item name
   */
  itemName?: string;

  /**
   * Manufacturer
   */
  manufacturer?: string;

  /**
   * Model number
   */
  modelNumber?: string;
}

/**
 * Catalog item
 */
export interface CatalogItem {
  /**
   * Amazon Standard Identification Number (ASIN)
   */
  asin: string;

  /**
   * Item attributes
   */
  attributes?: Record<string, any>;

  /**
   * Item identifiers
   */
  identifiers?: Record<string, any>;

  /**
   * Item images
   */
  images?: Record<string, CatalogItemImage[]>;

  /**
   * Product types
   */
  productTypes?: Record<string, string>;

  /**
   * Item relationships
   */
  relationships?: Record<string, any>;

  /**
   * Sales ranks
   */
  salesRanks?: Record<string, CatalogItemSalesRank[]>;

  /**
   * Item summaries
   */
  summaries?: CatalogItemSummary[];
}

/**
 * Catalog item search result
 */
export interface CatalogItemSearchResult {
  /**
   * Number of results
   */
  numberOfResults: number;

  /**
   * Pagination token
   */
  pagination?: {
    /**
     * Next page token
     */
    nextToken?: string;

    /**
     * Previous page token
     */
    previousToken?: string;
  };

  /**
   * Refinements
   */
  refinements?: {
    /**
     * Brands
     */
    brands?: Array<{
      /**
       * Brand name
       */
      name: string;

      /**
       * Number of results
       */
      numberOfResults: number;
    }>;

    /**
     * Classifications
     */
    classifications?: Array<{
      /**
       * Classification ID
       */
      id: string;

      /**
       * Classification name
       */
      name: string;

      /**
       * Number of results
       */
      numberOfResults: number;
    }>;
  };

  /**
   * Search items
   */
  items: CatalogItem[];
}

/**
 * Catalog API client for Amazon Selling Partner API
 */
export class CatalogClient extends BaseApiClient {
  /**
   * API version
   */
  private readonly apiVersion = 'catalog/2022-04-01';

  /**
   * Create a new CatalogClient instance
   *
   * @param authConfig Authentication configuration
   */
  constructor(authConfig: AuthConfig) {
    super(authConfig);
  }

  /**
   * Get a catalog item by ASIN
   *
   * @param params Parameters for retrieving a catalog item
   * @returns Promise resolving to the catalog item
   */
  public async getCatalogItem(params: GetCatalogItemParams): Promise<CatalogItem> {
    const { asin, includedData, locale } = params;

    // Build query parameters
    const query: Record<string, string | string[] | undefined> = {};

    if (includedData && includedData.length > 0) {
      query.includedData = includedData;
    }

    if (locale) {
      query.locale = locale;
    }

    // Add marketplace ID
    query.marketplaceIds = this.config.marketplaceId;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/items/${asin}`,
      query: query as Record<string, string | number | boolean | undefined>,
    };

    // Use cache for catalog items (5 minutes TTL)
    const cacheKey = `catalog:item:${asin}:${this.config.marketplaceId}:${JSON.stringify(includedData)}:${locale || 'default'}`;

    return this.withCache<CatalogItem>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: CatalogItem }>(requestOptions);
        return response.data.payload;
      },
      300 // 5 minutes TTL
    );
  }

  /**
   * Search catalog items
   *
   * @param params Parameters for searching catalog items
   * @returns Promise resolving to the search results
   */
  public async searchCatalogItems(
    params: SearchCatalogItemsParams
  ): Promise<CatalogItemSearchResult> {
    const { keywords, brandNames, classificationIds, pageSize, pageToken, includedData, locale } =
      params;

    // Build query parameters
    const query: Record<string, string | string[] | number | undefined> = {};

    if (keywords) {
      query.keywords = keywords;
    }

    if (brandNames && brandNames.length > 0) {
      query.brandNames = brandNames;
    }

    if (classificationIds && classificationIds.length > 0) {
      query.classificationIds = classificationIds;
    }

    if (pageSize) {
      query.pageSize = Math.min(20, Math.max(1, pageSize)); // Ensure pageSize is between 1 and 20
    }

    if (pageToken) {
      query.pageToken = pageToken;
    }

    if (includedData && includedData.length > 0) {
      query.includedData = includedData;
    }

    if (locale) {
      query.locale = locale;
    }

    // Add marketplace ID
    query.marketplaceIds = this.config.marketplaceId;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/items`,
      query: query as Record<string, string | number | boolean | undefined>,
    };

    // Don't cache search results as they may change frequently
    const response = await this.request<{ payload: CatalogItemSearchResult }>(requestOptions);
    return response.data.payload;
  }
}
