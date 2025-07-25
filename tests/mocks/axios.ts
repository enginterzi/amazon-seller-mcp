/**
 * Mock implementation of axios for testing
 */
import { vi } from 'vitest';

// Create mock request function with mock methods
const mockRequest = vi.fn();
mockRequest.mockResolvedValue = vi.fn().mockReturnValue(mockRequest);
mockRequest.mockResolvedValueOnce = vi.fn().mockReturnValue(mockRequest);
mockRequest.mockRejectedValue = vi.fn().mockReturnValue(mockRequest);
mockRequest.mockRejectedValueOnce = vi.fn().mockReturnValue(mockRequest);

// Create mock axios object
const mockAxios = vi.fn();

// Add properties and methods that might be used in tests
mockAxios.get = vi.fn();
mockAxios.post = vi.fn();
mockAxios.put = vi.fn();
mockAxios.delete = vi.fn();
mockAxios.patch = vi.fn();
mockAxios.request = mockRequest;
mockAxios.isAxiosError = vi
  .fn()
  .mockImplementation((error) => error && error.response !== undefined);
mockAxios.create = vi.fn(() => ({
  request: mockRequest,
}));

export default mockAxios;
