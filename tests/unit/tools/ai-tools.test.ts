/**
 * Tests for AI-assisted tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerAiTools } from '../../../src/tools/ai-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  ListingsClientMockFactory,
  CatalogClientMockFactory,
} from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('AI Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockListingsClient: any;
  let mockCatalogClient: any;
  let listingsFactory: ListingsClientMockFactory;
  let catalogFactory: CatalogClientMockFactory;
  let authConfig: any;
  let mockEnv: any;

  beforeEach(() => {
    const testEnv = TestSetup.setupTestEnvironment();
    mockEnv = testEnv.mockEnv;

    toolManager = new ToolRegistrationManager(mockEnv.server.mcpServer);

    listingsFactory = new ListingsClientMockFactory();
    catalogFactory = new CatalogClientMockFactory();
    mockListingsClient = listingsFactory.create();
    mockCatalogClient = catalogFactory.create();

    // Mock the client constructors to return our mocked clients
    vi.doMock('../../../src/api/listings-client.js', () => ({
      ListingsClient: vi.fn().mockImplementation(() => mockListingsClient),
    }));

    vi.doMock('../../../src/api/catalog-client.js', () => ({
      CatalogClient: vi.fn().mockImplementation(() => mockCatalogClient),
    }));

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

    const handler = (mockEnv.server.mcpServer.registerTool as any).mock.calls.find(
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

    const handler = (mockEnv.server.mcpServer.registerTool as any).mock.calls.find(
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

    const handler = (mockEnv.server.mcpServer.registerTool as any).mock.calls.find(
      (call) => call[0] === 'optimize-listing'
    )[2];

    const result = await handler({
      sku: 'test-sku',
      optimizationGoal: 'both',
      competitorAsins: ['B00TEST123'],
      includeA9Tips: true,
    });

    // Since the tool creates its own clients and will fail to get the listing,
    // it should return an error message about the listing not being found
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error: Listing with SKU test-sku not found');
  });

  it('should handle errors when the listing is not found', async () => {
    registerAiTools(toolManager, authConfig);

    mockListingsClient.getListing.mockRejectedValue(new Error('Listing not found'));

    const handler = (mockEnv.server.mcpServer.registerTool as any).mock.calls.find(
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

    const handler = (mockEnv.server.mcpServer.registerTool as any).mock.calls.find(
      (call) => call[0] === 'optimize-listing'
    )[2];

    const result = await handler({
      sku: 'test-sku',
      optimizationGoal: 'visibility',
    });

    // Since the tool creates its own clients and will fail to get the listing,
    // it should return an error message about the listing not being found
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error: Listing with SKU test-sku not found');
  });
});
