/**
 * Tests for the CredentialManager class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CredentialManager, MARKETPLACES } from '../../../src/auth/credential-manager.js';
import { AmazonRegion, AuthError, AuthErrorType } from '../../../src/auth/index.js';
import { CredentialManagerMockFactory } from '../../utils/mock-factories/auth-factory.js';
import { TestAssertions } from '../../utils/test-assertions.js';

// Mock fs module
vi.mock('fs');
// Mock dotenv module
vi.mock('dotenv');

// Store original process.env
const originalEnv = { ...process.env };

describe('CredentialManager', () => {
  let credentialManagerFactory: CredentialManagerMockFactory;
  let mockFs: any;
  let mockDotenv: any;

  beforeEach(async () => {
    credentialManagerFactory = new CredentialManagerMockFactory();

    // Reset all mocks
    vi.resetAllMocks();

    // Mock fs module
    mockFs = await import('fs');
    mockDotenv = await import('dotenv');

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
    vi.resetAllMocks();

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

  describe('when loading from config files', () => {
    it('should load credentials from specified config file path', () => {
      // Arrange
      const configData = {
        clientId: 'file-client-id',
        clientSecret: 'file-client-secret',
        refreshToken: 'file-refresh-token',
        region: 'EU',
        marketplaceId: 'A1F83G8C2ARO7P',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        configFilePath: '/custom/path/config.json',
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('file-client-id');
      expect(config.credentials.clientSecret).toBe('file-client-secret');
      expect(config.credentials.refreshToken).toBe('file-refresh-token');
      expect(config.region).toBe(AmazonRegion.EU);
      expect(config.marketplaceId).toBe('A1F83G8C2ARO7P');
    });

    it('should load credentials from default config file in current directory', () => {
      // Arrange
      const configData = {
        clientId: 'default-client-id',
        clientSecret: 'default-client-secret',
        refreshToken: 'default-refresh-token',
        region: 'NA',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('default-client-id');
    });

    it('should load credentials from home directory config file when current directory fails', () => {
      // Arrange
      const homeConfigData = {
        clientId: 'home-client-id',
        clientSecret: 'home-client-secret',
        refreshToken: 'home-refresh-token',
        region: 'FE',
        marketplaceId: 'A1VC38T7YXB528',
      };

      // Mock HOME environment variable
      const originalHome = process.env.HOME;
      process.env.HOME = '/home/testuser';

      // Mock fs.readFileSync to fail for current directory, succeed for home directory
      vi.mocked(mockFs.readFileSync)
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        })
        .mockReturnValueOnce(JSON.stringify(homeConfigData));

      const credentialManager = new CredentialManager({
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('home-client-id');
      expect(config.region).toBe(AmazonRegion.FE);

      // Cleanup
      process.env.HOME = originalHome;
    });

    it('should handle missing HOME environment variable gracefully', () => {
      // Arrange
      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      vi.mocked(mockFs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const credentialManager = new CredentialManager({
        loadEnv: false,
      });

      // Act & Assert
      expect(() => credentialManager.loadCredentials()).toThrow(AuthError);

      // Cleanup
      if (originalHome) process.env.HOME = originalHome;
      if (originalUserProfile) process.env.USERPROFILE = originalUserProfile;
    });

    it('should use USERPROFILE when HOME is not available', () => {
      // Arrange
      const homeConfigData = {
        clientId: 'userprofile-client-id',
        clientSecret: 'userprofile-client-secret',
        refreshToken: 'userprofile-refresh-token',
        region: 'NA',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\testuser';

      // Mock fs.readFileSync to fail for current directory, succeed for USERPROFILE directory
      vi.mocked(mockFs.readFileSync)
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        })
        .mockReturnValueOnce(JSON.stringify(homeConfigData));

      const credentialManager = new CredentialManager({
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('userprofile-client-id');

      // Cleanup
      if (originalHome) process.env.HOME = originalHome;
      if (originalUserProfile) process.env.USERPROFILE = originalUserProfile;
    });

    it('should throw AuthError when config file is malformed', () => {
      // Arrange
      vi.mocked(mockFs.readFileSync).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const credentialManager = new CredentialManager({
        configFilePath: '/invalid/config.json',
        loadEnv: false,
      });

      // Act & Assert
      expect(() => credentialManager.loadCredentials()).toThrow(AuthError);
    });

    it('should merge config file and environment variables with env taking precedence', () => {
      // Arrange
      const configData = {
        clientId: 'file-client-id',
        clientSecret: 'file-client-secret',
        refreshToken: 'file-refresh-token',
        region: 'EU',
        marketplaceId: 'A1F83G8C2ARO7P',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      // Set environment variables that should override file values
      process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'env-client-id';
      process.env.AMAZON_SELLER_MCP_REGION = 'NA';

      const credentialManager = new CredentialManager({
        configFilePath: '/test/config.json',
        loadEnv: true,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('env-client-id'); // From env
      expect(config.credentials.clientSecret).toBe('file-client-secret'); // From file
      expect(config.region).toBe(AmazonRegion.NA); // From env
    });
  });

  describe('when using marketplace configuration', () => {
    it('should resolve marketplace from marketplace code when marketplace is specified', () => {
      // Arrange
      const configData = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
        marketplace: 'UK',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        configFilePath: '/test/config.json',
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.marketplaceId).toBe(MARKETPLACES.UK.marketplaceId);
      expect(config.region).toBe(MARKETPLACES.UK.region);
    });

    it('should prefer explicit marketplaceId and region over marketplace code', () => {
      // Arrange
      const configData = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
        marketplace: 'UK',
        marketplaceId: 'ATVPDKIKX0DER', // US marketplace
        region: 'NA',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        configFilePath: '/test/config.json',
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.marketplaceId).toBe('ATVPDKIKX0DER'); // Explicit value, not from UK marketplace
      expect(config.region).toBe(AmazonRegion.NA); // Explicit value, not from UK marketplace
    });

    it('should handle invalid marketplace code gracefully', () => {
      // Arrange
      const configData = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
        marketplace: 'INVALID_MARKETPLACE',
        region: 'NA',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        configFilePath: '/test/config.json',
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert - Should use explicit values since marketplace code is invalid
      expect(config.marketplaceId).toBe('ATVPDKIKX0DER');
      expect(config.region).toBe(AmazonRegion.NA);
    });
  });

  describe('when loading from custom environment file', () => {
    it('should load environment variables from custom path', () => {
      // Arrange
      vi.mocked(mockDotenv.config).mockReturnValue({ parsed: {} });

      // Set environment variables to simulate dotenv loading from custom path
      process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'custom-env-client-id';
      process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'custom-env-client-secret';
      process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'custom-env-refresh-token';
      process.env.AMAZON_SELLER_MCP_REGION = 'EU';
      process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = 'A1F83G8C2ARO7P';

      const credentialManager = new CredentialManager({
        loadEnv: true,
        envPath: '/custom/.env',
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('custom-env-client-id');
      expect(config.region).toBe(AmazonRegion.EU);
      expect(mockDotenv.config).toHaveBeenCalledWith({ path: '/custom/.env' });
    });

    it('should disable environment loading when loadEnv is false', () => {
      // Arrange
      process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'env-should-be-ignored';

      const configData = {
        clientId: 'file-client-id',
        clientSecret: 'file-client-secret',
        refreshToken: 'file-refresh-token',
        region: 'NA',
        marketplaceId: 'ATVPDKIKX0DER',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        configFilePath: '/test/config.json',
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.clientId).toBe('file-client-id'); // From file, not env
      expect(mockDotenv.config).not.toHaveBeenCalled();
    });
  });

  describe('when handling IAM credentials', () => {
    it('should load IAM credentials from environment variables', () => {
      // Arrange
      process.env.AMAZON_SELLER_MCP_CLIENT_ID = 'test-client-id';
      process.env.AMAZON_SELLER_MCP_CLIENT_SECRET = 'test-client-secret';
      process.env.AMAZON_SELLER_MCP_REFRESH_TOKEN = 'test-refresh-token';
      process.env.AMAZON_SELLER_MCP_ACCESS_KEY_ID = 'test-access-key';
      process.env.AMAZON_SELLER_MCP_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.AMAZON_SELLER_MCP_ROLE_ARN = 'arn:aws:iam::123456789012:role/TestRole';
      process.env.AMAZON_SELLER_MCP_REGION = 'NA';
      process.env.AMAZON_SELLER_MCP_MARKETPLACE_ID = 'ATVPDKIKX0DER';

      const credentialManager = new CredentialManager({
        loadEnv: true,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.accessKeyId).toBe('test-access-key');
      expect(config.credentials.secretAccessKey).toBe('test-secret-key');
      expect(config.credentials.roleArn).toBe('arn:aws:iam::123456789012:role/TestRole');
    });

    it('should load IAM credentials from config file', () => {
      // Arrange
      const configData = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
        accessKeyId: 'file-access-key',
        secretAccessKey: 'file-secret-key',
        roleArn: 'arn:aws:iam::123456789012:role/FileRole',
        region: 'EU',
        marketplaceId: 'A1F83G8C2ARO7P',
      };

      vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify(configData));

      const credentialManager = new CredentialManager({
        configFilePath: '/test/config.json',
        loadEnv: false,
      });

      // Act
      const config = credentialManager.loadCredentials();

      // Assert
      expect(config.credentials.accessKeyId).toBe('file-access-key');
      expect(config.credentials.secretAccessKey).toBe('file-secret-key');
      expect(config.credentials.roleArn).toBe('arn:aws:iam::123456789012:role/FileRole');
    });
  });
});
