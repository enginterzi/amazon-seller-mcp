/**
 * Tests for TypeValidationMockFactory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TypeValidationMockFactory,
  TypeValidationBuilders,
  type TypeValidationMockConfig,
} from './type-validation-factory.js';
import { TypeValidationError } from '../../../src/types/validators.js';

describe('TypeValidationMockFactory', () => {
  let factory: TypeValidationMockFactory;

  beforeEach(() => {
    factory = new TypeValidationMockFactory();
  });

  describe('Amazon API Types', () => {
    describe('createValidAmazonCatalogItem', () => {
      it('should create valid catalog item data', () => {
        const item = factory.createValidAmazonCatalogItem();

        expect(item).toHaveProperty('asin');
        expect(typeof item.asin).toBe('string');
        expect(item.asin.length).toBeGreaterThan(0);
      });

      it('should create minimal catalog item when configured', () => {
        const minimalFactory = TypeValidationBuilders.minimal();
        const item = minimalFactory.createValidAmazonCatalogItem();

        expect(item).toHaveProperty('asin');
        expect(item.asin).toBe('B08TEST123');
      });

      it('should apply overrides correctly', () => {
        const customAsin = 'B12345CUSTOM';
        const item = factory.createValidAmazonCatalogItem({ asin: customAsin });

        expect(item.asin).toBe(customAsin);
      });

      it('should validate generated data', () => {
        // This should not throw since the factory validates internally
        expect(() => factory.createValidAmazonCatalogItem()).not.toThrow();
      });
    });

    describe('createInvalidAmazonCatalogItem', () => {
      it('should create invalid catalog item with missing ASIN', () => {
        const invalidItem = factory.createInvalidAmazonCatalogItem('missingAsin');

        expect(invalidItem).not.toHaveProperty('asin');
        expect(invalidItem).toHaveProperty('attributes');
      });

      it('should create invalid catalog item with wrong types', () => {
        const invalidItem = factory.createInvalidAmazonCatalogItem('invalidType');

        expect(typeof (invalidItem as Record<string, unknown>).asin).toBe('number');
        expect(typeof (invalidItem as Record<string, unknown>).attributes).toBe('string');
      });

      it('should create invalid catalog item with malformed structure', () => {
        const invalidItem = factory.createInvalidAmazonCatalogItem('malformedStructure');

        expect(invalidItem).toHaveProperty('asin');
        expect(invalidItem).toHaveProperty('attributes');
        const attrs = (invalidItem as Record<string, unknown>).attributes;
        expect(attrs.dimensions.length).toBe('invalid');
      });
    });

    describe('createValidAmazonListingsItem', () => {
      it('should create valid listings item data', () => {
        const item = factory.createValidAmazonListingsItem();

        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('productType');
        expect(item).toHaveProperty('attributes');
        expect(typeof item.sku).toBe('string');
        expect(typeof item.productType).toBe('string');
      });

      it('should create minimal listings item when configured', () => {
        const minimalFactory = TypeValidationBuilders.minimal();
        const item = minimalFactory.createValidAmazonListingsItem();

        expect(item.sku).toBe('TEST-SKU-123');
        expect(item.productType).toBe('PRODUCT');
      });
    });

    describe('createValidAmazonOrder', () => {
      it('should create valid order data', () => {
        const order = factory.createValidAmazonOrder();

        expect(order).toHaveProperty('amazonOrderId');
        expect(order).toHaveProperty('purchaseDate');
        expect(order).toHaveProperty('orderStatus');
        expect(order).toHaveProperty('marketplaceId');
        expect(typeof order.amazonOrderId).toBe('string');
        expect(typeof order.marketplaceId).toBe('string');
      });

      it('should create minimal order when configured', () => {
        const minimalFactory = TypeValidationBuilders.minimal();
        const order = minimalFactory.createValidAmazonOrder();

        expect(order.amazonOrderId).toBe('TEST-ORDER-123');
        expect(order.marketplaceId).toBe('ATVPDKIKX0DER');
      });
    });

    describe('createValidAmazonReport', () => {
      it('should create valid report data', () => {
        const report = factory.createValidAmazonReport();

        expect(report).toHaveProperty('reportId');
        expect(report).toHaveProperty('reportType');
        expect(report).toHaveProperty('processingStatus');
        expect(report).toHaveProperty('createdTime');
        expect(typeof report.reportId).toBe('string');
        expect(typeof report.reportType).toBe('string');
      });
    });
  });

  describe('Common Types', () => {
    describe('createValidErrorDetails', () => {
      it('should create valid error details', () => {
        const details = factory.createValidErrorDetails();

        // Should pass type guard validation
        expect(() => factory.checkType(details, 'ErrorDetails')).not.toThrow();
      });

      it('should create minimal error details when configured', () => {
        const minimalFactory = TypeValidationBuilders.minimal();
        const details = minimalFactory.createValidErrorDetails();

        expect(details.code).toBe('InvalidInput');
      });
    });

    describe('createValidLogMetadata', () => {
      it('should create valid log metadata', () => {
        const metadata = factory.createValidLogMetadata();

        expect(() => factory.checkType(metadata, 'LogMetadata')).not.toThrow();
      });
    });

    describe('createValidMcpRequestBody', () => {
      it('should create valid MCP request body', () => {
        const request = factory.createValidMcpRequestBody();

        expect(request.jsonrpc).toBe('2.0');
        expect(typeof request.method).toBe('string');
        expect(() => factory.checkType(request, 'McpRequestBody')).not.toThrow();
      });
    });

    describe('createValidNotificationData', () => {
      it('should create valid notification data', () => {
        const notification = factory.createValidNotificationData();

        expect(typeof notification.type).toBe('string');
        expect(typeof notification.timestamp).toBe('string');
        expect(typeof notification.payload).toBe('object');
        expect(() => factory.checkType(notification, 'NotificationData')).not.toThrow();
      });
    });
  });

  describe('Filter Parameters', () => {
    describe('createValidInventoryFilterParams', () => {
      it('should create valid inventory filter parameters', () => {
        const params = factory.createValidInventoryFilterParams();

        expect(() => factory.validateData(params, 'InventoryFilterParams')).not.toThrow();
      });
    });

    describe('createValidOrdersFilterParams', () => {
      it('should create valid orders filter parameters', () => {
        const params = factory.createValidOrdersFilterParams();

        expect(() => factory.validateData(params, 'OrdersFilterParams')).not.toThrow();
      });
    });

    describe('createValidReportsFilterParams', () => {
      it('should create valid reports filter parameters', () => {
        const params = factory.createValidReportsFilterParams();

        expect(() => factory.validateData(params, 'ReportsFilterParams')).not.toThrow();
      });
    });
  });

  describe('Validation Methods', () => {
    describe('validateData', () => {
      it('should validate Amazon catalog item successfully', () => {
        const validItem = factory.createValidAmazonCatalogItem();

        expect(() => factory.validateData(validItem, 'AmazonCatalogItem')).not.toThrow();
        const result = factory.validateData(validItem, 'AmazonCatalogItem');
        expect(result).toEqual(validItem);
      });

      it('should throw error for invalid data', () => {
        const invalidItem = factory.createInvalidAmazonCatalogItem();

        expect(() => factory.validateData(invalidItem, 'AmazonCatalogItem')).toThrow(
          TypeValidationError
        );
      });

      it('should throw error for unknown validation type', () => {
        const data = { test: 'data' };

        expect(() => factory.validateData(data, 'UnknownType')).toThrow(
          'Unknown validation type: UnknownType'
        );
      });
    });

    describe('checkType', () => {
      it('should return true for valid data', () => {
        const validItem = factory.createValidAmazonCatalogItem();

        expect(factory.checkType(validItem, 'AmazonCatalogItem')).toBe(true);
      });

      it('should return false for invalid data', () => {
        const invalidItem = factory.createInvalidAmazonCatalogItem();

        expect(factory.checkType(invalidItem, 'AmazonCatalogItem')).toBe(false);
      });

      it('should throw error for unknown type guard', () => {
        const data = { test: 'data' };

        expect(() => factory.checkType(data, 'UnknownType')).toThrow(
          'Unknown type guard: UnknownType'
        );
      });
    });
  });

  describe('Batch Operations', () => {
    describe('createValidDataBatch', () => {
      it('should create batch of valid data for multiple types', () => {
        const types = ['AmazonCatalogItem', 'AmazonOrder', 'ErrorDetails'];
        const count = 2;

        const batch = factory.createValidDataBatch(types, count);

        expect(Object.keys(batch)).toEqual(types);
        types.forEach((type) => {
          expect(batch[type]).toHaveLength(count);
          batch[type].forEach((item) => {
            expect(factory.checkType(item, type)).toBe(true);
          });
        });
      });

      it('should create single item by default', () => {
        const types = ['AmazonCatalogItem'];

        const batch = factory.createValidDataBatch(types);

        expect(batch.AmazonCatalogItem).toHaveLength(1);
      });

      it('should throw error for unsupported batch type', () => {
        const types = ['UnsupportedType'];

        expect(() => factory.createValidDataBatch(types)).toThrow(
          'Unsupported batch type: UnsupportedType'
        );
      });
    });

    describe('createInvalidDataBatch', () => {
      it('should create batch of invalid data for multiple types', () => {
        const types = ['AmazonCatalogItem', 'AmazonOrder'];
        const count = 2;

        const batch = factory.createInvalidDataBatch(types, count);

        expect(Object.keys(batch)).toEqual(types);
        types.forEach((type) => {
          expect(batch[type]).toHaveLength(count);
          batch[type].forEach((item) => {
            expect(factory.checkType(item, type)).toBe(false);
          });
        });
      });
    });
  });

  describe('Configuration', () => {
    describe('minimal configuration', () => {
      it('should create minimal data when configured', () => {
        const minimalFactory = new TypeValidationMockFactory({ minimal: true });
        const item = minimalFactory.createValidAmazonCatalogItem();

        expect(item.asin).toBe('B08TEST123');
        // Should not have complex nested structures in minimal mode
      });
    });

    describe('comprehensive configuration', () => {
      it('should create comprehensive data with edge cases', () => {
        const comprehensiveFactory = TypeValidationBuilders.comprehensive();
        const item = comprehensiveFactory.createValidAmazonCatalogItem();

        expect(item).toHaveProperty('asin');
        // Should include more complex structures when comprehensive
      });
    });

    describe('custom configuration', () => {
      it('should accept custom configuration', () => {
        const customConfig: TypeValidationMockConfig = {
          minimal: true,
          includeEdgeCases: false,
          overrides: { customField: 'customValue' },
        };

        const customFactory = TypeValidationBuilders.custom(customConfig);

        expect(customFactory).toBeInstanceOf(TypeValidationMockFactory);
      });
    });
  });

  describe('Factory Management', () => {
    describe('reset', () => {
      it('should reset factory state', () => {
        // Create some data to populate internal state
        factory.createValidAmazonCatalogItem();
        factory.createValidAmazonOrder();

        // Reset should not throw
        expect(() => factory.reset()).not.toThrow();
      });
    });

    describe('create', () => {
      it('should implement base factory create method', () => {
        const result = factory.create();

        expect(result).toEqual({});
      });
    });
  });
});

describe('TypeValidationBuilders', () => {
  describe('minimal', () => {
    it('should create minimal factory', () => {
      const factory = TypeValidationBuilders.minimal();

      expect(factory).toBeInstanceOf(TypeValidationMockFactory);
    });
  });

  describe('comprehensive', () => {
    it('should create comprehensive factory', () => {
      const factory = TypeValidationBuilders.comprehensive();

      expect(factory).toBeInstanceOf(TypeValidationMockFactory);
    });
  });

  describe('custom', () => {
    it('should create custom factory with provided config', () => {
      const config: TypeValidationMockConfig = { minimal: true };
      const factory = TypeValidationBuilders.custom(config);

      expect(factory).toBeInstanceOf(TypeValidationMockFactory);
    });
  });
});
