/**
 * Tests for the CredentialManager class
 */

import { describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { CredentialManager, MARKETPLACES } from '../../../src/auth/credential-manager.js';
import { AmazonRegion, AuthError, AuthErrorType } from '../../../src/auth/index.js';
import { CredentialManagerMockFactory } from '../../utils/mock-factories/auth-factory.js';
import { TestAssertions } from '../../utils/test-assertions.js';

// Store original process.env
const originalEnv = { ...process.env };

describe('CredentialManager', () => {
  let credentialManagerFactory: CredentialManagerMockFactory;

  beforeEach(() => {
    credentialManagerFactory = new CredentialManagerMockFactory();

    // Reset process.env
    process.env = { ...originalEnv };

    // Clear all environment variables that might affect tests
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('AMAZON_SELLER_MCP_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    credentialManagerFactory.reset();

    // Restore process.env
    process.env = originalEnv;
  });

  it('should load credentials from environment variables', () => {
    // Set environment variables
    process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'env-client-id';
    process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'env-client-secret';
    process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'env-refresh-token';
    process.env.AMAZON_SELLER_MCP_ACCESS_KEY_ID = 'env-access-key-id';
    process.env.AMAZON_SELLER_MCP_SECRET_ACCESS_KEY = 'env-secret-access-key';
    process.env.AMAZON_SELLER_MCP_REGION = 'EU';
    process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = 'A1F83G8C2ARO7P';

    const credentialManager = new CredentialManager({
      loadEnv: true,
    });

    const config = credentialManager.loadCredentials();

    expect(config.credentials.clientId).toBe('env-client-id');
    expect(config.credentials.clientSecret).toBe('env-client-secret');
    expect(config.credentials.refreshToken).toBe('env-refresh-token');
    expect(config.credentials.accessKeyId).toBe('env-access-key-id');
    expect(config.credentials.secretAccessKey).toBe('env-secret-access-key');

    expect(config.region).toBe(AmazonRegion.EU);
    expect(config.marketplaceId).toBe('A1F83G8C2ARO7P');
  });

  it('should load credentials with minimal required fields', () => {
    // Set only required environment variables
    process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'min-client-id';
    process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'min-client-secret';
    process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'min-refresh-token';
    process.env.AMAZON_SELLER_MCP_REGION = 'NA';
    process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = 'ATVPDKIKX0DER';

    const credentialManager = new CredentialManager({
      loadEnv: true,
    });

    const config = credentialManager.loadCredentials();

    expect(config.credentials.clientId).toBe('min-client-id');
    expect(config.credentials.clientSecret).toBe('min-client-secret');
    expect(config.credentials.refreshToken).toBe('min-refresh-token');
    expect(config.region).toBe(AmazonRegion.NA);
    expect(config.marketplaceId).toBe('ATVPDKIKX0DER');
  });

  it('should resolve marketplace from marketplace code when using US marketplace', () => {
    process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'test-client-secret';
    process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'test-refresh-token';
    process.env.AMAZON_SELLER_MCP_REGION = 'NA';
    process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = 'ATVPDKIKX0DER';

    const credentialManager = new CredentialManager({
      loadEnv: true,
    });

    const config = credentialManager.loadCredentials();

    expect(config.marketplaceId).toBe(MARKETPLACES.US.marketplaceId);
    expect(config.region).toBe(MARKETPLACES.US.region);
  });

  it('should throw AuthError when required credentials are missing', () => {
    // Only set partial credentials
    process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'test-client-id';
    // Missing CLIENT_SECRET and REFRESH_TOKEN

    const credentialManager = new CredentialManager({
      loadEnv: true,
    });

    expect(() => credentialManager.loadCredentials()).toThrow(AuthError);

    try {
      credentialManager.loadCredentials();
    } catch (error) {
      TestAssertions.expectAuthError(
        error as AuthError,
        AuthErrorType.INVALID_CREDENTIALS,
        'Missing required credentials'
      );
    }
  });

  it('should throw AuthError when region is invalid', () => {
    process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'test-client-secret';
    process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'test-refresh-token';
    process.env.AMAZON_SELLER_MCP_REGION = 'INVALID_REGION';
    process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = 'ATVPDKIKX0DER';

    const credentialManager = new CredentialManager({
      loadEnv: true,
    });

    expect(() => credentialManager.loadCredentials()).toThrow(AuthError);

    try {
      credentialManager.loadCredentials();
    } catch (error) {
      TestAssertions.expectAuthError(
        error as AuthError,
        AuthErrorType.INVALID_CREDENTIALS,
        'Invalid region'
      );
    }
  });

  it('should throw AuthError when marketplaceId is missing', () => {
    process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'test-client-id';
    process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'test-client-secret';
    process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'test-refresh-token';
    process.env.AMAZON_SELLER_MCP_REGION = 'NA';
    // Missing MARKETPLACE_ID

    const credentialManager = new CredentialManager({
      loadEnv: true,
    });

    expect(() => credentialManager.loadCredentials()).toThrow(AuthError);

    try {
      credentialManager.loadCredentials();
    } catch (error) {
      TestAssertions.expectAuthError(
        error as AuthError,
        AuthErrorType.INVALID_CREDENTIALS,
        'Missing marketplaceId'
      );
    }
  });

  it('should handle different Amazon regions correctly', () => {
    const testCases = [
      { region: 'NA', marketplaceId: 'ATVPDKIKX0DER', expected: AmazonRegion.NA },
      { region: 'EU', marketplaceId: 'A1F83G8C2ARO7P', expected: AmazonRegion.EU },
      { region: 'FE', marketplaceId: 'A1VC38T7YXB528', expected: AmazonRegion.FE },
    ];

    testCases.forEach(({ region, marketplaceId, expected }) => {
      // Clear environment
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith('AMAZON_SELLER_MCP_')) {
          delete process.env[key];
        }
      });

      // Set test environment
      process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'test-client-id';
      process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'test-client-secret';
      process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'test-refresh-token';
      process.env.AMAZON_SELLER_MCP_REGION = region;
      process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = marketplaceId;

      const credentialManager = new CredentialManager({
        loadEnv: true,
      });

      const config = credentialManager.loadCredentials();
      expect(config.region).toBe(expected);
      expect(config.marketplaceId).toBe(marketplaceId);
    });
  });

  it('should return marketplace configuration for valid country code', () => {
    const marketplace = CredentialManager.getMarketplaceByCountry('US');
    expect(marketplace).toEqual(MARKETPLACES.US);
    expect(marketplace.marketplaceId).toBe('ATVPDKIKX0DER');
    expect(marketplace.region).toBe(AmazonRegion.NA);
    expect(marketplace.countryCode).toBe('US');
  });

  it('should handle case-insensitive country codes', () => {
    const testCases = ['us', 'US', 'Us', 'uS'];

    testCases.forEach((countryCode) => {
      const marketplace = CredentialManager.getMarketplaceByCountry(countryCode);
      expect(marketplace).toEqual(MARKETPLACES.US);
    });
  });

  it('should return correct marketplace for different countries', () => {
    const testCases = [
      { code: 'US', expected: MARKETPLACES.US },
      { code: 'CA', expected: MARKETPLACES.CA },
      { code: 'UK', expected: MARKETPLACES.UK },
      { code: 'DE', expected: MARKETPLACES.DE },
      { code: 'JP', expected: MARKETPLACES.JP },
    ];

    testCases.forEach(({ code, expected }) => {
      const marketplace = CredentialManager.getMarketplaceByCountry(code);
      expect(marketplace).toEqual(expected);
    });
  });

  it('should throw AuthError for invalid country code', () => {
    expect(() => {
      CredentialManager.getMarketplaceByCountry('INVALID');
    }).toThrow(AuthError);

    try {
      CredentialManager.getMarketplaceByCountry('INVALID');
    } catch (error) {
      TestAssertions.expectAuthError(
        error as AuthError,
        AuthErrorType.INVALID_CREDENTIALS,
        'Invalid country code'
      );
    }
  });

  it('should return marketplace configuration for valid marketplace ID', () => {
    const marketplace = CredentialManager.getMarketplaceById('ATVPDKIKX0DER');
    expect(marketplace).toEqual(MARKETPLACES.US);
    expect(marketplace.marketplaceId).toBe('ATVPDKIKX0DER');
  });

  it('should return correct marketplace for different marketplace IDs', () => {
    const testCases = [
      { id: 'ATVPDKIKX0DER', expected: MARKETPLACES.US },
      { id: 'A2EUQ1WTGCTBG2', expected: MARKETPLACES.CA },
      { id: 'A1F83G8C2ARO7P', expected: MARKETPLACES.UK },
      { id: 'A1PA6795UKMFR9', expected: MARKETPLACES.DE },
      { id: 'A1VC38T7YXB528', expected: MARKETPLACES.JP },
    ];

    testCases.forEach(({ id, expected }) => {
      const marketplace = CredentialManager.getMarketplaceById(id);
      expect(marketplace).toEqual(expected);
    });
  });

  it('should throw AuthError for invalid marketplace ID', () => {
    expect(() => {
      CredentialManager.getMarketplaceById('INVALID');
    }).toThrow(AuthError);

    try {
      CredentialManager.getMarketplaceById('INVALID');
    } catch (error) {
      TestAssertions.expectAuthError(
        error as AuthError,
        AuthErrorType.INVALID_CREDENTIALS,
        'Invalid marketplace ID'
      );
    }
  });
});
