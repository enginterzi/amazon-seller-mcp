/**
 * Tests for the Catalog API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogClient } from '../../../src/api/catalog-client.js';
import { AmazonRegion } from '../../../src/types/auth.js';

// Mock axios
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        request: vi.fn().mockResolvedValue({
          status: 200,
          data: {
            payload: {
              asin: 'B01EXAMPLE',
              summaries: [
                {
                  marketplaceId: 'ATVPDKIKX0DER',
                  itemName: 'Example Product',
                },
              ],
            },
          },
          headers: {},
        }),
      })),
      isAxiosError: vi.fn().mockReturnValue(false),
    },
  };
});

// Mock AmazonAuth
vi.mock('../../../src/auth/amazon-auth.js', () => {
  return {
    AmazonAuth: vi.fn().mockImplementation(() => {
      return {
        getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
        generateSecuredRequest: vi.fn().mockImplementation((request) => {
          return {
            ...request,
            headers: {
              ...request.headers,
              'x-amz-date': '20220101T000000Z',
              Authorization: 'AWS4-HMAC-SHA256 Credential=mock-credential',
            },
          };
        }),
      };
    }),
  };
});

describe('CatalogClient', () => {
  let catalogClient: CatalogClient;

  const mockAuthConfig = {
    credentials: {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      refreshToken: 'mock-refresh-token',
    },
    region: AmazonRegion.NA,
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  };

  beforeEach(() => {
    // Create a new CatalogClient instance before each test
    catalogClient = new CatalogClient(mockAuthConfig);

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('getCatalogItem', () => {
    it('should get a catalog item by ASIN', async () => {
      const result = await catalogClient.getCatalogItem({ asin: 'B01EXAMPLE' });

      expect(result).toBeDefined();
      expect(result.asin).toBe('B01EXAMPLE');
    });
  });

  describe('searchCatalogItems', () => {
    it('should search catalog items by keywords', async () => {
      const result = await catalogClient.searchCatalogItems({ keywords: 'example' });

      expect(result).toBeDefined();
    });
  });
});
