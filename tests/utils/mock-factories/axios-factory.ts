/**
 * Axios mock factory for standardized axios mocking
 */
import { vi, type Mock } from 'vitest';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { BaseMockFactory } from './base-factory.js';

/**
 * Configuration for axios mock scenarios
 */
export interface AxiosMockConfig {
  /** Default response for successful requests */
  defaultResponse?: Partial<AxiosResponse>;
  /** Default error for failed requests */
  defaultError?: Partial<AxiosError>;
  /** Whether to auto-setup common HTTP methods */
  setupHttpMethods?: boolean;
  /** Whether to setup axios.create mock */
  setupCreate?: boolean;
  /** Whether to setup axios.isAxiosError mock */
  setupIsAxiosError?: boolean;
}

/**
 * Response scenario configuration
 */
export interface ResponseScenario {
  /** Response data */
  data?: any;
  /** HTTP status code */
  status?: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Delay before response (in ms) */
  delay?: number;
}

/**
 * Error scenario configuration
 */
export interface ErrorScenario {
  /** Error message */
  message?: string;
  /** Error code (e.g., 'ECONNRESET', 'ECONNABORTED') */
  code?: string;
  /** HTTP status code for HTTP errors */
  status?: number;
  /** Response data for HTTP errors */
  responseData?: any;
  /** Response headers for HTTP errors */
  responseHeaders?: Record<string, string>;
  /** Whether this is an axios error */
  isAxiosError?: boolean;
}

/**
 * Mock axios instance interface
 */
export interface MockAxiosInstance {
  request: Mock<[AxiosRequestConfig], Promise<AxiosResponse>>;
  get: Mock<[string, AxiosRequestConfig?], Promise<AxiosResponse>>;
  post: Mock<[string, any?, AxiosRequestConfig?], Promise<AxiosResponse>>;
  put: Mock<[string, any?, AxiosRequestConfig?], Promise<AxiosResponse>>;
  delete: Mock<[string, AxiosRequestConfig?], Promise<AxiosResponse>>;
  patch: Mock<[string, any?, AxiosRequestConfig?], Promise<AxiosResponse>>;
  head: Mock<[string, AxiosRequestConfig?], Promise<AxiosResponse>>;
  options: Mock<[string, AxiosRequestConfig?], Promise<AxiosResponse>>;
}

/**
 * Mock axios static interface
 */
export interface MockAxiosStatic extends MockAxiosInstance {
  create: Mock<[AxiosRequestConfig?], MockAxiosInstance>;
  isAxiosError: Mock<[any], boolean>;
}

/**
 * Axios mock factory for creating standardized axios mocks
 */
export class AxiosMockFactory extends BaseMockFactory<MockAxiosStatic> {
  private defaultConfig: AxiosMockConfig;

  constructor(config: AxiosMockConfig = {}) {
    super('axios-factory', {});
    this.defaultConfig = {
      setupHttpMethods: true,
      setupCreate: true,
      setupIsAxiosError: true,
      defaultResponse: {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
        data: {},
      },
      ...config,
    };
  }

  /**
   * Create a mock axios instance
   */
  create(overrides: Partial<AxiosMockConfig> = {}): MockAxiosStatic {
    const config = { ...this.defaultConfig, ...overrides };
    
    // Create mock axios instance
    const mockAxios = this.createMockAxiosInstance();
    
    // Setup axios.create if enabled
    if (config.setupCreate) {
      mockAxios.create = this.createMockFn((axiosConfig?: AxiosRequestConfig) => {
        return this.createMockAxiosInstance();
      });
    }

    // Setup axios.isAxiosError if enabled
    if (config.setupIsAxiosError) {
      mockAxios.isAxiosError = this.createMockFn((error: any) => {
        return error != null && typeof error === 'object' && error.response !== undefined;
      });
    }

    this.instances.push(mockAxios);
    return mockAxios;
  }

  /**
   * Create a mock axios instance (without static methods)
   */
  createInstance(overrides: Partial<AxiosMockConfig> = {}): MockAxiosInstance {
    return this.createMockAxiosInstance();
  }

  /**
   * Configure a mock to return a successful response
   */
  mockSuccess(
    mock: MockAxiosInstance,
    scenario: ResponseScenario = {},
    options: { once?: boolean; method?: keyof MockAxiosInstance } = {}
  ): void {
    const response: AxiosResponse = {
      ...this.defaultConfig.defaultResponse,
      data: scenario.data !== undefined ? scenario.data : {},
      status: scenario.status || 200,
      statusText: 'OK',
      headers: scenario.headers || {},
      config: {},
    };

    const mockFn = options.method ? mock[options.method] : mock.request;
    
    if (scenario.delay) {
      const delayedResponse = () => 
        new Promise<AxiosResponse>(resolve => 
          setTimeout(() => resolve(response), scenario.delay)
        );
      
      if (options.once) {
        mockFn.mockResolvedValueOnce(delayedResponse());
      } else {
        mockFn.mockResolvedValue(delayedResponse());
      }
    } else {
      if (options.once) {
        mockFn.mockResolvedValueOnce(response);
      } else {
        mockFn.mockResolvedValue(response);
      }
    }
  }

  /**
   * Configure a mock to return an error
   */
  mockError(
    mock: MockAxiosInstance,
    scenario: ErrorScenario = {},
    options: { once?: boolean; method?: keyof MockAxiosInstance } = {}
  ): void {
    const error = this.createAxiosError(scenario);
    const mockFn = options.method ? mock[options.method] : mock.request;

    if (options.once) {
      mockFn.mockRejectedValueOnce(error);
    } else {
      mockFn.mockRejectedValue(error);
    }
  }

  /**
   * Configure a mock to return different responses in sequence
   */
  mockSequence(
    mock: MockAxiosInstance,
    scenarios: (ResponseScenario | ErrorScenario)[],
    options: { method?: keyof MockAxiosInstance } = {}
  ): void {
    const mockFn = options.method ? mock[options.method] : mock.request;

    scenarios.forEach((scenario) => {
      if ('message' in scenario || ('status' in scenario && scenario.status && scenario.status >= 400)) {
        // Error scenario
        const error = this.createAxiosError(scenario as ErrorScenario);
        mockFn.mockRejectedValueOnce(error);
      } else {
        // Success scenario
        const response: AxiosResponse = {
          ...this.defaultConfig.defaultResponse,
          data: (scenario as ResponseScenario).data !== undefined ? (scenario as ResponseScenario).data : {},
          status: (scenario as ResponseScenario).status || 200,
          statusText: 'OK',
          headers: (scenario as ResponseScenario).headers || {},
          config: {},
        };
        mockFn.mockResolvedValueOnce(response);
      }
    });
  }

  /**
   * Configure common HTTP error scenarios
   */
  mockHttpError(
    mock: MockAxiosInstance,
    statusCode: number,
    data?: any,
    options: { once?: boolean; method?: keyof MockAxiosInstance } = {}
  ): void {
    this.mockError(mock, {
      message: `Request failed with status code ${statusCode}`,
      status: statusCode,
      responseData: data,
      isAxiosError: true,
    }, options);
  }

  /**
   * Configure network error scenarios
   */
  mockNetworkError(
    mock: MockAxiosInstance,
    errorCode: string = 'ECONNRESET',
    options: { once?: boolean; method?: keyof MockAxiosInstance } = {}
  ): void {
    this.mockError(mock, {
      message: 'Network Error',
      code: errorCode,
      isAxiosError: true,
    }, options);
  }

  /**
   * Configure timeout error scenarios
   */
  mockTimeoutError(
    mock: MockAxiosInstance,
    options: { once?: boolean; method?: keyof MockAxiosInstance } = {}
  ): void {
    this.mockError(mock, {
      message: 'timeout of 5000ms exceeded',
      code: 'ECONNABORTED',
      isAxiosError: true,
    }, options);
  }

  /**
   * Reset all mocks in an axios instance
   */
  resetInstance(mock: MockAxiosInstance): void {
    Object.values(mock).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  }

  /**
   * Create a mock axios instance with all HTTP methods
   */
  private createMockAxiosInstance(): MockAxiosInstance {
    const instance = {
      request: this.createMockFn(),
      get: this.createMockFn(),
      post: this.createMockFn(),
      put: this.createMockFn(),
      delete: this.createMockFn(),
      patch: this.createMockFn(),
      head: this.createMockFn(),
      options: this.createMockFn(),
    } as any;

    // Add defaults property for axios configuration
    instance.defaults = {
      httpAgent: undefined,
      httpsAgent: undefined,
      timeout: 10000,
      headers: {},
    };

    return instance;
  }

  /**
   * Create an axios error object
   */
  createAxiosError(scenario: ErrorScenario): AxiosError {
    const error = new Error(scenario.message || 'Request failed') as AxiosError;
    
    error.name = 'AxiosError';
    error.code = scenario.code;
    error.isAxiosError = scenario.isAxiosError !== false;

    if (scenario.status) {
      error.response = {
        data: scenario.responseData || { error: 'Request failed' },
        status: scenario.status,
        statusText: this.getStatusText(scenario.status),
        headers: scenario.responseHeaders || {},
        config: {},
      };
    }

    return error;
  }

  /**
   * Get status text for HTTP status code
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || 'Unknown';
  }
}

/**
 * Pre-configured axios mock scenarios
 */
export const AxiosMockScenarios = {
  /**
   * Success response with default data
   */
  success: (data: any = { success: true }): ResponseScenario => ({
    data,
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  }),

  /**
   * Created response (201)
   */
  created: (data: any = { id: 'created' }): ResponseScenario => ({
    data,
    status: 201,
    headers: {
      'content-type': 'application/json',
    },
  }),

  /**
   * No content response (204)
   */
  noContent: (): ResponseScenario => ({
    status: 204,
  }),

  /**
   * Bad request error (400)
   */
  badRequest: (message: string = 'Bad Request'): ErrorScenario => ({
    message: `Request failed with status code 400`,
    status: 400,
    responseData: { error: message },
    isAxiosError: true,
  }),

  /**
   * Unauthorized error (401)
   */
  unauthorized: (message: string = 'Unauthorized'): ErrorScenario => ({
    message: `Request failed with status code 401`,
    status: 401,
    responseData: { error: message },
    isAxiosError: true,
  }),

  /**
   * Forbidden error (403)
   */
  forbidden: (message: string = 'Forbidden'): ErrorScenario => ({
    message: `Request failed with status code 403`,
    status: 403,
    responseData: { error: message },
    isAxiosError: true,
  }),

  /**
   * Not found error (404)
   */
  notFound: (message: string = 'Not Found'): ErrorScenario => ({
    message: `Request failed with status code 404`,
    status: 404,
    responseData: { error: message },
    isAxiosError: true,
  }),

  /**
   * Rate limit error (429)
   */
  rateLimit: (message: string = 'Too Many Requests'): ErrorScenario => ({
    message: `Request failed with status code 429`,
    status: 429,
    responseData: { error: message },
    isAxiosError: true,
  }),

  /**
   * Server error (500)
   */
  serverError: (message: string = 'Internal Server Error'): ErrorScenario => ({
    message: `Request failed with status code 500`,
    status: 500,
    responseData: { error: message },
    isAxiosError: true,
  }),

  /**
   * Network connection error
   */
  networkError: (code: string = 'ECONNRESET'): ErrorScenario => ({
    message: 'Network Error',
    code,
    isAxiosError: true,
  }),

  /**
   * Timeout error
   */
  timeout: (): ErrorScenario => ({
    message: 'timeout of 5000ms exceeded',
    code: 'ECONNABORTED',
    isAxiosError: true,
  }),
};