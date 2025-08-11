/**
 * Tests for listings tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerListingsTools } from '../../../src/tools/listings-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  ListingsClientMockFactory,
  type MockListingsClient,
} from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';
import type { AuthConfig } from '../../../src/types/auth.js';

describe('Listings Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockListingsClient: MockListingsClient;
  let listingsFactory: ListingsClientMockFactory;
  let authConfig: AuthConfig;
  let mockEnv: AuthConfig;

  beforeEach(() => {
    const testEnv = TestSetup.setupTestEnvironment();
    mockEnv = testEnv.mockEnv;

    toolManager = new ToolRegistrationManager(mockEnv.server.mcpServer);
    listingsFactory = new ListingsClientMockFactory();
    mockListingsClient = listingsFactory.create();
    authConfig = TestDataBuilder.createAuthConfig();
  });

  it('should register listings tools', () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'create-listing',
      expect.objectContaining({
        title: 'Create Amazon Listing',
        description: 'Create a new product listing on Amazon',
      }),
      expect.any(Function)
    );
    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'update-listing',
      expect.objectContaining({
        title: 'Update Amazon Listing',
        description: 'Update an existing product listing on Amazon',
      }),
      expect.any(Function)
    );
    expect(mockEnv.server.mcpServer.registerTool).toHaveBeenCalledWith(
      'delete-listing',
      expect.objectContaining({
        title: 'Delete Amazon Listing',
        description: 'Delete a product listing from Amazon',
      }),
      expect.any(Function)
    );
  });

  it('should handle create listing tool execution', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    listingsFactory.mockPutListing(mockListingsClient, 'test-submission-id');

    const createListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[0][2];
    const result = await createListingHandler({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Test Product',
        brand: 'Test Brand',
        description: 'Test description',
      },
      fulfillmentAvailability: [
        {
          fulfillmentChannelCode: 'AMAZON',
          quantity: 10,
        },
      ],
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing creation submitted for SKU: TEST-SKU-1');
    expect(result.content[0].text).toContain('Submission ID: test-submission-id');
    expect(result.content[0].text).toContain('Status: ACCEPTED');
    expect(result.content[0].text).toContain('The listing was accepted without issues');
    expect(result.content[0].text).toContain(
      'Resource URI: amazon-listings://SELLER_ID/TEST-SKU-1'
    );

    expect(mockListingsClient.putListing).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Test Product',
        brand: 'Test Brand',
        description: 'Test description',
      },
      requirements: undefined,
      fulfillmentAvailability: [
        {
          fulfillmentChannelCode: 'AMAZON',
          quantity: 10,
        },
      ],
    });
  });

  it('should handle create listing with issues', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    mockListingsClient.putListing.mockResolvedValue({
      submissionId: 'test-submission-id',
      status: 'ACCEPTED_WITH_WARNINGS',
      issues: [
        {
          code: 'MISSING_RECOMMENDED_ATTRIBUTE',
          message: 'Missing recommended attribute: color',
          severity: 'WARNING',
          attributeNames: ['color'],
        },
        {
          code: 'INVALID_ATTRIBUTE_VALUE',
          message: 'Invalid value for attribute: brand',
          severity: 'ERROR',
          attributeNames: ['brand'],
        },
      ],
    });

    const createListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[0][2];
    const result = await createListingHandler({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Test Product',
        brand: '',
        description: 'Test description',
      },
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing creation submitted for SKU: TEST-SKU-1');
    expect(result.content[0].text).toContain('Submission ID: test-submission-id');
    expect(result.content[0].text).toContain('Status: ACCEPTED_WITH_WARNINGS');
    expect(result.content[0].text).toContain('Issues:');
    expect(result.content[0].text).toContain(
      '[WARNING] MISSING_RECOMMENDED_ATTRIBUTE: Missing recommended attribute: color'
    );
    expect(result.content[0].text).toContain('Affected attributes: color');
    expect(result.content[0].text).toContain(
      '[ERROR] INVALID_ATTRIBUTE_VALUE: Invalid value for attribute: brand'
    );
    expect(result.content[0].text).toContain('Affected attributes: brand');
  });

  it('should handle errors when creating a listing', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    mockListingsClient.putListing.mockRejectedValue(new Error('API error'));

    const createListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[0][2];
    const result = await createListingHandler({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Test Product',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error creating listing: API error');
  });

  it('should handle update listing tool execution', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    listingsFactory.mockGetListing(mockListingsClient, 'TEST-SKU-1', {
      sku: 'TEST-SKU-1',
      attributes: {
        title: 'Old Product Title',
      },
    });

    listingsFactory.mockPutListing(mockListingsClient, 'test-submission-id');

    const updateListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[1][2];
    const result = await updateListingHandler({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Updated Product Title',
        description: 'Updated description',
      },
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing update submitted for SKU: TEST-SKU-1');
    expect(result.content[0].text).toContain('Submission ID: test-submission-id');
    expect(result.content[0].text).toContain('Status: ACCEPTED');
    expect(result.content[0].text).toContain('The listing update was accepted without issues');
    expect(result.content[0].text).toContain(
      'Resource URI: amazon-listings://SELLER_ID/TEST-SKU-1'
    );

    expect(mockListingsClient.getListing).toHaveBeenCalledWith('TEST-SKU-1');
    expect(mockListingsClient.putListing).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Updated Product Title',
        description: 'Updated description',
      },
      requirements: undefined,
      fulfillmentAvailability: undefined,
    });
  });

  it('should handle listing not found when updating', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    mockListingsClient.getListing.mockRejectedValue(new Error('Listing not found'));

    const updateListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[1][2];
    const result = await updateListingHandler({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Updated Product Title',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Error: Listing with SKU TEST-SKU-1 not found. Cannot update a non-existent listing.'
    );

    expect(mockListingsClient.getListing).toHaveBeenCalledWith('TEST-SKU-1');
    expect(mockListingsClient.putListing).not.toHaveBeenCalled();
  });

  it('should handle errors when updating a listing', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    listingsFactory.mockGetListing(mockListingsClient, 'TEST-SKU-1', {
      sku: 'TEST-SKU-1',
      attributes: {
        title: 'Old Product Title',
      },
    });

    mockListingsClient.putListing.mockRejectedValue(new Error('API error'));

    const updateListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[1][2];
    const result = await updateListingHandler({
      sku: 'TEST-SKU-1',
      productType: 'SHOES',
      attributes: {
        title: 'Updated Product Title',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error updating listing: API error');
  });

  it('should handle delete listing tool execution', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    mockListingsClient.deleteListing.mockResolvedValue({
      submissionId: 'test-submission-id',
      status: 'ACCEPTED',
    });

    const deleteListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[2][2];
    const result = await deleteListingHandler({
      sku: 'TEST-SKU-1',
      issueLocale: 'en_US',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing deletion submitted for SKU: TEST-SKU-1');
    expect(result.content[0].text).toContain('Submission ID: test-submission-id');
    expect(result.content[0].text).toContain('Status: ACCEPTED');
    expect(result.content[0].text).toContain('The listing was successfully deleted');

    expect(mockListingsClient.deleteListing).toHaveBeenCalledWith({
      sku: 'TEST-SKU-1',
      issueLocale: 'en_US',
    });
  });

  it('should handle delete listing with issues', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    mockListingsClient.deleteListing.mockResolvedValue({
      submissionId: 'test-submission-id',
      status: 'REJECTED',
      issues: [
        {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found for SKU: TEST-SKU-1',
          severity: 'ERROR',
        },
      ],
    });

    const deleteListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[2][2];
    const result = await deleteListingHandler({
      sku: 'TEST-SKU-1',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Listing deletion submitted for SKU: TEST-SKU-1');
    expect(result.content[0].text).toContain('Submission ID: test-submission-id');
    expect(result.content[0].text).toContain('Status: REJECTED');
    expect(result.content[0].text).toContain('Issues:');
    expect(result.content[0].text).toContain(
      '[ERROR] LISTING_NOT_FOUND: Listing not found for SKU: TEST-SKU-1'
    );
  });

  it('should handle errors when deleting a listing', async () => {
    registerListingsTools(toolManager, authConfig, mockListingsClient);

    mockListingsClient.deleteListing.mockRejectedValue(new Error('API error'));

    const deleteListingHandler = (mockEnv.server.mcpServer.registerTool as any).mock.calls[2][2];
    const result = await deleteListingHandler({
      sku: 'TEST-SKU-1',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error deleting listing: API error');
  });
});
