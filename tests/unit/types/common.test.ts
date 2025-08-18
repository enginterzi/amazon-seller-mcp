/**
 * Comprehensive tests for common type definitions
 * Tests all common interfaces with validation, type guards, and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
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
import { COMMON_CONSTANTS, CommonUtils } from '../../../src/types/common.js';
import type {
  ErrorDetails,
  LogMetadata,
  ErrorRecoveryContext,
  McpRequestBody,
  NotificationData,
  HttpRequest,
  ToolInput,
} from '../../../src/types/common.js';

describe('Common Types', () => {
  describe('ErrorDetails Interface', () => {
    describe('when validating error details structure', () => {
      it('should validate complete error details with all properties', () => {
        const errorDetails = TestDataBuilder.createErrorDetails({
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
          customProperty: 'custom value',
        });

        expect(isErrorDetails(errorDetails)).toBe(true);
        expect(errorDetails.code).toBe('InvalidInput');
        expect(errorDetails.statusCode).toBe(400);
        expect(errorDetails.requestId).toBe('req-123456789');
        expect(errorDetails.timestamp).toBe('2024-01-15T10:30:00Z');
        expect(errorDetails.headers).toEqual({
          'content-type': 'application/json',
          'x-amzn-requestid': 'req-123456789',
          'x-amzn-trace-id': 'Root=1-trace-123',
        });
        expect(errorDetails.message).toBe('Invalid input provided');
        expect(errorDetails.customProperty).toBe('custom value');
      });

      it('should validate minimal error details with only optional properties', () => {
        const errorDetails: ErrorDetails = {};

        expect(isErrorDetails(errorDetails)).toBe(true);
      });

      it('should validate error details with only code property', () => {
        const errorDetails: ErrorDetails = {
          code: 'RATE_LIMIT_EXCEEDED',
        };

        expect(isErrorDetails(errorDetails)).toBe(true);
        expect(errorDetails.code).toBe('RATE_LIMIT_EXCEEDED');
      });

      it('should validate error details with only status code', () => {
        const errorDetails: ErrorDetails = {
          statusCode: 429,
        };

        expect(isErrorDetails(errorDetails)).toBe(true);
        expect(errorDetails.statusCode).toBe(429);
      });

      it('should validate error details with extensible properties', () => {
        const errorDetails: ErrorDetails = {
          code: 'CUSTOM_ERROR',
          statusCode: 500,
          customField1: 'value1',
          customField2: 42,
          customField3: true,
          customField4: { nested: 'object' },
        };

        expect(isErrorDetails(errorDetails)).toBe(true);
        expect(errorDetails.customField1).toBe('value1');
        expect(errorDetails.customField2).toBe(42);
        expect(errorDetails.customField3).toBe(true);
        expect(errorDetails.customField4).toEqual({ nested: 'object' });
      });
    });

    describe('when validating invalid error details', () => {
      it('should reject null values', () => {
        expect(isErrorDetails(null)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(isErrorDetails(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isErrorDetails('string')).toBe(false);
        expect(isErrorDetails(123)).toBe(false);
        expect(isErrorDetails(true)).toBe(false);
      });

      it('should reject error details with invalid code type', () => {
        const invalidErrorDetails =
          TestDataBuilder.createInvalidData().invalidErrorDetails('wrongTypes');

        expect(isErrorDetails(invalidErrorDetails)).toBe(false);
      });

      it('should reject error details with invalid headers structure', () => {
        const invalidErrorDetails =
          TestDataBuilder.createInvalidData().invalidErrorDetails('invalidHeaders');

        expect(isErrorDetails(invalidErrorDetails)).toBe(false);
      });

      it('should reject error details with non-string header values', () => {
        const errorDetails = {
          code: 'TEST_ERROR',
          headers: {
            'valid-header': 'valid-value',
            'invalid-header': 123, // Should be string
          },
        };

        expect(isErrorDetails(errorDetails)).toBe(false);
      });

      it('should reject error details with non-object headers', () => {
        const errorDetails = {
          code: 'TEST_ERROR',
          headers: 'not-an-object',
        };

        expect(isErrorDetails(errorDetails)).toBe(false);
      });
    });
  });

  describe('LogMetadata Interface', () => {
    describe('when validating log metadata structure', () => {
      it('should validate complete log metadata with all properties', () => {
        const logMetadata = TestDataBuilder.createLogMetadata({
          requestId: 'req-123456789',
          userId: 'user-123',
          operation: 'getCatalogItem',
          duration: 250,
          statusCode: 200,
          errorCode: undefined,
          correlationId: 'corr-123456789',
          sessionId: 'sess-123456789',
          traceId: 'trace-123456789',
        });

        expect(isLogMetadata(logMetadata)).toBe(true);
        expect(logMetadata.requestId).toBe('req-123456789');
        expect(logMetadata.userId).toBe('user-123');
        expect(logMetadata.operation).toBe('getCatalogItem');
        expect(logMetadata.duration).toBe(250);
        expect(logMetadata.statusCode).toBe(200);
        expect(logMetadata.correlationId).toBe('corr-123456789');
      });

      it('should validate minimal log metadata with only optional properties', () => {
        const logMetadata: LogMetadata = {};

        expect(isLogMetadata(logMetadata)).toBe(true);
      });

      it('should validate log metadata with correlation ID for tracking', () => {
        const logMetadata: LogMetadata = {
          requestId: 'req-456',
          correlationId: 'corr-456',
          operation: 'updateInventory',
        };

        expect(isLogMetadata(logMetadata)).toBe(true);
        expect(logMetadata.requestId).toBe('req-456');
        expect(logMetadata.correlationId).toBe('corr-456');
        expect(logMetadata.operation).toBe('updateInventory');
      });

      it('should validate log metadata with duration measurement', () => {
        const logMetadata: LogMetadata = {
          operation: 'processOrder',
          duration: 1500,
          statusCode: 201,
        };

        expect(isLogMetadata(logMetadata)).toBe(true);
        expect(logMetadata.operation).toBe('processOrder');
        expect(logMetadata.duration).toBe(1500);
        expect(logMetadata.statusCode).toBe(201);
      });

      it('should validate log metadata with error information', () => {
        const logMetadata: LogMetadata = {
          requestId: 'req-error-123',
          operation: 'failedOperation',
          duration: 100,
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
        };

        expect(isLogMetadata(logMetadata)).toBe(true);
        expect(logMetadata.errorCode).toBe('INTERNAL_ERROR');
        expect(logMetadata.statusCode).toBe(500);
      });

      it('should validate log metadata with extensible properties', () => {
        const logMetadata: LogMetadata = {
          requestId: 'req-123',
          operation: 'customOperation',
          customMetric: 'value',
          performanceData: { cpu: 0.5, memory: 1024 },
          tags: ['api', 'catalog'],
        };

        expect(isLogMetadata(logMetadata)).toBe(true);
        expect(logMetadata.customMetric).toBe('value');
        expect(logMetadata.performanceData).toEqual({ cpu: 0.5, memory: 1024 });
        expect(logMetadata.tags).toEqual(['api', 'catalog']);
      });
    });

    describe('when validating invalid log metadata', () => {
      it('should reject null values', () => {
        expect(isLogMetadata(null)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(isLogMetadata(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isLogMetadata('string')).toBe(false);
        expect(isLogMetadata(123)).toBe(false);
        expect(isLogMetadata(true)).toBe(false);
      });

      it('should reject log metadata with invalid types', () => {
        const invalidLogMetadata =
          TestDataBuilder.createInvalidData().invalidLogMetadata('wrongTypes');

        expect(isLogMetadata(invalidLogMetadata)).toBe(false);
      });

      it('should reject log metadata with invalid number fields', () => {
        const invalidLogMetadata =
          TestDataBuilder.createInvalidData().invalidLogMetadata('invalidNumbers');

        expect(isLogMetadata(invalidLogMetadata)).toBe(false);
      });

      it('should reject log metadata with non-string requestId', () => {
        const logMetadata = {
          requestId: 123, // Should be string
          operation: 'test',
        };

        expect(isLogMetadata(logMetadata)).toBe(false);
      });

      it('should reject log metadata with non-number duration', () => {
        const logMetadata = {
          operation: 'test',
          duration: 'invalid', // Should be number
        };

        expect(isLogMetadata(logMetadata)).toBe(false);
      });
    });
  });

  describe('ErrorRecoveryContext Interface', () => {
    describe('when validating error recovery context structure', () => {
      it('should validate complete error recovery context with function operation', () => {
        const mockOperation = async () => ({ success: true });
        const errorRecoveryContext: ErrorRecoveryContext = {
          operation: mockOperation,
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
        };

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(true);
        expect(typeof errorRecoveryContext.operation).toBe('function');
        expect(errorRecoveryContext.retryCount).toBe(1);
        expect(errorRecoveryContext.maxRetries).toBe(3);
        expect(errorRecoveryContext.shouldRetry).toBe(true);
      });

      it('should validate error recovery context with string operation', () => {
        const errorRecoveryContext = TestDataBuilder.createErrorRecoveryContext({
          operation: 'getCatalogItem',
          params: { asin: 'B08TEST123' },
          retryCount: 2,
          maxRetries: 5,
        });

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(true);
        expect(errorRecoveryContext.operation).toBe('getCatalogItem');
        expect(errorRecoveryContext.retryCount).toBe(2);
        expect(errorRecoveryContext.maxRetries).toBe(5);
      });

      it('should validate minimal error recovery context', () => {
        const errorRecoveryContext: ErrorRecoveryContext = {};

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(true);
      });

      it('should validate error recovery context with retry logic parameters', () => {
        const errorRecoveryContext: ErrorRecoveryContext = {
          retryCount: 0,
          maxRetries: 3,
          shouldRetry: true,
          requestId: 'req-retry-123',
        };

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(true);
        expect(errorRecoveryContext.retryCount).toBe(0);
        expect(errorRecoveryContext.maxRetries).toBe(3);
        expect(errorRecoveryContext.shouldRetry).toBe(true);
      });

      it('should validate error recovery context with operation parameters', () => {
        const errorRecoveryContext: ErrorRecoveryContext = {
          operation: 'updateInventory',
          params: {
            sku: 'TEST-SKU-123',
            quantity: 50,
            marketplaceId: 'ATVPDKIKX0DER',
          },
          options: {
            timeout: 5000,
            retryDelay: 1000,
          },
        };

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(true);
        expect(errorRecoveryContext.operation).toBe('updateInventory');
        expect(errorRecoveryContext.params).toEqual({
          sku: 'TEST-SKU-123',
          quantity: 50,
          marketplaceId: 'ATVPDKIKX0DER',
        });
      });

      it('should validate error recovery context with extensible properties', () => {
        const errorRecoveryContext: ErrorRecoveryContext = {
          operation: 'customOperation',
          retryCount: 1,
          customProperty: 'custom value',
          metadata: { source: 'test' },
          tags: ['retry', 'api'],
        };

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(true);
        expect(errorRecoveryContext.customProperty).toBe('custom value');
        expect(errorRecoveryContext.metadata).toEqual({ source: 'test' });
        expect(errorRecoveryContext.tags).toEqual(['retry', 'api']);
      });
    });

    describe('when validating invalid error recovery context', () => {
      it('should reject null values', () => {
        expect(isErrorRecoveryContext(null)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(isErrorRecoveryContext(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isErrorRecoveryContext('string')).toBe(false);
        expect(isErrorRecoveryContext(123)).toBe(false);
        expect(isErrorRecoveryContext(true)).toBe(false);
      });

      it('should reject error recovery context with invalid types', () => {
        const invalidContext =
          TestDataBuilder.createInvalidData().invalidErrorRecoveryContext('wrongTypes');

        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should reject error recovery context with invalid params', () => {
        const invalidContext =
          TestDataBuilder.createInvalidData().invalidErrorRecoveryContext('invalidParams');

        expect(isErrorRecoveryContext(invalidContext)).toBe(false);
      });

      it('should reject error recovery context with invalid operation type', () => {
        const errorRecoveryContext = {
          operation: 123, // Should be function or string
          retryCount: 1,
        };

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(false);
      });

      it('should reject error recovery context with non-boolean shouldRetry', () => {
        const errorRecoveryContext = {
          retryCount: 1,
          shouldRetry: 'yes', // Should be boolean
        };

        expect(isErrorRecoveryContext(errorRecoveryContext)).toBe(false);
      });
    });
  });

  describe('McpRequestBody Interface', () => {
    describe('when validating MCP request body structure', () => {
      it('should validate complete MCP request body with all properties', () => {
        const mcpRequestBody = TestDataBuilder.createMcpRequestBody({
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
        });

        expect(isMcpRequestBody(mcpRequestBody)).toBe(true);
        expect(mcpRequestBody.jsonrpc).toBe('2.0');
        expect(mcpRequestBody.method).toBe('tools/call');
        expect(mcpRequestBody.id).toBe('req-123456789');
        expect(mcpRequestBody.params).toEqual({
          name: 'getCatalogItem',
          arguments: {
            asin: 'B08TEST123',
            marketplaceIds: ['ATVPDKIKX0DER'],
          },
        });
      });

      it('should validate minimal MCP request body with required properties only', () => {
        const mcpRequestBody: McpRequestBody = {
          jsonrpc: '2.0',
          method: 'resources/list',
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(true);
        expect(mcpRequestBody.jsonrpc).toBe('2.0');
        expect(mcpRequestBody.method).toBe('resources/list');
      });

      it('should validate MCP request body for JSON-RPC 2.0 compliance', () => {
        const mcpRequestBody: McpRequestBody = {
          jsonrpc: '2.0',
          method: 'notifications/subscribe',
          params: {
            uri: 'inventory://changes',
          },
          id: 42,
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(true);
        expect(mcpRequestBody.jsonrpc).toBe('2.0');
        expect(mcpRequestBody.method).toBe('notifications/subscribe');
        expect(mcpRequestBody.id).toBe(42);
      });

      it('should validate MCP request body with string ID', () => {
        const mcpRequestBody: McpRequestBody = {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 'string-id-123',
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(true);
        expect(mcpRequestBody.id).toBe('string-id-123');
      });

      it('should validate MCP request body with number ID', () => {
        const mcpRequestBody: McpRequestBody = {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 12345,
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(true);
        expect(mcpRequestBody.id).toBe(12345);
      });

      it('should validate MCP request body with complex parameters', () => {
        const mcpRequestBody: McpRequestBody = {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'updateInventory',
            arguments: {
              updates: [
                { sku: 'SKU1', quantity: 10 },
                { sku: 'SKU2', quantity: 20 },
              ],
              marketplaceId: 'ATVPDKIKX0DER',
              options: {
                validateOnly: false,
                batchSize: 100,
              },
            },
          },
          id: 'batch-update-123',
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(true);
        expect(mcpRequestBody.params?.name).toBe('updateInventory');
      });
    });

    describe('when validating invalid MCP request body', () => {
      it('should reject null values', () => {
        expect(isMcpRequestBody(null)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(isMcpRequestBody(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isMcpRequestBody('string')).toBe(false);
        expect(isMcpRequestBody(123)).toBe(false);
        expect(isMcpRequestBody(true)).toBe(false);
      });

      it('should reject MCP request body with wrong JSON-RPC version', () => {
        const invalidMcpRequestBody =
          TestDataBuilder.createInvalidData().invalidMcpRequestBody('wrongJsonRpc');

        expect(isMcpRequestBody(invalidMcpRequestBody)).toBe(false);
      });

      it('should reject MCP request body missing method', () => {
        const invalidMcpRequestBody =
          TestDataBuilder.createInvalidData().invalidMcpRequestBody('missingMethod');

        expect(isMcpRequestBody(invalidMcpRequestBody)).toBe(false);
      });

      it('should reject MCP request body with invalid params', () => {
        const invalidMcpRequestBody =
          TestDataBuilder.createInvalidData().invalidMcpRequestBody('invalidParams');

        expect(isMcpRequestBody(invalidMcpRequestBody)).toBe(false);
      });

      it('should reject MCP request body with non-string method', () => {
        const mcpRequestBody = {
          jsonrpc: '2.0',
          method: 123, // Should be string
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(false);
      });

      it('should reject MCP request body with invalid ID type', () => {
        const mcpRequestBody = {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: [], // Should be string or number
        };

        expect(isMcpRequestBody(mcpRequestBody)).toBe(false);
      });
    });
  });

  describe('NotificationData Interface', () => {
    describe('when validating notification data structure', () => {
      it('should validate complete notification data with all properties', () => {
        const notificationData = TestDataBuilder.createNotificationData({
          type: 'inventory.changed',
          timestamp: '2024-01-15T10:30:00Z',
          payload: {
            sku: 'TEST-SKU-123',
            previousQuantity: 10,
            newQuantity: 5,
            marketplaceId: 'ATVPDKIKX0DER',
          },
          source: 'amazon-seller-mcp',
        });

        expect(isNotificationData(notificationData)).toBe(true);
        expect(notificationData.type).toBe('inventory.changed');
        expect(notificationData.timestamp).toBe('2024-01-15T10:30:00Z');
        expect(notificationData.source).toBe('amazon-seller-mcp');
        expect(notificationData.payload).toEqual({
          sku: 'TEST-SKU-123',
          previousQuantity: 10,
          newQuantity: 5,
          marketplaceId: 'ATVPDKIKX0DER',
        });
      });

      it('should validate minimal notification data with required properties only', () => {
        const notificationData: NotificationData = {
          type: 'order.status.changed',
          timestamp: '2024-01-15T11:00:00Z',
          payload: {
            orderId: 'ORDER-123',
            newStatus: 'SHIPPED',
          },
        };

        expect(isNotificationData(notificationData)).toBe(true);
        expect(notificationData.type).toBe('order.status.changed');
        expect(notificationData.timestamp).toBe('2024-01-15T11:00:00Z');
      });

      it('should validate notification data with event types and payload validation', () => {
        const notificationData: NotificationData = {
          type: 'listing.updated',
          timestamp: '2024-01-15T12:00:00Z',
          payload: {
            sku: 'LISTING-SKU-456',
            changes: {
              price: { from: 29.99, to: 24.99 },
              quantity: { from: 100, to: 150 },
            },
            marketplaceId: 'ATVPDKIKX0DER',
          },
          source: 'listing-service',
        };

        expect(isNotificationData(notificationData)).toBe(true);
        expect(notificationData.type).toBe('listing.updated');
        expect(notificationData.payload.changes).toEqual({
          price: { from: 29.99, to: 24.99 },
          quantity: { from: 100, to: 150 },
        });
      });

      it('should validate notification data with complex payload structure', () => {
        const notificationData: NotificationData = {
          type: 'report.generated',
          timestamp: '2024-01-15T13:00:00Z',
          payload: {
            reportId: 'REPORT-789',
            reportType: 'INVENTORY_SUMMARY',
            status: 'COMPLETED',
            downloadUrl: 'https://example.com/reports/789',
            metadata: {
              recordCount: 1500,
              fileSize: 2048576,
              generatedAt: '2024-01-15T12:55:00Z',
            },
          },
        };

        expect(isNotificationData(notificationData)).toBe(true);
        expect(notificationData.payload.metadata).toEqual({
          recordCount: 1500,
          fileSize: 2048576,
          generatedAt: '2024-01-15T12:55:00Z',
        });
      });
    });

    describe('when validating invalid notification data', () => {
      it('should reject null values', () => {
        expect(isNotificationData(null)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(isNotificationData(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isNotificationData('string')).toBe(false);
        expect(isNotificationData(123)).toBe(false);
        expect(isNotificationData(true)).toBe(false);
      });

      it('should reject notification data missing required fields', () => {
        const invalidNotificationData =
          TestDataBuilder.createInvalidData().invalidNotificationData('missingRequired');

        expect(isNotificationData(invalidNotificationData)).toBe(false);
      });

      it('should reject notification data with wrong types', () => {
        const invalidNotificationData =
          TestDataBuilder.createInvalidData().invalidNotificationData('wrongTypes');

        expect(isNotificationData(invalidNotificationData)).toBe(false);
      });

      it('should reject notification data with invalid payload', () => {
        const invalidNotificationData =
          TestDataBuilder.createInvalidData().invalidNotificationData('invalidPayload');

        expect(isNotificationData(invalidNotificationData)).toBe(false);
      });

      it('should reject notification data with non-string type', () => {
        const notificationData = {
          type: 123, // Should be string
          timestamp: '2024-01-15T10:30:00Z',
          payload: { test: 'data' },
        };

        expect(isNotificationData(notificationData)).toBe(false);
      });

      it('should reject notification data with null payload', () => {
        const notificationData = {
          type: 'test.event',
          timestamp: '2024-01-15T10:30:00Z',
          payload: null, // Should be object
        };

        expect(isNotificationData(notificationData)).toBe(false);
      });
    });
  });

  describe('HTTP Request/Response Interfaces', () => {
    describe('HttpRequest Interface', () => {
      describe('when validating HTTP request structure', () => {
        it('should validate complete HTTP request with all properties', () => {
          const httpRequest = TestDataBuilder.createHttpRequest({
            method: 'POST',
            url: '/api/catalog/items',
            ip: '192.168.1.100',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'Amazon-MCP-Client/1.0.0',
              authorization: 'Bearer token123',
              'x-amzn-marketplace-id': 'ATVPDKIKX0DER',
              'accept-encoding': ['gzip', 'deflate'],
            },
          });

          expect(isHttpRequest(httpRequest)).toBe(true);
          expect(httpRequest.method).toBe('POST');
          expect(httpRequest.url).toBe('/api/catalog/items');
          expect(httpRequest.ip).toBe('192.168.1.100');
          expect(httpRequest.headers['content-type']).toBe('application/json');
          expect(httpRequest.headers['accept-encoding']).toEqual(['gzip', 'deflate']);
        });

        it('should validate minimal HTTP request with required properties only', () => {
          const httpRequest: HttpRequest = {
            method: 'GET',
            url: '/api/health',
            headers: {},
          };

          expect(isHttpRequest(httpRequest)).toBe(true);
          expect(httpRequest.method).toBe('GET');
          expect(httpRequest.url).toBe('/api/health');
        });

        it('should validate HTTP request for web server compatibility', () => {
          const httpRequest: HttpRequest = {
            method: 'PUT',
            url: '/api/inventory/update',
            ip: '10.0.0.1',
            headers: {
              'content-type': 'application/json',
              'content-length': '1024',
              host: 'api.example.com',
              'x-forwarded-for': '203.0.113.1',
              'x-real-ip': '203.0.113.1',
            },
          };

          expect(isHttpRequest(httpRequest)).toBe(true);
          expect(httpRequest.headers.host).toBe('api.example.com');
          expect(httpRequest.headers['x-forwarded-for']).toBe('203.0.113.1');
        });

        it('should validate HTTP request with array header values', () => {
          const httpRequest: HttpRequest = {
            method: 'GET',
            url: '/api/orders',
            headers: {
              accept: ['application/json', 'application/xml'],
              'cache-control': 'no-cache',
              'x-custom-header': ['value1', 'value2', 'value3'],
            },
          };

          expect(isHttpRequest(httpRequest)).toBe(true);
          expect(httpRequest.headers.accept).toEqual(['application/json', 'application/xml']);
          expect(httpRequest.headers['x-custom-header']).toEqual(['value1', 'value2', 'value3']);
        });
      });

      describe('when validating invalid HTTP request', () => {
        it('should reject null values', () => {
          expect(isHttpRequest(null)).toBe(false);
        });

        it('should reject undefined values', () => {
          expect(isHttpRequest(undefined)).toBe(false);
        });

        it('should reject primitive values', () => {
          expect(isHttpRequest('string')).toBe(false);
          expect(isHttpRequest(123)).toBe(false);
          expect(isHttpRequest(true)).toBe(false);
        });

        it('should reject HTTP request missing required fields', () => {
          const invalidHttpRequest =
            TestDataBuilder.createInvalidData().invalidHttpRequest('missingRequired');

          expect(isHttpRequest(invalidHttpRequest)).toBe(false);
        });

        it('should reject HTTP request with invalid headers', () => {
          const invalidHttpRequest =
            TestDataBuilder.createInvalidData().invalidHttpRequest('invalidHeaders');

          expect(isHttpRequest(invalidHttpRequest)).toBe(false);
        });

        it('should reject HTTP request with non-string method', () => {
          const httpRequest = {
            method: 123, // Should be string
            url: '/api/test',
            headers: {},
          };

          expect(isHttpRequest(httpRequest)).toBe(false);
        });

        it('should reject HTTP request with invalid header values', () => {
          const httpRequest = {
            method: 'GET',
            url: '/api/test',
            headers: {
              'valid-header': 'valid-value',
              'invalid-header': 123, // Should be string or string[]
            },
          };

          expect(isHttpRequest(httpRequest)).toBe(false);
        });

        it('should reject HTTP request with mixed array header values', () => {
          const httpRequest = {
            method: 'GET',
            url: '/api/test',
            headers: {
              'mixed-header': ['string', 123], // All elements should be strings
            },
          };

          expect(isHttpRequest(httpRequest)).toBe(false);
        });
      });
    });

    describe('HttpResponse Interface', () => {
      describe('when validating HTTP response structure', () => {
        it('should validate complete HTTP response with all properties', () => {
          const httpResponse = TestDataBuilder.createHttpResponse({
            statusCode: 200,
          });

          expect(isHttpResponse(httpResponse)).toBe(true);
          expect(httpResponse.statusCode).toBe(200);
          expect(typeof httpResponse.on).toBe('function');
        });

        it('should validate HTTP response with different status codes', () => {
          const statusCodes = [200, 201, 400, 401, 404, 500];

          statusCodes.forEach((statusCode) => {
            const httpResponse = TestDataBuilder.createHttpResponse({ statusCode });

            expect(isHttpResponse(httpResponse)).toBe(true);
            expect(httpResponse.statusCode).toBe(statusCode);
          });
        });

        it('should validate HTTP response event listener registration', () => {
          const httpResponse = TestDataBuilder.createHttpResponse({
            statusCode: 201,
          });

          expect(isHttpResponse(httpResponse)).toBe(true);
          expect(typeof httpResponse.on).toBe('function');

          // Test that the on method can be called
          expect(() => {
            httpResponse.on('finish', () => {});
          }).not.toThrow();
        });
      });

      describe('when validating invalid HTTP response', () => {
        it('should reject null values', () => {
          expect(isHttpResponse(null)).toBe(false);
        });

        it('should reject undefined values', () => {
          expect(isHttpResponse(undefined)).toBe(false);
        });

        it('should reject primitive values', () => {
          expect(isHttpResponse('string')).toBe(false);
          expect(isHttpResponse(123)).toBe(false);
          expect(isHttpResponse(true)).toBe(false);
        });

        it('should reject HTTP response missing status code', () => {
          const invalidHttpResponse =
            TestDataBuilder.createInvalidData().invalidHttpResponse('missingStatusCode');

          expect(isHttpResponse(invalidHttpResponse)).toBe(false);
        });

        it('should reject HTTP response with invalid on method', () => {
          const invalidHttpResponse =
            TestDataBuilder.createInvalidData().invalidHttpResponse('invalidOn');

          expect(isHttpResponse(invalidHttpResponse)).toBe(false);
        });

        it('should reject HTTP response with non-number status code', () => {
          const httpResponse = {
            statusCode: '200', // Should be number
            on: () => {},
          };

          expect(isHttpResponse(httpResponse)).toBe(false);
        });

        it('should reject HTTP response with non-function on method', () => {
          const httpResponse = {
            statusCode: 200,
            on: 'not-a-function', // Should be function
          };

          expect(isHttpResponse(httpResponse)).toBe(false);
        });
      });
    });
  });

  describe('ToolInput Interface', () => {
    describe('when validating tool input structure', () => {
      it('should validate complete tool input with various properties', () => {
        const toolInput = TestDataBuilder.createToolInput({
          asin: 'B08TEST123',
          marketplaceIds: ['ATVPDKIKX0DER'],
          includeSalesRank: true,
          locale: 'en_US',
          maxResults: 100,
          filters: {
            category: 'Electronics',
            brand: 'TestBrand',
          },
        });

        expect(isToolInput(toolInput)).toBe(true);
        expect(toolInput.asin).toBe('B08TEST123');
        expect(toolInput.marketplaceIds).toEqual(['ATVPDKIKX0DER']);
        expect(toolInput.includeSalesRank).toBe(true);
        expect(toolInput.maxResults).toBe(100);
      });

      it('should validate minimal tool input', () => {
        const toolInput: ToolInput = {};

        expect(isToolInput(toolInput)).toBe(true);
      });

      it('should validate tool input with string properties', () => {
        const toolInput: ToolInput = {
          operation: 'search',
          query: 'test product',
          sortBy: 'relevance',
        };

        expect(isToolInput(toolInput)).toBe(true);
        expect(toolInput.operation).toBe('search');
        expect(toolInput.query).toBe('test product');
      });

      it('should validate tool input with number properties', () => {
        const toolInput: ToolInput = {
          page: 1,
          limit: 50,
          timeout: 30000,
        };

        expect(isToolInput(toolInput)).toBe(true);
        expect(toolInput.page).toBe(1);
        expect(toolInput.limit).toBe(50);
      });

      it('should validate tool input with boolean properties', () => {
        const toolInput: ToolInput = {
          includeImages: true,
          validateOnly: false,
          async: true,
        };

        expect(isToolInput(toolInput)).toBe(true);
        expect(toolInput.includeImages).toBe(true);
        expect(toolInput.validateOnly).toBe(false);
      });

      it('should validate tool input with array properties', () => {
        const toolInput: ToolInput = {
          skus: ['SKU1', 'SKU2', 'SKU3'],
          categories: ['Electronics', 'Home'],
          tags: ['new', 'featured'],
        };

        expect(isToolInput(toolInput)).toBe(true);
        expect(toolInput.skus).toEqual(['SKU1', 'SKU2', 'SKU3']);
        expect(toolInput.categories).toEqual(['Electronics', 'Home']);
      });

      it('should validate tool input with nested object properties', () => {
        const toolInput: ToolInput = {
          filters: {
            price: { min: 10, max: 100 },
            availability: { inStock: true },
          },
          options: {
            format: 'json',
            compression: 'gzip',
          },
        };

        expect(isToolInput(toolInput)).toBe(true);
        expect(toolInput.filters).toEqual({
          price: { min: 10, max: 100 },
          availability: { inStock: true },
        });
      });
    });

    describe('when validating invalid tool input', () => {
      it('should reject null values', () => {
        expect(isToolInput(null)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(isToolInput(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isToolInput('string')).toBe(false);
        expect(isToolInput(123)).toBe(false);
        expect(isToolInput(true)).toBe(false);
      });

      it('should accept arrays (as they are objects in JavaScript)', () => {
        // Note: Arrays are objects in JavaScript, so they pass the current type guard
        // This behavior matches the simple implementation of isToolInput
        expect(isToolInput([])).toBe(true);
        expect(isToolInput(['item1', 'item2'])).toBe(true);
      });

      it('should reject functions', () => {
        expect(isToolInput(() => {})).toBe(false);
        expect(isToolInput(function () {})).toBe(false);
      });
    });
  });
});
describe('Common Constants and Utilities', () => {
  describe('COMMON_CONSTANTS', () => {
    it('should export JSON-RPC version', () => {
      expect(COMMON_CONSTANTS.JSONRPC_VERSION).toBe('2.0');
      expect(typeof COMMON_CONSTANTS.JSONRPC_VERSION).toBe('string');
    });

    it('should export HTTP status codes', () => {
      expect(COMMON_CONSTANTS.HTTP_STATUS.OK).toBe(200);
      expect(COMMON_CONSTANTS.HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(COMMON_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(COMMON_CONSTANTS.HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(COMMON_CONSTANTS.HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(COMMON_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('should export error codes', () => {
      expect(COMMON_CONSTANTS.ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(COMMON_CONSTANTS.ERROR_CODES.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(COMMON_CONSTANTS.ERROR_CODES.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
      expect(COMMON_CONSTANTS.ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(COMMON_CONSTANTS.ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });

    it('should export default retry configuration', () => {
      expect(COMMON_CONSTANTS.DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(COMMON_CONSTANTS.DEFAULT_RETRY_CONFIG.shouldRetry).toBe(true);
    });
  });

  describe('CommonUtils', () => {
    describe('createErrorDetails', () => {
      it('should create error details with code only', () => {
        const error = CommonUtils.createErrorDetails('TEST_ERROR');
        expect(error.code).toBe('TEST_ERROR');
        expect(error.statusCode).toBeUndefined();
        expect(error.timestamp).toBeDefined();
        expect(typeof error.timestamp).toBe('string');
      });

      it('should create error details with code and status code', () => {
        const error = CommonUtils.createErrorDetails('TEST_ERROR', 400);
        expect(error.code).toBe('TEST_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.timestamp).toBeDefined();
      });

      it('should create valid timestamp', () => {
        const error = CommonUtils.createErrorDetails('TEST_ERROR');
        const timestamp = new Date(error.timestamp!);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).not.toBeNaN();
      });
    });

    describe('createLogMetadata', () => {
      it('should create log metadata with operation only', () => {
        const metadata = CommonUtils.createLogMetadata('test-operation');
        expect(metadata.operation).toBe('test-operation');
        expect(metadata.requestId).toBeUndefined();
        expect(metadata.timestamp).toBeDefined();
        expect(typeof metadata.timestamp).toBe('string');
      });

      it('should create log metadata with operation and request ID', () => {
        const metadata = CommonUtils.createLogMetadata('test-operation', 'req-123');
        expect(metadata.operation).toBe('test-operation');
        expect(metadata.requestId).toBe('req-123');
        expect(metadata.timestamp).toBeDefined();
      });

      it('should create valid timestamp', () => {
        const metadata = CommonUtils.createLogMetadata('test-operation');
        const timestamp = new Date(metadata.timestamp!);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).not.toBeNaN();
      });
    });

    describe('createMcpRequest', () => {
      it('should create MCP request with method only', () => {
        const request = CommonUtils.createMcpRequest('test-method');
        expect(request.jsonrpc).toBe('2.0');
        expect(request.method).toBe('test-method');
        expect(request.params).toBeUndefined();
        expect(request.id).toBeDefined();
        expect(typeof request.id).toBe('string');
      });

      it('should create MCP request with method and params', () => {
        const params = { key: 'value', number: 123 };
        const request = CommonUtils.createMcpRequest('test-method', params);
        expect(request.jsonrpc).toBe('2.0');
        expect(request.method).toBe('test-method');
        expect(request.params).toEqual(params);
        expect(request.id).toBeDefined();
      });

      it('should generate unique IDs', () => {
        const request1 = CommonUtils.createMcpRequest('method1');
        const request2 = CommonUtils.createMcpRequest('method2');
        expect(request1.id).not.toBe(request2.id);
      });
    });

    describe('HTTP status code utilities', () => {
      describe('isSuccessStatus', () => {
        it('should identify success status codes', () => {
          expect(CommonUtils.isSuccessStatus(200)).toBe(true);
          expect(CommonUtils.isSuccessStatus(201)).toBe(true);
          expect(CommonUtils.isSuccessStatus(204)).toBe(true);
          expect(CommonUtils.isSuccessStatus(299)).toBe(true);
        });

        it('should reject non-success status codes', () => {
          expect(CommonUtils.isSuccessStatus(199)).toBe(false);
          expect(CommonUtils.isSuccessStatus(300)).toBe(false);
          expect(CommonUtils.isSuccessStatus(400)).toBe(false);
          expect(CommonUtils.isSuccessStatus(500)).toBe(false);
        });
      });

      describe('isClientError', () => {
        it('should identify client error status codes', () => {
          expect(CommonUtils.isClientError(400)).toBe(true);
          expect(CommonUtils.isClientError(401)).toBe(true);
          expect(CommonUtils.isClientError(404)).toBe(true);
          expect(CommonUtils.isClientError(499)).toBe(true);
        });

        it('should reject non-client error status codes', () => {
          expect(CommonUtils.isClientError(399)).toBe(false);
          expect(CommonUtils.isClientError(500)).toBe(false);
          expect(CommonUtils.isClientError(200)).toBe(false);
          expect(CommonUtils.isClientError(300)).toBe(false);
        });
      });

      describe('isServerError', () => {
        it('should identify server error status codes', () => {
          expect(CommonUtils.isServerError(500)).toBe(true);
          expect(CommonUtils.isServerError(501)).toBe(true);
          expect(CommonUtils.isServerError(503)).toBe(true);
          expect(CommonUtils.isServerError(599)).toBe(true);
        });

        it('should reject non-server error status codes', () => {
          expect(CommonUtils.isServerError(499)).toBe(false);
          expect(CommonUtils.isServerError(600)).toBe(false);
          expect(CommonUtils.isServerError(200)).toBe(false);
          expect(CommonUtils.isServerError(400)).toBe(false);
        });
      });
    });

    it('should maintain type safety for utility functions', () => {
      // Verify return types
      const errorDetails: ErrorDetails = CommonUtils.createErrorDetails('TEST');
      const logMetadata: LogMetadata = CommonUtils.createLogMetadata('operation');
      const mcpRequest: McpRequestBody = CommonUtils.createMcpRequest('method');
      const successStatus: boolean = CommonUtils.isSuccessStatus(200);
      const clientError: boolean = CommonUtils.isClientError(400);
      const serverError: boolean = CommonUtils.isServerError(500);

      expect(typeof errorDetails.code).toBe('string');
      expect(typeof logMetadata.operation).toBe('string');
      expect(mcpRequest.jsonrpc).toBe('2.0');
      expect(typeof successStatus).toBe('boolean');
      expect(typeof clientError).toBe('boolean');
      expect(typeof serverError).toBe('boolean');
    });
  });
});
