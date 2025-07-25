/**
 * Tests for AI-assisted tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerAiTools } from '../../../src/tools/ai-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { ListingsClient } from '../../../src/api/listings-client.js';
import { CatalogClient } from '../../../src/api/catalog-client.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the MCP server
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      registerTool: vi.fn(),
      createMessage: vi.fn().mockResolvedValue({
        content: {
          type: 'text',
          text: 'Generated content from LLM',
        },
      }),
    })),
  };
});

// Create mock functions for the clients
const mockGetListing = vi.fn().mockResolvedValue({
  sku: 'test-sku',
  attributes: {
    title: 'Test Product',
    bullet_points: ['Feature 1', 'Feature 2'],
    description: 'Test description',
    keywords: ['keyword1', 'keyword2'],
  },
});

const mockGetCatalogItem = vi.fn().mockResolvedValue({
  asin: 'B00TEST123',
  attributes: {
    title: 'Competitor Product',
    bullet_points: ['Comp Feature 1', 'Comp Feature 2'],
  },
});

// Mock the listings client
vi.mock('../../../src/api/listings-client.js', () => {
  return {
    ListingsClient: vi.fn().mockImplementation(() => ({
      getListing: mockGetListing,
    })),
  };
});

// Mock the catalog client
vi.mock('../../../src/api/catalog-client.js', () => {
  return {
    CatalogClient: vi.fn().mockImplementation(() => ({
      getCatalogItem: mockGetCatalogItem,
    })),
  };
});

describe('AI Tools', () => {
  let toolManager: ToolRegistrationManager;
  let server: McpServer;
  let authConfig: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a mock tool manager
    toolManager = {
      registerTool: vi.fn(),
      getRegisteredTools: vi.fn().mockReturnValue([]),
      isToolRegistered: vi.fn().mockReturnValue(false),
    } as unknown as ToolRegistrationManager;

    // Create a mock server
    server = new McpServer();

    // Create mock auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    };
  });

  describe('registerAiTools', () => {
    it('should register the generate-product-description tool', () => {
      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Check if the tool was registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'generate-product-description',
        expect.objectContaining({
          title: 'Generate Product Description',
          description: 'Generate an optimized product description using AI',
        }),
        expect.any(Function)
      );
    });

    it('should register the optimize-listing tool', () => {
      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Check if the tool was registered
      expect(toolManager.registerTool).toHaveBeenCalledWith(
        'optimize-listing',
        expect.objectContaining({
          title: 'Optimize Amazon Listing',
          description: 'Analyze and optimize an existing Amazon listing',
        }),
        expect.any(Function)
      );
    });
  });

  describe('generate-product-description tool', () => {
    it('should call the LLM to generate a product description', async () => {
      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Get the handler function
      const handler = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[2];

      // Call the handler
      const result = await handler({
        productTitle: 'Test Product',
        keyFeatures: ['Feature 1', 'Feature 2'],
        targetAudience: 'Test Audience',
        brandName: 'Test Brand',
        category: 'Test Category',
      });

      // Check if the LLM was called
      expect(server.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Test Product'),
              }),
            }),
          ]),
        })
      );

      // Check the result
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Generated Product Description:\n\nGenerated content from LLM',
          },
        ],
      });
    });

    it('should handle errors when generating a product description', async () => {
      // Mock the server to throw an error
      (server.createMessage as any).mockRejectedValueOnce(new Error('Test error'));

      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Get the handler function
      const handler = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[2];

      // Call the handler
      const result = await handler({
        productTitle: 'Test Product',
        keyFeatures: ['Feature 1', 'Feature 2'],
      });

      // Check the result
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error generating product description: Test error',
          },
        ],
        isError: true,
      });
    });
  });

  describe('optimize-listing tool', () => {
    it('should retrieve the listing and call the LLM to optimize it', async () => {
      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Get the handler function
      const handler = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      // Call the handler
      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'both',
        competitorAsins: ['B00TEST123'],
        includeA9Tips: true,
      });

      // Check if the listing was retrieved
      expect(mockGetListing).toHaveBeenCalledWith('test-sku');

      // Check if the competitor data was retrieved
      expect(mockGetCatalogItem).toHaveBeenCalledWith('B00TEST123');

      // Check if the LLM was called
      expect(server.createMessage).toHaveBeenCalled();

      // Verify the call contains the expected data
      const createMessageCall = (server.createMessage as any).mock.calls[0][0];
      expect(createMessageCall).toHaveProperty('messages');
      expect(createMessageCall.messages[0]).toHaveProperty('role', 'user');
      expect(createMessageCall.messages[0].content).toHaveProperty('type', 'text');
      expect(createMessageCall.messages[0].content.text).toContain('Current Title: Test Product');

      // Check the result
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Listing Optimization Analysis for SKU test-sku:\n\nGenerated content from LLM',
          },
        ],
      });
    });

    it('should handle errors when the listing is not found', async () => {
      // Mock the listings client to throw an error
      mockGetListing.mockRejectedValueOnce(new Error('Listing not found'));

      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Get the handler function
      const handler = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      // Call the handler
      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'conversion',
      });

      // Check the result
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Listing with SKU test-sku not found. Cannot optimize a non-existent listing.',
          },
        ],
        isError: true,
      });
    });

    it('should handle errors when optimizing a listing', async () => {
      // Mock the server to throw an error
      (server.createMessage as any).mockRejectedValueOnce(new Error('Test error'));

      // Register AI tools
      registerAiTools(toolManager, authConfig, server);

      // Get the handler function
      const handler = (toolManager.registerTool as any).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      // Call the handler
      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'visibility',
      });

      // Check the result
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error optimizing listing: Test error',
          },
        ],
        isError: true,
      });
    });
  });
});
