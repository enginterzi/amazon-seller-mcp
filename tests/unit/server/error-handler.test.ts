/**
 * Tests for MCP server error handling
 */

import { describe, it, expect, vi } from 'vitest';
import {
  handleToolError,
  handleResourceError,
  wrapToolHandlerWithErrorHandling,
  wrapResourceHandlerWithErrorHandling,
} from '../../../src/server/error-handler.js';
import { ValidationError, ServerError } from '../../../src/utils/error-handler.js';

describe('handleToolError', () => {
  it('should handle AmazonSellerMcpError', () => {
    const error = new ValidationError('Invalid input', { errors: ['Invalid SKU'] });

    const response = handleToolError(error);

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe('Invalid input');
    expect(response.errorDetails?.code).toBe('VALIDATION_ERROR');
    expect(response.errorDetails?.details).toEqual({ errors: ['Invalid SKU'] });
  });

  it('should handle generic Error', () => {
    const error = new Error('Generic error');

    const response = handleToolError(error);

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe('Error: Generic error');
    expect(response.errorDetails?.code).toBe('UNKNOWN_ERROR');
  });

  it('should handle non-Error objects', () => {
    const error = 'String error';

    const response = handleToolError(error);

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('String error');
    expect(response.errorDetails?.code).toBe('UNKNOWN_ERROR');
  });
});

describe('handleResourceError', () => {
  it('should handle AmazonSellerMcpError', () => {
    const error = new ValidationError('Invalid input', { errors: ['Invalid SKU'] });

    const response = handleResourceError(error);

    expect(response.contents[0].uri).toBe('error://amazon-seller-mcp/error');
    expect(response.contents[0].mimeType).toBe('application/json');

    const parsedContent = JSON.parse(response.contents[0].text);
    expect(parsedContent.error).toBe(true);
    expect(parsedContent.code).toBe('VALIDATION_ERROR');
    expect(parsedContent.message).toBe('Invalid input');
    expect(parsedContent.details).toEqual({ errors: ['Invalid SKU'] });
  });

  it('should handle generic Error', () => {
    const error = new Error('Generic error');

    const response = handleResourceError(error);

    const parsedContent = JSON.parse(response.contents[0].text);
    expect(parsedContent.error).toBe(true);
    expect(parsedContent.code).toBe('UNKNOWN_ERROR');
    expect(parsedContent.message).toBe('Generic error');
  });
});

describe('wrapToolHandlerWithErrorHandling', () => {
  it('should pass through successful responses', async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Success' }],
    });

    const wrappedHandler = wrapToolHandlerWithErrorHandling(handler);
    const result = await wrappedHandler({ foo: 'bar' });

    expect(result.content[0].text).toBe('Success');
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('should handle errors', async () => {
    const error = new ServerError('Server error');
    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = wrapToolHandlerWithErrorHandling(handler);
    const result = await wrappedHandler({ foo: 'bar' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Server error');
    expect(result.errorDetails?.code).toBe('SERVER_ERROR');
  });
});

describe('wrapResourceHandlerWithErrorHandling', () => {
  it('should pass through successful responses', async () => {
    const handler = vi.fn().mockResolvedValue({
      contents: [{ uri: 'test://uri', text: 'Success' }],
    });

    const wrappedHandler = wrapResourceHandlerWithErrorHandling(handler);
    const result = await wrappedHandler(new URL('test://uri'), { foo: 'bar' });

    expect(result.contents[0].text).toBe('Success');
    expect(handler).toHaveBeenCalledWith(expect.any(URL), { foo: 'bar' });
  });

  it('should handle errors', async () => {
    const error = new ServerError('Server error');
    const handler = vi.fn().mockRejectedValue(error);

    const wrappedHandler = wrapResourceHandlerWithErrorHandling(handler);
    const result = await wrappedHandler(new URL('test://uri'), { foo: 'bar' });

    const parsedContent = JSON.parse(result.contents[0].text);
    expect(parsedContent.error).toBe(true);
    expect(parsedContent.code).toBe('SERVER_ERROR');
    expect(parsedContent.message).toBe('Server error');
  });
});
