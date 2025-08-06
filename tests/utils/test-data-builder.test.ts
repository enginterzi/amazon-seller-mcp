/**
 * Tests for the test data builder
 */

import { describe, it, expect } from 'vitest';
import { TestDataBuilder } from './test-data-builder.js';
import {
  AmazonRegion,
  AuthErrorType,
  AuthError,
} from '../../src/auth/index.js';
import {
  ApiErrorType,
  ApiError,
} from '../../src/api/index.js';

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
          item_name: expect.arrayContaining([
            expect.objectContaining({
              value: expect.any(String),
              language_tag: 'en_US',
            }),
          ]),
        }),
        identifiers: expect.arrayContaining([
          expect.objectContaining({
            identifier: expect.any(String),
            identifierType: expect.any(String),
          }),
        ]),
        images: expect.any(Array),
        productTypes: expect.any(Array),
        salesRanks: expect.any(Array),
        summaries: expect.any(Array),
      });
    });
  });

  describe('createOrder', () => {
    it('should create valid order data', () => {
      const order = TestDataBuilder.createOrder();

      expect(order).toMatchObject({
        AmazonOrderId: expect.stringContaining('ORDER'),
        OrderStatus: expect.any(String),
        PurchaseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        OrderTotal: expect.objectContaining({
          CurrencyCode: expect.any(String),
          Amount: expect.any(String),
        }),
        MarketplaceId: expect.any(String),
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
          reservedQuantity: expect.any(Object),
          unfulfillableQuantity: expect.any(Object),
        }),
        totalQuantity: expect.any(Number),
      });
    });
  });

  describe('createListing', () => {
    it('should create valid listing data', () => {
      const listing = TestDataBuilder.createListing();

      expect(listing).toMatchObject({
        sku: expect.stringContaining('SKU'),
        asin: expect.stringMatching(/^B\w+/),
        productType: expect.any(String),
        attributes: expect.objectContaining({
          condition_type: expect.any(Array),
          purchasable_offer: expect.any(Array),
        }),
        issues: expect.any(Array),
      });
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
      expect(['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8', 'AAHKV2X7AFYLW']).toContain(marketplaceId);
      
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