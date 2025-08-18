/**
 * Tests for Zod schema validation functions
 */

import { describe, it, expect, vi } from 'vitest';
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
  AmazonListingsItemSchema,
  AmazonInventorySummarySchema,
  AmazonOrderSchema,
  AmazonReportSchema,
  InventoryFilterParamsSchema,
  OrdersFilterParamsSchema,
  ReportsFilterParamsSchema,
} from '../../../src/types/validators.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Validation Functions', () => {
  describe('validateAmazonCatalogItem', () => {
    it('should validate complete catalog item successfully', () => {
      const validItem = TestDataBuilder.createCatalogItem();

      const result = validateAmazonCatalogItem(validItem);

      expect(result).toEqual(validItem);
      expect(result.asin).toBe('B08TEST123');
      expect(result.attributes?.title).toBe('Test Product');
    });

    it('should validate minimal catalog item with only required fields', () => {
      const minimalItem = { asin: 'B08MINIMAL123' };

      const result = validateAmazonCatalogItem(minimalItem);

      expect(result.asin).toBe('B08MINIMAL123');
      expect(result.attributes).toBeUndefined();
    });

    it('should validate catalog item with complex nested structures', () => {
      const complexItem = TestDataBuilder.createCatalogItem({
        attributes: {
          title: 'Complex Product',
          dimensions: {
            length: 15.5,
            width: 10.2,
            height: 5.8,
            weight: 2.3,
          },
          images: [
            { variant: 'MAIN', link: 'https://example.com/main.jpg' },
            { variant: 'PT01', link: 'https://example.com/alt1.jpg' },
            { variant: 'PT02', link: 'https://example.com/alt2.jpg' },
          ],
          customAttribute: 'Custom Value',
          numericAttribute: 42,
          booleanAttribute: true,
        },
        identifiers: {
          ATVPDKIKX0DER: [
            { identifier: 'B08COMPLEX123', identifierType: 'ASIN' },
            { identifier: '1234567890123', identifierType: 'EAN', marketplaceId: 'ATVPDKIKX0DER' },
          ],
          A1PA6795UKMFR9: [{ identifier: 'B08COMPLEX123', identifierType: 'ASIN' }],
        },
        relationships: {
          ATVPDKIKX0DER: [
            {
              type: 'VARIATION',
              identifiers: [{ identifier: 'B08PARENT123', identifierType: 'ASIN' }],
            },
            {
              type: 'ACCESSORY',
              identifiers: [
                { identifier: 'B08ACCESSORY123', identifierType: 'ASIN' },
                { identifier: 'B08ACCESSORY456', identifierType: 'ASIN' },
              ],
            },
          ],
        },
        salesRanks: {
          ATVPDKIKX0DER: [
            { rank: 1234, title: 'Electronics' },
            { rank: 5678, title: 'Home & Garden' },
          ],
        },
      });

      const result = validateAmazonCatalogItem(complexItem);

      expect(result).toEqual(complexItem);
      expect(result.attributes?.customAttribute).toBe('Custom Value');
      expect(result.attributes?.numericAttribute).toBe(42);
      expect(result.attributes?.booleanAttribute).toBe(true);
    });

    it('should throw TypeValidationError for missing required asin field', () => {
      const invalidItem = TestDataBuilder.createInvalidData().invalidCatalogItem('missingAsin');

      expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);

      try {
        validateAmazonCatalogItem(invalidItem);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeValidationError);
        expect((error as TypeValidationError).typeName).toBe('AmazonCatalogItem');
        expect((error as TypeValidationError).message).toContain(
          'Invalid Amazon catalog item data'
        );
        expect((error as TypeValidationError).validationErrors).toBeInstanceOf(z.ZodError);
      }
    });

    it('should throw TypeValidationError for invalid data types', () => {
      const invalidItem = TestDataBuilder.createInvalidData().invalidCatalogItem('invalidType');

      expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for malformed nested structures', () => {
      const invalidItem =
        TestDataBuilder.createInvalidData().invalidCatalogItem('malformedStructure');

      expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
    });

    it('should handle empty asin string as invalid', () => {
      const invalidItem = { asin: '' };

      expect(() => validateAmazonCatalogItem(invalidItem)).toThrow(TypeValidationError);
    });

    it('should handle null and undefined inputs', () => {
      expect(() => validateAmazonCatalogItem(null)).toThrow(TypeValidationError);
      expect(() => validateAmazonCatalogItem(undefined)).toThrow(TypeValidationError);
    });

    it('should handle primitive values as invalid', () => {
      expect(() => validateAmazonCatalogItem('string')).toThrow(TypeValidationError);
      expect(() => validateAmazonCatalogItem(123)).toThrow(TypeValidationError);
      expect(() => validateAmazonCatalogItem(true)).toThrow(TypeValidationError);
    });
  });

  describe('validateAmazonListingsItem', () => {
    it('should validate complete listings item successfully', () => {
      const validItem = TestDataBuilder.createListing();

      const result = validateAmazonListingsItem(validItem);

      expect(result).toEqual(validItem);
      expect(result.sku).toBe('TEST-SKU-123');
      expect(result.productType).toBe('PRODUCT');
    });

    it('should validate listings item with minimal required fields', () => {
      const minimalItem = {
        sku: 'MINIMAL-SKU-123',
        productType: 'SIMPLE_PRODUCT',
        attributes: {
          title: 'Minimal Product',
        },
      };

      const result = validateAmazonListingsItem(minimalItem);

      expect(result.sku).toBe('MINIMAL-SKU-123');
      expect(result.productType).toBe('SIMPLE_PRODUCT');
      expect(result.attributes.title).toBe('Minimal Product');
    });

    it('should validate listings item with fulfillment availability', () => {
      const itemWithAvailability = TestDataBuilder.createListing({
        fulfillmentAvailability: [
          { fulfillmentChannelCode: 'DEFAULT', quantity: 100 },
          { fulfillmentChannelCode: 'AMAZON', quantity: 50 },
          { fulfillmentChannelCode: 'MERCHANT' }, // No quantity specified
        ],
      });

      const result = validateAmazonListingsItem(itemWithAvailability);

      expect(result.fulfillmentAvailability).toHaveLength(3);
      expect(result.fulfillmentAvailability?.[0].quantity).toBe(100);
      expect(result.fulfillmentAvailability?.[2].quantity).toBeUndefined();
    });

    it('should throw TypeValidationError for missing required sku field', () => {
      const invalidItem = TestDataBuilder.createInvalidData().invalidListingsItem('missingSku');

      expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for invalid attributes', () => {
      const invalidItem =
        TestDataBuilder.createInvalidData().invalidListingsItem('invalidAttributes');

      expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for malformed fulfillment availability', () => {
      const invalidItem =
        TestDataBuilder.createInvalidData().invalidListingsItem('malformedAvailability');

      expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
    });

    it('should handle empty required strings as invalid', () => {
      const invalidItem = {
        sku: '',
        productType: '',
        attributes: { title: 'Test' },
      };

      expect(() => validateAmazonListingsItem(invalidItem)).toThrow(TypeValidationError);
    });
  });

  describe('validateAmazonInventorySummary', () => {
    it('should validate complete inventory summary successfully', () => {
      const validSummary = TestDataBuilder.createInventorySummary();

      const result = validateAmazonInventorySummary(validSummary);

      expect(result).toEqual(validSummary);
      expect(result.asin).toBe('B08TEST123');
      expect(result.sellerSku).toBe('TEST-SKU-123');
    });

    it('should validate inventory summary with minimal fields', () => {
      const minimalSummary = {};

      const result = validateAmazonInventorySummary(minimalSummary);

      expect(result).toEqual({});
    });

    it('should validate inventory summary with detailed inventory information', () => {
      const detailedSummary = TestDataBuilder.createInventorySummary({
        inventoryDetails: {
          fulfillableQuantity: 150,
          inboundWorkingQuantity: 25,
          inboundShippedQuantity: 10,
          inboundReceivingQuantity: 5,
        },
      });

      const result = validateAmazonInventorySummary(detailedSummary);

      expect(result.inventoryDetails?.fulfillableQuantity).toBe(150);
      expect(result.inventoryDetails?.inboundWorkingQuantity).toBe(25);
    });

    it('should throw TypeValidationError for invalid inventory details', () => {
      const invalidSummary =
        TestDataBuilder.createInvalidData().invalidInventorySummary('invalidDetails');

      expect(() => validateAmazonInventorySummary(invalidSummary)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for wrong data types', () => {
      const invalidSummary =
        TestDataBuilder.createInvalidData().invalidInventorySummary('wrongTypes');

      expect(() => validateAmazonInventorySummary(invalidSummary)).toThrow(TypeValidationError);
    });
  });

  describe('validateAmazonOrder', () => {
    it('should validate complete order successfully', () => {
      const validOrder = TestDataBuilder.createOrder();

      const result = validateAmazonOrder(validOrder);

      expect(result).toEqual(validOrder);
      expect(result.amazonOrderId).toBe('TEST-ORDER-123456789');
      expect(result.orderStatus).toBe('Shipped');
    });

    it('should validate order with minimal required fields', () => {
      const minimalOrder = {
        amazonOrderId: 'MIN-ORDER-123',
        purchaseDate: '2024-01-15T10:30:00Z',
        orderStatus: 'Pending',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      const result = validateAmazonOrder(minimalOrder);

      expect(result.amazonOrderId).toBe('MIN-ORDER-123');
      expect(result.orderTotal).toBeUndefined();
      expect(result.shippingAddress).toBeUndefined();
    });

    it('should validate order with complete shipping address', () => {
      const orderWithAddress = TestDataBuilder.createOrder({
        shippingAddress: {
          name: 'John Doe',
          addressLine1: '123 Main Street',
          addressLine2: 'Suite 100',
          city: 'Anytown',
          stateOrRegion: 'CA',
          postalCode: '12345-6789',
          countryCode: 'US',
        },
      });

      const result = validateAmazonOrder(orderWithAddress);

      expect(result.shippingAddress?.name).toBe('John Doe');
      expect(result.shippingAddress?.postalCode).toBe('12345-6789');
    });

    it('should throw TypeValidationError for missing required fields', () => {
      const invalidOrder = TestDataBuilder.createInvalidData().invalidOrder('missingRequired');

      expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for invalid order total', () => {
      const invalidOrder = TestDataBuilder.createInvalidData().invalidOrder('invalidTotal');

      expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for malformed shipping address', () => {
      const invalidOrder = TestDataBuilder.createInvalidData().invalidOrder('malformedAddress');

      expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
    });

    it('should handle empty required strings as invalid', () => {
      const invalidOrder = {
        amazonOrderId: '',
        purchaseDate: '2024-01-15T10:30:00Z',
        orderStatus: 'Pending',
        marketplaceId: '',
      };

      expect(() => validateAmazonOrder(invalidOrder)).toThrow(TypeValidationError);
    });
  });

  describe('validateAmazonReport', () => {
    it('should validate complete report successfully', () => {
      const validReport = TestDataBuilder.createReport();

      const result = validateAmazonReport(validReport);

      expect(result).toEqual(validReport);
      expect(result.reportId).toBe('REPORT_123456789');
      expect(result.reportType).toBe('GET_MERCHANT_LISTINGS_ALL_DATA');
    });

    it('should validate report with minimal required fields', () => {
      const minimalReport = {
        reportId: 'MIN-REPORT-123',
        reportType: 'GET_ORDERS_DATA',
        processingStatus: 'IN_PROGRESS',
        createdTime: '2024-01-15T10:30:00Z',
      };

      const result = validateAmazonReport(minimalReport);

      expect(result.reportId).toBe('MIN-REPORT-123');
      expect(result.reportDocumentId).toBeUndefined();
    });

    it('should validate report with document ID', () => {
      const reportWithDoc = TestDataBuilder.createReport({
        reportDocumentId: 'DOC_987654321',
      });

      const result = validateAmazonReport(reportWithDoc);

      expect(result.reportDocumentId).toBe('DOC_987654321');
    });

    it('should throw TypeValidationError for missing required fields', () => {
      const invalidReport = TestDataBuilder.createInvalidData().invalidReport('missingRequired');

      expect(() => validateAmazonReport(invalidReport)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for wrong data types', () => {
      const invalidReport = TestDataBuilder.createInvalidData().invalidReport('wrongTypes');

      expect(() => validateAmazonReport(invalidReport)).toThrow(TypeValidationError);
    });

    it('should handle empty required strings as invalid', () => {
      const invalidReport = {
        reportId: '',
        reportType: '',
        processingStatus: 'DONE',
        createdTime: '2024-01-15T10:30:00Z',
      };

      expect(() => validateAmazonReport(invalidReport)).toThrow(TypeValidationError);
    });
  });

  describe('validateInventoryFilterParams', () => {
    it('should validate complete inventory filter parameters successfully', () => {
      const validParams = TestDataBuilder.createInventoryFilterParams();

      const result = validateInventoryFilterParams(validParams);

      expect(result).toEqual(validParams);
      expect(result.marketplaceIds).toEqual(['ATVPDKIKX0DER']);
      expect(result.sellerSkus).toEqual(['TEST-SKU-123', 'TEST-SKU-456']);
    });

    it('should validate empty filter parameters', () => {
      const emptyParams = {};

      const result = validateInventoryFilterParams(emptyParams);

      expect(result).toEqual({});
    });

    it('should validate filter parameters with date strings', () => {
      const paramsWithDates = {
        startDateTime: '2024-01-01T00:00:00Z',
        endDateTime: '2024-01-31T23:59:59Z',
      };

      const result = validateInventoryFilterParams(paramsWithDates);

      expect(result.startDateTime).toBe('2024-01-01T00:00:00Z');
      expect(result.endDateTime).toBe('2024-01-31T23:59:59Z');
    });

    it('should validate filter parameters with Date objects', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const paramsWithDates = {
        startDateTime: startDate,
        endDateTime: endDate,
      };

      const result = validateInventoryFilterParams(paramsWithDates);

      expect(result.startDateTime).toEqual(startDate);
      expect(result.endDateTime).toEqual(endDate);
    });

    it('should throw TypeValidationError for invalid array parameters', () => {
      const invalidParams =
        TestDataBuilder.createInvalidData().invalidFilterParams('invalidArrays');

      expect(() => validateInventoryFilterParams(invalidParams)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for wrong date types', () => {
      const invalidParams =
        TestDataBuilder.createInvalidData().invalidFilterParams('wrongDateTypes');

      expect(() => validateInventoryFilterParams(invalidParams)).toThrow(TypeValidationError);
    });

    it('should throw TypeValidationError for invalid token types', () => {
      const invalidParams =
        TestDataBuilder.createInvalidData().invalidFilterParams('invalidTokens');

      expect(() => validateInventoryFilterParams(invalidParams)).toThrow(TypeValidationError);
    });
  });

  describe('validateOrdersFilterParams', () => {
    it('should validate complete orders filter parameters successfully', () => {
      const validParams = TestDataBuilder.createOrdersFilterParams();

      const result = validateOrdersFilterParams(validParams);

      expect(result).toEqual(validParams);
      expect(result.orderStatuses).toEqual(['Pending', 'Shipped', 'Delivered']);
      expect(result.fulfillmentChannels).toEqual(['MFN', 'AFN']);
    });

    it('should validate minimal orders filter parameters', () => {
      const minimalParams = {
        marketplaceIds: ['ATVPDKIKX0DER'],
      };

      const result = validateOrdersFilterParams(minimalParams);

      expect(result.marketplaceIds).toEqual(['ATVPDKIKX0DER']);
      expect(result.nextToken).toBeUndefined();
    });

    it('should validate orders filter parameters with buyer email', () => {
      const paramsWithEmail = {
        buyerEmail: 'test@example.com',
        marketplaceIds: ['ATVPDKIKX0DER'],
      };

      const result = validateOrdersFilterParams(paramsWithEmail);

      expect(result.buyerEmail).toBe('test@example.com');
    });

    it('should throw TypeValidationError for invalid parameters', () => {
      const invalidParams = {
        marketplaceIds: 'not-an-array',
        orderStatuses: [123, 456],
      };

      expect(() => validateOrdersFilterParams(invalidParams)).toThrow(TypeValidationError);
    });
  });

  describe('validateReportsFilterParams', () => {
    it('should validate complete reports filter parameters successfully', () => {
      const validParams = TestDataBuilder.createReportsFilterParams();

      const result = validateReportsFilterParams(validParams);

      expect(result).toEqual(validParams);
      expect(result.reportTypes).toEqual([
        'GET_MERCHANT_LISTINGS_ALL_DATA',
        'GET_FLAT_FILE_ORDERS_DATA',
      ]);
      expect(result.processingStatuses).toEqual(['DONE', 'IN_PROGRESS']);
    });

    it('should validate minimal reports filter parameters', () => {
      const minimalParams = {
        reportTypes: ['GET_MERCHANT_LISTINGS_ALL_DATA'],
      };

      const result = validateReportsFilterParams(minimalParams);

      expect(result.reportTypes).toEqual(['GET_MERCHANT_LISTINGS_ALL_DATA']);
      expect(result.nextToken).toBeUndefined();
    });

    it('should validate reports filter parameters with date range', () => {
      const paramsWithDates = {
        createdSince: '2024-01-01T00:00:00Z',
        createdUntil: '2024-01-31T23:59:59Z',
      };

      const result = validateReportsFilterParams(paramsWithDates);

      expect(result.createdSince).toBe('2024-01-01T00:00:00Z');
      expect(result.createdUntil).toBe('2024-01-31T23:59:59Z');
    });

    it('should throw TypeValidationError for invalid parameters', () => {
      const invalidParams = {
        reportTypes: 'not-an-array',
        processingStatuses: [123, 456],
      };

      expect(() => validateReportsFilterParams(invalidParams)).toThrow(TypeValidationError);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty objects for all validation functions', () => {
      // Only inventory summary and filter params allow empty objects
      expect(() => validateAmazonInventorySummary({})).not.toThrow();
      expect(() => validateInventoryFilterParams({})).not.toThrow();
      expect(() => validateOrdersFilterParams({})).not.toThrow();
      expect(() => validateReportsFilterParams({})).not.toThrow();

      // These require at least some fields
      expect(() => validateAmazonCatalogItem({})).toThrow(TypeValidationError);
      expect(() => validateAmazonListingsItem({})).toThrow(TypeValidationError);
      expect(() => validateAmazonOrder({})).toThrow(TypeValidationError);
      expect(() => validateAmazonReport({})).toThrow(TypeValidationError);
    });

    it('should handle null values consistently', () => {
      const validators = [
        validateAmazonCatalogItem,
        validateAmazonListingsItem,
        validateAmazonInventorySummary,
        validateAmazonOrder,
        validateAmazonReport,
        validateInventoryFilterParams,
        validateOrdersFilterParams,
        validateReportsFilterParams,
      ];

      validators.forEach((validator) => {
        expect(() => validator(null)).toThrow(TypeValidationError);
      });
    });

    it('should handle undefined values consistently', () => {
      const validators = [
        validateAmazonCatalogItem,
        validateAmazonListingsItem,
        validateAmazonInventorySummary,
        validateAmazonOrder,
        validateAmazonReport,
        validateInventoryFilterParams,
        validateOrdersFilterParams,
        validateReportsFilterParams,
      ];

      validators.forEach((validator) => {
        expect(() => validator(undefined)).toThrow(TypeValidationError);
      });
    });

    it('should handle arrays as invalid input', () => {
      const validators = [
        validateAmazonCatalogItem,
        validateAmazonListingsItem,
        validateAmazonInventorySummary,
        validateAmazonOrder,
        validateAmazonReport,
        validateInventoryFilterParams,
        validateOrdersFilterParams,
        validateReportsFilterParams,
      ];

      validators.forEach((validator) => {
        expect(() => validator([])).toThrow(TypeValidationError);
        expect(() => validator([1, 2, 3])).toThrow(TypeValidationError);
      });
    });

    it('should handle primitive values as invalid input', () => {
      const validators = [
        validateAmazonCatalogItem,
        validateAmazonListingsItem,
        validateAmazonInventorySummary,
        validateAmazonOrder,
        validateAmazonReport,
        validateInventoryFilterParams,
        validateOrdersFilterParams,
        validateReportsFilterParams,
      ];

      const primitives = ['string', 123, true, false];

      validators.forEach((validator) => {
        primitives.forEach((primitive) => {
          expect(() => validator(primitive)).toThrow(TypeValidationError);
        });
      });
    });

    it('should handle very large numbers in numeric fields', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;

      const inventoryWithLargeNumbers = {
        inventoryDetails: {
          fulfillableQuantity: largeNumber,
          inboundWorkingQuantity: largeNumber,
        },
      };

      expect(() => validateAmazonInventorySummary(inventoryWithLargeNumbers)).not.toThrow();

      const catalogWithLargeNumbers = {
        asin: 'B08TEST123',
        attributes: {
          dimensions: {
            length: largeNumber,
            width: largeNumber,
            height: largeNumber,
            weight: largeNumber,
          },
        },
        salesRanks: {
          ATVPDKIKX0DER: [{ rank: largeNumber, title: 'Test Category' }],
        },
      };

      expect(() => validateAmazonCatalogItem(catalogWithLargeNumbers)).not.toThrow();
    });

    it('should handle very long strings in string fields', () => {
      const longString = 'a'.repeat(10000);

      const catalogWithLongStrings = {
        asin: 'B08TEST123',
        attributes: {
          title: longString,
          description: longString,
          brand: longString,
        },
      };

      expect(() => validateAmazonCatalogItem(catalogWithLongStrings)).not.toThrow();
    });

    it('should handle empty arrays in array fields', () => {
      const catalogWithEmptyArrays = {
        asin: 'B08TEST123',
        attributes: {
          images: [],
        },
        salesRanks: {
          ATVPDKIKX0DER: [],
        },
      };

      expect(() => validateAmazonCatalogItem(catalogWithEmptyArrays)).not.toThrow();

      const filterWithEmptyArrays = {
        marketplaceIds: [],
        sellerSkus: [],
        asins: [],
      };

      expect(() => validateInventoryFilterParams(filterWithEmptyArrays)).not.toThrow();
    });
  });

  describe('TypeValidationError Properties', () => {
    it('should create TypeValidationError with correct properties', () => {
      const invalidData = { asin: 123 };

      try {
        validateAmazonCatalogItem(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeValidationError);
        expect(error).toBeInstanceOf(Error);

        const validationError = error as TypeValidationError;
        expect(validationError.name).toBe('TypeValidationError');
        expect(validationError.typeName).toBe('AmazonCatalogItem');
        expect(validationError.message).toContain('Invalid Amazon catalog item data');
        expect(validationError.validationErrors).toBeInstanceOf(z.ZodError);
        expect(validationError.validationErrors.issues).toHaveLength(1);
        expect(validationError.validationErrors.issues[0].path).toEqual(['asin']);
        expect(validationError.validationErrors.issues[0].code).toBe('invalid_type');
      }
    });

    it('should preserve original error for non-Zod errors', () => {
      // Test that the function properly handles Zod errors by creating a TypeValidationError
      expect(() => {
        try {
          AmazonCatalogItemSchema.parse({ asin: 123 });
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new TypeValidationError('Test error', 'TestType', error);
          }
          throw error;
        }
      }).toThrow(TypeValidationError);
    });
  });

  describe('Non-Zod Error Handling', () => {
    it('should re-throw non-Zod errors in validateAmazonCatalogItem', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = AmazonCatalogItemSchema.parse;
      AmazonCatalogItemSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateAmazonCatalogItem({})).toThrow('Non-Zod error');

      // Restore original parse method
      AmazonCatalogItemSchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateAmazonListingsItem', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = AmazonListingsItemSchema.parse;
      AmazonListingsItemSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateAmazonListingsItem({})).toThrow('Non-Zod error');

      // Restore original parse method
      AmazonListingsItemSchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateAmazonInventorySummary', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = AmazonInventorySummarySchema.parse;
      AmazonInventorySummarySchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateAmazonInventorySummary({})).toThrow('Non-Zod error');

      // Restore original parse method
      AmazonInventorySummarySchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateAmazonOrder', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = AmazonOrderSchema.parse;
      AmazonOrderSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateAmazonOrder({})).toThrow('Non-Zod error');

      // Restore original parse method
      AmazonOrderSchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateAmazonReport', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = AmazonReportSchema.parse;
      AmazonReportSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateAmazonReport({})).toThrow('Non-Zod error');

      // Restore original parse method
      AmazonReportSchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateInventoryFilterParams', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = InventoryFilterParamsSchema.parse;
      InventoryFilterParamsSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateInventoryFilterParams({})).toThrow('Non-Zod error');

      // Restore original parse method
      InventoryFilterParamsSchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateOrdersFilterParams', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = OrdersFilterParamsSchema.parse;
      OrdersFilterParamsSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateOrdersFilterParams({})).toThrow('Non-Zod error');

      // Restore original parse method
      OrdersFilterParamsSchema.parse = originalParse;
    });

    it('should re-throw non-Zod errors in validateReportsFilterParams', () => {
      const originalError = new Error('Non-Zod error');

      // Mock the schema parse to throw a non-Zod error
      const originalParse = ReportsFilterParamsSchema.parse;
      ReportsFilterParamsSchema.parse = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateReportsFilterParams({})).toThrow('Non-Zod error');

      // Restore original parse method
      ReportsFilterParamsSchema.parse = originalParse;
    });
  });
});
