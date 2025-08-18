/**
 * Tests for authentication type definitions
 */

import { describe, it, expect } from 'vitest';
import {
  AmazonRegion,
  REGION_ENDPOINTS,
  AuthError,
  AuthErrorType,
  type AmazonCredentials,
  type AuthTokens,
  type AuthConfig,
  type SignableRequest,
  type RegionEndpoint,
} from '../../../src/types/auth.js';

describe('Auth Types', () => {
  describe('AmazonRegion Enum', () => {
    it('should define all required regions', () => {
      expect(AmazonRegion.NA).toBe('NA');
      expect(AmazonRegion.EU).toBe('EU');
      expect(AmazonRegion.FE).toBe('FE');
    });

    it('should have string values for all regions', () => {
      const regions = Object.values(AmazonRegion);
      expect(regions).toHaveLength(3);
      expect(regions.every((region) => typeof region === 'string')).toBe(true);
    });
  });

  describe('REGION_ENDPOINTS Configuration', () => {
    it('should define endpoints for all regions', () => {
      expect(REGION_ENDPOINTS[AmazonRegion.NA]).toBeDefined();
      expect(REGION_ENDPOINTS[AmazonRegion.EU]).toBeDefined();
      expect(REGION_ENDPOINTS[AmazonRegion.FE]).toBeDefined();
    });

    it('should have correct North America endpoint configuration', () => {
      const naEndpoint = REGION_ENDPOINTS[AmazonRegion.NA];
      expect(naEndpoint.endpoint).toBe('https://sellingpartnerapi-na.amazon.com');
      expect(naEndpoint.region).toBe('us-east-1');
    });

    it('should have correct Europe endpoint configuration', () => {
      const euEndpoint = REGION_ENDPOINTS[AmazonRegion.EU];
      expect(euEndpoint.endpoint).toBe('https://sellingpartnerapi-eu.amazon.com');
      expect(euEndpoint.region).toBe('eu-west-1');
    });

    it('should have correct Far East endpoint configuration', () => {
      const feEndpoint = REGION_ENDPOINTS[AmazonRegion.FE];
      expect(feEndpoint.endpoint).toBe('https://sellingpartnerapi-fe.amazon.com');
      expect(feEndpoint.region).toBe('us-west-2');
    });

    it('should have valid URL format for all endpoints', () => {
      Object.values(REGION_ENDPOINTS).forEach((endpoint) => {
        expect(endpoint.endpoint).toMatch(/^https:\/\/.+\.amazon\.com$/);
        expect(endpoint.region).toMatch(/^[a-z]+-[a-z]+-\d+$/);
      });
    });
  });

  describe('AuthErrorType Enum', () => {
    it('should define all required error types', () => {
      expect(AuthErrorType.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
      expect(AuthErrorType.TOKEN_REFRESH_FAILED).toBe('TOKEN_REFRESH_FAILED');
      expect(AuthErrorType.REQUEST_SIGNING_FAILED).toBe('REQUEST_SIGNING_FAILED');
      expect(AuthErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(AuthErrorType.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });

    it('should have string values for all error types', () => {
      const errorTypes = Object.values(AuthErrorType);
      expect(errorTypes).toHaveLength(5);
      expect(errorTypes.every((type) => typeof type === 'string')).toBe(true);
    });
  });

  describe('AuthError Class', () => {
    it('should create AuthError with message and type', () => {
      const error = new AuthError('Test error', AuthErrorType.INVALID_CREDENTIALS);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(AuthErrorType.INVALID_CREDENTIALS);
      expect(error.cause).toBeUndefined();
    });

    it('should create AuthError with message, type, and cause', () => {
      const originalError = new Error('Original error');
      const error = new AuthError('Test error', AuthErrorType.NETWORK_ERROR, originalError);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(error.cause).toBe(originalError);
    });

    it('should handle all error types correctly', () => {
      const errorTypes = Object.values(AuthErrorType);

      errorTypes.forEach((type) => {
        const error = new AuthError(`Error of type ${type}`, type);
        expect(error.type).toBe(type);
        expect(error.message).toBe(`Error of type ${type}`);
      });
    });

    it('should preserve error stack trace', () => {
      const error = new AuthError('Test error', AuthErrorType.UNKNOWN_ERROR);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new AuthError('Test error', AuthErrorType.TOKEN_REFRESH_FAILED);
      }).toThrow(AuthError);

      expect(() => {
        throw new AuthError('Test error', AuthErrorType.TOKEN_REFRESH_FAILED);
      }).toThrow('Test error');
    });
  });

  describe('Interface Type Validation', () => {
    describe('AmazonCredentials Interface', () => {
      it('should accept valid credentials with required fields only', () => {
        const credentials: AmazonCredentials = {
          clientId: 'amzn1.application-oa2-client.test',
          clientSecret: 'test-secret',
          refreshToken: 'Atzr|IwEBItest',
        };

        expect(credentials.clientId).toBe('amzn1.application-oa2-client.test');
        expect(credentials.clientSecret).toBe('test-secret');
        expect(credentials.refreshToken).toBe('Atzr|IwEBItest');
        expect(credentials.accessKeyId).toBeUndefined();
        expect(credentials.secretAccessKey).toBeUndefined();
        expect(credentials.roleArn).toBeUndefined();
      });

      it('should accept valid credentials with all fields', () => {
        const credentials: AmazonCredentials = {
          clientId: 'amzn1.application-oa2-client.test',
          clientSecret: 'test-secret',
          refreshToken: 'Atzr|IwEBItest',
          accessKeyId: 'AKIATEST123',
          secretAccessKey: 'test-secret-key',
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        };

        expect(credentials.clientId).toBe('amzn1.application-oa2-client.test');
        expect(credentials.clientSecret).toBe('test-secret');
        expect(credentials.refreshToken).toBe('Atzr|IwEBItest');
        expect(credentials.accessKeyId).toBe('AKIATEST123');
        expect(credentials.secretAccessKey).toBe('test-secret-key');
        expect(credentials.roleArn).toBe('arn:aws:iam::123456789012:role/TestRole');
      });
    });

    describe('AuthTokens Interface', () => {
      it('should accept valid auth tokens', () => {
        const tokens: AuthTokens = {
          accessToken: 'Atza|IwEBItest',
          expiresAt: Date.now() + 3600000,
        };

        expect(tokens.accessToken).toBe('Atza|IwEBItest');
        expect(typeof tokens.expiresAt).toBe('number');
        expect(tokens.expiresAt).toBeGreaterThan(Date.now());
      });

      it('should handle expired tokens', () => {
        const tokens: AuthTokens = {
          accessToken: 'Atza|IwEBItest',
          expiresAt: Date.now() - 1000,
        };

        expect(tokens.expiresAt).toBeLessThan(Date.now());
      });
    });

    describe('AuthConfig Interface', () => {
      it('should accept valid auth config with required fields', () => {
        const config: AuthConfig = {
          credentials: {
            clientId: 'amzn1.application-oa2-client.test',
            clientSecret: 'test-secret',
            refreshToken: 'Atzr|IwEBItest',
          },
          region: AmazonRegion.NA,
          marketplaceId: 'ATVPDKIKX0DER',
        };

        expect(config.credentials.clientId).toBe('amzn1.application-oa2-client.test');
        expect(config.region).toBe(AmazonRegion.NA);
        expect(config.marketplaceId).toBe('ATVPDKIKX0DER');
        expect(config.tokenCacheTimeMs).toBeUndefined();
      });

      it('should accept valid auth config with all fields', () => {
        const config: AuthConfig = {
          credentials: {
            clientId: 'amzn1.application-oa2-client.test',
            clientSecret: 'test-secret',
            refreshToken: 'Atzr|IwEBItest',
            accessKeyId: 'AKIATEST123',
            secretAccessKey: 'test-secret-key',
          },
          region: AmazonRegion.EU,
          marketplaceId: 'A1PA6795UKMFR9',
          tokenCacheTimeMs: 3600000,
        };

        expect(config.credentials.accessKeyId).toBe('AKIATEST123');
        expect(config.region).toBe(AmazonRegion.EU);
        expect(config.marketplaceId).toBe('A1PA6795UKMFR9');
        expect(config.tokenCacheTimeMs).toBe(3600000);
      });
    });

    describe('SignableRequest Interface', () => {
      it('should accept valid signable request with required fields', () => {
        const request: SignableRequest = {
          method: 'GET',
          url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        expect(request.method).toBe('GET');
        expect(request.url).toBe('https://sellingpartnerapi-na.amazon.com/orders/v0/orders');
        expect(request.headers['Content-Type']).toBe('application/json');
        expect(request.data).toBeUndefined();
      });

      it('should accept valid signable request with data', () => {
        const requestData = { test: 'data' };
        const request: SignableRequest = {
          method: 'POST',
          url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
          data: requestData,
        };

        expect(request.method).toBe('POST');
        expect(request.data).toBe(requestData);
        expect(request.headers['Authorization']).toBe('Bearer token');
      });

      it('should handle different HTTP methods', () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

        methods.forEach((method) => {
          const request: SignableRequest = {
            method,
            url: 'https://example.com',
            headers: {},
          };

          expect(request.method).toBe(method);
        });
      });
    });

    describe('RegionEndpoint Interface', () => {
      it('should accept valid region endpoint', () => {
        const endpoint: RegionEndpoint = {
          endpoint: 'https://sellingpartnerapi-na.amazon.com',
          region: 'us-east-1',
        };

        expect(endpoint.endpoint).toBe('https://sellingpartnerapi-na.amazon.com');
        expect(endpoint.region).toBe('us-east-1');
      });

      it('should work with all defined region endpoints', () => {
        Object.values(REGION_ENDPOINTS).forEach((endpoint) => {
          const regionEndpoint: RegionEndpoint = {
            endpoint: endpoint.endpoint,
            region: endpoint.region,
          };

          expect(regionEndpoint.endpoint).toBe(endpoint.endpoint);
          expect(regionEndpoint.region).toBe(endpoint.region);
        });
      });
    });
  });

  describe('Type Compatibility and Usage', () => {
    it('should allow region enum values in auth config', () => {
      const regions = [AmazonRegion.NA, AmazonRegion.EU, AmazonRegion.FE];

      regions.forEach((region) => {
        const config: AuthConfig = {
          credentials: {
            clientId: 'test',
            clientSecret: 'test',
            refreshToken: 'test',
          },
          region,
          marketplaceId: 'TEST',
        };

        expect(config.region).toBe(region);
        expect(REGION_ENDPOINTS[region]).toBeDefined();
      });
    });

    it('should allow error types in AuthError constructor', () => {
      const errorTypes = Object.values(AuthErrorType);

      errorTypes.forEach((type) => {
        const error = new AuthError('Test', type);
        expect(error.type).toBe(type);
      });
    });

    it('should maintain type safety for optional fields', () => {
      const minimalCredentials: AmazonCredentials = {
        clientId: 'test',
        clientSecret: 'test',
        refreshToken: 'test',
      };

      const fullCredentials: AmazonCredentials = {
        ...minimalCredentials,
        accessKeyId: 'test',
        secretAccessKey: 'test',
        roleArn: 'test',
      };

      expect(minimalCredentials.accessKeyId).toBeUndefined();
      expect(fullCredentials.accessKeyId).toBe('test');
    });
  });
});
