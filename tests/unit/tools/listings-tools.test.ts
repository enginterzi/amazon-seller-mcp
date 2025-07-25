/**
 * Tests for listings tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerListingsTools } from '../../../src/tools/listings-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { ListingsClient } from '../../../src/api/listings-client.js';

// Mock the listings client
vi.mock('../../../src/api/listings-client.js', () => {
  return {
    ListingsClient: vi.fn().mockImplementation(() => ({
      getListing: vi.fn(),
      putListing: vi.fn(),
      deleteListing: vi.fn(),
    })),
  };
});

describe('Listings Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockListingsClient: any;
  let authConfig: any;

  beforeEach(() => {
    // Create a mock MCP server
    const mockServer = {
      registerTool: vi.fn(),
    };

    // Create a new tool manager
    toolManager = new ToolRegistrationManager(mockServer as any);

    // Create a spy for the tool registration
    vi.spyOn(toolManager, 'registerTool');

    // Reset the mock listings client
    mockListingsClient = {
      getListing: vi.fn(),
      putListing: vi.fn(),
      deleteListing: vi.fn(),
    };

    // Reset the ListingsClient mock
    (ListingsClient as any).mockImplementation(() => mockListingsClient);

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

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should register listings tools', () => {
    // Register listings tools
    registerListingsTools(toolManager, authConfig);

    // Verify that the tools were registered
    expect(toolManager.registerTool).toHaveBeenCalledTimes(3);
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'create-listing',
      expect.objectContaining({
        title: 'Create Amazon Listing',
        description: 'Create a new product listing on Amazon',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'update-listing',
      expect.objectContaining({
        title: 'Update Amazon Listing',
        description: 'Update an existing product listing on Amazon',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'delete-listing',
      expect.objectContaining({
        title: 'Delete Amazon Listing',
        description: 'Delete a product listing from Amazon',
      }),
      expect.any(Function)
    );
  });

  describe('create-listing tool', () => {
    it('should handle create listing tool execution', async () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the put listing response
      mockListingsClient.putListing.mockResolvedValue({
        submissionId: 'test-submission-id',
        status: 'ACCEPTED',
      });

      // Get the create listing tool handler
      const createListingHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
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

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing creation submitted for SKU: TEST-SKU-1');
      expect(result.content[0].text).toContain('Submission ID: test-submission-id');
      expect(result.content[0].text).toContain('Status: ACCEPTED');
      expect(result.content[0].text).toContain('The listing was accepted without issues');
      expect(result.content[0].text).toContain(
        'Resource URI: amazon-listings://SELLER_ID/TEST-SKU-1'
      );

      // Verify that the listings client was called with the correct parameters
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
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the put listing response with issues
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

      // Get the create listing tool handler
      const createListingHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await createListingHandler({
        sku: 'TEST-SKU-1',
        productType: 'SHOES',
        attributes: {
          title: 'Test Product',
          brand: '',
          description: 'Test description',
        },
      });

      // Verify the result
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
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the put listing error
      mockListingsClient.putListing.mockRejectedValue(new Error('API error'));

      // Get the create listing tool handler
      const createListingHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await createListingHandler({
        sku: 'TEST-SKU-1',
        productType: 'SHOES',
        attributes: {
          title: 'Test Product',
        },
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating listing: API error');
    });
  });

  describe('update-listing tool', () => {
    it('should handle update listing tool execution', async () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the get listing response
      mockListingsClient.getListing.mockResolvedValue({
        sku: 'TEST-SKU-1',
        attributes: {
          title: 'Old Product Title',
        },
      });

      // Mock the put listing response
      mockListingsClient.putListing.mockResolvedValue({
        submissionId: 'test-submission-id',
        status: 'ACCEPTED',
      });

      // Get the update listing tool handler
      const updateListingHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateListingHandler({
        sku: 'TEST-SKU-1',
        productType: 'SHOES',
        attributes: {
          title: 'Updated Product Title',
          description: 'Updated description',
        },
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing update submitted for SKU: TEST-SKU-1');
      expect(result.content[0].text).toContain('Submission ID: test-submission-id');
      expect(result.content[0].text).toContain('Status: ACCEPTED');
      expect(result.content[0].text).toContain('The listing update was accepted without issues');
      expect(result.content[0].text).toContain(
        'Resource URI: amazon-listings://SELLER_ID/TEST-SKU-1'
      );

      // Verify that the listings client was called with the correct parameters
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
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the get listing error
      mockListingsClient.getListing.mockRejectedValue(new Error('Listing not found'));

      // Get the update listing tool handler
      const updateListingHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateListingHandler({
        sku: 'TEST-SKU-1',
        productType: 'SHOES',
        attributes: {
          title: 'Updated Product Title',
        },
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: Listing with SKU TEST-SKU-1 not found. Cannot update a non-existent listing.'
      );

      // Verify that the listings client was called with the correct parameters
      expect(mockListingsClient.getListing).toHaveBeenCalledWith('TEST-SKU-1');
      expect(mockListingsClient.putListing).not.toHaveBeenCalled();
    });

    it('should handle errors when updating a listing', async () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the get listing response
      mockListingsClient.getListing.mockResolvedValue({
        sku: 'TEST-SKU-1',
        attributes: {
          title: 'Old Product Title',
        },
      });

      // Mock the put listing error
      mockListingsClient.putListing.mockRejectedValue(new Error('API error'));

      // Get the update listing tool handler
      const updateListingHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateListingHandler({
        sku: 'TEST-SKU-1',
        productType: 'SHOES',
        attributes: {
          title: 'Updated Product Title',
        },
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error updating listing: API error');
    });
  });

  describe('delete-listing tool', () => {
    it('should handle delete listing tool execution', async () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the delete listing response
      mockListingsClient.deleteListing.mockResolvedValue({
        submissionId: 'test-submission-id',
        status: 'ACCEPTED',
      });

      // Get the delete listing tool handler
      const deleteListingHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await deleteListingHandler({
        sku: 'TEST-SKU-1',
        issueLocale: 'en_US',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Listing deletion submitted for SKU: TEST-SKU-1');
      expect(result.content[0].text).toContain('Submission ID: test-submission-id');
      expect(result.content[0].text).toContain('Status: ACCEPTED');
      expect(result.content[0].text).toContain('The listing was successfully deleted');

      // Verify that the listings client was called with the correct parameters
      expect(mockListingsClient.deleteListing).toHaveBeenCalledWith({
        sku: 'TEST-SKU-1',
        issueLocale: 'en_US',
      });
    });

    it('should handle delete listing with issues', async () => {
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the delete listing response with issues
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

      // Get the delete listing tool handler
      const deleteListingHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await deleteListingHandler({
        sku: 'TEST-SKU-1',
      });

      // Verify the result
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
      // Register listings tools
      registerListingsTools(toolManager, authConfig);

      // Mock the delete listing error
      mockListingsClient.deleteListing.mockRejectedValue(new Error('API error'));

      // Get the delete listing tool handler
      const deleteListingHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
      const result = await deleteListingHandler({
        sku: 'TEST-SKU-1',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error deleting listing: API error');
    });
  });
});
