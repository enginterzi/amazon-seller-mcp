/**
 * Tests for the tool registration functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { z } from 'zod';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import type { MockEnvironment } from '../../utils/test-setup.js';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerTool: vi.fn(),
    })),
  };
});

describe('ToolRegistrationManager', () => {
  let toolManager: ToolRegistrationManager;
  let mockEnv: MockEnvironment;
  let mockServer: any;

  beforeEach(() => {
    mockEnv = TestSetup.setupMockEnvironment();
    mockServer = {
      registerTool: vi.fn(),
    };
    toolManager = new ToolRegistrationManager(mockServer);
  });

  afterEach(() => {
    TestSetup.cleanupMockEnvironment();
  });

  it('should register a tool successfully', async () => {
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

  it('should prevent duplicate tool registration', () => {
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

    const firstResult = toolManager.registerTool('test-tool', options, handler);
    expect(firstResult).toBe(true);
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);

    const secondResult = toolManager.registerTool('test-tool', options, handler);
    expect(secondResult).toBe(false);
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
  });

  it('should handle tool execution errors gracefully', async () => {
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

    toolManager.registerTool('error-tool', options, handler);

    const registeredHandler = mockServer.registerTool.mock.calls[0][2];
    const result = await registeredHandler({ param: 'test' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Test error');
  });
});
