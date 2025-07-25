/**
 * Listings API client for Amazon Selling Partner API
 */

import { BaseApiClient } from './base-client.js';
import { ApiRequestOptions } from '../types/api.js';
import { AuthConfig } from '../types/auth.js';
import { z } from 'zod';

/**
 * Parameters for retrieving listings
 */
export interface GetListingsParams {
  /**
   * Seller SKU (optional, if not provided, all listings will be returned)
   */
  sku?: string;

  /**
   * List of included data sets
   */
  includedData?: Array<
    'attributes' | 'issues' | 'offers' | 'fulfillmentAvailability' | 'procurement'
  >;

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
 * Parameters for creating or updating a listing
 */
export interface PutListingParams {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Product type
   */
  productType: string;

  /**
   * Product attributes
   */
  attributes: Record<string, any>;

  /**
   * Listing requirements
   */
  requirements?: Array<{
    /**
     * Requirement type
     */
    type: string;

    /**
     * Requirement value
     */
    value: string;
  }>;

  /**
   * Listing fulfillment availability
   */
  fulfillmentAvailability?: Array<{
    /**
     * Fulfillment channel code
     */
    fulfillmentChannelCode: string;

    /**
     * Quantity
     */
    quantity: number;
  }>;
}

/**
 * Parameters for deleting a listing
 */
export interface DeleteListingParams {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Issue locale
   */
  issueLocale?: string;
}

/**
 * Listing identifier
 */
export interface ListingIdentifier {
  /**
   * Marketplace ID
   */
  marketplaceId: string;

  /**
   * Amazon Standard Identification Number (ASIN)
   */
  asin?: string;

  /**
   * Seller ID
   */
  sellerId: string;
}

/**
 * Listing issue
 */
export interface ListingIssue {
  /**
   * Issue code
   */
  code: string;

  /**
   * Issue message
   */
  message: string;

  /**
   * Issue severity
   */
  severity: 'ERROR' | 'WARNING' | 'INFO';

  /**
   * Attribute names related to the issue
   */
  attributeNames?: string[];
}

/**
 * Listing offer
 */
export interface ListingOffer {
  /**
   * Offer price
   */
  price: {
    /**
     * Price amount
     */
    amount: number;

    /**
     * Currency code
     */
    currencyCode: string;
  };

  /**
   * Offer quantity
   */
  quantity: number;
}

/**
 * Listing fulfillment availability
 */
export interface ListingFulfillmentAvailability {
  /**
   * Fulfillment channel code
   */
  fulfillmentChannelCode: string;

  /**
   * Quantity
   */
  quantity: number;
}

/**
 * Listing procurement
 */
export interface ListingProcurement {
  /**
   * Cost price
   */
  costPrice?: {
    /**
     * Price amount
     */
    amount: number;

    /**
     * Currency code
     */
    currencyCode: string;
  };
}

/**
 * Listing
 */
export interface Listing {
  /**
   * Seller SKU
   */
  sku: string;

  /**
   * Listing status
   */
  status: 'ACTIVE' | 'INACTIVE' | 'INCOMPLETE' | 'REMOVED';

  /**
   * Listing identifiers
   */
  identifiers: ListingIdentifier;

  /**
   * Listing attributes
   */
  attributes?: Record<string, any>;

  /**
   * Listing issues
   */
  issues?: ListingIssue[];

  /**
   * Listing offers
   */
  offers?: ListingOffer[];

  /**
   * Listing fulfillment availability
   */
  fulfillmentAvailability?: ListingFulfillmentAvailability[];

  /**
   * Listing procurement
   */
  procurement?: ListingProcurement;
}

/**
 * Listings result
 */
export interface ListingsResult {
  /**
   * Listings
   */
  listings: Listing[];

  /**
   * Next token for pagination
   */
  nextToken?: string;
}

/**
 * Listing submission result
 */
export interface ListingSubmissionResult {
  /**
   * Submission ID
   */
  submissionId: string;

  /**
   * Submission status
   */
  status: 'ACCEPTED' | 'REJECTED';

  /**
   * Submission issues
   */
  issues?: ListingIssue[];
}

/**
 * Listings API client for Amazon Selling Partner API
 */
export class ListingsClient extends BaseApiClient {
  /**
   * API version
   */
  private readonly apiVersion = 'listings/2021-08-01';

  /**
   * Create a new ListingsClient instance
   *
   * @param authConfig Authentication configuration
   */
  constructor(authConfig: AuthConfig) {
    super(authConfig);
  }

  /**
   * Get listings
   *
   * @param params Parameters for retrieving listings
   * @returns Promise resolving to the listings result
   */
  public async getListings(params: GetListingsParams = {}): Promise<ListingsResult> {
    const { sku, includedData, pageSize, nextToken } = params;

    // Build query parameters
    const query: Record<string, string | string[] | number | undefined> = {};

    if (sku) {
      query.sku = sku;
    }

    if (includedData && includedData.length > 0) {
      query.includedData = includedData;
    }

    if (pageSize) {
      query.pageSize = Math.min(100, Math.max(1, pageSize)); // Ensure pageSize is between 1 and 100
    }

    if (nextToken) {
      query.nextToken = nextToken;
    }

    // Add seller ID and marketplace ID
    query.sellerId = 'SELLER_ID'; // This should be retrieved from auth config in a real implementation
    query.marketplaceIds = this.config.marketplaceId;

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'GET',
      path: `/${this.apiVersion}/items`,
      query: query as Record<string, string | number | boolean | undefined>,
    };

    // Use cache for listings (1 minute TTL)
    const cacheKey = `listings:${query.sellerId}:${this.config.marketplaceId}:${sku || 'all'}:${JSON.stringify(includedData)}:${nextToken || 'first'}`;

    return this.withCache<ListingsResult>(
      cacheKey,
      async () => {
        const response = await this.request<{ payload: ListingsResult }>(requestOptions);
        return response.data.payload;
      },
      60 // 1 minute TTL
    );
  }

  /**
   * Get a single listing by SKU
   *
   * @param sku Seller SKU
   * @param includedData List of included data sets
   * @returns Promise resolving to the listing
   */
  public async getListing(
    sku: string,
    includedData?: Array<
      'attributes' | 'issues' | 'offers' | 'fulfillmentAvailability' | 'procurement'
    >
  ): Promise<Listing> {
    const result = await this.getListings({ sku, includedData });

    if (!result.listings || result.listings.length === 0) {
      throw new Error(`Listing with SKU ${sku} not found`);
    }

    return result.listings[0];
  }

  /**
   * Create or update a listing
   *
   * @param params Parameters for creating or updating a listing
   * @returns Promise resolving to the submission result
   */
  public async putListing(params: PutListingParams): Promise<ListingSubmissionResult> {
    const { sku, productType, attributes, requirements, fulfillmentAvailability } = params;

    // Validate listing data
    this.validateListingData(params);

    // Build request body
    const requestBody = {
      productType,
      attributes,
      requirements,
      fulfillmentAvailability,
    };

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'PUT',
      path: `/${this.apiVersion}/items/${sku}`,
      query: {
        marketplaceIds: this.config.marketplaceId,
      },
      data: requestBody,
    };

    const response = await this.request<{ payload: ListingSubmissionResult }>(requestOptions);

    // Clear cache for this SKU
    this.clearCache(`listings:*:${this.config.marketplaceId}:${sku}:*`);

    return response.data.payload;
  }

  /**
   * Delete a listing
   *
   * @param params Parameters for deleting a listing
   * @returns Promise resolving to the submission result
   */
  public async deleteListing(params: DeleteListingParams): Promise<ListingSubmissionResult> {
    const { sku, issueLocale } = params;

    // Build query parameters
    const query: Record<string, string | undefined> = {
      marketplaceIds: this.config.marketplaceId,
    };

    if (issueLocale) {
      query.issueLocale = issueLocale;
    }

    // Make API request
    const requestOptions: ApiRequestOptions = {
      method: 'DELETE',
      path: `/${this.apiVersion}/items/${sku}`,
      query,
    };

    const response = await this.request<{ payload: ListingSubmissionResult }>(requestOptions);

    // Clear cache for this SKU
    this.clearCache(`listings:*:${this.config.marketplaceId}:${sku}:*`);

    return response.data.payload;
  }

  /**
   * Validate listing data
   *
   * @param params Listing parameters to validate
   * @throws Error if validation fails
   */
  private validateListingData(params: PutListingParams): void {
    // Define validation schema using zod
    const listingSchema = z.object({
      sku: z.string().min(1, 'SKU is required'),
      productType: z.string().min(1, 'Product type is required'),
      attributes: z.record(z.any()).refine((attrs) => Object.keys(attrs).length > 0, {
        message: 'At least one attribute is required',
      }),
      requirements: z
        .array(
          z.object({
            type: z.string().min(1, 'Requirement type is required'),
            value: z.string().min(1, 'Requirement value is required'),
          })
        )
        .optional(),
      fulfillmentAvailability: z
        .array(
          z.object({
            fulfillmentChannelCode: z.string().min(1, 'Fulfillment channel code is required'),
            quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
          })
        )
        .optional(),
    });

    try {
      // Validate against schema
      listingSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors
        const formattedErrors = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        throw new Error(`Listing validation failed: ${formattedErrors}`);
      }
      throw error;
    }
  }
}
