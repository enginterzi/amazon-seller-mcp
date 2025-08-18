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
  AmazonCatalogItem,
  AmazonOrder,
  AmazonInventorySummary,
  AmazonListingsItem,
  AmazonReport,
  InventoryFilterParams,
  OrdersFilterParams,
  ReportsFilterParams,
  AmazonItemAttributes,
  AmazonItemIdentifiers,
  AmazonItemRelationships,
  ToolContentResponse,
  OrderUpdateDetails,
  ErrorDetails,
  LogMetadata,
  ErrorRecoveryContext,
  McpRequestBody,
  NotificationData,
  HttpRequest,
  HttpResponse,
  ToolInput,
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
      details: Record<string, unknown>;
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
  static createCatalogItem(overrides: Partial<AmazonCatalogItem> = {}): AmazonCatalogItem {
    return {
      asin: 'B08TEST123',
      attributes: {
        title: 'Test Product',
        description: 'Test product description',
        brand: 'Test Brand',
        dimensions: {
          length: 10.5,
          width: 8.0,
          height: 3.2,
          weight: 1.5,
        },
        images: [
          {
            variant: 'MAIN',
            link: 'https://example.com/image.jpg',
          },
        ],
      },
      identifiers: {
        ATVPDKIKX0DER: [
          { identifier: 'B08TEST123', identifierType: 'ASIN' },
          { identifier: '1234567890123', identifierType: 'EAN' },
        ],
      },
      relationships: {
        ATVPDKIKX0DER: [
          {
            type: 'VARIATION',
            identifiers: [
              {
                identifier: 'B08PARENT123',
                identifierType: 'ASIN',
              },
            ],
          },
        ],
      },
      salesRanks: {
        ATVPDKIKX0DER: [
          {
            rank: 12345,
            title: 'Home & Garden',
          },
        ],
      },
      ...overrides,
    };
  }

  /**
   * Create order data for testing
   */
  static createOrder(overrides: Partial<AmazonOrder> = {}): AmazonOrder {
    return {
      amazonOrderId: 'TEST-ORDER-123456789',
      purchaseDate: '2024-01-15T10:30:00Z',
      orderStatus: 'Shipped',
      orderTotal: {
        currencyCode: 'USD',
        amount: '29.99',
      },
      marketplaceId: 'ATVPDKIKX0DER',
      shippingAddress: {
        name: 'Test Buyer',
        addressLine1: '123 Test Street',
        addressLine2: 'Apt 4B',
        city: 'Test City',
        stateOrRegion: 'CA',
        postalCode: '12345',
        countryCode: 'US',
      },
      ...overrides,
    };
  }

  /**
   * Create inventory summary data for testing
   */
  static createInventorySummary(
    overrides: Partial<AmazonInventorySummary> = {}
  ): AmazonInventorySummary {
    return {
      asin: 'B08TEST123',
      sellerSku: 'TEST-SKU-123',
      condition: 'NewItem',
      inventoryDetails: {
        fulfillableQuantity: 100,
        inboundWorkingQuantity: 0,
        inboundShippedQuantity: 0,
        inboundReceivingQuantity: 0,
      },
      ...overrides,
    };
  }

  /**
   * Create listing data for testing
   */
  static createListing(overrides: Partial<AmazonListingsItem> = {}): AmazonListingsItem {
    return {
      sku: 'TEST-SKU-123',
      productType: 'PRODUCT',
      attributes: {
        title: 'Test Product Listing',
        brand: 'Test Brand',
        description: 'Test product description for listing',
      },
      status: 'ACTIVE',
      fulfillmentAvailability: [
        {
          fulfillmentChannelCode: 'DEFAULT',
          quantity: 100,
        },
        {
          fulfillmentChannelCode: 'AMAZON',
          quantity: 50,
        },
      ],
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
  static createInventoryChangeNotification(
    overrides: Partial<{
      sku: string;
      fulfillmentChannel: string;
      previousQuantity: number;
      newQuantity: number;
      marketplaceId: string;
    }> = {}
  ): {
    sku: string;
    fulfillmentChannel: string;
    previousQuantity: number;
    newQuantity: number;
    marketplaceId: string;
  } {
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
  static createOrderStatusChangeNotification(
    overrides: Partial<{
      orderId: string;
      previousStatus: string;
      newStatus: string;
      marketplaceId: string;
    }> = {}
  ): {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    marketplaceId: string;
  } {
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
  static createCacheTestData(
    overrides: Partial<{ key: string; value: unknown; ttl?: number }> = {}
  ): {
    key: string;
    value: unknown;
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
   * Create Amazon report data for testing
   */
  static createReport(overrides: Partial<AmazonReport> = {}): AmazonReport {
    return {
      reportId: 'REPORT_123456789',
      reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
      processingStatus: 'DONE',
      createdTime: '2024-01-15T10:30:00Z',
      reportDocumentId: 'DOC_123456789',
      ...overrides,
    };
  }

  /**
   * Create inventory filter parameters for testing
   */
  static createInventoryFilterParams(
    overrides: Partial<InventoryFilterParams> = {}
  ): InventoryFilterParams {
    return {
      nextToken: 'NEXT_TOKEN_123',
      granularityType: 'Marketplace',
      granularityId: 'ATVPDKIKX0DER',
      startDateTime: '2024-01-01T00:00:00Z',
      endDateTime: '2024-01-31T23:59:59Z',
      marketplaceIds: ['ATVPDKIKX0DER'],
      sellerSkus: ['TEST-SKU-123', 'TEST-SKU-456'],
      asins: ['B08TEST123', 'B08TEST456'],
      fulfillmentChannels: ['AMAZON', 'MERCHANT'],
      ...overrides,
    };
  }

  /**
   * Create orders filter parameters for testing
   */
  static createOrdersFilterParams(overrides: Partial<OrdersFilterParams> = {}): OrdersFilterParams {
    return {
      nextToken: 'NEXT_TOKEN_456',
      marketplaceIds: ['ATVPDKIKX0DER'],
      createdAfter: '2024-01-01T00:00:00Z',
      createdBefore: '2024-01-31T23:59:59Z',
      orderStatuses: ['Pending', 'Shipped', 'Delivered'],
      fulfillmentChannels: ['MFN', 'AFN'],
      buyerEmail: 'buyer@example.com',
      ...overrides,
    };
  }

  /**
   * Create reports filter parameters for testing
   */
  static createReportsFilterParams(
    overrides: Partial<ReportsFilterParams> = {}
  ): ReportsFilterParams {
    return {
      nextToken: 'NEXT_TOKEN_789',
      reportTypes: ['GET_MERCHANT_LISTINGS_ALL_DATA', 'GET_FLAT_FILE_ORDERS_DATA'],
      processingStatuses: ['DONE', 'IN_PROGRESS'],
      marketplaceIds: ['ATVPDKIKX0DER'],
      createdSince: '2024-01-01T00:00:00Z',
      createdUntil: '2024-01-31T23:59:59Z',
      ...overrides,
    };
  }

  /**
   * Create Amazon item attributes for testing
   */
  static createItemAttributes(overrides: Partial<AmazonItemAttributes> = {}): AmazonItemAttributes {
    return {
      title: 'Test Product Title',
      description: 'Test product description with detailed information',
      brand: 'Test Brand',
      dimensions: {
        length: 10.5,
        width: 8.0,
        height: 3.2,
        weight: 1.5,
      },
      images: [
        {
          variant: 'MAIN',
          link: 'https://example.com/images/main.jpg',
        },
        {
          variant: 'PT01',
          link: 'https://example.com/images/alt1.jpg',
        },
      ],
      category: 'Electronics',
      color: 'Black',
      size: 'Medium',
      material: 'Plastic',
      ...overrides,
    };
  }

  /**
   * Create Amazon item identifiers for testing
   */
  static createItemIdentifiers(
    overrides: Partial<AmazonItemIdentifiers> = {}
  ): AmazonItemIdentifiers {
    return {
      ATVPDKIKX0DER: [
        {
          identifier: 'B08TEST123',
          identifierType: 'ASIN',
          marketplaceId: 'ATVPDKIKX0DER',
        },
        {
          identifier: '1234567890123',
          identifierType: 'EAN',
          marketplaceId: 'ATVPDKIKX0DER',
        },
        {
          identifier: '123456789012',
          identifierType: 'UPC',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      ],
      ...overrides,
    };
  }

  /**
   * Create Amazon item relationships for testing
   */
  static createItemRelationships(
    overrides: Partial<AmazonItemRelationships> = {}
  ): AmazonItemRelationships {
    return {
      ATVPDKIKX0DER: [
        {
          type: 'VARIATION',
          identifiers: [
            {
              identifier: 'B08PARENT123',
              identifierType: 'ASIN',
            },
          ],
        },
        {
          type: 'ACCESSORY',
          identifiers: [
            {
              identifier: 'B08ACCESSORY123',
              identifierType: 'ASIN',
            },
          ],
        },
      ],
      ...overrides,
    };
  }

  /**
   * Create tool content response for testing
   */
  static createToolContentResponse(
    overrides: Partial<ToolContentResponse> = {}
  ): ToolContentResponse {
    return {
      type: 'text',
      text: 'Test tool response content',
      mimeType: 'text/plain',
      ...overrides,
    };
  }

  /**
   * Create order update details for testing
   */
  static createOrderUpdateDetails(overrides: Partial<OrderUpdateDetails> = {}): OrderUpdateDetails {
    return {
      trackingNumber: 'TRK123456789',
      carrierCode: 'UPS',
      shippingDate: '2024-01-16T10:00:00Z',
      notes: 'Package shipped successfully',
      ...overrides,
    };
  }

  /**
   * Create error details for testing
   */
  static createErrorDetails(overrides: Partial<ErrorDetails> = {}): ErrorDetails {
    return {
      code: 'InvalidInput',
      statusCode: 400,
      requestId: 'req-123456789',
      timestamp: '2024-01-15T10:30:00Z',
      headers: {
        'content-type': 'application/json',
        'x-amzn-requestid': 'req-123456789',
        'x-amzn-trace-id': 'Root=1-trace-123',
      },
      message: 'Invalid input provided',
      details: 'The request contains invalid parameters',
      ...overrides,
    };
  }

  /**
   * Create log metadata for testing
   */
  static createLogMetadata(overrides: Partial<LogMetadata> = {}): LogMetadata {
    return {
      requestId: 'req-123456789',
      userId: 'user-123',
      operation: 'getCatalogItem',
      duration: 250,
      statusCode: 200,
      correlationId: 'corr-123456789',
      sessionId: 'sess-123456789',
      ...overrides,
    };
  }

  /**
   * Create error recovery context for testing
   */
  static createErrorRecoveryContext(
    overrides: Partial<ErrorRecoveryContext> = {}
  ): ErrorRecoveryContext {
    return {
      operation: 'getCatalogItem',
      params: {
        asin: 'B08TEST123',
        marketplaceIds: ['ATVPDKIKX0DER'],
      },
      retryCount: 1,
      maxRetries: 3,
      requestId: 'req-123456789',
      shouldRetry: true,
      options: {
        timeout: 10000,
        headers: {
          'User-Agent': 'Amazon-MCP-Client/1.0.0',
        },
      },
      lastError: 'Rate limit exceeded',
      backoffMs: 1000,
      ...overrides,
    };
  }

  /**
   * Create MCP request body for testing
   */
  static createMcpRequestBody(overrides: Partial<McpRequestBody> = {}): McpRequestBody {
    return {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'getCatalogItem',
        arguments: {
          asin: 'B08TEST123',
          marketplaceIds: ['ATVPDKIKX0DER'],
        },
      },
      id: 'req-123456789',
      ...overrides,
    };
  }

  /**
   * Create notification data for testing
   */
  static createNotificationData(overrides: Partial<NotificationData> = {}): NotificationData {
    return {
      type: 'inventory.changed',
      timestamp: '2024-01-15T10:30:00Z',
      payload: {
        sku: 'TEST-SKU-123',
        previousQuantity: 10,
        newQuantity: 5,
        marketplaceId: 'ATVPDKIKX0DER',
      },
      source: 'amazon-seller-mcp',
      ...overrides,
    };
  }

  /**
   * Create HTTP request for testing
   */
  static createHttpRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
    return {
      method: 'GET',
      url: '/api/catalog/items/B08TEST123',
      ip: '192.168.1.100',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Amazon-MCP-Client/1.0.0',
        authorization: 'Bearer token123',
        'x-amzn-marketplace-id': 'ATVPDKIKX0DER',
      },
      ...overrides,
    };
  }

  /**
   * Create HTTP response for testing
   */
  static createHttpResponse(overrides: Partial<HttpResponse> = {}): HttpResponse {
    const mockResponse = {
      statusCode: 200,
      on: vi.fn(),
      ...overrides,
    };
    return mockResponse as HttpResponse;
  }

  /**
   * Create tool input for testing
   */
  static createToolInput(overrides: Partial<ToolInput> = {}): ToolInput {
    return {
      asin: 'B08TEST123',
      marketplaceIds: ['ATVPDKIKX0DER'],
      includeSalesRank: true,
      locale: 'en_US',
      ...overrides,
    };
  }

  /**
   * Create invalid data builders for error scenario testing
   */
  static createInvalidData() {
    return {
      /**
       * Create invalid Amazon catalog item data
       */
      invalidCatalogItem: (
        type: 'missingAsin' | 'invalidType' | 'malformedStructure' = 'missingAsin'
      ) => {
        switch (type) {
          case 'missingAsin':
            return {
              // Missing required asin field
              attributes: { title: 'Test Product' },
            };
          case 'invalidType':
            return {
              asin: 123, // Should be string, not number
              attributes: 'invalid', // Should be object, not string
            };
          case 'malformedStructure':
            return {
              asin: 'B08TEST123',
              attributes: {
                dimensions: {
                  length: 'invalid', // Should be number, not string
                  width: null, // Should be number or undefined
                },
                images: [
                  {
                    variant: 123, // Should be string, not number
                    // Missing required link field
                  },
                ],
              },
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid Amazon listings item data
       */
      invalidListingsItem: (
        type: 'missingSku' | 'invalidAttributes' | 'malformedAvailability' = 'missingSku'
      ) => {
        switch (type) {
          case 'missingSku':
            return {
              // Missing required sku field
              productType: 'PRODUCT',
              attributes: { title: 'Test Product' },
            };
          case 'invalidAttributes':
            return {
              sku: 'TEST-SKU-123',
              productType: 'PRODUCT',
              attributes: null, // Should be object, not null
            };
          case 'malformedAvailability':
            return {
              sku: 'TEST-SKU-123',
              productType: 'PRODUCT',
              attributes: { title: 'Test Product' },
              fulfillmentAvailability: [
                {
                  // Missing required fulfillmentChannelCode
                  quantity: 'invalid', // Should be number, not string
                },
              ],
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid Amazon inventory summary data
       */
      invalidInventorySummary: (type: 'invalidDetails' | 'wrongTypes' = 'invalidDetails') => {
        switch (type) {
          case 'invalidDetails':
            return {
              asin: 'B08TEST123',
              inventoryDetails: {
                fulfillableQuantity: 'invalid', // Should be number, not string
                inboundWorkingQuantity: null, // Should be number or undefined
              },
            };
          case 'wrongTypes':
            return {
              asin: 123, // Should be string, not number
              sellerSku: [], // Should be string, not array
              condition: { invalid: 'object' }, // Should be string, not object
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid Amazon order data
       */
      invalidOrder: (
        type: 'missingRequired' | 'invalidTotal' | 'malformedAddress' = 'missingRequired'
      ) => {
        switch (type) {
          case 'missingRequired':
            return {
              // Missing required amazonOrderId
              purchaseDate: '2024-01-15T10:30:00Z',
              orderStatus: 'Shipped',
              // Missing required marketplaceId
            };
          case 'invalidTotal':
            return {
              amazonOrderId: 'TEST-ORDER-123',
              purchaseDate: '2024-01-15T10:30:00Z',
              orderStatus: 'Shipped',
              marketplaceId: 'ATVPDKIKX0DER',
              orderTotal: {
                currencyCode: 123, // Should be string, not number
                // Missing required amount field
              },
            };
          case 'malformedAddress':
            return {
              amazonOrderId: 'TEST-ORDER-123',
              purchaseDate: '2024-01-15T10:30:00Z',
              orderStatus: 'Shipped',
              marketplaceId: 'ATVPDKIKX0DER',
              shippingAddress: {
                name: 123, // Should be string, not number
                addressLine1: null, // Should be string or undefined
                city: [], // Should be string, not array
              },
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid Amazon report data
       */
      invalidReport: (type: 'missingRequired' | 'wrongTypes' = 'missingRequired') => {
        switch (type) {
          case 'missingRequired':
            return {
              // Missing required reportId
              reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
              // Missing required processingStatus
              // Missing required createdTime
            };
          case 'wrongTypes':
            return {
              reportId: 123, // Should be string, not number
              reportType: null, // Should be string, not null
              processingStatus: [], // Should be string, not array
              createdTime: { invalid: 'object' }, // Should be string, not object
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid filter parameters
       */
      invalidFilterParams: (
        type: 'invalidArrays' | 'wrongDateTypes' | 'invalidTokens' = 'invalidArrays'
      ) => {
        switch (type) {
          case 'invalidArrays':
            return {
              marketplaceIds: 'not-an-array', // Should be array, not string
              sellerSkus: [123, 456], // Should be string array, not number array
              asins: null, // Should be array or undefined, not null
            };
          case 'wrongDateTypes':
            return {
              startDateTime: 123, // Should be string or Date, not number
              endDateTime: [], // Should be string or Date, not array
            };
          case 'invalidTokens':
            return {
              nextToken: 123, // Should be string, not number
              granularityType: null, // Should be string or undefined, not null
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid error details
       */
      invalidErrorDetails: (type: 'wrongTypes' | 'invalidHeaders' = 'wrongTypes') => {
        switch (type) {
          case 'wrongTypes':
            return {
              code: 123, // Should be string, not number
              statusCode: 'invalid', // Should be number, not string
              requestId: [], // Should be string, not array
              timestamp: null, // Should be string or undefined, not null
            };
          case 'invalidHeaders':
            return {
              code: 'InvalidInput',
              statusCode: 400,
              headers: {
                'content-type': 123, // Should be string, not number
                'invalid-header': null, // Should be string, not null
              },
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid log metadata
       */
      invalidLogMetadata: (type: 'wrongTypes' | 'invalidNumbers' = 'wrongTypes') => {
        switch (type) {
          case 'wrongTypes':
            return {
              requestId: 123, // Should be string, not number
              userId: [], // Should be string, not array
              operation: null, // Should be string or undefined, not null
            };
          case 'invalidNumbers':
            return {
              duration: 'invalid', // Should be number, not string
              statusCode: null, // Should be number or undefined, not null
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid error recovery context
       */
      invalidErrorRecoveryContext: (type: 'wrongTypes' | 'invalidParams' = 'wrongTypes') => {
        switch (type) {
          case 'wrongTypes':
            return {
              operation: 123, // Should be function or string, not number
              retryCount: 'invalid', // Should be number, not string
              maxRetries: null, // Should be number or undefined, not null
              shouldRetry: 'yes', // Should be boolean, not string
            };
          case 'invalidParams':
            return {
              params: 'not-an-object', // Should be object, not string
              options: [], // Should be object, not array
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid MCP request body
       */
      invalidMcpRequestBody: (
        type: 'wrongJsonRpc' | 'missingMethod' | 'invalidParams' = 'wrongJsonRpc'
      ) => {
        switch (type) {
          case 'wrongJsonRpc':
            return {
              jsonrpc: '1.0', // Should be '2.0'
              method: 'tools/call',
            };
          case 'missingMethod':
            return {
              jsonrpc: '2.0',
              // Missing required method field
              params: { test: 'data' },
            };
          case 'invalidParams':
            return {
              jsonrpc: '2.0',
              method: 'tools/call',
              params: 'not-an-object', // Should be object, not string
              id: [], // Should be string or number, not array
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid notification data
       */
      invalidNotificationData: (
        type: 'missingRequired' | 'wrongTypes' | 'invalidPayload' = 'missingRequired'
      ) => {
        switch (type) {
          case 'missingRequired':
            return {
              // Missing required type field
              timestamp: '2024-01-15T10:30:00Z',
              // Missing required payload field
            };
          case 'wrongTypes':
            return {
              type: 123, // Should be string, not number
              timestamp: null, // Should be string, not null
              payload: 'not-an-object', // Should be object, not string
            };
          case 'invalidPayload':
            return {
              type: 'inventory.changed',
              timestamp: '2024-01-15T10:30:00Z',
              payload: null, // Should be object, not null
              source: 123, // Should be string or undefined, not number
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid HTTP request
       */
      invalidHttpRequest: (type: 'missingRequired' | 'invalidHeaders' = 'missingRequired') => {
        switch (type) {
          case 'missingRequired':
            return {
              // Missing required method field
              url: '/api/test',
              // Missing required headers field
            };
          case 'invalidHeaders':
            return {
              method: 'GET',
              url: '/api/test',
              headers: 'not-an-object', // Should be object, not string
              ip: 123, // Should be string or undefined, not number
            };
          default:
            return {};
        }
      },

      /**
       * Create invalid HTTP response
       */
      invalidHttpResponse: (type: 'missingStatusCode' | 'invalidOn' = 'missingStatusCode') => {
        switch (type) {
          case 'missingStatusCode':
            return {
              // Missing required statusCode field
              on: vi.fn(),
            };
          case 'invalidOn':
            return {
              statusCode: 200,
              on: 'not-a-function', // Should be function, not string
            };
          default:
            return {};
        }
      },
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
