/**
 * Tests for axios mock factory
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AxiosMockFactory,
  AxiosMockScenarios,
  type MockAxiosStatic,
  type ResponseScenario,
  type ErrorScenario,
} from './axios-factory.js';

describe('AxiosMockFactory', () => {
  let factory: AxiosMockFactory;
  let mockAxios: MockAxiosStatic;

  beforeEach(() => {
    factory = new AxiosMockFactory();
    mockAxios = factory.create();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('create', () => {
    it('should create a mock axios instance with all HTTP methods', () => {
      expect(mockAxios.request).toBeDefined();
      expect(mockAxios.get).toBeDefined();
      expect(mockAxios.post).toBeDefined();
      expect(mockAxios.put).toBeDefined();
      expect(mockAxios.delete).toBeDefined();
      expect(mockAxios.patch).toBeDefined();
      expect(mockAxios.head).toBeDefined();
      expect(mockAxios.options).toBeDefined();
    });

    it('should create axios.create mock by default', () => {
      expect(mockAxios.create).toBeDefined();
      expect(typeof mockAxios.create).toBe('function');

      const instance = mockAxios.create();
      expect(instance.request).toBeDefined();
    });

    it('should create axios.isAxiosError mock by default', () => {
      expect(mockAxios.isAxiosError).toBeDefined();
      expect(typeof mockAxios.isAxiosError).toBe('function');

      // Test default implementation
      expect(mockAxios.isAxiosError({ response: {} })).toBe(true);
      expect(mockAxios.isAxiosError({})).toBe(false);
      expect(mockAxios.isAxiosError(null)).toBe(false);
    });

    it('should allow disabling axios.create setup', () => {
      const customFactory = new AxiosMockFactory({ setupCreate: false });
      const customMock = customFactory.create();

      expect(customMock.create).toBeUndefined();
    });

    it('should allow disabling axios.isAxiosError setup', () => {
      const customFactory = new AxiosMockFactory({ setupIsAxiosError: false });
      const customMock = customFactory.create();

      expect(customMock.isAxiosError).toBeUndefined();
    });
  });

  describe('createInstance', () => {
    it('should create a mock axios instance without static methods', () => {
      const instance = factory.createInstance();

      expect(instance.request).toBeDefined();
      expect(instance.get).toBeDefined();
      expect(instance.post).toBeDefined();
      expect((instance as any).create).toBeUndefined();
      expect((instance as any).isAxiosError).toBeUndefined();
    });
  });

  describe('mockSuccess', () => {
    it('should configure mock to return successful response', async () => {
      const responseData = { message: 'success' };

      factory.mockSuccess(mockAxios, {
        data: responseData,
        status: 200,
      });

      const result = await mockAxios.request({});

      expect(result.data).toEqual(responseData);
      expect(result.status).toBe(200);
      expect(result.statusText).toBe('OK');
    });

    it('should configure mock for specific HTTP method', async () => {
      const responseData = { id: 123 };

      factory.mockSuccess(
        mockAxios,
        {
          data: responseData,
          status: 201,
        },
        { method: 'post' }
      );

      const result = await mockAxios.post('/test', {});

      expect(result.data).toEqual(responseData);
      expect(result.status).toBe(201);
    });

    it('should configure mock for one-time response', async () => {
      const responseData1 = { message: 'first' };
      const responseData2 = { message: 'second' };

      factory.mockSuccess(
        mockAxios,
        {
          data: responseData1,
        },
        { once: true }
      );

      factory.mockSuccess(mockAxios, {
        data: responseData2,
      });

      const result1 = await mockAxios.request({});
      const result2 = await mockAxios.request({});

      expect(result1.data).toEqual(responseData1);
      expect(result2.data).toEqual(responseData2);
    });

    it('should handle delayed responses', async () => {
      const responseData = { delayed: true };
      const delay = 50;

      factory.mockSuccess(mockAxios, {
        data: responseData,
        delay,
      });

      const startTime = Date.now();
      const result = await mockAxios.request({});
      const endTime = Date.now();

      expect(result.data).toEqual(responseData);
      expect(endTime - startTime).toBeGreaterThanOrEqual(delay - 10); // Allow some tolerance
    });
  });

  describe('mockError', () => {
    it('should configure mock to return error', async () => {
      factory.mockError(mockAxios, {
        message: 'Test error',
        status: 400,
        responseData: { error: 'Bad request' },
      });

      await expect(mockAxios.request({})).rejects.toThrow('Test error');
    });

    it('should configure mock for specific HTTP method', async () => {
      factory.mockError(
        mockAxios,
        {
          message: 'POST error',
          status: 422,
        },
        { method: 'post' }
      );

      await expect(mockAxios.post('/test', {})).rejects.toThrow('POST error');
    });

    it('should configure mock for one-time error', async () => {
      factory.mockError(
        mockAxios,
        {
          message: 'First error',
        },
        { once: true }
      );

      factory.mockSuccess(mockAxios, {
        data: { recovered: true },
      });

      await expect(mockAxios.request({})).rejects.toThrow('First error');

      const result = await mockAxios.request({});
      expect(result.data).toEqual({ recovered: true });
    });

    it('should create proper axios error with response', async () => {
      factory.mockError(mockAxios, {
        message: 'HTTP Error',
        status: 404,
        responseData: { error: 'Not found' },
        responseHeaders: { 'content-type': 'application/json' },
      });

      try {
        await mockAxios.request({});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('HTTP Error');
        expect(error.response.status).toBe(404);
        expect(error.response.data).toEqual({ error: 'Not found' });
        expect(error.response.headers).toEqual({ 'content-type': 'application/json' });
        expect(error.isAxiosError).toBe(true);
      }
    });

    it('should create network error without response', async () => {
      factory.mockError(mockAxios, {
        message: 'Network Error',
        code: 'ECONNRESET',
      });

      try {
        await mockAxios.request({});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network Error');
        expect(error.code).toBe('ECONNRESET');
        expect(error.response).toBeUndefined();
        expect(error.isAxiosError).toBe(true);
      }
    });
  });

  describe('mockSequence', () => {
    it('should configure mock to return responses in sequence', async () => {
      const scenarios: (ResponseScenario | ErrorScenario)[] = [
        { data: { first: true }, status: 200 },
        { message: 'Second call fails', status: 500 },
        { data: { third: true }, status: 200 },
      ];

      factory.mockSequence(mockAxios, scenarios);

      const result1 = await mockAxios.request({});
      expect(result1.data).toEqual({ first: true });

      await expect(mockAxios.request({})).rejects.toThrow('Second call fails');

      const result3 = await mockAxios.request({});
      expect(result3.data).toEqual({ third: true });
    });

    it('should work with specific HTTP method', async () => {
      const scenarios: ResponseScenario[] = [{ data: { first: true } }, { data: { second: true } }];

      factory.mockSequence(mockAxios, scenarios, { method: 'get' });

      const result1 = await mockAxios.get('/test');
      const result2 = await mockAxios.get('/test');

      expect(result1.data).toEqual({ first: true });
      expect(result2.data).toEqual({ second: true });
    });
  });

  describe('mockHttpError', () => {
    it('should configure HTTP error with status code', async () => {
      factory.mockHttpError(mockAxios, 422, { validation: 'failed' });

      try {
        await mockAxios.request({});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Request failed with status code 422');
        expect(error.response.status).toBe(422);
        expect(error.response.data).toEqual({ validation: 'failed' });
        expect(error.isAxiosError).toBe(true);
      }
    });
  });

  describe('mockNetworkError', () => {
    it('should configure network error with default code', async () => {
      factory.mockNetworkError(mockAxios);

      try {
        await mockAxios.request({});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network Error');
        expect(error.code).toBe('ECONNRESET');
        expect(error.isAxiosError).toBe(true);
      }
    });

    it('should configure network error with custom code', async () => {
      factory.mockNetworkError(mockAxios, 'ECONNREFUSED');

      try {
        await mockAxios.request({});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('ECONNREFUSED');
      }
    });
  });

  describe('mockTimeoutError', () => {
    it('should configure timeout error', async () => {
      factory.mockTimeoutError(mockAxios);

      try {
        await mockAxios.request({});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('timeout of 5000ms exceeded');
        expect(error.code).toBe('ECONNABORTED');
        expect(error.isAxiosError).toBe(true);
      }
    });
  });

  describe('resetInstance', () => {
    it('should reset all mocks in an axios instance', () => {
      // Configure some mocks
      factory.mockSuccess(mockAxios, { data: { test: true } });
      mockAxios.get.mockResolvedValue({ data: { get: true } } as any);

      // Verify mocks are configured
      expect(mockAxios.request).toHaveBeenCalledTimes(0);
      expect(mockAxios.get).toHaveBeenCalledTimes(0);

      // Reset instance
      factory.resetInstance(mockAxios);

      // Verify mocks are reset (this is more about ensuring no errors occur)
      expect(() => factory.resetInstance(mockAxios)).not.toThrow();
    });
  });
});

describe('AxiosMockScenarios', () => {
  describe('success scenarios', () => {
    it('should create success scenario', () => {
      const scenario = AxiosMockScenarios.success({ message: 'ok' });

      expect(scenario.data).toEqual({ message: 'ok' });
      expect(scenario.status).toBe(200);
    });

    it('should create created scenario', () => {
      const scenario = AxiosMockScenarios.created({ id: 123 });

      expect(scenario.data).toEqual({ id: 123 });
      expect(scenario.status).toBe(201);
    });

    it('should create no content scenario', () => {
      const scenario = AxiosMockScenarios.noContent();

      expect(scenario.status).toBe(204);
    });
  });

  describe('error scenarios', () => {
    it('should create bad request scenario', () => {
      const scenario = AxiosMockScenarios.badRequest('Invalid input');

      expect(scenario.message).toBe('Request failed with status code 400');
      expect(scenario.status).toBe(400);
      expect(scenario.responseData).toEqual({ error: 'Invalid input' });
      expect(scenario.isAxiosError).toBe(true);
    });

    it('should create unauthorized scenario', () => {
      const scenario = AxiosMockScenarios.unauthorized();

      expect(scenario.status).toBe(401);
      expect(scenario.responseData).toEqual({ error: 'Unauthorized' });
    });

    it('should create forbidden scenario', () => {
      const scenario = AxiosMockScenarios.forbidden();

      expect(scenario.status).toBe(403);
      expect(scenario.responseData).toEqual({ error: 'Forbidden' });
    });

    it('should create not found scenario', () => {
      const scenario = AxiosMockScenarios.notFound();

      expect(scenario.status).toBe(404);
      expect(scenario.responseData).toEqual({ error: 'Not Found' });
    });

    it('should create rate limit scenario', () => {
      const scenario = AxiosMockScenarios.rateLimit();

      expect(scenario.status).toBe(429);
      expect(scenario.responseData).toEqual({ error: 'Too Many Requests' });
    });

    it('should create server error scenario', () => {
      const scenario = AxiosMockScenarios.serverError();

      expect(scenario.status).toBe(500);
      expect(scenario.responseData).toEqual({ error: 'Internal Server Error' });
    });

    it('should create network error scenario', () => {
      const scenario = AxiosMockScenarios.networkError('ECONNREFUSED');

      expect(scenario.message).toBe('Network Error');
      expect(scenario.code).toBe('ECONNREFUSED');
      expect(scenario.isAxiosError).toBe(true);
    });

    it('should create timeout scenario', () => {
      const scenario = AxiosMockScenarios.timeout();

      expect(scenario.message).toBe('timeout of 5000ms exceeded');
      expect(scenario.code).toBe('ECONNABORTED');
      expect(scenario.isAxiosError).toBe(true);
    });
  });
});
