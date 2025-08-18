/**
 * Comprehensive tests for Amazon API type definitions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  validateAmazonCatalogItem,
  validateAmazonListingsItem,
  validateAmazonInventorySummary,
  validateAmazonOrder,
  validateAmazonReport,
  validateInventoryFilterParams,
  validateOrdersFilterParams,
  validateReportsFilterParams,
  TypeValidationError,
  AmazonCatalogItemSchema,
} from '../../../src/types/validators.js';
import {
  isAmazonCatalogItem,
  isAmazonListingsItem,
  isAmazonInventorySummary,
  isAmazonOrder,
  isAmazonReport,
  isInventoryFilterParams,
  isOrdersFilterParams,
  isReportsFilterParams,
  isAmazonItemAttributes,
  isAmazonItemIdentifiers,
  isAmazonItemRelationships,
  isToolContentResponse,
  isOrderUpdateDetails,
} from '../../../src/types/guards.js';
import type { ToolContentResponse } from '../../../src/types/amazon-api.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { TestSetup } from '../../utils/test-setup.js';

describe('Amazon API Types', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  describe('AmazonCatalogItem Interface', () => {
    describe('validation with complete structure', () => {
      it('should validate complete catalog item with all nested structures', () => {
        const validItem = TestDataBuilder.createCatalogItem({
          asin: 'B08TEST123',
          attributes: {
            title: 'Test Product Title',
            description: 'Detailed product description',
            brand: 'Test Brand',
            dimensions: {
              length: 10.5,
              width: 8.0,
              height: 3.2,
              weight: 1.5,
            },
            images: [
              { variant: 'MAIN', link: 'https://example.com/main.jpg' },
              { variant: 'PT01', link: 'https://example.com/alt1.jpg' },
            ],
            category: 'Electronics',
            color: 'Black',
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
                identifiers: [{ identifier: 'B08PARENT123', identifierType: 'ASIN' }],
              },
            ],
          },
          salesRanks: {
            ATVPDKIKX0DER: [{ rank: 12345, title: 'Electronics' }],
          },
        });

        expect(() => validateAmazonCatalogItem(validItem)).not.toThrow();
        expect(isAmazonCatalogItem(validItem)).toBe(true);

        const validated = validateAmazonCatalogItem(validItem);
        expect(validated.asin).toBe('B08TEST123');
        expect(validated.attributes?.title).toBe('Test Product Title');
        expect(validated.attributes?.dimensions?.length).toBe(10.5);
        expect(validated.identifiers?.ATVPDKIKX0DER?.[0]?.identifier).toBe('B08TEST123');
      });

      it('should validate minimal catalog item with only required fields', () => {
        const minimalItem = { asin: 'B08MINIMAL123' };

        expect(() => validateAmazonCatalogItem(minimalItem)).not.toThrow();
        expect(isAmazonCatalogItem(minimalItem)).toBe(true);

        const validated = validateAmazonCatalogItem(minimalItem);
        expect(validated.asin).toBe('B08MINIMAL123');
        expect(validated.attributes).toBeUndefined();
        expect(validated.identifiers).toBeUndefined();
      });

      it('should validate attributes with extensible properties', () => {
        const itemWithExtensibleAttributes = {
          asin: 'B08EXT123',
          attributes: {
            title: 'Test Product',
            customProperty: 'custom value',
            numericProperty: 42,
            booleanProperty: true,
            objectProperty: { nested: 'value' },
          },
        };

        expect(() => validateAmazonCatalogItem(itemWithExtensibleAttributes)).not.toThrow();
        expect(isAmazonCatalogItem(itemWithExtensibleAttributes)).toBe(true);
      });
    });

    describe('validation error scenarios', () => {
      it('should reject catalog item with missing ASIN', () => {
        const invalidItem = TestDataBuilder.createInvalidData().invalidCatalogItem('missingAsin');

        expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonCatalogItem(invalidItem)).toBe(false);
      });

      it('should reject catalog item with invalid ASIN type', () => {
        const invalidItem = TestDataBuilder.createInvalidData().invalidCatalogItem('invalidType');

        expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonCatalogItem(invalidItem)).toBe(false);
      });

      it('should reject catalog item with malformed nested structures', () => {
        const invalidItem =
          TestDataBuilder.createInvalidData().invalidCatalogItem('malformedStructure');

        expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonCatalogItem(invalidItem)).toBe(false);
      });

      it('should reject catalog item with empty ASIN', () => {
        const invalidItem = { asin: '' };

        expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
        // Note: Type guard only checks for string type, not length constraints
        expect(isAmazonCatalogItem(invalidItem)).toBe(true);
      });

      it('should reject catalog item with invalid dimensions', () => {
        const invalidItem = {
          asin: 'B08TEST123',
          attributes: {
            dimensions: {
              length: 'invalid',
              width: null,
              height: [],
            },
          },
        };

        expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonCatalogItem(invalidItem)).toBe(false);
      });

      it('should reject catalog item with invalid images array', () => {
        const invalidItem = {
          asin: 'B08TEST123',
          attributes: {
            images: [
              { variant: 123, link: 'https://example.com/image.jpg' },
              { variant: 'PT01' }, // Missing link
            ],
          },
        };

        expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonCatalogItem(invalidItem)).toBe(false);
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle null and undefined values correctly', () => {
        expect(isAmazonCatalogItem(null)).toBe(false);
        expect(isAmazonCatalogItem(undefined)).toBe(false);
        expect(() => validateAmazonCatalogItem(null)).toThrow(TypeValidationError);
        expect(() => validateAmazonCatalogItem(undefined)).toThrow(TypeValidationError);
      });

      it('should handle primitive values correctly', () => {
        expect(isAmazonCatalogItem('string')).toBe(false);
        expect(isAmazonCatalogItem(123)).toBe(false);
        expect(isAmazonCatalogItem(true)).toBe(false);
        expect(() => validateAmazonCatalogItem('string')).toThrow(TypeValidationError);
      });

      it('should handle empty objects correctly', () => {
        const emptyObject = {};
        expect(isAmazonCatalogItem(emptyObject)).toBe(false);
        expect(() => validateAmazonCatalogItem(emptyObject)).toThrow(TypeValidationError);
      });
    });
  });

  describe('AmazonListingsItem Interface', () => {
    describe('validation with complete structure', () => {
      it('should validate complete listings item with SKU, product type, and fulfillment availability', () => {
        const validItem = TestDataBuilder.createListing({
          sku: 'TEST-SKU-123',
          productType: 'PRODUCT',
          attributes: {
            title: 'Test Product Listing',
            brand: 'Test Brand',
            description: 'Product description for listing',
          },
          status: 'ACTIVE',
          fulfillmentAvailability: [
            { fulfillmentChannelCode: 'DEFAULT', quantity: 100 },
            { fulfillmentChannelCode: 'AMAZON', quantity: 50 },
          ],
        });

        expect(() => validateAmazonListingsItem(validItem)).not.toThrow();
        expect(isAmazonListingsItem(validItem)).toBe(true);

        const validated = validateAmazonListingsItem(validItem);
        expect(validated.sku).toBe('TEST-SKU-123');
        expect(validated.productType).toBe('PRODUCT');
        expect(validated.fulfillmentAvailability?.[0]?.fulfillmentChannelCode).toBe('DEFAULT');
      });

      it('should validate minimal listings item with required fields only', () => {
        const minimalItem = {
          sku: 'MINIMAL-SKU',
          productType: 'SIMPLE_PRODUCT',
          attributes: { title: 'Minimal Product' },
        };

        expect(() => validateAmazonListingsItem(minimalItem)).not.toThrow();
        expect(isAmazonListingsItem(minimalItem)).toBe(true);
      });
    });

    describe('validation error scenarios', () => {
      it('should reject listings item with missing SKU', () => {
        const invalidItem = TestDataBuilder.createInvalidData().invalidListingsItem('missingSku');

        expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonListingsItem(invalidItem)).toBe(false);
      });

      it('should reject listings item with invalid attributes', () => {
        const invalidItem =
          TestDataBuilder.createInvalidData().invalidListingsItem('invalidAttributes');

        expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonListingsItem(invalidItem)).toBe(false);
      });

      it('should reject listings item with malformed fulfillment availability', () => {
        const invalidItem =
          TestDataBuilder.createInvalidData().invalidListingsItem('malformedAvailability');

        expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
        expect(isAmazonListingsItem(invalidItem)).toBe(false);
      });

      it('should reject listings item with empty SKU', () => {
        const invalidItem = {
          sku: '',
          productType: 'PRODUCT',
          attributes: { title: 'Test' },
        };

        expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
        // Note: Type guard only checks for string type, not length constraints
        expect(isAmazonListingsItem(invalidItem)).toBe(true);
      });
    });
  });

  describe('AmazonInventorySummary Interface', () => {
    describe('validation with inventory details and condition', () => {
      it('should validate complete inventory summary with all details', () => {
        const validSummary = TestDataBuilder.createInventorySummary({
          asin: 'B08INV123',
          sellerSku: 'INV-SKU-123',
          condition: 'NewItem',
          inventoryDetails: {
            fulfillableQuantity: 100,
            inboundWorkingQuantity: 25,
            inboundShippedQuantity: 10,
            inboundReceivingQuantity: 5,
          },
        });

        expect(() => validateAmazonInventorySummary(validSummary)).not.toThrow();
        expect(isAmazonInventorySummary(validSummary)).toBe(true);

        const validated = validateAmazonInventorySummary(validSummary);
        expect(validated.asin).toBe('B08INV123');
        expect(validated.inventoryDetails?.fulfillableQuantity).toBe(100);
      });

      it('should validate minimal inventory summary', () => {
        const minimalSummary = {};

        expect(() => validateAmazonInventorySummary(minimalSummary)).not.toThrow();
        expect(isAmazonInventorySummary(minimalSummary)).toBe(true);
      });
    });

    describe('validation error scenarios', () => {
      it('should reject inventory summary with invalid inventory details', () => {
        const invalidSummary =
          TestDataBuilder.createInvalidData().invalidInventorySummary('invalidDetails');

        expect(() => validateAmazonInventorySummary(invalidSummary)).toThrow(TypeValidationError);
        expect(isAmazonInventorySummary(invalidSummary)).toBe(false);
      });

      it('should reject inventory summary with wrong types', () => {
        const invalidSummary =
          TestDataBuilder.createInvalidData().invalidInventorySummary('wrongTypes');

        expect(() => validateAmazonInventorySummary(invalidSummary)).toThrow(TypeValidationError);
        expect(isAmazonInventorySummary(invalidSummary)).toBe(false);
      });
    });
  });

  describe('AmazonOrder Interface', () => {
    describe('validation with order status, shipping address, and order total', () => {
      it('should validate complete order with all details', () => {
        const validOrder = TestDataBuilder.createOrder({
          amazonOrderId: 'ORDER-123456789',
          purchaseDate: '2024-01-15T10:30:00Z',
          orderStatus: 'Shipped',
          orderTotal: {
            currencyCode: 'USD',
            amount: '29.99',
          },
          marketplaceId: 'ATVPDKIKX0DER',
          shippingAddress: {
            name: 'John Doe',
            addressLine1: '123 Main Street',
            addressLine2: 'Apt 4B',
            city: 'Anytown',
            stateOrRegion: 'CA',
            postalCode: '12345',
            countryCode: 'US',
          },
        });

        expect(() => validateAmazonOrder(validOrder)).not.toThrow();
        expect(isAmazonOrder(validOrder)).toBe(true);

        const validated = validateAmazonOrder(validOrder);
        expect(validated.amazonOrderId).toBe('ORDER-123456789');
        expect(validated.orderTotal?.currencyCode).toBe('USD');
        expect(validated.shippingAddress?.name).toBe('John Doe');
      });

      it('should validate minimal order with required fields only', () => {
        const minimalOrder = {
          amazonOrderId: 'MIN-ORDER-123',
          purchaseDate: '2024-01-15T10:30:00Z',
          orderStatus: 'Pending',
          marketplaceId: 'ATVPDKIKX0DER',
        };

        expect(() => validateAmazonOrder(minimalOrder)).not.toThrow();
        expect(isAmazonOrder(minimalOrder)).toBe(true);
      });
    });

    describe('validation error scenarios', () => {
      it('should reject order with missing required fields', () => {
        const invalidOrder = TestDataBuilder.createInvalidData().invalidOrder('missingRequired');

        expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
        expect(isAmazonOrder(invalidOrder)).toBe(false);
      });

      it('should reject order with invalid order total', () => {
        const invalidOrder = TestDataBuilder.createInvalidData().invalidOrder('invalidTotal');

        expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
        expect(isAmazonOrder(invalidOrder)).toBe(false);
      });

      it('should reject order with malformed shipping address', () => {
        const invalidOrder = TestDataBuilder.createInvalidData().invalidOrder('malformedAddress');

        expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
        expect(isAmazonOrder(invalidOrder)).toBe(false);
      });
    });
  });

  describe('AmazonReport Interface', () => {
    describe('validation with report metadata and processing status', () => {
      it('should validate complete report with all metadata', () => {
        const validReport = TestDataBuilder.createReport({
          reportId: 'REPORT-123456789',
          reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
          processingStatus: 'DONE',
          createdTime: '2024-01-15T10:30:00Z',
          reportDocumentId: 'DOC-123456789',
        });

        expect(() => validateAmazonReport(validReport)).not.toThrow();
        expect(isAmazonReport(validReport)).toBe(true);

        const validated = validateAmazonReport(validReport);
        expect(validated.reportId).toBe('REPORT-123456789');
        expect(validated.processingStatus).toBe('DONE');
      });

      it('should validate minimal report without optional fields', () => {
        const minimalReport = {
          reportId: 'MIN-REPORT-123',
          reportType: 'GET_FLAT_FILE_ORDERS_DATA',
          processingStatus: 'IN_PROGRESS',
          createdTime: '2024-01-15T10:30:00Z',
        };

        expect(() => validateAmazonReport(minimalReport)).not.toThrow();
        expect(isAmazonReport(minimalReport)).toBe(true);
      });
    });

    describe('validation error scenarios', () => {
      it('should reject report with missing required fields', () => {
        const invalidReport = TestDataBuilder.createInvalidData().invalidReport('missingRequired');

        expect(() => validateAmazonReport(invalidReport)).toThrow(TypeValidationError);
        expect(isAmazonReport(invalidReport)).toBe(false);
      });

      it('should reject report with wrong types', () => {
        const invalidReport = TestDataBuilder.createInvalidData().invalidReport('wrongTypes');

        expect(() => validateAmazonReport(invalidReport)).toThrow(TypeValidationError);
        expect(isAmazonReport(invalidReport)).toBe(false);
      });
    });
  });

  describe('Filter Parameter Interfaces', () => {
    describe('InventoryFilterParams with pagination, date ranges, and arrays', () => {
      it('should validate complete inventory filter parameters', () => {
        const validParams = TestDataBuilder.createInventoryFilterParams({
          nextToken: 'NEXT_TOKEN_123',
          granularityType: 'Marketplace',
          granularityId: 'ATVPDKIKX0DER',
          startDateTime: '2024-01-01T00:00:00Z',
          endDateTime: new Date('2024-01-31T23:59:59Z'),
          marketplaceIds: ['ATVPDKIKX0DER', 'A1PA6795UKMFR9'],
          sellerSkus: ['SKU-1', 'SKU-2', 'SKU-3'],
          asins: ['B08TEST123', 'B08TEST456'],
          fulfillmentChannels: ['AMAZON', 'MERCHANT'],
        });

        expect(() => validateInventoryFilterParams(validParams)).not.toThrow();
        expect(isInventoryFilterParams(validParams)).toBe(true);

        const validated = validateInventoryFilterParams(validParams);
        expect(validated.marketplaceIds).toHaveLength(2);
        expect(validated.sellerSkus).toHaveLength(3);
      });

      it('should validate minimal inventory filter parameters', () => {
        const minimalParams = {};

        expect(() => validateInventoryFilterParams(minimalParams)).not.toThrow();
        expect(isInventoryFilterParams(minimalParams)).toBe(true);
      });

      it('should handle date objects and string dates', () => {
        const paramsWithDates = {
          startDateTime: new Date('2024-01-01'),
          endDateTime: '2024-01-31T23:59:59Z',
        };

        expect(() => validateInventoryFilterParams(paramsWithDates)).not.toThrow();
        expect(isInventoryFilterParams(paramsWithDates)).toBe(true);
      });
    });

    describe('OrdersFilterParams with pagination, date ranges, and arrays', () => {
      it('should validate complete orders filter parameters', () => {
        const validParams = TestDataBuilder.createOrdersFilterParams({
          nextToken: 'ORDERS_TOKEN_456',
          marketplaceIds: ['ATVPDKIKX0DER'],
          createdAfter: '2024-01-01T00:00:00Z',
          createdBefore: '2024-01-31T23:59:59Z',
          orderStatuses: ['Pending', 'Shipped', 'Delivered'],
          fulfillmentChannels: ['MFN', 'AFN'],
          buyerEmail: 'buyer@example.com',
        });

        expect(() => validateOrdersFilterParams(validParams)).not.toThrow();
        expect(isOrdersFilterParams(validParams)).toBe(true);

        const validated = validateOrdersFilterParams(validParams);
        expect(validated.orderStatuses).toHaveLength(3);
        expect(validated.buyerEmail).toBe('buyer@example.com');
      });

      it('should validate minimal orders filter parameters', () => {
        const minimalParams = {};

        expect(() => validateOrdersFilterParams(minimalParams)).not.toThrow();
        expect(isOrdersFilterParams(minimalParams)).toBe(true);
      });
    });

    describe('ReportsFilterParams with pagination, date ranges, and arrays', () => {
      it('should validate complete reports filter parameters', () => {
        const validParams = TestDataBuilder.createReportsFilterParams({
          nextToken: 'REPORTS_TOKEN_789',
          reportTypes: ['GET_MERCHANT_LISTINGS_ALL_DATA', 'GET_FLAT_FILE_ORDERS_DATA'],
          processingStatuses: ['DONE', 'IN_PROGRESS', 'CANCELLED'],
          marketplaceIds: ['ATVPDKIKX0DER'],
          createdSince: '2024-01-01T00:00:00Z',
          createdUntil: '2024-01-31T23:59:59Z',
        });

        expect(() => validateReportsFilterParams(validParams)).not.toThrow();
        expect(isReportsFilterParams(validParams)).toBe(true);

        const validated = validateReportsFilterParams(validParams);
        expect(validated.reportTypes).toHaveLength(2);
        expect(validated.processingStatuses).toHaveLength(3);
      });

      it('should validate minimal reports filter parameters', () => {
        const minimalParams = {};

        expect(() => validateReportsFilterParams(minimalParams)).not.toThrow();
        expect(isReportsFilterParams(minimalParams)).toBe(true);
      });
    });

    describe('filter parameter validation error scenarios', () => {
      it('should reject filter parameters with invalid arrays', () => {
        const invalidParams =
          TestDataBuilder.createInvalidData().invalidFilterParams('invalidArrays');

        expect(() => validateInventoryFilterParams(invalidParams)).toThrow(TypeValidationError);
        expect(isInventoryFilterParams(invalidParams)).toBe(false);
      });

      it('should reject filter parameters with wrong date types', () => {
        const invalidParams =
          TestDataBuilder.createInvalidData().invalidFilterParams('wrongDateTypes');

        expect(() => validateInventoryFilterParams(invalidParams)).toThrow(TypeValidationError);
        expect(isInventoryFilterParams(invalidParams)).toBe(false);
      });

      it('should reject filter parameters with invalid tokens', () => {
        const invalidParams =
          TestDataBuilder.createInvalidData().invalidFilterParams('invalidTokens');

        expect(() => validateInventoryFilterParams(invalidParams)).toThrow(TypeValidationError);
        expect(isInventoryFilterParams(invalidParams)).toBe(false);
      });
    });
  });

  describe('Nested Structure Validation', () => {
    describe('AmazonItemAttributes', () => {
      it('should validate complete item attributes structure', () => {
        const validAttributes = TestDataBuilder.createItemAttributes({
          title: 'Complete Product Title',
          description: 'Detailed description',
          brand: 'Premium Brand',
          dimensions: {
            length: 15.5,
            width: 10.2,
            height: 5.8,
            weight: 2.3,
          },
          images: [
            { variant: 'MAIN', link: 'https://example.com/main.jpg' },
            { variant: 'PT01', link: 'https://example.com/alt1.jpg' },
          ],
        });

        expect(isAmazonItemAttributes(validAttributes)).toBe(true);
      });

      it('should handle extensible properties in attributes', () => {
        const attributesWithExtensions = {
          title: 'Test Product',
          customString: 'custom value',
          customNumber: 42,
          customBoolean: true,
          customObject: { nested: 'data' },
        };

        expect(isAmazonItemAttributes(attributesWithExtensions)).toBe(true);
      });
    });

    describe('AmazonItemIdentifiers', () => {
      it('should validate complete item identifiers structure', () => {
        const validIdentifiers = TestDataBuilder.createItemIdentifiers({
          ATVPDKIKX0DER: [
            { identifier: 'B08TEST123', identifierType: 'ASIN' },
            { identifier: '1234567890123', identifierType: 'EAN' },
          ],
          A1PA6795UKMFR9: [{ identifier: 'B08TEST123', identifierType: 'ASIN' }],
        });

        expect(isAmazonItemIdentifiers(validIdentifiers)).toBe(true);
      });
    });

    describe('AmazonItemRelationships', () => {
      it('should validate complete item relationships structure', () => {
        const validRelationships = TestDataBuilder.createItemRelationships({
          ATVPDKIKX0DER: [
            {
              type: 'VARIATION',
              identifiers: [{ identifier: 'B08PARENT123', identifierType: 'ASIN' }],
            },
          ],
        });

        expect(isAmazonItemRelationships(validRelationships)).toBe(true);
      });
    });
  });

  describe('Additional Amazon API Types', () => {
    describe('ToolContentResponse', () => {
      it('should validate tool content response with text type', () => {
        const textResponse = TestDataBuilder.createToolContentResponse({
          type: 'text',
          text: 'Response content',
          mimeType: 'text/plain',
        });

        expect(isToolContentResponse(textResponse)).toBe(true);
      });

      it('should validate tool content response with resource_link type', () => {
        const resourceResponse: ToolContentResponse = {
          type: 'resource_link',
          uri: 'amazon://catalog/B08TEST123',
          name: 'Test Product',
          description: 'Product catalog resource',
        };

        expect(isToolContentResponse(resourceResponse)).toBe(true);
      });

      it('should reject invalid content type', () => {
        const invalidResponse = {
          type: 'invalid_type',
          text: 'Content',
        };

        expect(isToolContentResponse(invalidResponse)).toBe(false);
      });
    });

    describe('OrderUpdateDetails', () => {
      it('should validate complete order update details', () => {
        const updateDetails = TestDataBuilder.createOrderUpdateDetails({
          trackingNumber: 'TRK123456789',
          carrierCode: 'UPS',
          shippingDate: '2024-01-16T10:00:00Z',
          notes: 'Package shipped successfully',
        });

        expect(isOrderUpdateDetails(updateDetails)).toBe(true);
      });

      it('should validate minimal order update details', () => {
        const minimalDetails = {};

        expect(isOrderUpdateDetails(minimalDetails)).toBe(true);
      });

      it('should reject invalid property types', () => {
        const invalidDetails = {
          trackingNumber: 123,
          carrierCode: null,
          shippingDate: [],
        };

        expect(isOrderUpdateDetails(invalidDetails)).toBe(false);
      });
    });
  });

  describe('Schema Validation Integration', () => {
    it('should use Zod schemas for comprehensive validation', () => {
      const testData = {
        asin: 'B08SCHEMA123',
        attributes: {
          title: 'Schema Test Product',
          dimensions: { length: 10, width: 8 },
        },
      };

      // Test direct schema validation
      const result = AmazonCatalogItemSchema.safeParse(testData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.asin).toBe('B08SCHEMA123');
        expect(result.data.attributes?.title).toBe('Schema Test Product');
      }
    });

    it('should provide detailed validation errors', () => {
      const invalidData = {
        asin: 123, // Should be string
        attributes: {
          dimensions: {
            length: 'invalid', // Should be number
          },
        },
      };

      try {
        validateAmazonCatalogItem(invalidData);
        expect.fail('Should have thrown TypeValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeValidationError);
        expect(error.typeName).toBe('AmazonCatalogItem');
        expect(error.validationErrors).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large arrays efficiently', () => {
      const largeIdentifiers: AmazonItemIdentifiers = {};
      for (let i = 0; i < 100; i++) {
        largeIdentifiers[`MARKETPLACE_${i}`] = [
          { identifier: `ASIN_${i}`, identifierType: 'ASIN' },
        ];
      }

      const catalogItem = {
        asin: 'B08LARGE123',
        identifiers: largeIdentifiers,
      };

      expect(() => validateAmazonCatalogItem(catalogItem)).not.toThrow();
      expect(isAmazonCatalogItem(catalogItem)).toBe(true);
    });

    it('should handle deeply nested structures', () => {
      const deeplyNested = {
        asin: 'B08DEEP123',
        attributes: {
          title: 'Deep Product',
          customObject: {
            level1: {
              level2: {
                level3: 'deep value',
              },
            },
          },
        },
      };

      expect(() => validateAmazonCatalogItem(deeplyNested)).not.toThrow();
      expect(isAmazonCatalogItem(deeplyNested)).toBe(true);
    });

    it('should handle circular references gracefully', () => {
      const circularObject: Record<string, unknown> = {
        asin: 'B08CIRCULAR123',
      };
      circularObject.self = circularObject;

      // Type guards should handle circular references without infinite loops
      expect(isAmazonCatalogItem(circularObject)).toBe(true);
    });
  });
});
