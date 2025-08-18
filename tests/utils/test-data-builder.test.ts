/**
 * Tests for the test data builder
 */

import { describe, it, expect } from 'vitest';
import { TestDataBuilder } from './test-data-builder.js';
import { AmazonRegion, AuthErrorType, AuthError } from '../../src/auth/index.js';
import { ApiErrorType, ApiError } from '../../src/api/index.js';

describe('TestDataBuilder', () => {
  describe('createCredentials', () => {
    it('should create valid Amazon credentials with defaults', () => {
      const credentials = TestDataBuilder.createCredentials();

      expect(credentials).toMatchObject({
        clientId: expect.stringMatching(/^amzn1\.application-oa2-client\./),
        clientSecret: expect.stringContaining('test-client-secret'),
        refreshToken: expect.stringMatching(/^Atzr\|/),
        accessKeyId: expect.stringMatching(/^AKIA/),
        secretAccessKey: expect.stringContaining('test-secret-access-key'),
        roleArn: expect.stringMatching(/^arn:aws:iam::/),
      });
    });

    it('should allow overriding credential properties', () => {
      const overrides = {
        clientId: 'custom-client-id',
        clientSecret: 'custom-secret',
      };

      const credentials = TestDataBuilder.createCredentials(overrides);

      expect(credentials.clientId).toBe('custom-client-id');
      expect(credentials.clientSecret).toBe('custom-secret');
      expect(credentials.refreshToken).toMatch(/^Atzr\|/);
    });
  });

  describe('createAuthConfig', () => {
    it('should create valid auth configuration', () => {
      const config = TestDataBuilder.createAuthConfig();

      expect(config).toMatchObject({
        credentials: expect.objectContaining({
          clientId: expect.any(String),
          clientSecret: expect.any(String),
          refreshToken: expect.any(String),
        }),
        region: AmazonRegion.NA,
        marketplaceId: 'ATVPDKIKX0DER',
        tokenCacheTimeMs: 3600000,
      });
    });

    it('should allow overriding auth config properties', () => {
      const config = TestDataBuilder.createAuthConfig({
        region: AmazonRegion.EU,
        marketplaceId: 'A2EUQ1WTGCTBG2',
      });

      expect(config.region).toBe(AmazonRegion.EU);
      expect(config.marketplaceId).toBe('A2EUQ1WTGCTBG2');
    });
  });

  describe('createAuthTokens', () => {
    it('should create valid auth tokens', () => {
      const tokens = TestDataBuilder.createAuthTokens();

      expect(tokens).toMatchObject({
        accessToken: expect.stringMatching(/^Atza\|/),
        expiresAt: expect.any(Number),
      });

      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should allow overriding token properties', () => {
      const customToken = 'custom-access-token';
      const customExpiry = Date.now() + 7200000; // 2 hours

      const tokens = TestDataBuilder.createAuthTokens({
        accessToken: customToken,
        expiresAt: customExpiry,
      });

      expect(tokens.accessToken).toBe(customToken);
      expect(tokens.expiresAt).toBe(customExpiry);
    });
  });

  describe('createApiClientConfig', () => {
    it('should create valid API client configuration', () => {
      const config = TestDataBuilder.createApiClientConfig();

      expect(config).toMatchObject({
        baseUrl: 'https://sellingpartnerapi-na.amazon.com',
        region: AmazonRegion.NA,
        marketplaceId: 'ATVPDKIKX0DER',
        maxRetries: 3,
        timeoutMs: 10000,
        rateLimit: expect.objectContaining({
          requestsPerSecond: 5,
          burstSize: 10,
          enabled: true,
        }),
      });
    });
  });

  describe('createApiResponse', () => {
    it('should create valid API response with provided data', () => {
      const testData = { message: 'success', items: [1, 2, 3] };
      const response = TestDataBuilder.createApiResponse(testData);

      expect(response).toMatchObject({
        data: testData,
        statusCode: 200,
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-amzn-requestid': expect.any(String),
          'x-amzn-trace-id': expect.any(String),
        }),
        rateLimit: expect.objectContaining({
          remaining: expect.any(Number),
          resetAt: expect.any(Date),
          limit: expect.any(Number),
        }),
      });
    });

    it('should allow overriding response properties', () => {
      const testData = { test: true };
      const response = TestDataBuilder.createApiResponse(testData, {
        statusCode: 201,
        headers: { 'custom-header': 'custom-value' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.headers).toMatchObject({
        'custom-header': 'custom-value',
      });
    });
  });

  describe('createApiError', () => {
    it('should create valid API error with defaults', () => {
      const error = TestDataBuilder.createApiError();

      expect(error).toBeInstanceOf(ApiError);
      expect(error.type).toBe(ApiErrorType.SERVER_ERROR);
      expect(error.message).toBe('Test API error');
      expect(error.statusCode).toBe(500);
      expect(error.details).toMatchObject({
        errorCode: 'TEST_ERROR',
        errorMessage: 'Test error details',
      });
    });

    it('should allow customizing error properties', () => {
      const error = TestDataBuilder.createApiError(ApiErrorType.AUTH_ERROR, {
        message: 'Custom auth error',
        statusCode: 401,
        details: { custom: 'details' },
      });

      expect(error.type).toBe(ApiErrorType.AUTH_ERROR);
      expect(error.message).toBe('Custom auth error');
      expect(error.statusCode).toBe(401);
      expect(error.details).toMatchObject({ custom: 'details' });
    });
  });

  describe('createAuthError', () => {
    it('should create valid auth error with defaults', () => {
      const error = TestDataBuilder.createAuthError();

      expect(error).toBeInstanceOf(AuthError);
      expect(error.type).toBe(AuthErrorType.TOKEN_REFRESH_FAILED);
      expect(error.message).toBe('Test authentication error');
    });

    it('should allow customizing auth error properties', () => {
      const causeError = new Error('Network timeout');
      const error = TestDataBuilder.createAuthError(AuthErrorType.INVALID_CREDENTIALS, {
        message: 'Invalid credentials provided',
        cause: causeError,
      });

      expect(error.type).toBe(AuthErrorType.INVALID_CREDENTIALS);
      expect(error.message).toBe('Invalid credentials provided');
      expect(error.cause).toBe(causeError);
    });
  });

  describe('createCatalogItem', () => {
    it('should create valid catalog item data', () => {
      const item = TestDataBuilder.createCatalogItem();

      expect(item).toMatchObject({
        asin: expect.stringMatching(/^B\w+/),
        attributes: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          brand: expect.any(String),
          dimensions: expect.objectContaining({
            length: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number),
            weight: expect.any(Number),
          }),
          images: expect.arrayContaining([
            expect.objectContaining({
              variant: expect.any(String),
              link: expect.any(String),
            }),
          ]),
        }),
        identifiers: expect.objectContaining({
          ATVPDKIKX0DER: expect.arrayContaining([
            expect.objectContaining({
              identifier: expect.any(String),
              identifierType: expect.any(String),
            }),
          ]),
        }),
        relationships: expect.any(Object),
        salesRanks: expect.any(Object),
      });
    });
  });

  describe('createOrder', () => {
    it('should create valid order data', () => {
      const order = TestDataBuilder.createOrder();

      expect(order).toMatchObject({
        amazonOrderId: expect.stringContaining('ORDER'),
        orderStatus: expect.any(String),
        purchaseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        orderTotal: expect.objectContaining({
          currencyCode: expect.any(String),
          amount: expect.any(String),
        }),
        marketplaceId: expect.any(String),
        shippingAddress: expect.objectContaining({
          name: expect.any(String),
          addressLine1: expect.any(String),
          city: expect.any(String),
          stateOrRegion: expect.any(String),
          postalCode: expect.any(String),
          countryCode: expect.any(String),
        }),
      });
    });
  });

  describe('createInventorySummary', () => {
    it('should create valid inventory summary data', () => {
      const summary = TestDataBuilder.createInventorySummary();

      expect(summary).toMatchObject({
        asin: expect.stringMatching(/^B\w+/),
        sellerSku: expect.stringContaining('SKU'),
        condition: expect.any(String),
        inventoryDetails: expect.objectContaining({
          fulfillableQuantity: expect.any(Number),
          inboundWorkingQuantity: expect.any(Number),
          inboundShippedQuantity: expect.any(Number),
          inboundReceivingQuantity: expect.any(Number),
        }),
      });
    });
  });

  describe('createListing', () => {
    it('should create valid listing data', () => {
      const listing = TestDataBuilder.createListing();

      expect(listing).toMatchObject({
        sku: expect.stringContaining('SKU'),
        productType: expect.any(String),
        attributes: expect.objectContaining({
          title: expect.any(String),
          brand: expect.any(String),
          description: expect.any(String),
        }),
        status: expect.any(String),
        fulfillmentAvailability: expect.arrayContaining([
          expect.objectContaining({
            fulfillmentChannelCode: expect.any(String),
            quantity: expect.any(Number),
          }),
        ]),
      });
    });
  });

  describe('createReport', () => {
    it('should create valid report data', () => {
      const report = TestDataBuilder.createReport();

      expect(report).toMatchObject({
        reportId: expect.stringContaining('REPORT'),
        reportType: expect.any(String),
        processingStatus: expect.any(String),
        createdTime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        reportDocumentId: expect.stringContaining('DOC'),
      });
    });
  });

  describe('createInventoryFilterParams', () => {
    it('should create valid inventory filter parameters', () => {
      const params = TestDataBuilder.createInventoryFilterParams();

      expect(params).toMatchObject({
        nextToken: expect.any(String),
        granularityType: expect.any(String),
        granularityId: expect.any(String),
        startDateTime: expect.any(String),
        endDateTime: expect.any(String),
        marketplaceIds: expect.arrayContaining([expect.any(String)]),
        sellerSkus: expect.arrayContaining([expect.stringContaining('SKU')]),
        asins: expect.arrayContaining([expect.stringMatching(/^B\w+/)]),
        fulfillmentChannels: expect.arrayContaining([expect.any(String)]),
      });
    });
  });

  describe('createOrdersFilterParams', () => {
    it('should create valid orders filter parameters', () => {
      const params = TestDataBuilder.createOrdersFilterParams();

      expect(params).toMatchObject({
        nextToken: expect.any(String),
        marketplaceIds: expect.arrayContaining([expect.any(String)]),
        createdAfter: expect.any(String),
        createdBefore: expect.any(String),
        orderStatuses: expect.arrayContaining([expect.any(String)]),
        fulfillmentChannels: expect.arrayContaining([expect.any(String)]),
        buyerEmail: expect.stringContaining('@'),
      });
    });
  });

  describe('createReportsFilterParams', () => {
    it('should create valid reports filter parameters', () => {
      const params = TestDataBuilder.createReportsFilterParams();

      expect(params).toMatchObject({
        nextToken: expect.any(String),
        reportTypes: expect.arrayContaining([expect.any(String)]),
        processingStatuses: expect.arrayContaining([expect.any(String)]),
        marketplaceIds: expect.arrayContaining([expect.any(String)]),
        createdSince: expect.any(String),
        createdUntil: expect.any(String),
      });
    });
  });

  describe('createErrorDetails', () => {
    it('should create valid error details', () => {
      const error = TestDataBuilder.createErrorDetails();

      expect(error).toMatchObject({
        code: expect.any(String),
        statusCode: expect.any(Number),
        requestId: expect.stringContaining('req-'),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        headers: expect.objectContaining({
          'content-type': expect.any(String),
          'x-amzn-requestid': expect.any(String),
        }),
      });
    });
  });

  describe('createLogMetadata', () => {
    it('should create valid log metadata', () => {
      const metadata = TestDataBuilder.createLogMetadata();

      expect(metadata).toMatchObject({
        requestId: expect.stringContaining('req-'),
        userId: expect.stringContaining('user-'),
        operation: expect.any(String),
        duration: expect.any(Number),
        statusCode: expect.any(Number),
      });
    });
  });

  describe('createErrorRecoveryContext', () => {
    it('should create valid error recovery context', () => {
      const context = TestDataBuilder.createErrorRecoveryContext();

      expect(context).toMatchObject({
        operation: expect.any(String),
        params: expect.objectContaining({
          asin: expect.stringMatching(/^B\w+/),
          marketplaceIds: expect.arrayContaining([expect.any(String)]),
        }),
        retryCount: expect.any(Number),
        maxRetries: expect.any(Number),
        requestId: expect.stringContaining('req-'),
        shouldRetry: expect.any(Boolean),
        options: expect.objectContaining({
          timeout: expect.any(Number),
          headers: expect.any(Object),
        }),
      });
    });
  });

  describe('createMcpRequestBody', () => {
    it('should create valid MCP request body', () => {
      const request = TestDataBuilder.createMcpRequestBody();

      expect(request).toMatchObject({
        jsonrpc: '2.0',
        method: expect.any(String),
        params: expect.objectContaining({
          name: expect.any(String),
          arguments: expect.any(Object),
        }),
        id: expect.any(String),
      });
    });
  });

  describe('createNotificationData', () => {
    it('should create valid notification data', () => {
      const notification = TestDataBuilder.createNotificationData();

      expect(notification).toMatchObject({
        type: expect.stringContaining('.'),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        payload: expect.objectContaining({
          sku: expect.stringContaining('SKU'),
          marketplaceId: expect.any(String),
        }),
        source: expect.any(String),
      });
    });
  });

  describe('createHttpRequest', () => {
    it('should create valid HTTP request', () => {
      const request = TestDataBuilder.createHttpRequest();

      expect(request).toMatchObject({
        method: expect.any(String),
        url: expect.stringContaining('/'),
        ip: expect.stringMatching(/^\d+\.\d+\.\d+\.\d+$/),
        headers: expect.objectContaining({
          'content-type': expect.any(String),
          'user-agent': expect.any(String),
        }),
      });
    });
  });

  describe('createHttpResponse', () => {
    it('should create valid HTTP response', () => {
      const response = TestDataBuilder.createHttpResponse();

      expect(response).toMatchObject({
        statusCode: expect.any(Number),
        on: expect.any(Function),
      });
    });
  });

  describe('createInvalidData', () => {
    it('should create invalid catalog item data', () => {
      const invalidData = TestDataBuilder.createInvalidData();

      const missingAsin = invalidData.invalidCatalogItem('missingAsin');
      expect(missingAsin).not.toHaveProperty('asin');

      const invalidType = invalidData.invalidCatalogItem('invalidType');
      expect(invalidType.asin).toBe(123);
      expect(invalidType.attributes).toBe('invalid');

      const malformed = invalidData.invalidCatalogItem('malformedStructure');
      expect(malformed.attributes.dimensions.length).toBe('invalid');
    });

    it('should create invalid error details data', () => {
      const invalidData = TestDataBuilder.createInvalidData();

      const wrongTypes = invalidData.invalidErrorDetails('wrongTypes');
      expect(wrongTypes.code).toBe(123);
      expect(wrongTypes.statusCode).toBe('invalid');

      const invalidHeaders = invalidData.invalidErrorDetails('invalidHeaders');
      expect(invalidHeaders.headers['content-type']).toBe(123);
    });

    it('should create invalid MCP request body data', () => {
      const invalidData = TestDataBuilder.createInvalidData();

      const wrongJsonRpc = invalidData.invalidMcpRequestBody('wrongJsonRpc');
      expect(wrongJsonRpc.jsonrpc).toBe('1.0');

      const missingMethod = invalidData.invalidMcpRequestBody('missingMethod');
      expect(missingMethod).not.toHaveProperty('method');

      const invalidParams = invalidData.invalidMcpRequestBody('invalidParams');
      expect(invalidParams.params).toBe('not-an-object');
    });
  });

  describe('createRandomData', () => {
    it('should generate random data utilities', () => {
      const randomData = TestDataBuilder.createRandomData();

      expect(randomData.randomAsin()).toMatch(/^B[A-Z0-9]{8}$/);
      expect(randomData.randomSku()).toMatch(/^SKU-[A-Z0-9]+$/);
      expect(randomData.randomOrderId()).toMatch(/^ORDER-[A-Z0-9]+$/);

      const price = randomData.randomPrice();
      expect(price).toBeGreaterThanOrEqual(1);
      expect(price).toBeLessThanOrEqual(1000);

      const quantity = randomData.randomQuantity();
      expect(quantity).toBeGreaterThanOrEqual(0);
      expect(quantity).toBeLessThanOrEqual(1000);

      const date = randomData.randomDate();
      expect(date).toBeInstanceOf(Date);

      const marketplaceId = randomData.randomMarketplaceId();
      expect(['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8', 'AAHKV2X7AFYLW']).toContain(
        marketplaceId
      );

      const region = randomData.randomRegion();
      expect(Object.values(AmazonRegion)).toContain(region);

      const apiErrorType = randomData.randomApiErrorType();
      expect(Object.values(ApiErrorType)).toContain(apiErrorType);

      const authErrorType = randomData.randomAuthErrorType();
      expect(Object.values(AuthErrorType)).toContain(authErrorType);
    });

    it('should generate different random values on multiple calls', () => {
      const randomData = TestDataBuilder.createRandomData();

      const asin1 = randomData.randomAsin();
      const asin2 = randomData.randomAsin();
      expect(asin1).not.toBe(asin2);

      const price1 = randomData.randomPrice();
      const price2 = randomData.randomPrice();
      // While they could be the same, it's very unlikely
      expect(typeof price1).toBe('number');
      expect(typeof price2).toBe('number');
    });
  });
});
