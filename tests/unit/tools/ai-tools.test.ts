/**
 * Tests for AI-assisted tools
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { registerAiTools } from '../../../src/tools/ai-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  ListingsClientMockFactory,
  CatalogClientMockFactory,
  type MockListingsClient,
  type MockCatalogClient,
} from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import type { AuthConfig } from '../../../src/types/auth.js';

// Mock the API clients
vi.mock('../../../src/api/listings-client.js', () => ({
  ListingsClient: vi.fn(),
}));

vi.mock('../../../src/api/catalog-client.js', () => ({
  CatalogClient: vi.fn(),
}));

describe('AI Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockListingsClient: MockListingsClient;
  let mockCatalogClient: MockCatalogClient;
  let listingsFactory: ListingsClientMockFactory;
  let catalogFactory: CatalogClientMockFactory;
  let authConfig: AuthConfig;
  let mockEnv: AuthConfig;

  beforeEach(async () => {
    const testEnv = TestSetup.setupTestEnvironment();
    mockEnv = testEnv.mockEnv;

    toolManager = new ToolRegistrationManager(mockEnv.server.mcpServer);

    listingsFactory = new ListingsClientMockFactory();
    catalogFactory = new CatalogClientMockFactory();
    mockListingsClient = listingsFactory.create();
    mockCatalogClient = catalogFactory.create();

    // Mock the client constructors to return our mocked clients
    const { ListingsClient } = await import('../../../src/api/listings-client.js');
    const { CatalogClient } = await import('../../../src/api/catalog-client.js');

    vi.mocked(ListingsClient).mockImplementation(() => mockListingsClient);
    vi.mocked(CatalogClient).mockImplementation(() => mockCatalogClient);

    authConfig = TestDataBuilder.createAuthConfig();
  });

  it('should register the generate-product-description tool', () => {
    registerAiTools(toolManager, authConfig);

    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'generate-product-description',
      expect.objectContaining({
        title: 'Generate Product Description',
        description: 'Generate an optimized product description using AI',
      }),
      expect.any(Function)
    );
  });

  it('should register the optimize-listing tool', () => {
    registerAiTools(toolManager, authConfig);

    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'optimize-listing',
      expect.objectContaining({
        title: 'Optimize Amazon Listing',
        description: 'Analyze and optimize an existing Amazon listing',
      }),
      expect.any(Function)
    );
  });

  it('should generate optimized product descriptions for given product details', async () => {
    registerAiTools(toolManager, authConfig);

    const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
      (call) => call[0] === 'generate-product-description'
    )[2];

    const result = await handler({
      productTitle: 'Test Product',
      keyFeatures: ['Feature 1', 'Feature 2'],
      targetAudience: 'Test Audience',
      brandName: 'Test Brand',
      category: 'Test Category',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Product Description Generation Prompt');
    expect(result.content[0].text).toContain('Test Product');
    expect(result.content[0].text).toContain('Feature 1, Feature 2');
    expect(result.content[0].text).toContain(
      'Copy the above prompt and use it with your preferred AI assistant'
    );
  });

  it('should handle errors when generating a product description', async () => {
    registerAiTools(toolManager, authConfig);

    const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
      (call) => call[0] === 'generate-product-description'
    )[2];

    const result = await handler({
      productTitle: 'Test Product',
      keyFeatures: ['Feature 1', 'Feature 2'],
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Product Description Generation Prompt');
  });

  it('should retrieve the listing and call the LLM to optimize it', async () => {
    registerAiTools(toolManager, authConfig);

    // Mock successful listing retrieval
    const mockListing = {
      attributes: {
        title: 'Test Product',
        bullet_points: [],
        description: '',
        keywords: '',
      },
    };

    mockListingsClient.getListing.mockResolvedValue(mockListing);
    mockCatalogClient.getCatalogItem.mockResolvedValue({
      asin: 'B07N4M94KL',
      summaries: [{ itemName: 'N/A', brandName: 'N/A' }],
    });

    const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
      (call) => call[0] === 'optimize-listing'
    )[2];

    const result = await handler({
      sku: 'test-sku',
      optimizationGoal: 'both',
      competitorAsins: ['B00TEST123'],
      includeA9Tips: true,
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
  });

  it('should handle errors when the listing is not found', async () => {
    registerAiTools(toolManager, authConfig);

    mockListingsClient.getListing.mockRejectedValue(new Error('Listing not found'));

    const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
      (call) => call[0] === 'optimize-listing'
    )[2];

    const result = await handler({
      sku: 'test-sku',
      optimizationGoal: 'conversion',
    });

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
    registerAiTools(toolManager, authConfig);

    // Mock successful listing retrieval with empty attributes
    const mockListing = {
      attributes: {
        title: '',
        bullet_points: [],
        description: '',
        keywords: '',
      },
    };

    mockListingsClient.getListing.mockResolvedValue(mockListing);

    const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
      (call) => call[0] === 'optimize-listing'
    )[2];

    const result = await handler({
      sku: 'test-sku',
      optimizationGoal: 'visibility',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
  });

  describe('generate-product-description tool', () => {
    it('should generate prompt with all optional parameters', async () => {
      registerAiTools(toolManager, authConfig);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[2];

      const result = await handler({
        productTitle: 'Premium Wireless Headphones',
        keyFeatures: ['Noise Cancellation', 'Bluetooth 5.0', '30-hour battery'],
        targetAudience: 'Music enthusiasts and professionals',
        brandName: 'AudioTech',
        category: 'Electronics',
        competitiveAdvantages: ['Superior sound quality', 'Comfortable fit'],
        tone: 'professional',
        maxLength: 2000,
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Premium Wireless Headphones');
      expect(result.content[0].text).toContain(
        'Noise Cancellation, Bluetooth 5.0, 30-hour battery'
      );
      expect(result.content[0].text).toContain('Music enthusiasts and professionals');
      expect(result.content[0].text).toContain('AudioTech');
      expect(result.content[0].text).toContain('Electronics');
      expect(result.content[0].text).toContain('Superior sound quality, Comfortable fit');
      expect(result.content[0].text).toContain('professional');
      expect(result.content[0].text).toContain('2000 characters');
    });

    it('should generate prompt with minimal parameters', async () => {
      registerAiTools(toolManager, authConfig);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[2];

      const result = await handler({
        productTitle: 'Simple Product',
        keyFeatures: ['Feature 1'],
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Simple Product');
      expect(result.content[0].text).toContain('Feature 1');
      expect(result.content[0].text).toContain('professional tone'); // Default tone
    });

    it('should handle different tone options', async () => {
      registerAiTools(toolManager, authConfig);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[2];

      const tones = ['casual', 'enthusiastic', 'technical'];

      for (const tone of tones) {
        const result = await handler({
          productTitle: 'Test Product',
          keyFeatures: ['Feature 1'],
          tone,
        });

        expect(result.content[0].text).toContain(tone);
      }
    });

    it('should handle validation errors gracefully', async () => {
      registerAiTools(toolManager, authConfig);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'generate-product-description'
      )[2];

      const result = await handler({
        // Missing required fields
        keyFeatures: ['Feature 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error generating product description prompt');
    });
  });

  describe('optimize-listing tool', () => {
    it('should generate optimization prompt with competitor data', async () => {
      registerAiTools(toolManager, authConfig);

      // Mock successful listing retrieval
      const mockListing = {
        attributes: {
          title: 'Current Product Title',
          bullet_points: ['Point 1', 'Point 2'],
          description: 'Current description',
          keywords: ['keyword1', 'keyword2'],
        },
      };

      // Mock successful competitor data retrieval
      const mockCompetitorItem = {
        asin: 'B00TEST123',
        summaries: [
          {
            itemName: 'Competitor Product',
            brandName: 'Competitor Brand',
          },
        ],
      };

      // Mock the clients to return successful data
      mockListingsClient.getListing.mockResolvedValue(mockListing);
      mockCatalogClient.getCatalogItem.mockResolvedValue(mockCompetitorItem);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'both',
        competitorAsins: ['B00TEST123'],
        targetKeywords: ['target1', 'target2'],
        includeA9Tips: true,
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
      expect(result.content[0].text).toContain('Current Product Title');
      expect(result.content[0].text).toContain('Competitor Product');
      expect(result.content[0].text).toContain('target1, target2');
      expect(result.content[0].text).toContain('Amazon A9 algorithm optimization tips');
    });

    it('should handle string keywords format', async () => {
      registerAiTools(toolManager, authConfig);

      // Mock listing with string keywords instead of array
      const mockListing = {
        attributes: {
          title: 'Test Product',
          bullet_points: ['Feature 1'],
          description: 'Test description',
          keywords: 'keyword1,keyword2,keyword3',
        },
      };

      mockListingsClient.getListing.mockResolvedValue(mockListing);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'conversion',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
      expect(result.content[0].text).toContain('keyword1,keyword2,keyword3');
    });

    it('should handle competitor data retrieval errors', async () => {
      registerAiTools(toolManager, authConfig);

      // Mock successful listing but failed competitor retrieval
      const mockListing = {
        attributes: {
          title: 'Test Product',
          bullet_points: ['Feature 1'],
          description: 'Test description',
          keywords: ['keyword1'],
        },
      };

      mockListingsClient.getListing.mockResolvedValue(mockListing);
      mockCatalogClient.getCatalogItem.mockRejectedValue(new Error('Competitor not found'));

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'visibility',
        competitorAsins: ['B00INVALID'],
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
      expect(result.content[0].text).not.toContain('Competitor Products for Reference');
    });

    it('should handle missing listing attributes gracefully', async () => {
      registerAiTools(toolManager, authConfig);

      // Mock listing with missing attributes
      const mockListing = {
        attributes: {
          // Missing title, bullet_points, description, keywords
        },
      };

      mockListingsClient.getListing.mockResolvedValue(mockListing);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      const result = await handler({
        sku: 'test-sku',
        optimizationGoal: 'conversion',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
      expect(result.content[0].text).toContain('Current Title:');
      expect(result.content[0].text).toContain('Current Bullet Points:');
    });

    it('should handle validation errors for optimize-listing', async () => {
      registerAiTools(toolManager, authConfig);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      const result = await handler({
        // Missing required sku field
        optimizationGoal: 'conversion',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error optimizing listing');
    });

    it('should handle different optimization goals', async () => {
      registerAiTools(toolManager, authConfig);

      const handler = (mockEnv.server.mcpServer.registerTool as Mock).mock.calls.find(
        (call) => call[0] === 'optimize-listing'
      )[2];

      const goals = ['conversion', 'visibility', 'both'];

      for (const goal of goals) {
        // Mock successful listing retrieval for each goal
        const mockListing = {
          attributes: {
            title: '',
            bullet_points: [],
            description: '',
            keywords: '',
          },
        };

        mockListingsClient.getListing.mockResolvedValue(mockListing);

        const result = await handler({
          sku: 'test-sku',
          optimizationGoal: goal,
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Listing Optimization Analysis for SKU test-sku');
      }
    });
  });
});
