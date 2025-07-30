/**
 * Credential management for Amazon Selling Partner API
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  AmazonCredentials,
  AmazonRegion,
  AuthConfig,
  AuthError,
  AuthErrorType,
} from '../types/auth.js';

/**
 * Default configuration file name
 */
const DEFAULT_CONFIG_FILE = '.amazon-seller-mcp.json';

/**
 * Environment variable prefixes
 */
const ENV_PREFIX = 'AMAZON_SELLER_MCP';

/**
 * Environment variable names
 */
const ENV_VARS = {
  CLIENT_ID: `${ENV_PREFIX}_CLIENT_ID`,
  CLIENT_SECRET: `${ENV_PREFIX}_CLIENT_SECRET`,
  REFRESH_TOKEN: `${ENV_PREFIX}_REFRESH_TOKEN`,
  ACCESS_KEY_ID: `${ENV_PREFIX}_ACCESS_KEY_ID`,
  SECRET_ACCESS_KEY: `${ENV_PREFIX}_SECRET_ACCESS_KEY`,
  ROLE_ARN: `${ENV_PREFIX}_ROLE_ARN`,
  REGION: `${ENV_PREFIX}_REGION`,
  MARKETPLACE_ID: `${ENV_PREFIX}_MARKETPLACE_ID`,
};

/**
 * Marketplace configuration
 */
export interface MarketplaceConfig {
  marketplaceId: string;
  region: AmazonRegion;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
}

/**
 * Common marketplaces
 */
export const MARKETPLACES: Record<string, MarketplaceConfig> = {
  US: {
    marketplaceId: 'ATVPDKIKX0DER',
    region: AmazonRegion.NA,
    countryCode: 'US',
    currencyCode: 'USD',
    languageCode: 'en_US',
  },
  CA: {
    marketplaceId: 'A2EUQ1WTGCTBG2',
    region: AmazonRegion.NA,
    countryCode: 'CA',
    currencyCode: 'CAD',
    languageCode: 'en_CA',
  },
  MX: {
    marketplaceId: 'A1AM78C64UM0Y8',
    region: AmazonRegion.NA,
    countryCode: 'MX',
    currencyCode: 'MXN',
    languageCode: 'es_MX',
  },
  UK: {
    marketplaceId: 'A1F83G8C2ARO7P',
    region: AmazonRegion.EU,
    countryCode: 'UK',
    currencyCode: 'GBP',
    languageCode: 'en_GB',
  },
  DE: {
    marketplaceId: 'A1PA6795UKMFR9',
    region: AmazonRegion.EU,
    countryCode: 'DE',
    currencyCode: 'EUR',
    languageCode: 'de_DE',
  },
  FR: {
    marketplaceId: 'A13V1IB3VIYZZH',
    region: AmazonRegion.EU,
    countryCode: 'FR',
    currencyCode: 'EUR',
    languageCode: 'fr_FR',
  },
  IT: {
    marketplaceId: 'APJ6JRA9NG5V4',
    region: AmazonRegion.EU,
    countryCode: 'IT',
    currencyCode: 'EUR',
    languageCode: 'it_IT',
  },
  ES: {
    marketplaceId: 'A1RKKUPIHCS9HS',
    region: AmazonRegion.EU,
    countryCode: 'ES',
    currencyCode: 'EUR',
    languageCode: 'es_ES',
  },
  JP: {
    marketplaceId: 'A1VC38T7YXB528',
    region: AmazonRegion.FE,
    countryCode: 'JP',
    currencyCode: 'JPY',
    languageCode: 'ja_JP',
  },
  AU: {
    marketplaceId: 'A39IBJ37TRP1C6',
    region: AmazonRegion.FE,
    countryCode: 'AU',
    currencyCode: 'AUD',
    languageCode: 'en_AU',
  },
};

/**
 * Configuration file structure
 */
interface ConfigFile {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
  region?: string;
  marketplaceId?: string;
  marketplace?: string;
}

/**
 * Credential manager options
 */
export interface CredentialManagerOptions {
  configFilePath?: string;
  loadEnv?: boolean;
  envPath?: string;
}

/**
 * Credential manager for Amazon Selling Partner API
 *
 * Handles loading credentials from environment variables and config files
 */
export class CredentialManager {
  private configFilePath?: string;
  private loadEnv: boolean;
  private envPath?: string;

  /**
   * Create a new CredentialManager instance
   *
   * @param options Credential manager options
   */
  constructor(options: CredentialManagerOptions = {}) {
    this.configFilePath = options.configFilePath;
    this.loadEnv = options.loadEnv !== false;
    this.envPath = options.envPath;

    // Load environment variables if specified
    if (this.loadEnv && this.envPath) {
      dotenv.config({ path: this.envPath });
    } else if (this.loadEnv) {
      dotenv.config();
    }
  }

  /**
   * Load credentials from environment variables and config file
   *
   * @returns Authentication configuration
   */
  public loadCredentials(): AuthConfig {
    // Start with empty credentials
    let credentials: Partial<AmazonCredentials> = {};
    let region: AmazonRegion | undefined;
    let marketplaceId: string | undefined;
    let marketplace: string | undefined;

    // Load from config file if specified
    if (this.configFilePath) {
      const fileConfig = this.loadConfigFile(this.configFilePath);
      credentials = {
        ...credentials,
        clientId: fileConfig.clientId,
        clientSecret: fileConfig.clientSecret,
        refreshToken: fileConfig.refreshToken,
        accessKeyId: fileConfig.accessKeyId,
        secretAccessKey: fileConfig.secretAccessKey,
        roleArn: fileConfig.roleArn,
      };

      region = fileConfig.region as AmazonRegion;
      marketplaceId = fileConfig.marketplaceId;
      marketplace = fileConfig.marketplace;
    }

    // Try default config file locations if no config file specified
    if (!this.configFilePath) {
      // Try current directory
      try {
        const fileConfig = this.loadConfigFile(DEFAULT_CONFIG_FILE);
        credentials = {
          ...credentials,
          clientId: credentials.clientId || fileConfig.clientId,
          clientSecret: credentials.clientSecret || fileConfig.clientSecret,
          refreshToken: credentials.refreshToken || fileConfig.refreshToken,
          accessKeyId: credentials.accessKeyId || fileConfig.accessKeyId,
          secretAccessKey: credentials.secretAccessKey || fileConfig.secretAccessKey,
          roleArn: credentials.roleArn || fileConfig.roleArn,
        };

        region = region || (fileConfig.region as AmazonRegion);
        marketplaceId = marketplaceId || fileConfig.marketplaceId;
        marketplace = marketplace || fileConfig.marketplace;
      } catch (error) {
        // Ignore errors, try home directory next
      }

      // Try home directory
      try {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (homeDir) {
          const homeConfig = this.loadConfigFile(path.join(homeDir, DEFAULT_CONFIG_FILE));
          credentials = {
            ...credentials,
            clientId: credentials.clientId || homeConfig.clientId,
            clientSecret: credentials.clientSecret || homeConfig.clientSecret,
            refreshToken: credentials.refreshToken || homeConfig.refreshToken,
            accessKeyId: credentials.accessKeyId || homeConfig.accessKeyId,
            secretAccessKey: credentials.secretAccessKey || homeConfig.secretAccessKey,
            roleArn: credentials.roleArn || homeConfig.roleArn,
          };

          region = region || (homeConfig.region as AmazonRegion);
          marketplaceId = marketplaceId || homeConfig.marketplaceId;
          marketplace = marketplace || homeConfig.marketplace;
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Load from environment variables
    if (this.loadEnv) {
      credentials = {
        ...credentials,
        clientId: process.env[ENV_VARS.CLIENT_ID] || credentials.clientId,
        clientSecret: process.env[ENV_VARS.CLIENT_SECRET] || credentials.clientSecret,
        refreshToken: process.env[ENV_VARS.REFRESH_TOKEN] || credentials.refreshToken,
        accessKeyId: process.env[ENV_VARS.ACCESS_KEY_ID] || credentials.accessKeyId,
        secretAccessKey: process.env[ENV_VARS.SECRET_ACCESS_KEY] || credentials.secretAccessKey,
        roleArn: process.env[ENV_VARS.ROLE_ARN] || credentials.roleArn,
      };

      region = (process.env[ENV_VARS.REGION] as AmazonRegion) || region;
      marketplaceId = process.env[ENV_VARS.MARKETPLACE_ID] || marketplaceId;
    }

    // If marketplace is specified but not marketplaceId or region, use marketplace config
    if (marketplace && (!marketplaceId || !region)) {
      const marketplaceConfig = MARKETPLACES[marketplace.toUpperCase()];
      if (marketplaceConfig) {
        marketplaceId = marketplaceId || marketplaceConfig.marketplaceId;
        region = region || marketplaceConfig.region;
      }
    }

    // Validate credentials
    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      throw new AuthError(
        'Missing required credentials: clientId, clientSecret, and refreshToken are required',
        AuthErrorType.INVALID_CREDENTIALS
      );
    }

    // Validate region and marketplaceId
    if (!region || !Object.values(AmazonRegion).includes(region)) {
      throw new AuthError(
        `Invalid region: ${region}. Must be one of: ${Object.values(AmazonRegion).join(', ')}`,
        AuthErrorType.INVALID_CREDENTIALS
      );
    }

    if (!marketplaceId) {
      throw new AuthError(
        'Missing marketplaceId. Specify a marketplace or marketplaceId in config or environment variables',
        AuthErrorType.INVALID_CREDENTIALS
      );
    }

    return {
      credentials: credentials as AmazonCredentials,
      region,
      marketplaceId,
    };
  }

  /**
   * Load configuration from a JSON file
   *
   * @param filePath Path to the configuration file
   * @returns Configuration from the file
   */
  private loadConfigFile(filePath: string): ConfigFile {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent) as ConfigFile;
    } catch (error) {
      throw new AuthError(
        `Failed to load config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        AuthErrorType.INVALID_CREDENTIALS,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get marketplace configuration by country code
   *
   * @param countryCode ISO country code (e.g., 'US', 'UK')
   * @returns Marketplace configuration
   */
  public static getMarketplaceByCountry(countryCode: string): MarketplaceConfig {
    const marketplace = MARKETPLACES[countryCode.toUpperCase()];
    if (!marketplace) {
      throw new AuthError(
        `Invalid country code: ${countryCode}. Must be one of: ${Object.keys(MARKETPLACES).join(', ')}`,
        AuthErrorType.INVALID_CREDENTIALS
      );
    }
    return marketplace;
  }

  /**
   * Get marketplace configuration by marketplace ID
   *
   * @param marketplaceId Amazon marketplace ID
   * @returns Marketplace configuration
   */
  public static getMarketplaceById(marketplaceId: string): MarketplaceConfig {
    const marketplace = Object.values(MARKETPLACES).find((m) => m.marketplaceId === marketplaceId);
    if (!marketplace) {
      throw new AuthError(
        `Invalid marketplace ID: ${marketplaceId}`,
        AuthErrorType.INVALID_CREDENTIALS
      );
    }
    return marketplace;
  }
}
