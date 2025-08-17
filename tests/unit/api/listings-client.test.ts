/**
 * Tests for the Listings API client
 */

import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { ListingsClient, PutListingParams } from '../../../src/api/listings-client.js';

// Type for accessing private methods in tests
type ListingsClientWithPrivates = ListingsClient & {
  request: MockListingsClient['request'];
  clearCache: () => void;
};
import {
  ListingsClientMockFactory,
  type MockListingsClient,
} from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('ListingsClient', () => {
  let listingsClient: ListingsClient;
  let mockFactory: ListingsClientMockFactory;
  let mockClient: MockListingsClient;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();
    listingsClient = new ListingsClient(authConfig);

    mockFactory = new ListingsClientMockFactory();
    mockClient = mockFactory.create();

    // Replace the client's request method with our mock
    (listingsClient as ListingsClientWithPrivates).request = mockClient.request;

    // Clear the cache to ensure clean state
    (listingsClient as ListingsClientWithPrivates).clearCache();
  });

  it('should retrieve all listings successfully', async () => {
    const expectedListings = [
      TestDataBuilder.createListing({ sku: 'test-sku-1', status: 'ACTIVE' }),
      TestDataBuilder.createListing({ sku: 'test-sku-2', status: 'INACTIVE' }),
    ];

    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockFactory.mockGetListings(mockClient, expectedListings);

    const result = await listingsClient.getListings();

    expect(result.listings).toHaveLength(2);
    TestAssertions.expectValidListing(result.listings[0], 'test-sku-1');
    TestAssertions.expectValidListing(result.listings[1], 'test-sku-2');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/listings/2021-08-01/items'),
    });
  });

  it('should retrieve specific listing by SKU successfully', async () => {
    const expectedListings = [
      TestDataBuilder.createListing({ sku: 'test-sku-1', status: 'ACTIVE' }),
    ];

    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockFactory.mockGetListings(mockClient, expectedListings);

    const result = await listingsClient.getListings({ sku: 'test-sku-1' });

    expect(result.listings).toHaveLength(1);
    TestAssertions.expectValidListing(result.listings[0], 'test-sku-1');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/listings/2021-08-01/items'),
      query: expect.objectContaining({ sku: 'test-sku-1' }),
    });
  });

  it('should handle pagination correctly', async () => {
    const expectedListings = [
      TestDataBuilder.createListing({ sku: 'test-sku-3', status: 'ACTIVE' }),
    ];

    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockFactory.mockGetListings(mockClient, expectedListings, { nextToken: 'next-page-token' });

    const result = await listingsClient.getListings({ pageSize: 1 });

    expect(result.listings).toHaveLength(1);
    expect(result.nextToken).toBe('next-page-token');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/listings/2021-08-01/items'),
      query: expect.objectContaining({ pageSize: 1 }),
    });
  });

  it('should retrieve single listing by SKU successfully', async () => {
    const expectedListing = TestDataBuilder.createListing({
      sku: 'test-sku-1',
      status: 'ACTIVE',
    });

    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockFactory.mockGetListings(mockClient, [expectedListing]);

    const result = await listingsClient.getListing('test-sku-1');

    TestAssertions.expectValidListing(result, 'test-sku-1');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/listings/2021-08-01/items'),
      query: expect.objectContaining({ sku: 'test-sku-1' }),
    });
  });

  it('should handle listing not found error', async () => {
    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockFactory.mockGetListings(mockClient, []); // Empty listings array

    await expect(listingsClient.getListing('non-existent-sku')).rejects.toThrow(
      'Listing with SKU non-existent-sku not found'
    );

    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/listings/2021-08-01/items'),
      query: expect.objectContaining({ sku: 'non-existent-sku' }),
    });
  });

  it('should create or update listing successfully', async () => {
    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockFactory.mockPutListing(mockClient, 'test-submission-id');

    const listingParams: PutListingParams = {
      sku: 'test-sku-1',
      productType: 'PRODUCT',
      attributes: {
        title: 'Test Product',
        brand: 'Test Brand',
        description: 'This is a test product',
      },
      fulfillmentAvailability: [
        {
          fulfillmentChannelCode: 'AMAZON',
          quantity: 10,
        },
      ],
    };

    const result = await listingsClient.putListing(listingParams);

    expect(result.submissionId).toBe('test-submission-id');
    expect(result.status).toBe('ACCEPTED');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'PUT',
      path: expect.stringContaining('/listings/2021-08-01/items/test-sku-1'),
      data: expect.objectContaining({
        productType: 'PRODUCT',
        attributes: expect.objectContaining({
          title: 'Test Product',
          brand: 'Test Brand',
        }),
      }),
    });
  });

  it('should handle listing validation errors', async () => {
    const validationError = TestDataBuilder.createApiError('VALIDATION_ERROR', {
      message: 'Listing validation failed',
      statusCode: 400,
    });

    mockClient.putListing.mockRejectedValue(validationError);

    const invalidListingParams = {
      sku: 'test-sku-1',
      productType: '', // Invalid: empty string
      attributes: {}, // Invalid: empty object
    } as PutListingParams;

    await expect(listingsClient.putListing(invalidListingParams)).rejects.toThrow(
      'Listing validation failed'
    );
  });

  it('should delete listing successfully', async () => {
    const expectedResult = {
      submissionId: 'test-submission-id',
      status: 'ACCEPTED',
    };

    mockClient.request.mockResolvedValue({
      data: { payload: expectedResult },
      statusCode: 200,
      headers: {},
    });

    const result = await listingsClient.deleteListing({ sku: 'test-sku-1' });

    expect(result.submissionId).toBe('test-submission-id');
    expect(result.status).toBe('ACCEPTED');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'DELETE',
      path: expect.stringContaining('/listings/2021-08-01/items/test-sku-1'),
    });
  });

  it('should include issue locale when deleting listing', async () => {
    const expectedResult = {
      submissionId: 'test-submission-id',
      status: 'ACCEPTED',
    };

    mockClient.request.mockResolvedValue({
      data: { payload: expectedResult },
      statusCode: 200,
      headers: {},
    });

    const result = await listingsClient.deleteListing({
      sku: 'test-sku-1',
      issueLocale: 'en_US',
    });

    expect(result.submissionId).toBe('test-submission-id');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'DELETE',
      path: expect.stringContaining('/listings/2021-08-01/items/test-sku-1'),
      query: expect.objectContaining({ issueLocale: 'en_US' }),
    });
  });

  it('should handle API errors gracefully', async () => {
    const apiError = TestDataBuilder.createApiError('INVALID_INPUT', {
      message: 'Invalid input',
      statusCode: 400,
    });

    // Reset the mock first to clear any previous setup
    mockClient.request.mockReset();
    mockClient.request.mockRejectedValue(apiError);

    await expect(listingsClient.getListings()).rejects.toThrow('Invalid input');

    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: expect.stringContaining('/listings/2021-08-01/items'),
    });
  });
});
