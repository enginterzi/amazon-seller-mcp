/**
 * Tool Test Template
 *
 * This template provides a standardized structure for testing MCP tools.
 * Tools are the primary interface for AI agents to interact with your system.
 *
 * Guidelines:
 * - Test tool registration and execution
 * - Verify tool input/output contracts
 * - Test error handling and validation
 * - Ensure tools work correctly with MCP protocol
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import the tool under test
import { ToolUnderTest } from '../../src/tools/tool-under-test.js';

// Import mock factories and test utilities
import { TestDataBuilder, TestAssertions, TestSetup } from '../utils/index.js';

// Import MCP types
import type { CallToolRequest, MockDependencies } from '../../src/types/index.js';

describe('ToolUnderTest', () => {
  let tool: ToolUnderTest;
  let mockDependencies: MockDependencies;

  beforeEach(() => {
    // Setup mock environment
    mockDependencies = TestSetup.setupMockEnvironment();

    // Create tool instance with mocked dependencies
    tool = new ToolUnderTest(mockDependencies.apiClient, mockDependencies.auth);
  });

  describe('tool registration', () => {
    it('should register tool with correct metadata', () => {
      // Act
      const toolDefinition = tool.getDefinition();

      // Assert
      expect(toolDefinition).toEqual({
        name: 'expected_tool_name',
        description: expect.stringContaining('expected description'),
        inputSchema: {
          type: 'object',
          properties: expect.objectContaining({
            // Expected input properties
            requiredParam: {
              type: 'string',
              description: expect.any(String),
            },
            optionalParam: {
              type: 'string',
              description: expect.any(String),
            },
          }),
          required: ['requiredParam'],
        },
      });
    });

    it('should have valid JSON schema for input validation', () => {
      // Act
      const toolDefinition = tool.getDefinition();

      // Assert
      expect(toolDefinition.inputSchema).toBeDefined();
      expect(toolDefinition.inputSchema.type).toBe('object');
      expect(toolDefinition.inputSchema.properties).toBeDefined();
      expect(toolDefinition.inputSchema.required).toBeInstanceOf(Array);
    });
  });

  describe('tool execution', () => {
    it('should execute successfully with valid input', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const expectedResult = TestDataBuilder.createExpectedToolResult();
      mockDependencies.apiClient.someMethod.mockResolvedValue(expectedResult);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolSuccess(result, expectedResult);
      expect(result.content).toEqual([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('success'),
        }),
      ]);
    });

    it('should validate required input parameters', async () => {
      // Arrange
      const invalidInput = TestDataBuilder.createInvalidToolInput();

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: invalidInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolError(result, 'ValidationError');
      expect(result.content).toEqual([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('validation failed'),
        }),
      ]);
    });

    it('should handle missing required parameters', async () => {
      // Arrange
      const incompleteInput = {}; // Missing required parameters

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: incompleteInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolError(result, 'ValidationError');
      expect(result.content[0].text).toContain('requiredParam is required');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const apiError = TestDataBuilder.createApiError('RateLimitExceeded');
      mockDependencies.apiClient.someMethod.mockRejectedValue(apiError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolError(result, 'RateLimitExceeded');
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });
  });

  describe('input validation', () => {
    it('should accept valid input formats', async () => {
      // Arrange
      const validInputs = [
        TestDataBuilder.createValidToolInput(),
        TestDataBuilder.createValidToolInput({ variant: 'alternative' }),
        TestDataBuilder.createValidToolInput({ withOptionalParams: true }),
      ];

      // Act & Assert
      for (const input of validInputs) {
        const request: CallToolRequest = {
          method: 'tools/call',
          params: {
            name: 'expected_tool_name',
            arguments: input,
          },
        };

        const result = await tool.execute(request);
        expect(result.isError).toBe(false);
      }
    });

    it('should reject invalid input types', async () => {
      // Arrange
      const invalidInputs = [
        { requiredParam: 123 }, // Wrong type
        { requiredParam: null }, // Null value
        { requiredParam: '' }, // Empty string
        { unknownParam: 'value' }, // Unknown parameter
      ];

      // Act & Assert
      for (const input of invalidInputs) {
        const request: CallToolRequest = {
          method: 'tools/call',
          params: {
            name: 'expected_tool_name',
            arguments: input,
          },
        };

        const result = await tool.execute(request);
        TestAssertions.expectToolError(result, 'ValidationError');
      }
    });

    it('should validate parameter constraints', async () => {
      // Arrange
      const constraintViolations = [
        { requiredParam: 'a' }, // Too short
        { requiredParam: 'a'.repeat(1000) }, // Too long
        { requiredParam: 'invalid-format' }, // Invalid format
      ];

      // Act & Assert
      for (const input of constraintViolations) {
        const request: CallToolRequest = {
          method: 'tools/call',
          params: {
            name: 'expected_tool_name',
            arguments: input,
          },
        };

        const result = await tool.execute(request);
        TestAssertions.expectToolError(result, 'ValidationError');
      }
    });
  });

  describe('output formatting', () => {
    it('should return structured output for successful operations', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const apiResponse = TestDataBuilder.createApiResponse();
      mockDependencies.apiClient.someMethod.mockResolvedValue(apiResponse);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      expect(result.content).toEqual([
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/^Operation completed successfully/),
        }),
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Result:'),
        }),
      ]);
    });

    it('should format error messages consistently', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const apiError = new Error('API operation failed');
      mockDependencies.apiClient.someMethod.mockRejectedValue(apiError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual(
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/^Error: API operation failed/),
        })
      );
    });

    it('should include relevant context in output', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const apiResponse = TestDataBuilder.createApiResponse();
      mockDependencies.apiClient.someMethod.mockResolvedValue(apiResponse);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      const outputText = result.content[0].text;
      expect(outputText).toContain(validInput.requiredParam);
      expect(outputText).toContain('timestamp');
      expect(outputText).toContain('operation_id');
    });
  });

  describe('edge cases', () => {
    it('should handle empty API responses', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      mockDependencies.apiClient.someMethod.mockResolvedValue(null);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolSuccess(
        result,
        expect.objectContaining({
          message: 'No data found',
        })
      );
    });

    it('should handle network timeouts', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const timeoutError = new Error('Request timeout');
      mockDependencies.apiClient.someMethod.mockRejectedValue(timeoutError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolError(result, 'TimeoutError');
      expect(result.content[0].text).toContain('Request timeout');
    });

    it('should handle authentication failures', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const authError = TestDataBuilder.createAuthError('TokenExpired');
      mockDependencies.apiClient.someMethod.mockRejectedValue(authError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const result = await tool.execute(request);

      // Assert
      TestAssertions.expectToolError(result, 'AuthenticationError');
      expect(result.content[0].text).toContain('Authentication failed');
    });
  });

  describe('performance', () => {
    it('should complete operations within reasonable time', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const apiResponse = TestDataBuilder.createApiResponse();
      mockDependencies.apiClient.someMethod.mockResolvedValue(apiResponse);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'expected_tool_name',
          arguments: validInput,
        },
      };

      // Act
      const startTime = Date.now();
      const result = await tool.execute(request);
      const executionTime = Date.now() - startTime;

      // Assert
      TestAssertions.expectToolSuccess(result, expect.any(Object));
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent executions', async () => {
      // Arrange
      const validInput = TestDataBuilder.createValidToolInput();
      const apiResponse = TestDataBuilder.createApiResponse();
      mockDependencies.apiClient.someMethod.mockResolvedValue(apiResponse);

      const requests = Array(5)
        .fill(null)
        .map(() => ({
          method: 'tools/call' as const,
          params: {
            name: 'expected_tool_name',
            arguments: validInput,
          },
        }));

      // Act
      const results = await Promise.all(requests.map((request) => tool.execute(request)));

      // Assert
      results.forEach((result) => {
        TestAssertions.expectToolSuccess(result, expect.any(Object));
      });
    });
  });
});

/**
 * Template Usage Instructions:
 *
 * 1. Replace 'ToolUnderTest' with your actual tool class name
 * 2. Update tool name and description to match your tool's purpose
 * 3. Define the correct input schema for your tool's parameters
 * 4. Update mock dependencies to match your tool's requirements
 * 5. Add tool-specific test cases for your business logic
 * 6. Test all input validation rules and constraints
 * 7. Verify error handling for all possible failure scenarios
 * 8. Ensure output formatting matches MCP protocol requirements
 * 9. Test performance and concurrency characteristics
 * 10. Include edge cases specific to your tool's domain
 */
