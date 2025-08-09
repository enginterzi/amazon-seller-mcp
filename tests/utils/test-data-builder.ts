/**
 * Test data builders for creating consistent test fixtures
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type {
  AmazonCredentials,
  AuthConfig,
  AuthTokens,
  ApiClientConfig,
  ApiResponse,
  RateLimitConfig,
} from '../../src/types/index.js';
import { AmazonRegion, AuthError, AuthErrorType } from '../../src/auth/index.js';
import { ApiError, ApiErrorType } from '../../src/api/index.js';

/**
 * Test data builder for creating test fixtures
 */
export class TestDataBuilder {
  /**
   * Create Amazon credentials for testing
   */
  static createCredentials(overrides: Partial<AmazonCredentials> = {}): AmazonCredentials {
    return {
      clientId: 'amzn1.application-oa2-client.test123',
      clientSecret: 'test-client-secret-12345',
      refreshToken: 'Atzr|IwEBItest-refresh-token-12345',
      accessKeyId: 'AKIATEST12345',
      secretAccessKey: 'test-secret-access-key-12345',
      roleArn: 'arn:aws:iam::123456789012:role/TestRole',
      ...overrides,
    };
  }

  /**
   * Create authentication configuration for testing
   */
  static createAuthConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
    return {
      credentials: this.createCredentials(),
      region: AmazonRegion.NA,
      marketplaceId: 'ATVPDKIKX0DER',
      tokenCacheTimeMs: 3600000, // 1 hour
      ...overrides,
    };
  }

  /**
   * Create authentication tokens for testing
   */
  static createAuthTokens(overrides: Partial<AuthTokens> = {}): AuthTokens {
    const now = Date.now();
    return {
      accessToken: 'Atza|test-access-token-12345',
      expiresAt: now + 3600000, // 1 hour from now
      ...overrides,
    };
  }

  /**
   * Create API client configuration for testing
   */
  static createApiClientConfig(overrides: Partial<ApiClientConfig> = {}): ApiClientConfig {
    return {
      baseUrl: 'https://sellingpartnerapi-na.amazon.com',
      region: AmazonRegion.NA,
      marketplaceId: 'ATVPDKIKX0DER',
      maxRetries: 3,
      timeoutMs: 10000,
      rateLimit: this.createRateLimitConfig(),
      ...overrides,
    };
  }

  /**
   * Create rate limit configuration for testing
   */
  static createRateLimitConfig(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
    return {
      requestsPerSecond: 5,
      burstSize: 10,
      enabled: true,
      ...overrides,
    };
  }

  /**
   * Create a successful API response for testing
   */
  static createApiResponse<T>(data: T, overrides: Partial<ApiResponse<T>> = {}): ApiResponse<T> {
    return {
      data,
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'x-amzn-requestid': 'test-request-id-12345',
        'x-amzn-trace-id': 'Root=1-test-trace-id',
      },
      rateLimit: {
        remaining: 95,
        resetAt: new Date(Date.now() + 60000), // 1 minute from now
        limit: 100,
      },
      ...overrides,
    };
  }

  /**
   * Create an API error for testing
   */
  static createApiError(
    type: ApiErrorType = ApiErrorType.SERVER_ERROR,
    overrides: Partial<{
      message: string;
      statusCode: number;
      details: any;
      cause: Error;
    }> = {}
  ): ApiError {
    const defaults = {
      message: 'Test API error',
      statusCode: 500,
      details: { errorCode: 'TEST_ERROR', errorMessage: 'Test error details' },
      cause: undefined,
    };

    const config = { ...defaults, ...overrides };

    return new ApiError(config.message, type, config.statusCode, config.details, config.cause);
  }

  /**
   * Create an authentication error for testing
   */
  static createAuthError(
    type: AuthErrorType = AuthErrorType.TOKEN_REFRESH_FAILED,
    overrides: Partial<{
      message: string;
      cause: Error;
    }> = {}
  ): AuthError {
    const defaults = {
      message: 'Test authentication error',
      cause: undefined,
    };

    const config = { ...defaults, ...overrides };

    return new AuthError(config.message, type, config.cause);
  }

  /**
   * Create catalog item data for testing
   */
  static createCatalogItem(overrides: Partial<any> = {}): any {
    return {
      asin: 'B08TEST123',
      attributes: {
        item_name: [{ value: 'Test Product', language_tag: 'en_US' }],
        brand: [{ value: 'Test Brand', language_tag: 'en_US' }],
        list_price: [{ value: 29.99, currency: 'USD' }],
      },
      identifiers: [
        { identifier: 'B08TEST123', identifierType: 'ASIN' },
        { identifier: '1234567890123', identifierType: 'EAN' },
      ],
      images: [
        {
          variant: 'MAIN',
          link: 'https://example.com/image.jpg',
          height: 500,
          width: 500,
        },
      ],
      productTypes: [
        {
          productType: 'PRODUCT',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      ],
      salesRanks: [
        {
          productCategoryId: 'home_garden',
          rank: 12345,
          classificationRanks: [],
        },
      ],
      summaries: [
        {
          marketplaceId: 'ATVPDKIKX0DER',
          adultProduct: false,
          autographed: false,
          brand: 'Test Brand',
          itemName: 'Test Product',
          manufacturer: 'Test Manufacturer',
          memorabilia: false,
          packageQuantity: 1,
        },
      ],
      ...overrides,
    };
  }

  /**
   * Create order data for testing
   */
  static createOrder(overrides: Partial<any> = {}): any {
    return {
      AmazonOrderId: 'TEST-ORDER-123456789',
      SellerOrderId: 'SELLER-ORDER-123',
      PurchaseDate: '2024-01-15T10:30:00Z',
      LastUpdateDate: '2024-01-15T11:00:00Z',
      OrderStatus: 'Shipped',
      FulfillmentChannel: 'MFN',
      SalesChannel: 'Amazon.com',
      OrderChannel: 'Amazon.com',
      ShipServiceLevel: 'Standard',
      OrderTotal: {
        CurrencyCode: 'USD',
        Amount: '29.99',
      },
      NumberOfItemsShipped: 1,
      NumberOfItemsUnshipped: 0,
      PaymentExecutionDetail: [],
      PaymentMethod: 'Other',
      PaymentMethodDetails: ['Standard'],
      MarketplaceId: 'ATVPDKIKX0DER',
      ShipmentServiceLevelCategory: 'Standard',
      OrderType: 'StandardOrder',
      EarliestShipDate: '2024-01-15T12:00:00Z',
      LatestShipDate: '2024-01-16T12:00:00Z',
      EarliestDeliveryDate: '2024-01-18T12:00:00Z',
      LatestDeliveryDate: '2024-01-20T12:00:00Z',
      IsBusinessOrder: false,
      IsPrime: false,
      IsPremiumOrder: false,
      IsGlobalExpressEnabled: false,
      ReplaceOrderId: null,
      IsReplacementOrder: false,
      PromiseResponseDueDate: '2024-01-15T14:00:00Z',
      IsEstimatedShipDateSet: false,
      IsSoldByAB: false,
      IsIBA: false,
      DefaultShipFromLocationAddress: {
        Name: 'Test Seller',
        AddressLine1: '123 Test Street',
        City: 'Test City',
        StateOrRegion: 'CA',
        PostalCode: '12345',
        CountryCode: 'US',
      },
      BuyerRequestedCancel: {
        IsBuyerRequestedCancel: false,
        BuyerCancelReason: null,
      },
      FulfillmentInstruction: {
        FulfillmentSupplySourceId: null,
      },
      ...overrides,
    };
  }

  /**
   * Create inventory summary data for testing
   */
  static createInventorySummary(overrides: Partial<any> = {}): any {
    return {
      asin: 'B08TEST123',
      fnSku: 'TEST-FN-SKU-123',
      sellerSku: 'TEST-SKU-123',
      condition: 'NewItem',
      inventoryDetails: {
        fulfillableQuantity: 100,
        inboundWorkingQuantity: 0,
        inboundShippedQuantity: 0,
        inboundReceivingQuantity: 0,
        reservedQuantity: {
          totalReservedQuantity: 5,
          pendingCustomerOrderQuantity: 3,
          pendingTransshipmentQuantity: 0,
          fcProcessingQuantity: 2,
        },
        researchingQuantity: {
          totalResearchingQuantity: 0,
          researchingQuantityBreakdown: [],
        },
        unfulfillableQuantity: {
          totalUnfulfillableQuantity: 2,
          customerDamagedQuantity: 1,
          warehouseDamagedQuantity: 1,
          distributorDamagedQuantity: 0,
          carrierDamagedQuantity: 0,
          defectiveQuantity: 0,
          expiredQuantity: 0,
        },
      },
      lastUpdatedTime: '2024-01-15T10:30:00Z',
      productName: 'Test Product',
      totalQuantity: 107,
      ...overrides,
    };
  }

  /**
   * Create listing data for testing
   */
  static createListing(overrides: Partial<any> = {}): any {
    return {
      sku: 'TEST-SKU-123',
      asin: 'B08TEST123',
      productType: 'PRODUCT',
      requirements: 'LISTING_PRODUCT_ONLY',
      attributes: {
        condition_type: [{ value: 'new_new', marketplace_id: 'ATVPDKIKX0DER' }],
        merchant_suggested_asin: [{ value: 'B08TEST123', marketplace_id: 'ATVPDKIKX0DER' }],
        purchasable_offer: [
          {
            marketplace_id: 'ATVPDKIKX0DER',
            currency: 'USD',
            our_price: [{ schedule: [{ value_with_tax: 29.99 }] }],
            minimum_seller_allowed_price: [{ schedule: [{ value_with_tax: 15.0 }] }],
            maximum_seller_allowed_price: [{ schedule: [{ value_with_tax: 50.0 }] }],
          },
        ],
        fulfillment_availability: [
          {
            fulfillment_channel_code: 'DEFAULT',
            quantity: 100,
            marketplace_id: 'ATVPDKIKX0DER',
          },
        ],
      },
      issues: [],
      ...overrides,
    };
  }

  /**
   * Create a mock function for testing
   */
  static createMockFunction<T>(
    returnValue: T,
    options: { shouldReject?: boolean; callCount?: number } = {}
  ): Mock {
    const mockFn = vi.fn();

    if (options.shouldReject) {
      mockFn.mockRejectedValue(returnValue);
    } else {
      mockFn.mockResolvedValue(returnValue);
    }

    return mockFn;
  }

  /**
   * Create inventory change notification data for testing
   */
  static createInventoryChangeNotification(overrides: Partial<any> = {}): any {
    return {
      sku: 'TEST-SKU-123',
      fulfillmentChannel: 'AMAZON',
      previousQuantity: 10,
      newQuantity: 5,
      marketplaceId: 'ATVPDKIKX0DER',
      ...overrides,
    };
  }

  /**
   * Create order status change notification data for testing
   */
  static createOrderStatusChangeNotification(overrides: Partial<any> = {}): any {
    return {
      orderId: 'TEST-ORDER-123',
      previousStatus: 'PENDING',
      newStatus: 'SHIPPED',
      marketplaceId: 'ATVPDKIKX0DER',
      orderDetails: {
        purchaseDate: '2023-01-01T00:00:00Z',
        orderTotal: {
          currencyCode: 'USD',
          amount: 99.99,
        },
      },
      ...overrides,
    };
  }

  /**
   * Create cache test data for testing
   */
  static createCacheTestData(overrides: Partial<{ key: string; value: any; ttl?: number }> = {}): {
    key: string;
    value: any;
    ttl?: number;
  } {
    return {
      key: 'test-cache-key',
      value: { data: 'test-cache-value', timestamp: Date.now() },
      ttl: 60, // 60 seconds
      ...overrides,
    };
  }

  /**
   * Create randomized test data for comprehensive testing
   */
  static createRandomData() {
    return {
      /**
       * Generate random ASIN
       */
      randomAsin: () => `B${Math.random().toString(36).substring(2, 10).toUpperCase()}`,

      /**
       * Generate random SKU
       */
      randomSku: () => `SKU-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,

      /**
       * Generate random order ID
       */
      randomOrderId: () => `ORDER-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,

      /**
       * Generate random price
       */
      randomPrice: (min = 1, max = 1000) =>
        Math.round((Math.random() * (max - min) + min) * 100) / 100,

      /**
       * Generate random quantity
       */
      randomQuantity: (min = 0, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min,

      /**
       * Generate random date within range
       */
      randomDate: (daysBack = 30, daysForward = 30) => {
        const now = Date.now();
        const range = (daysBack + daysForward) * 24 * 60 * 60 * 1000;
        const randomTime = now - daysBack * 24 * 60 * 60 * 1000 + Math.random() * range;
        return new Date(randomTime);
      },

      /**
       * Generate random marketplace ID
       */
      randomMarketplaceId: () => {
        const marketplaces = ['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8', 'AAHKV2X7AFYLW'];
        return marketplaces[Math.floor(Math.random() * marketplaces.length)];
      },

      /**
       * Generate random region
       */
      randomRegion: () => {
        const regions = [AmazonRegion.NA, AmazonRegion.EU, AmazonRegion.FE];
        return regions[Math.floor(Math.random() * regions.length)];
      },

      /**
       * Generate random error type
       */
      randomApiErrorType: () => {
        const types = Object.values(ApiErrorType);
        return types[Math.floor(Math.random() * types.length)];
      },

      /**
       * Generate random auth error type
       */
      randomAuthErrorType: () => {
        const types = Object.values(AuthErrorType);
        return types[Math.floor(Math.random() * types.length)];
      },
    };
  }
}
