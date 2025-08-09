/**
 * Resource Test Template
 *
 * This template provides a standardized structure for testing MCP resources.
 * Resources provide read-only access to data through URI-based addressing.
 *
 * Guidelines:
 * - Test resource registration and URI handling
 * - Verify resource response formats and content types
 * - Test URI pattern matching and parameter extraction
 * - Ensure resources work correctly with MCP protocol
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the resource under test
import { ResourceUnderTest } from '../../src/resources/resource-under-test.js';

// Import mock factories and test utilities
import { TestDataBuilder, TestAssertions, TestSetup } from '../utils/index.js';

// Import MCP types
import type { ReadResourceRequest, MockDependencies } from '../../src/types/index.js';

describe('ResourceUnderTest', () => {
  let resource: ResourceUnderTest;
  let mockDependencies: MockDependencies;

  beforeEach(() => {
    // Setup mock environment
    mockDependencies = TestSetup.setupMockEnvironment();

    // Create resource instance with mocked dependencies
    resource = new ResourceUnderTest(mockDependencies.apiClient, mockDependencies.auth);
  });

  describe('resource registration', () => {
    it('should register resource templates with correct patterns', () => {
      // Act
      const templates = resource.getTemplates();

      // Assert
      expect(templates).toEqual([
        expect.objectContaining({
          uriTemplate: 'amazon://resource-type/{id}',
          name: 'Resource Name',
          description: expect.stringContaining('expected description'),
          mimeType: 'application/json',
        }),
        expect.objectContaining({
          uriTemplate: 'amazon://resource-type/{id}/details',
          name: 'Resource Details',
          description: expect.stringContaining('detailed information'),
          mimeType: 'application/json',
        }),
      ]);
    });

    it('should have valid URI templates', () => {
      // Act
      const templates = resource.getTemplates();

      // Assert
      templates.forEach((template) => {
        expect(template.uriTemplate).toMatch(/^amazon:\/\//);
        expect(template.uriTemplate).toContain('{');
        expect(template.uriTemplate).toContain('}');
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.mimeType).toBeTruthy();
      });
    });
  });

  describe('URI pattern matching', () => {
    it('should match valid URI patterns', () => {
      // Arrange
      const validUris = [
        'amazon://resource-type/123',
        'amazon://resource-type/ABC-456',
        'amazon://resource-type/test-id/details',
      ];

      // Act & Assert
      validUris.forEach((uri) => {
        const canHandle = resource.canHandle(uri);
        expect(canHandle).toBe(true);
      });
    });

    it('should reject invalid URI patterns', () => {
      // Arrange
      const invalidUris = [
        'http://example.com/resource',
        'amazon://wrong-type/123',
        'amazon://resource-type/',
        'amazon://resource-type/123/invalid-path',
      ];

      // Act & Assert
      invalidUris.forEach((uri) => {
        const canHandle = resource.canHandle(uri);
        expect(canHandle).toBe(false);
      });
    });

    it('should extract parameters from URI correctly', () => {
      // Arrange
      const uri = 'amazon://resource-type/TEST-123';

      // Act
      const params = resource.extractParams(uri);

      // Assert
      expect(params).toEqual({
        id: 'TEST-123',
      });
    });
  });

  describe('resource reading', () => {
    it('should return resource data for valid URI', async () => {
      // Arrange
      const uri = 'amazon://resource-type/TEST-123';
      const expectedData = TestDataBuilder.createResourceData();
      mockDependencies.apiClient.get.mockResolvedValue(expectedData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      TestAssertions.expectResourceSuccess(result, {
        uri,
        mimeType: 'application/json',
        data: expectedData,
      });

      expect(result.contents).toEqual([
        expect.objectContaining({
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(expectedData, null, 2),
        }),
      ]);
    });

    it('should handle resource not found', async () => {
      // Arrange
      const uri = 'amazon://resource-type/NON-EXISTENT';
      const notFoundError = TestDataBuilder.createApiError('NotFound');
      mockDependencies.apiClient.get.mockRejectedValue(notFoundError);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      TestAssertions.expectResourceError(result, 'ResourceNotFound');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const uri = 'amazon://resource-type/TEST-123';
      const apiError = TestDataBuilder.createApiError('RateLimitExceeded');
      mockDependencies.apiClient.get.mockRejectedValue(apiError);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      TestAssertions.expectResourceError(result, 'RateLimitExceeded');
    });
  });

  describe('content formatting', () => {
    it('should format JSON content correctly', async () => {
      // Arrange
      const uri = 'amazon://resource-type/TEST-123';
      const resourceData = TestDataBuilder.createResourceData();
      mockDependencies.apiClient.get.mockResolvedValue(resourceData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      expect(result.contents[0]).toEqual({
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(resourceData, null, 2),
      });

      // Verify JSON is valid
      expect(() => JSON.parse(result.contents[0].text)).not.toThrow();
    });

    it('should format text content correctly', async () => {
      // Arrange
      const uri = 'amazon://resource-type/TEST-123/description';
      const textContent = 'This is a text description of the resource';
      mockDependencies.apiClient.get.mockResolvedValue({ description: textContent });

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      expect(result.contents[0]).toEqual({
        uri,
        mimeType: 'text/plain',
        text: textContent,
      });
    });

    it('should handle binary content appropriately', async () => {
      // Arrange
      const uri = 'amazon://resource-type/TEST-123/image';
      const binaryData = Buffer.from('fake-image-data');
      mockDependencies.apiClient.get.mockResolvedValue(binaryData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      expect(result.contents[0]).toEqual({
        uri,
        mimeType: 'application/octet-stream',
        blob: expect.any(String), // Base64 encoded
      });
    });
  });

  describe('URI parameter handling', () => {
    it('should handle single parameter URIs', async () => {
      // Arrange
      const uri = 'amazon://resource-type/PARAM-123';
      const expectedData = TestDataBuilder.createResourceData({ id: 'PARAM-123' });
      mockDependencies.apiClient.get.mockResolvedValue(expectedData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      await resource.read(request);

      // Assert
      expect(mockDependencies.apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('PARAM-123')
      );
    });

    it('should handle multiple parameter URIs', async () => {
      // Arrange
      const uri = 'amazon://resource-type/PARENT-123/children/CHILD-456';
      const expectedData = TestDataBuilder.createResourceData({
        parentId: 'PARENT-123',
        childId: 'CHILD-456',
      });
      mockDependencies.apiClient.get.mockResolvedValue(expectedData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      await resource.read(request);

      // Assert
      expect(mockDependencies.apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('PARENT-123'),
        expect.objectContaining({
          params: expect.objectContaining({
            childId: 'CHILD-456',
          }),
        })
      );
    });

    it('should validate parameter formats', async () => {
      // Arrange
      const invalidUris = [
        'amazon://resource-type/', // Missing parameter
        'amazon://resource-type/invalid@param', // Invalid characters
        'amazon://resource-type/toolong'.repeat(100), // Too long
      ];

      // Act & Assert
      for (const uri of invalidUris) {
        const request: ReadResourceRequest = {
          method: 'resources/read',
          params: { uri },
        };

        const result = await resource.read(request);
        TestAssertions.expectResourceError(result, 'InvalidURI');
      }
    });
  });

  describe('caching behavior', () => {
    it('should cache resource data when appropriate', async () => {
      // Arrange
      const uri = 'amazon://resource-type/CACHEABLE-123';
      const resourceData = TestDataBuilder.createResourceData();
      mockDependencies.apiClient.get.mockResolvedValue(resourceData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act - Make two requests
      await resource.read(request);
      await resource.read(request);

      // Assert - API should only be called once due to caching
      expect(mockDependencies.apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should respect cache expiration', async () => {
      // Arrange
      const uri = 'amazon://resource-type/EXPIRING-123';
      const resourceData = TestDataBuilder.createResourceData();
      mockDependencies.apiClient.get.mockResolvedValue(resourceData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act - Make request, wait for cache expiration, make another request
      await resource.read(request);

      // Simulate cache expiration
      vi.advanceTimersByTime(60000); // 1 minute

      await resource.read(request);

      // Assert - API should be called twice due to cache expiration
      expect(mockDependencies.apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty API responses', async () => {
      // Arrange
      const uri = 'amazon://resource-type/EMPTY-123';
      mockDependencies.apiClient.get.mockResolvedValue(null);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      expect(result.contents[0]).toEqual({
        uri,
        mimeType: 'application/json',
        text: 'null',
      });
    });

    it('should handle network timeouts', async () => {
      // Arrange
      const uri = 'amazon://resource-type/TIMEOUT-123';
      const timeoutError = new Error('Request timeout');
      mockDependencies.apiClient.get.mockRejectedValue(timeoutError);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      TestAssertions.expectResourceError(result, 'TimeoutError');
    });

    it('should handle authentication failures', async () => {
      // Arrange
      const uri = 'amazon://resource-type/AUTH-FAIL-123';
      const authError = TestDataBuilder.createAuthError('TokenExpired');
      mockDependencies.apiClient.get.mockRejectedValue(authError);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const result = await resource.read(request);

      // Assert
      TestAssertions.expectResourceError(result, 'AuthenticationError');
    });
  });

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      // Arrange
      const uri = 'amazon://resource-type/PERF-TEST-123';
      const resourceData = TestDataBuilder.createResourceData();
      mockDependencies.apiClient.get.mockResolvedValue(resourceData);

      const request: ReadResourceRequest = {
        method: 'resources/read',
        params: { uri },
      };

      // Act
      const startTime = Date.now();
      const result = await resource.read(request);
      const responseTime = Date.now() - startTime;

      // Assert
      TestAssertions.expectResourceSuccess(result, expect.any(Object));
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
    });

    it('should handle concurrent resource requests', async () => {
      // Arrange
      const uris = [
        'amazon://resource-type/CONCURRENT-1',
        'amazon://resource-type/CONCURRENT-2',
        'amazon://resource-type/CONCURRENT-3',
      ];

      const resourceData = TestDataBuilder.createResourceData();
      mockDependencies.apiClient.get.mockResolvedValue(resourceData);

      const requests = uris.map((uri) => ({
        method: 'resources/read' as const,
        params: { uri },
      }));

      // Act
      const results = await Promise.all(requests.map((request) => resource.read(request)));

      // Assert
      results.forEach((result) => {
        TestAssertions.expectResourceSuccess(result, expect.any(Object));
      });
    });
  });

  describe('resource listing', () => {
    it('should list available resources', async () => {
      // Arrange
      const expectedResources = TestDataBuilder.createResourceList();
      mockDependencies.apiClient.get.mockResolvedValue(expectedResources);

      // Act
      const resources = await resource.list();

      // Assert
      expect(resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: expect.stringMatching(/^amazon:\/\/resource-type\//),
            name: expect.any(String),
            description: expect.any(String),
            mimeType: expect.any(String),
          }),
        ])
      );
    });

    it('should handle empty resource lists', async () => {
      // Arrange
      mockDependencies.apiClient.get.mockResolvedValue([]);

      // Act
      const resources = await resource.list();

      // Assert
      expect(resources).toEqual([]);
    });
  });
});

/**
 * Template Usage Instructions:
 *
 * 1. Replace 'ResourceUnderTest' with your actual resource class name
 * 2. Update URI templates to match your resource addressing scheme
 * 3. Define correct MIME types for your resource content
 * 4. Update mock dependencies to match your resource's requirements
 * 5. Add resource-specific test cases for your data types
 * 6. Test all URI pattern variations and parameter combinations
 * 7. Verify content formatting for different data types
 * 8. Test caching behavior if your resource implements caching
 * 9. Include performance tests for resource access patterns
 * 10. Test resource listing and discovery functionality
 */
