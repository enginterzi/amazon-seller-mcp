/**
 * Comprehensive tests for type guard functions
 * Tests all type guard functions with valid objects, invalid objects, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  isErrorDetails,
  isLogMetadata,
  isErrorRecoveryContext,
  isMcpRequestBody,
  isNotificationData,
  isHttpRequest,
  isHttpResponse,
  isToolInput,
} from '../../../src/types/guards.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import { TestSetup } from '../../utils/test-setup.js';

describe('Type Guard Functions', () => {
  beforeEach(() => {
    TestSetup.setupMockEnvironment();
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  describe('Amazon API Type Guards', () => {
    describe('isAmazonItemAttributes', () => {
      describe('when validating valid attributes', () => {
        it('should return true for complete attributes object', () => {
          const validAttributes = TestDataBuilder.createItemAttributes();

          const result = isAmazonItemAttributes(validAttributes);

          expect(result).toBe(true);
        });

        it('should return true for minimal attributes object', () => {
          const minimalAttributes = {};

          const result = isAmazonItemAttributes(minimalAttributes);

          expect(result).toBe(true);
        });

        it('should return true for attributes with only title', () => {
          const attributesWithTitle = { title: 'Test Product' };

          const result = isAmazonItemAttributes(attributesWithTitle);

          expect(result).toBe(true);
        });

        it('should return true for attributes with valid dimensions', () => {
          const attributesWithDimensions = {
            dimensions: {
              length: 10.5,
              width: 8.0,
              height: 3.2,
              weight: 1.5,
            },
          };

          const result = isAmazonItemAttributes(attributesWithDimensions);

          expect(result).toBe(true);
        });

        it('should return true for attributes with valid images array', () => {
          const attributesWithImages = {
            images: [
              { variant: 'MAIN', link: 'https://example.com/main.jpg' },
              { variant: 'PT01', link: 'https://example.com/alt.jpg' },
            ],
          };

          const result = isAmazonItemAttributes(attributesWithImages);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid attributes', () => {
        it('should return false for null', () => {
          const result = isAmazonItemAttributes(null);

          expect(result).toBe(false);
        });

        it('should return false for undefined', () => {
          const result = isAmazonItemAttributes(undefined);

          expect(result).toBe(false);
        });

        it('should return false for primitive values', () => {
          expect(isAmazonItemAttributes('string')).toBe(false);
          expect(isAmazonItemAttributes(123)).toBe(false);
          expect(isAmazonItemAttributes(true)).toBe(false);
        });

        it('should return false for attributes with invalid title type', () => {
          const invalidAttributes = { title: 123 };

          const result = isAmazonItemAttributes(invalidAttributes);

          expect(result).toBe(false);
        });

        it('should return false for attributes with invalid dimensions structure', () => {
          const invalidAttributes = {
            dimensions: {
              length: 'invalid', // Should be number
              width: null,
            },
          };

          const result = isAmazonItemAttributes(invalidAttributes);

          expect(result).toBe(false);
        });

        it('should return false for attributes with invalid images array', () => {
          const invalidAttributes = {
            images: [
              { variant: 123, link: 'https://example.com/image.jpg' }, // variant should be string
            ],
          };

          const result = isAmazonItemAttributes(invalidAttributes);

          expect(result).toBe(false);
        });

        it('should return false for attributes with malformed image objects', () => {
          const invalidAttributes = {
            images: [
              { variant: 'MAIN' }, // Missing required link field
            ],
          };

          const result = isAmazonItemAttributes(invalidAttributes);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonItemIdentifiers', () => {
      describe('when validating valid identifiers', () => {
        it('should return true for complete identifiers object', () => {
          const validIdentifiers = TestDataBuilder.createItemIdentifiers();

          const result = isAmazonItemIdentifiers(validIdentifiers);

          expect(result).toBe(true);
        });

        it('should return true for empty identifiers object', () => {
          const emptyIdentifiers = {};

          const result = isAmazonItemIdentifiers(emptyIdentifiers);

          expect(result).toBe(true);
        });

        it('should return true for identifiers with optional marketplaceId', () => {
          const identifiersWithMarketplace = {
            ATVPDKIKX0DER: [
              {
                identifier: 'B08TEST123',
                identifierType: 'ASIN',
                marketplaceId: 'ATVPDKIKX0DER',
              },
            ],
          };

          const result = isAmazonItemIdentifiers(identifiersWithMarketplace);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid identifiers', () => {
        it('should return false for null', () => {
          const result = isAmazonItemIdentifiers(null);

          expect(result).toBe(false);
        });

        it('should return false for primitive values', () => {
          expect(isAmazonItemIdentifiers('string')).toBe(false);
          expect(isAmazonItemIdentifiers(123)).toBe(false);
          // Arrays are objects in JavaScript, so they pass the initial object check
          // but would fail if they had non-string keys or non-array values
        });

        it('should return false for identifiers with non-array values', () => {
          const invalidIdentifiers = {
            ATVPDKIKX0DER: 'not-an-array',
          };

          const result = isAmazonItemIdentifiers(invalidIdentifiers);

          expect(result).toBe(false);
        });

        it('should return false for identifiers with invalid identifier objects', () => {
          const invalidIdentifiers = {
            ATVPDKIKX0DER: [
              {
                identifier: 123, // Should be string
                identifierType: 'ASIN',
              },
            ],
          };

          const result = isAmazonItemIdentifiers(invalidIdentifiers);

          expect(result).toBe(false);
        });

        it('should return false for identifiers with invalid marketplaceId type', () => {
          const invalidIdentifiers = {
            ATVPDKIKX0DER: [
              {
                identifier: 'B08TEST123',
                identifierType: 'ASIN',
                marketplaceId: 123, // Should be string
              },
            ],
          };

          const result = isAmazonItemIdentifiers(invalidIdentifiers);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonItemRelationships', () => {
      describe('when validating valid relationships', () => {
        it('should return true for complete relationships object', () => {
          const validRelationships = TestDataBuilder.createItemRelationships();

          const result = isAmazonItemRelationships(validRelationships);

          expect(result).toBe(true);
        });

        it('should return true for empty relationships object', () => {
          const emptyRelationships = {};

          const result = isAmazonItemRelationships(emptyRelationships);

          expect(result).toBe(true);
        });

        it('should return true for relationships without identifiers', () => {
          const relationshipsWithoutIdentifiers = {
            ATVPDKIKX0DER: [
              {
                type: 'VARIATION',
              },
            ],
          };

          const result = isAmazonItemRelationships(relationshipsWithoutIdentifiers);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid relationships', () => {
        it('should return false for null', () => {
          const result = isAmazonItemRelationships(null);

          expect(result).toBe(false);
        });

        it('should return false for primitive values', () => {
          expect(isAmazonItemRelationships('string')).toBe(false);
          expect(isAmazonItemRelationships(123)).toBe(false);
        });

        it('should return false for relationships with non-array values', () => {
          const invalidRelationships = {
            ATVPDKIKX0DER: 'not-an-array',
          };

          const result = isAmazonItemRelationships(invalidRelationships);

          expect(result).toBe(false);
        });

        it('should return false for relationships with invalid type', () => {
          const invalidRelationships = {
            ATVPDKIKX0DER: [
              {
                type: 123, // Should be string
              },
            ],
          };

          const result = isAmazonItemRelationships(invalidRelationships);

          expect(result).toBe(false);
        });

        it('should return false for relationships with invalid identifiers array', () => {
          const invalidRelationships = {
            ATVPDKIKX0DER: [
              {
                type: 'VARIATION',
                identifiers: 'not-an-array',
              },
            ],
          };

          const result = isAmazonItemRelationships(invalidRelationships);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonCatalogItem', () => {
      describe('when validating valid catalog items', () => {
        it('should return true for complete catalog item', () => {
          const validItem = TestDataBuilder.createCatalogItem();

          const result = isAmazonCatalogItem(validItem);

          expect(result).toBe(true);
        });

        it('should return true for minimal catalog item with only ASIN', () => {
          const minimalItem = { asin: 'B08TEST123' };

          const result = isAmazonCatalogItem(minimalItem);

          expect(result).toBe(true);
        });

        it('should return true for catalog item with valid salesRanks', () => {
          const itemWithSalesRanks = {
            asin: 'B08TEST123',
            salesRanks: {
              ATVPDKIKX0DER: [
                { rank: 12345, title: 'Electronics' },
                { rank: 67890, title: 'Computers & Accessories' },
              ],
            },
          };

          const result = isAmazonCatalogItem(itemWithSalesRanks);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid catalog items', () => {
        it('should return false for null', () => {
          const result = isAmazonCatalogItem(null);

          expect(result).toBe(false);
        });

        it('should return false for primitive values', () => {
          expect(isAmazonCatalogItem('string')).toBe(false);
          expect(isAmazonCatalogItem(123)).toBe(false);
        });

        it('should return false for catalog item without ASIN', () => {
          const invalidItem = { attributes: { title: 'Test Product' } };

          const result = isAmazonCatalogItem(invalidItem);

          expect(result).toBe(false);
        });

        it('should return false for catalog item with invalid ASIN type', () => {
          const invalidItem = { asin: 123 };

          const result = isAmazonCatalogItem(invalidItem);

          expect(result).toBe(false);
        });

        it('should return false for catalog item with invalid salesRanks structure', () => {
          const invalidItem = {
            asin: 'B08TEST123',
            salesRanks: {
              ATVPDKIKX0DER: [
                { rank: 'invalid', title: 'Electronics' }, // rank should be number
              ],
            },
          };

          const result = isAmazonCatalogItem(invalidItem);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonListingsItem', () => {
      describe('when validating valid listings items', () => {
        it('should return true for complete listings item', () => {
          const validItem = TestDataBuilder.createListing();

          const result = isAmazonListingsItem(validItem);

          expect(result).toBe(true);
        });

        it('should return true for listings item without optional fields', () => {
          const minimalItem = {
            sku: 'TEST-SKU-123',
            productType: 'PRODUCT',
            attributes: { title: 'Test Product' },
          };

          const result = isAmazonListingsItem(minimalItem);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid listings items', () => {
        it('should return false for null', () => {
          const result = isAmazonListingsItem(null);

          expect(result).toBe(false);
        });

        it('should return false for listings item without required SKU', () => {
          const invalidItem = {
            productType: 'PRODUCT',
            attributes: { title: 'Test Product' },
          };

          const result = isAmazonListingsItem(invalidItem);

          expect(result).toBe(false);
        });

        it('should return false for listings item with invalid fulfillmentAvailability', () => {
          const invalidItem = {
            sku: 'TEST-SKU-123',
            productType: 'PRODUCT',
            attributes: { title: 'Test Product' },
            fulfillmentAvailability: [
              {
                fulfillmentChannelCode: 123, // Should be string
                quantity: 100,
              },
            ],
          };

          const result = isAmazonListingsItem(invalidItem);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonInventorySummary', () => {
      describe('when validating valid inventory summaries', () => {
        it('should return true for complete inventory summary', () => {
          const validSummary = TestDataBuilder.createInventorySummary();

          const result = isAmazonInventorySummary(validSummary);

          expect(result).toBe(true);
        });

        it('should return true for empty inventory summary', () => {
          const emptySummary = {};

          const result = isAmazonInventorySummary(emptySummary);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid inventory summaries', () => {
        it('should return false for null', () => {
          const result = isAmazonInventorySummary(null);

          expect(result).toBe(false);
        });

        it('should return false for inventory summary with invalid inventoryDetails', () => {
          const invalidSummary = {
            asin: 'B08TEST123',
            inventoryDetails: {
              fulfillableQuantity: 'invalid', // Should be number
            },
          };

          const result = isAmazonInventorySummary(invalidSummary);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonOrder', () => {
      describe('when validating valid orders', () => {
        it('should return true for complete order', () => {
          const validOrder = TestDataBuilder.createOrder();

          const result = isAmazonOrder(validOrder);

          expect(result).toBe(true);
        });

        it('should return true for minimal order with required fields only', () => {
          const minimalOrder = {
            amazonOrderId: 'TEST-ORDER-123',
            purchaseDate: '2024-01-15T10:30:00Z',
            orderStatus: 'Shipped',
            marketplaceId: 'ATVPDKIKX0DER',
          };

          const result = isAmazonOrder(minimalOrder);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid orders', () => {
        it('should return false for null', () => {
          const result = isAmazonOrder(null);

          expect(result).toBe(false);
        });

        it('should return false for order missing required fields', () => {
          const invalidOrder = {
            amazonOrderId: 'TEST-ORDER-123',
            // Missing required fields
          };

          const result = isAmazonOrder(invalidOrder);

          expect(result).toBe(false);
        });

        it('should return false for order with invalid orderTotal structure', () => {
          const invalidOrder = {
            amazonOrderId: 'TEST-ORDER-123',
            purchaseDate: '2024-01-15T10:30:00Z',
            orderStatus: 'Shipped',
            marketplaceId: 'ATVPDKIKX0DER',
            orderTotal: {
              currencyCode: 123, // Should be string
              amount: '29.99',
            },
          };

          const result = isAmazonOrder(invalidOrder);

          expect(result).toBe(false);
        });
      });
    });

    describe('isAmazonReport', () => {
      describe('when validating valid reports', () => {
        it('should return true for complete report', () => {
          const validReport = TestDataBuilder.createReport();

          const result = isAmazonReport(validReport);

          expect(result).toBe(true);
        });

        it('should return true for minimal report without optional fields', () => {
          const minimalReport = {
            reportId: 'REPORT_123456789',
            reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
            processingStatus: 'DONE',
            createdTime: '2024-01-15T10:30:00Z',
          };

          const result = isAmazonReport(minimalReport);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid reports', () => {
        it('should return false for null', () => {
          const result = isAmazonReport(null);

          expect(result).toBe(false);
        });

        it('should return false for report missing required fields', () => {
          const invalidReport = {
            reportId: 'REPORT_123456789',
            // Missing required fields
          };

          const result = isAmazonReport(invalidReport);

          expect(result).toBe(false);
        });

        it('should return false for report with invalid field types', () => {
          const invalidReport = {
            reportId: 123, // Should be string
            reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
            processingStatus: 'DONE',
            createdTime: '2024-01-15T10:30:00Z',
          };

          const result = isAmazonReport(invalidReport);

          expect(result).toBe(false);
        });
      });
    });

    describe('Filter Parameter Type Guards', () => {
      describe('isInventoryFilterParams', () => {
        describe('when validating valid filter parameters', () => {
          it('should return true for complete filter parameters', () => {
            const validParams = TestDataBuilder.createInventoryFilterParams();

            const result = isInventoryFilterParams(validParams);

            expect(result).toBe(true);
          });

          it('should return true for empty filter parameters', () => {
            const emptyParams = {};

            const result = isInventoryFilterParams(emptyParams);

            expect(result).toBe(true);
          });

          it('should return true for filter parameters with Date objects', () => {
            const paramsWithDates = {
              startDateTime: new Date('2024-01-01'),
              endDateTime: new Date('2024-01-31'),
            };

            const result = isInventoryFilterParams(paramsWithDates);

            expect(result).toBe(true);
          });
        });

        describe('when validating invalid filter parameters', () => {
          it('should return false for null', () => {
            const result = isInventoryFilterParams(null);

            expect(result).toBe(false);
          });

          it('should return false for filter parameters with invalid array types', () => {
            const invalidParams = {
              marketplaceIds: [123, 456], // Should be string array
            };

            const result = isInventoryFilterParams(invalidParams);

            expect(result).toBe(false);
          });

          it('should return false for filter parameters with invalid date types', () => {
            const invalidParams = {
              startDateTime: 123, // Should be string or Date
            };

            const result = isInventoryFilterParams(invalidParams);

            expect(result).toBe(false);
          });
        });
      });

      describe('isOrdersFilterParams', () => {
        describe('when validating valid filter parameters', () => {
          it('should return true for complete filter parameters', () => {
            const validParams = TestDataBuilder.createOrdersFilterParams();

            const result = isOrdersFilterParams(validParams);

            expect(result).toBe(true);
          });

          it('should return true for empty filter parameters', () => {
            const emptyParams = {};

            const result = isOrdersFilterParams(emptyParams);

            expect(result).toBe(true);
          });
        });

        describe('when validating invalid filter parameters', () => {
          it('should return false for null', () => {
            const result = isOrdersFilterParams(null);

            expect(result).toBe(false);
          });

          it('should return false for filter parameters with invalid types', () => {
            const invalidParams = {
              nextToken: 123, // Should be string
              orderStatuses: 'not-an-array', // Should be array
            };

            const result = isOrdersFilterParams(invalidParams);

            expect(result).toBe(false);
          });
        });
      });

      describe('isReportsFilterParams', () => {
        describe('when validating valid filter parameters', () => {
          it('should return true for complete filter parameters', () => {
            const validParams = TestDataBuilder.createReportsFilterParams();

            const result = isReportsFilterParams(validParams);

            expect(result).toBe(true);
          });

          it('should return true for empty filter parameters', () => {
            const emptyParams = {};

            const result = isReportsFilterParams(emptyParams);

            expect(result).toBe(true);
          });
        });

        describe('when validating invalid filter parameters', () => {
          it('should return false for null', () => {
            const result = isReportsFilterParams(null);

            expect(result).toBe(false);
          });

          it('should return false for filter parameters with invalid array elements', () => {
            const invalidParams = {
              reportTypes: [123, 'valid-type'], // Should be all strings
            };

            const result = isReportsFilterParams(invalidParams);

            expect(result).toBe(false);
          });
        });
      });
    });

    describe('Tool and Response Type Guards', () => {
      describe('isToolContentResponse', () => {
        describe('when validating valid tool content responses', () => {
          it('should return true for text response', () => {
            const textResponse = TestDataBuilder.createToolContentResponse({
              type: 'text',
              text: 'Test response content',
            });

            const result = isToolContentResponse(textResponse);

            expect(result).toBe(true);
          });

          it('should return true for image response', () => {
            const imageResponse = {
              type: 'image',
              data: 'base64-encoded-image-data',
              mimeType: 'image/png',
            };

            const result = isToolContentResponse(imageResponse);

            expect(result).toBe(true);
          });

          it('should return true for resource response', () => {
            const resourceResponse = {
              type: 'resource',
              uri: 'file://path/to/resource',
              name: 'Resource Name',
              description: 'Resource description',
            };

            const result = isToolContentResponse(resourceResponse);

            expect(result).toBe(true);
          });
        });

        describe('when validating invalid tool content responses', () => {
          it('should return false for null', () => {
            const result = isToolContentResponse(null);

            expect(result).toBe(false);
          });

          it('should return false for response with invalid type', () => {
            const invalidResponse = {
              type: 'invalid-type', // Should be one of the valid types
              text: 'Test content',
            };

            const result = isToolContentResponse(invalidResponse);

            expect(result).toBe(false);
          });

          it('should return false for response with invalid field types', () => {
            const invalidResponse = {
              type: 'text',
              text: 123, // Should be string
            };

            const result = isToolContentResponse(invalidResponse);

            expect(result).toBe(false);
          });
        });
      });

      describe('isOrderUpdateDetails', () => {
        describe('when validating valid order update details', () => {
          it('should return true for complete update details', () => {
            const validDetails = TestDataBuilder.createOrderUpdateDetails();

            const result = isOrderUpdateDetails(validDetails);

            expect(result).toBe(true);
          });

          it('should return true for empty update details', () => {
            const emptyDetails = {};

            const result = isOrderUpdateDetails(emptyDetails);

            expect(result).toBe(true);
          });
        });

        describe('when validating invalid order update details', () => {
          it('should return false for null', () => {
            const result = isOrderUpdateDetails(null);

            expect(result).toBe(false);
          });

          it('should return false for update details with invalid field types', () => {
            const invalidDetails = {
              trackingNumber: 123, // Should be string
              carrierCode: 'UPS',
            };

            const result = isOrderUpdateDetails(invalidDetails);

            expect(result).toBe(false);
          });
        });
      });
    });
  });

  describe('Common Type Guards', () => {
    describe('isErrorDetails', () => {
      describe('when validating valid error details', () => {
        it('should return true for complete error details', () => {
          const validError = TestDataBuilder.createErrorDetails();

          const result = isErrorDetails(validError);

          expect(result).toBe(true);
        });

        it('should return true for empty error details', () => {
          const emptyError = {};

          const result = isErrorDetails(emptyError);

          expect(result).toBe(true);
        });

        it('should return true for error details with valid headers', () => {
          const errorWithHeaders = {
            code: 'InvalidInput',
            headers: {
              'content-type': 'application/json',
              'x-amzn-requestid': 'req-123',
            },
          };

          const result = isErrorDetails(errorWithHeaders);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid error details', () => {
        it('should return false for null', () => {
          const result = isErrorDetails(null);

          expect(result).toBe(false);
        });

        it('should return false for primitive values', () => {
          expect(isErrorDetails('string')).toBe(false);
          expect(isErrorDetails(123)).toBe(false);
          expect(isErrorDetails(true)).toBe(false);
        });

        it('should return false for error details with invalid field types', () => {
          const invalidError = {
            code: 123, // Should be string
            statusCode: 'invalid', // Should be number
          };

          const result = isErrorDetails(invalidError);

          expect(result).toBe(false);
        });

        it('should return false for error details with invalid headers structure', () => {
          const invalidError = {
            code: 'InvalidInput',
            headers: {
              'content-type': 123, // Should be string
            },
          };

          const result = isErrorDetails(invalidError);

          expect(result).toBe(false);
        });
      });
    });

    describe('isLogMetadata', () => {
      describe('when validating valid log metadata', () => {
        it('should return true for complete log metadata', () => {
          const validMetadata = TestDataBuilder.createLogMetadata();

          const result = isLogMetadata(validMetadata);

          expect(result).toBe(true);
        });

        it('should return true for empty log metadata', () => {
          const emptyMetadata = {};

          const result = isLogMetadata(emptyMetadata);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid log metadata', () => {
        it('should return false for null', () => {
          const result = isLogMetadata(null);

          expect(result).toBe(false);
        });

        it('should return false for log metadata with invalid field types', () => {
          const invalidMetadata = {
            requestId: 123, // Should be string
            duration: 'invalid', // Should be number
          };

          const result = isLogMetadata(invalidMetadata);

          expect(result).toBe(false);
        });
      });
    });

    describe('isErrorRecoveryContext', () => {
      describe('when validating valid error recovery context', () => {
        it('should return true for complete recovery context', () => {
          const validContext = TestDataBuilder.createErrorRecoveryContext();

          const result = isErrorRecoveryContext(validContext);

          expect(result).toBe(true);
        });

        it('should return true for empty recovery context', () => {
          const emptyContext = {};

          const result = isErrorRecoveryContext(emptyContext);

          expect(result).toBe(true);
        });

        it('should return true for recovery context with function operation', () => {
          const contextWithFunction = {
            operation: () => Promise.resolve(),
            retryCount: 1,
          };

          const result = isErrorRecoveryContext(contextWithFunction);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid error recovery context', () => {
        it('should return false for null', () => {
          const result = isErrorRecoveryContext(null);

          expect(result).toBe(false);
        });

        it('should return false for recovery context with invalid operation type', () => {
          const invalidContext = {
            operation: 123, // Should be function or string
          };

          const result = isErrorRecoveryContext(invalidContext);

          expect(result).toBe(false);
        });

        it('should return false for recovery context with invalid params type', () => {
          const invalidContext = {
            params: 'not-an-object', // Should be object
          };

          const result = isErrorRecoveryContext(invalidContext);

          expect(result).toBe(false);
        });
      });
    });

    describe('isMcpRequestBody', () => {
      describe('when validating valid MCP request bodies', () => {
        it('should return true for complete MCP request', () => {
          const validRequest = TestDataBuilder.createMcpRequestBody();

          const result = isMcpRequestBody(validRequest);

          expect(result).toBe(true);
        });

        it('should return true for minimal MCP request', () => {
          const minimalRequest = {
            jsonrpc: '2.0',
            method: 'tools/call',
          };

          const result = isMcpRequestBody(minimalRequest);

          expect(result).toBe(true);
        });

        it('should return true for MCP request with numeric id', () => {
          const requestWithNumericId = {
            jsonrpc: '2.0',
            method: 'tools/call',
            id: 123,
          };

          const result = isMcpRequestBody(requestWithNumericId);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid MCP request bodies', () => {
        it('should return false for null', () => {
          const result = isMcpRequestBody(null);

          expect(result).toBe(false);
        });

        it('should return false for request with wrong jsonrpc version', () => {
          const invalidRequest = {
            jsonrpc: '1.0', // Should be '2.0'
            method: 'tools/call',
          };

          const result = isMcpRequestBody(invalidRequest);

          expect(result).toBe(false);
        });

        it('should return false for request missing method', () => {
          const invalidRequest = {
            jsonrpc: '2.0',
            // Missing required method
          };

          const result = isMcpRequestBody(invalidRequest);

          expect(result).toBe(false);
        });

        it('should return false for request with invalid params type', () => {
          const invalidRequest = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: 'not-an-object', // Should be object
          };

          const result = isMcpRequestBody(invalidRequest);

          expect(result).toBe(false);
        });
      });
    });

    describe('isNotificationData', () => {
      describe('when validating valid notification data', () => {
        it('should return true for complete notification', () => {
          const validNotification = TestDataBuilder.createNotificationData();

          const result = isNotificationData(validNotification);

          expect(result).toBe(true);
        });

        it('should return true for minimal notification', () => {
          const minimalNotification = {
            type: 'inventory.changed',
            timestamp: '2024-01-15T10:30:00Z',
            payload: { data: 'test' },
          };

          const result = isNotificationData(minimalNotification);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid notification data', () => {
        it('should return false for null', () => {
          const result = isNotificationData(null);

          expect(result).toBe(false);
        });

        it('should return false for notification missing required fields', () => {
          const invalidNotification = {
            type: 'inventory.changed',
            // Missing required timestamp and payload
          };

          const result = isNotificationData(invalidNotification);

          expect(result).toBe(false);
        });

        it('should return false for notification with invalid payload type', () => {
          const invalidNotification = {
            type: 'inventory.changed',
            timestamp: '2024-01-15T10:30:00Z',
            payload: 'not-an-object', // Should be object
          };

          const result = isNotificationData(invalidNotification);

          expect(result).toBe(false);
        });
      });
    });

    describe('isHttpRequest', () => {
      describe('when validating valid HTTP requests', () => {
        it('should return true for complete HTTP request', () => {
          const validRequest = TestDataBuilder.createHttpRequest();

          const result = isHttpRequest(validRequest);

          expect(result).toBe(true);
        });

        it('should return true for minimal HTTP request', () => {
          const minimalRequest = {
            method: 'GET',
            url: '/api/test',
            headers: {},
          };

          const result = isHttpRequest(minimalRequest);

          expect(result).toBe(true);
        });

        it('should return true for HTTP request with array header values', () => {
          const requestWithArrayHeaders = {
            method: 'GET',
            url: '/api/test',
            headers: {
              accept: ['application/json', 'text/plain'],
            },
          };

          const result = isHttpRequest(requestWithArrayHeaders);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid HTTP requests', () => {
        it('should return false for null', () => {
          const result = isHttpRequest(null);

          expect(result).toBe(false);
        });

        it('should return false for request missing required fields', () => {
          const invalidRequest = {
            method: 'GET',
            // Missing required url and headers
          };

          const result = isHttpRequest(invalidRequest);

          expect(result).toBe(false);
        });

        it('should return false for request with invalid headers structure', () => {
          const invalidRequest = {
            method: 'GET',
            url: '/api/test',
            headers: 'not-an-object', // Should be object
          };

          const result = isHttpRequest(invalidRequest);

          expect(result).toBe(false);
        });

        it('should return false for request with invalid header values', () => {
          const invalidRequest = {
            method: 'GET',
            url: '/api/test',
            headers: {
              'content-type': 123, // Should be string or array of strings
            },
          };

          const result = isHttpRequest(invalidRequest);

          expect(result).toBe(false);
        });
      });
    });

    describe('isHttpResponse', () => {
      describe('when validating valid HTTP responses', () => {
        it('should return true for complete HTTP response', () => {
          const validResponse = TestDataBuilder.createHttpResponse();

          const result = isHttpResponse(validResponse);

          expect(result).toBe(true);
        });

        it('should return true for minimal HTTP response', () => {
          const minimalResponse = {
            statusCode: 200,
            on: () => {},
          };

          const result = isHttpResponse(minimalResponse);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid HTTP responses', () => {
        it('should return false for null', () => {
          const result = isHttpResponse(null);

          expect(result).toBe(false);
        });

        it('should return false for response missing statusCode', () => {
          const invalidResponse = {
            on: () => {},
            // Missing required statusCode
          };

          const result = isHttpResponse(invalidResponse);

          expect(result).toBe(false);
        });

        it('should return false for response with invalid on property', () => {
          const invalidResponse = {
            statusCode: 200,
            on: 'not-a-function', // Should be function
          };

          const result = isHttpResponse(invalidResponse);

          expect(result).toBe(false);
        });
      });
    });

    describe('isToolInput', () => {
      describe('when validating valid tool inputs', () => {
        it('should return true for complete tool input', () => {
          const validInput = TestDataBuilder.createToolInput();

          const result = isToolInput(validInput);

          expect(result).toBe(true);
        });

        it('should return true for empty object', () => {
          const emptyInput = {};

          const result = isToolInput(emptyInput);

          expect(result).toBe(true);
        });

        it('should return true for any object structure', () => {
          const anyObjectInput = {
            customField: 'value',
            nestedObject: { data: 'test' },
            arrayField: [1, 2, 3],
          };

          const result = isToolInput(anyObjectInput);

          expect(result).toBe(true);
        });
      });

      describe('when validating invalid tool inputs', () => {
        it('should return false for null', () => {
          const result = isToolInput(null);

          expect(result).toBe(false);
        });

        it('should return false for undefined', () => {
          const result = isToolInput(undefined);

          expect(result).toBe(false);
        });

        it('should return false for primitive values', () => {
          expect(isToolInput('string')).toBe(false);
          expect(isToolInput(123)).toBe(false);
          expect(isToolInput(true)).toBe(false);
          // Arrays are objects in JavaScript, so they pass the isToolInput check
          // since isToolInput only checks typeof obj === 'object' && obj !== null
        });
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    describe('when testing with edge case values', () => {
      it('should handle empty arrays correctly', () => {
        const objectWithEmptyArrays = {
          asin: 'B08TEST123',
          attributes: {
            images: [], // Empty array should be valid
          },
        };

        expect(isAmazonCatalogItem(objectWithEmptyArrays)).toBe(true);
      });

      it('should handle objects with extra properties', () => {
        const objectWithExtraProps = {
          asin: 'B08TEST123',
          extraProperty: 'should not affect validation',
          anotherExtra: { nested: 'object' },
        };

        expect(isAmazonCatalogItem(objectWithExtraProps)).toBe(true);
      });

      it('should handle deeply nested structures', () => {
        const deeplyNested = {
          type: 'inventory.changed',
          timestamp: '2024-01-15T10:30:00Z',
          payload: {
            level1: {
              level2: {
                level3: {
                  data: 'deep value',
                },
              },
            },
          },
        };

        expect(isNotificationData(deeplyNested)).toBe(true);
      });

      it('should handle circular references gracefully', () => {
        const circularObject: Record<string, unknown> = {
          asin: 'B08TEST123',
        };
        circularObject.self = circularObject;

        // Should not throw an error and should validate based on known properties
        expect(() => isAmazonCatalogItem(circularObject)).not.toThrow();
      });

      it('should handle very large objects', () => {
        const largeObject = {
          asin: 'B08TEST123',
          attributes: {
            title: 'A'.repeat(10000), // Very long string
            images: Array(1000).fill({
              variant: 'MAIN',
              link: 'https://example.com/image.jpg',
            }),
          },
        };

        expect(isAmazonCatalogItem(largeObject)).toBe(true);
      });

      it('should handle objects with prototype pollution attempts', () => {
        const maliciousObject = {
          asin: 'B08TEST123',
          __proto__: { malicious: 'value' },
          constructor: { prototype: { polluted: true } },
        };

        expect(isAmazonCatalogItem(maliciousObject)).toBe(true);
      });
    });

    describe('when testing with special JavaScript values', () => {
      it('should handle NaN values correctly', () => {
        const objectWithNaN = {
          asin: 'B08TEST123',
          attributes: {
            dimensions: {
              length: NaN, // NaN is typeof 'number' in JavaScript, so it passes type check
            },
          },
        };

        // NaN is considered a number in JavaScript (typeof NaN === 'number' is true)
        // so the type guard will accept it as valid
        expect(isAmazonCatalogItem(objectWithNaN)).toBe(true);
      });

      it('should handle Infinity values correctly', () => {
        const objectWithInfinity = {
          duration: Infinity, // Should be valid number
          requestId: 'req-123',
        };

        expect(isLogMetadata(objectWithInfinity)).toBe(true);
      });

      it('should handle negative zero correctly', () => {
        const objectWithNegativeZero = {
          asin: 'B08TEST123',
          attributes: {
            dimensions: {
              weight: -0, // Should be valid
            },
          },
        };

        expect(isAmazonCatalogItem(objectWithNegativeZero)).toBe(true);
      });

      it('should handle Symbol values correctly', () => {
        const symbolKey = Symbol('test');
        const objectWithSymbol = {
          asin: 'B08TEST123',
          [symbolKey]: 'symbol value', // Should not affect validation
        };

        expect(isAmazonCatalogItem(objectWithSymbol)).toBe(true);
      });

      it('should handle BigInt values correctly', () => {
        const objectWithBigInt = {
          statusCode: BigInt(200), // Should be invalid (not a regular number)
        };

        expect(isLogMetadata(objectWithBigInt)).toBe(false);
      });
    });

    describe('Additional Edge Cases for Coverage', () => {
      it('should handle HTTP request headers with symbol keys', () => {
        const symbolKey = Symbol('test');
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            [symbolKey]: 'value', // Symbol key (not enumerable in Object.entries)
            'normal-header': 'value',
          },
        };
        // This should actually pass because Symbol keys are not enumerated by Object.entries
        expect(isHttpRequest(invalidRequest)).toBe(true);
      });

      it('should handle HTTP request headers with mixed valid/invalid array values', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            'x-custom': ['valid', 123], // Mixed array with non-string
          },
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle HTTP request with non-object headers', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: 'invalid-headers', // String instead of object
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle HTTP request with null headers', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: null, // Null headers
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle HTTP response with non-function on method', () => {
        const invalidResponse = {
          statusCode: 200,
          on: 'not-a-function', // String instead of function
        };
        expect(isHttpResponse(invalidResponse)).toBe(false);
      });

      it('should handle HTTP response with missing on method', () => {
        const invalidResponse = {
          statusCode: 200,
          // Missing on method
        };
        expect(isHttpResponse(invalidResponse)).toBe(false);
      });

      it('should handle type guards with objects that have non-enumerable properties', () => {
        const objWithNonEnumerable = {};
        Object.defineProperty(objWithNonEnumerable, 'hiddenProp', {
          value: 'hidden',
          enumerable: false,
        });

        expect(isToolInput(objWithNonEnumerable)).toBe(true); // Should still be valid
        expect(isErrorDetails(objWithNonEnumerable)).toBe(true); // Should still be valid
      });

      it('should handle Amazon catalog item with invalid sales ranks structure', () => {
        const invalidCatalogItem = {
          asin: 'B001234567',
          salesRanks: {
            US: [
              {
                rank: 'not-a-number', // Invalid rank type
                title: 'Test Category',
              },
            ],
          },
        };
        expect(isAmazonCatalogItem(invalidCatalogItem)).toBe(false);
      });

      it('should handle Amazon catalog item with invalid sales ranks title', () => {
        const invalidCatalogItem = {
          asin: 'B001234567',
          salesRanks: {
            US: [
              {
                rank: 1,
                title: 123, // Invalid title type
              },
            ],
          },
        };
        expect(isAmazonCatalogItem(invalidCatalogItem)).toBe(false);
      });

      it('should handle Amazon item relationships with invalid identifiers structure', () => {
        const invalidRelationships = {
          US: [
            {
              type: 'VARIATION',
              identifiers: 'not-an-array', // Should be array
            },
          ],
        };
        expect(isAmazonItemRelationships(invalidRelationships)).toBe(false);
      });

      it('should handle Amazon item relationships with invalid identifier object', () => {
        const invalidRelationships = {
          US: [
            {
              type: 'VARIATION',
              identifiers: [
                {
                  identifier: 123, // Should be string
                  identifierType: 'ASIN',
                },
              ],
            },
          ],
        };
        expect(isAmazonItemRelationships(invalidRelationships)).toBe(false);
      });

      it('should handle Amazon item identifiers with invalid identifier object properties', () => {
        const invalidIdentifiers = {
          US: [
            {
              identifier: 'B001234567',
              identifierType: 123, // Should be string
            },
          ],
        };
        expect(isAmazonItemIdentifiers(invalidIdentifiers)).toBe(false);
      });

      it('should handle Amazon item attributes with invalid dimensions properties', () => {
        const invalidAttributes = {
          title: 'Test Product',
          dimensions: {
            length: 'not-a-number', // Should be number
            width: 10,
            height: 5,
            weight: 2,
          },
        };
        expect(isAmazonItemAttributes(invalidAttributes)).toBe(false);
      });

      it('should handle Amazon item attributes with invalid images structure', () => {
        const invalidAttributes = {
          title: 'Test Product',
          images: [
            {
              variant: 123, // Should be string
              link: 'https://example.com/image.jpg',
            },
          ],
        };
        expect(isAmazonItemAttributes(invalidAttributes)).toBe(false);
      });

      it('should handle Amazon order with invalid shipping address properties', () => {
        const invalidOrder = {
          amazonOrderId: 'ORDER123',
          purchaseDate: '2023-01-01T00:00:00Z',
          orderStatus: 'Shipped',
          marketplaceId: 'ATVPDKIKX0DER',
          shippingAddress: {
            name: 'John Doe',
            addressLine1: 123, // Should be string
            city: 'New York',
          },
        };
        expect(isAmazonOrder(invalidOrder)).toBe(false);
      });

      it('should handle inventory filter params with invalid date objects', () => {
        const invalidParams = {
          startDateTime: 'invalid-date', // Valid string
          endDateTime: 123, // Invalid - not string or Date
        };
        expect(isInventoryFilterParams(invalidParams)).toBe(false);
      });

      it('should handle orders filter params with invalid array elements', () => {
        const invalidParams = {
          marketplaceIds: ['ATVPDKIKX0DER', 123], // Mixed array with non-string
        };
        expect(isOrdersFilterParams(invalidParams)).toBe(false);
      });

      it('should handle reports filter params with invalid array elements', () => {
        const invalidParams = {
          reportTypes: ['INVENTORY_REPORT', null], // Mixed array with null
        };
        expect(isReportsFilterParams(invalidParams)).toBe(false);
      });

      it('should handle HTTP request with invalid ip property type', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {},
          ip: 123, // Should be string
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle HTTP request with undefined header values correctly', () => {
        const validRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            'x-test': undefined, // undefined should be allowed
            'x-valid': 'value',
          },
        };
        expect(isHttpRequest(validRequest)).toBe(true);
      });

      it('should handle HTTP request with non-string non-array header values', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            'x-test': 123, // Should be string or array
          },
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle HTTP request with boolean header values', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            'x-test': true, // Should be string or array
          },
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle notification data with invalid source type', () => {
        const invalidNotification = {
          type: 'test-event',
          timestamp: '2023-01-01T00:00:00Z',
          payload: { data: 'test' },
          source: 123, // Should be string
        };
        expect(isNotificationData(invalidNotification)).toBe(false);
      });

      it('should handle HTTP request headers with non-string keys', () => {
        // This test is tricky because Object.entries only returns enumerable string keys
        // But we can test the type guard logic by creating an object with non-string keys
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            123: 'value', // Numeric key (will be converted to string by Object.entries)
            'valid-key': 'value',
          },
        };
        // This should actually pass because numeric keys are converted to strings
        expect(isHttpRequest(invalidRequest)).toBe(true);
      });

      it('should handle notification data with valid source', () => {
        const validNotification = {
          type: 'test-event',
          timestamp: '2023-01-01T00:00:00Z',
          payload: { data: 'test' },
          source: 'test-source',
        };
        expect(isNotificationData(validNotification)).toBe(true);
      });

      it('should handle MCP request with invalid id type', () => {
        const invalidRequest = {
          jsonrpc: '2.0',
          method: 'test-method',
          params: { test: 'value' },
          id: true, // Should be string or number
        };
        expect(isMcpRequestBody(invalidRequest)).toBe(false);
      });

      it('should handle MCP request with null id', () => {
        const invalidRequest = {
          jsonrpc: '2.0',
          method: 'test-method',
          params: { test: 'value' },
          id: null, // Should be string or number
        };
        expect(isMcpRequestBody(invalidRequest)).toBe(false);
      });

      it('should handle HTTP request with object header values', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            'x-test': { nested: 'object' }, // Should be string or array
          },
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle HTTP request with function header values', () => {
        const invalidRequest = {
          method: 'GET',
          url: '/test',
          headers: {
            'x-test': () => 'function', // Should be string or array
          },
        };
        expect(isHttpRequest(invalidRequest)).toBe(false);
      });

      it('should handle error recovery context with invalid options type', () => {
        const invalidContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 3,
          options: 'invalid-options', // Should be object
        };
        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should handle error recovery context with null options', () => {
        const invalidContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 3,
          options: null, // Should be object
        };
        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should handle error recovery context with invalid shouldRetry type', () => {
        const invalidContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 3,
          shouldRetry: 'yes', // Should be boolean
        };
        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should handle error recovery context with valid shouldRetry boolean', () => {
        const validContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 3,
          shouldRetry: true, // Valid boolean
        };
        expect(isErrorRecoveryContext(validContext)).toBe(true);
      });

      it('should handle error recovery context with invalid requestId type', () => {
        const invalidContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 3,
          requestId: 123, // Should be string
        };
        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should handle error recovery context with valid requestId string', () => {
        const validContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 3,
          requestId: 'req-123', // Valid string
        };
        expect(isErrorRecoveryContext(validContext)).toBe(true);
      });

      it('should handle error recovery context with invalid maxRetries type', () => {
        const invalidContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 'three', // Should be number
        };
        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should handle error recovery context with valid maxRetries number', () => {
        const validContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 1,
          maxRetries: 5, // Valid number
        };
        expect(isErrorRecoveryContext(validContext)).toBe(true);
      });

      it('should handle error recovery context with invalid retryCount type', () => {
        const invalidContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 'one', // Should be number
          maxRetries: 3,
        };
        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should handle error recovery context with valid retryCount number', () => {
        const validContext = {
          operation: 'test-operation',
          params: { test: 'value' },
          retryCount: 2, // Valid number
          maxRetries: 3,
        };
        expect(isErrorRecoveryContext(validContext)).toBe(true);
      });
    });
  });
});
