/**
 * Tests for the Listings API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ListingsClient, PutListingParams } from '../../../src/api/listings-client.js';
import { ApiError } from '../../../src/types/api.js';
import { AuthConfig } from '../../../src/types/auth.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  create: vi.Mock;
  isAxiosError: vi.Mock;
};

// Mock axios.create return value
const mockAxiosInstance = {
  request: vi.fn(),
};

// Mock AmazonAuth
vi.mock('../../../src/auth/amazon-auth.js', () => {
  return {
    AmazonAuth: class MockAmazonAuth {
      getAccessToken = vi.fn().mockResolvedValue('mock-access-token');
      generateSecuredRequest = vi.fn().mockImplementation((request) => Promise.resolve(request));
    },
  };
});

describe('ListingsClient', () => {
  // Test auth config
  const authConfig: AuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    region: 'NA',
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup axios mock
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getListings', () => {
    it('should get all listings', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            listings: [
              {
                sku: 'test-sku-1',
                status: 'ACTIVE',
                identifiers: {
                  marketplaceId: 'ATVPDKIKX0DER',
                  sellerId: 'A1B2C3D4E5',
                },
              },
              {
                sku: 'test-sku-2',
                status: 'INACTIVE',
                identifiers: {
                  marketplaceId: 'ATVPDKIKX0DER',
                  sellerId: 'A1B2C3D4E5',
                },
              },
            ],
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method
      const result = await client.getListings();

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/listings/2021-08-01/items'),
        })
      );

      // Verify result
      expect(result).toEqual(mockResponse.data.payload);
      expect(result.listings).toHaveLength(2);
      expect(result.listings[0].sku).toBe('test-sku-1');
      expect(result.listings[1].sku).toBe('test-sku-2');
    });

    it('should get a specific listing by SKU', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            listings: [
              {
                sku: 'test-sku-1',
                status: 'ACTIVE',
                identifiers: {
                  marketplaceId: 'ATVPDKIKX0DER',
                  sellerId: 'A1B2C3D4E5',
                },
              },
            ],
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method
      const result = await client.getListings({ sku: 'test-sku-1' });

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/listings/2021-08-01/items'),
        })
      );

      // Verify query parameters
      expect(mockAxiosInstance.request.mock.calls[0][0].url).toContain('sku=test-sku-1');

      // Verify result
      expect(result).toEqual(mockResponse.data.payload);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].sku).toBe('test-sku-1');
    });

    it('should handle pagination', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            listings: [
              {
                sku: 'test-sku-3',
                status: 'ACTIVE',
                identifiers: {
                  marketplaceId: 'ATVPDKIKX0DER',
                  sellerId: 'A1B2C3D4E5',
                },
              },
            ],
            nextToken: 'next-page-token',
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method
      const result = await client.getListings({ pageSize: 1 });

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/listings/2021-08-01/items'),
        })
      );

      // Verify query parameters
      expect(mockAxiosInstance.request.mock.calls[0][0].url).toContain('pageSize=1');

      // Verify result
      expect(result).toEqual(mockResponse.data.payload);
      expect(result.listings).toHaveLength(1);
      expect(result.nextToken).toBe('next-page-token');
    });
  });

  describe('getListing', () => {
    it('should get a single listing by SKU', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            listings: [
              {
                sku: 'test-sku-1',
                status: 'ACTIVE',
                identifiers: {
                  marketplaceId: 'ATVPDKIKX0DER',
                  sellerId: 'A1B2C3D4E5',
                },
              },
            ],
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method
      const result = await client.getListing('test-sku-1');

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/listings/2021-08-01/items'),
        })
      );

      // Verify query parameters
      expect(mockAxiosInstance.request.mock.calls[0][0].url).toContain('sku=test-sku-1');

      // Verify result
      expect(result).toEqual(mockResponse.data.payload.listings[0]);
      expect(result.sku).toBe('test-sku-1');
    });

    it('should throw an error if listing is not found', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            listings: [],
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method and expect error
      await expect(client.getListing('non-existent-sku')).rejects.toThrow(
        'Listing with SKU non-existent-sku not found'
      );
    });
  });

  describe('putListing', () => {
    it('should create or update a listing', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            submissionId: 'test-submission-id',
            status: 'ACCEPTED',
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Create listing params
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

      // Call method
      const result = await client.putListing(listingParams);

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: expect.stringContaining('/listings/2021-08-01/items/test-sku-1'),
          data: expect.objectContaining({
            productType: 'PRODUCT',
            attributes: expect.any(Object),
          }),
        })
      );

      // Verify result
      expect(result).toEqual(mockResponse.data.payload);
      expect(result.submissionId).toBe('test-submission-id');
      expect(result.status).toBe('ACCEPTED');
    });

    it('should validate listing data before submission', async () => {
      // Create client
      const client = new ListingsClient(authConfig);

      // Create invalid listing params (missing required fields)
      const invalidListingParams = {
        sku: 'test-sku-1',
        productType: '', // Invalid: empty string
        attributes: {}, // Invalid: empty object
      } as PutListingParams;

      // Call method and expect validation error
      await expect(client.putListing(invalidListingParams)).rejects.toThrow(
        'Listing validation failed'
      );

      // Verify that no request was made
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });
  });

  describe('deleteListing', () => {
    it('should delete a listing', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            submissionId: 'test-submission-id',
            status: 'ACCEPTED',
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method
      const result = await client.deleteListing({ sku: 'test-sku-1' });

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: expect.stringContaining('/listings/2021-08-01/items/test-sku-1'),
        })
      );

      // Verify result
      expect(result).toEqual(mockResponse.data.payload);
      expect(result.submissionId).toBe('test-submission-id');
      expect(result.status).toBe('ACCEPTED');
    });

    it('should include issue locale if provided', async () => {
      // Mock response
      const mockResponse = {
        status: 200,
        headers: {},
        data: {
          payload: {
            submissionId: 'test-submission-id',
            status: 'ACCEPTED',
          },
        },
      };

      // Setup mock
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method
      const result = await client.deleteListing({
        sku: 'test-sku-1',
        issueLocale: 'en_US',
      });

      // Verify request
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: expect.stringContaining('/listings/2021-08-01/items/test-sku-1'),
        })
      );

      // Verify query parameters
      expect(mockAxiosInstance.request.mock.calls[0][0].url).toContain('issueLocale=en_US');

      // Verify result
      expect(result).toEqual(mockResponse.data.payload);
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      // Mock error response
      const mockErrorResponse = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                code: 'INVALID_INPUT',
                message: 'Invalid input',
              },
            ],
          },
          headers: {},
        },
        message: 'Request failed with status code 400',
      };

      // Setup mock to throw error
      mockAxiosInstance.request.mockRejectedValueOnce(mockErrorResponse);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      // Create client
      const client = new ListingsClient(authConfig);

      // Call method and expect error
      await expect(client.getListings()).rejects.toBeInstanceOf(ApiError);
    });
  });
});
