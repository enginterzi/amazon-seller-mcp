/**
 * Tests for the tool registration functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { z } from 'zod';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerTool: vi.fn(),
    })),
  };
});

describe('ToolRegistrationManager', () => {
  // Mock server
  const mockServer = {
    registerTool: vi.fn(),
  };

  let toolManager: ToolRegistrationManager;

  beforeEach(() => {
    // Create a new tool manager before each test
    toolManager = new ToolRegistrationManager(mockServer as any);

    // Clear mock calls
    vi.clearAllMocks();
  });

  it('should register a tool', async () => {
    const options = {
      title: 'Test Tool',
      description: 'A test tool',
      inputSchema: z.object({
        param1: z.string().describe('Parameter 1'),
        param2: z.number().optional().describe('Parameter 2'),
      }),
    };

    const handler = async (input: any) => ({
      content: [
        {
          type: 'text' as const,
          text: `Executed with param1: ${input.param1}`,
        },
      ],
    });

    const result = toolManager.registerTool('test-tool', options, handler);

    expect(result).toBe(true);
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'test-tool',
      options,
      expect.any(Function)
    );
    expect(toolManager.isToolRegistered('test-tool')).toBe(true);
    expect(toolManager.getRegisteredTools()).toContain('test-tool');
  });

  it('should not register the same tool twice', () => {
    const options = {
      title: 'Test Tool',
      description: 'A test tool',
      inputSchema: z.object({
        param: z.string(),
      }),
    };

    const handler = async (input: any) => ({
      content: [
        {
          type: 'text' as const,
          text: `Executed with param: ${input.param}`,
        },
      ],
    });

    // Register the tool first time
    const firstResult = toolManager.registerTool('test-tool', options, handler);
    expect(firstResult).toBe(true);
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);

    // Try to register the same tool again
    const secondResult = toolManager.registerTool('test-tool', options, handler);
    expect(secondResult).toBe(false);
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should handle tool handler errors', async () => {
    const options = {
      title: 'Error Tool',
      description: 'A tool that throws an error',
      inputSchema: z.object({
        param: z.string(),
      }),
    };

    const handler = async (input: any) => {
      throw new Error('Test error');
    };

    // Register the tool
    toolManager.registerTool('error-tool', options, handler);

    // Get the handler function that was passed to registerTool
    const registeredHandler = mockServer.registerTool.mock.calls[0][2];

    // Call the handler and expect it to return an error response
    const result = await registeredHandler({ param: 'test' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Test error');
  });
});
