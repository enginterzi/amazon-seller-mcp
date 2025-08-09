/**
 * Tests for process order tool functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerOrdersTools } from '../../../src/tools/orders-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { OrdersClientMockFactory } from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Process Order Tool', () => {
  let toolManager: ToolRegistrationManager;
  let mockOrdersClient: any;
  let ordersFactory: OrdersClientMockFactory;
  let authConfig: any;

  beforeEach(() => {
    const { mockEnv } = TestSetup.setupTestEnvironment();

    toolManager = new ToolRegistrationManager(mockEnv.server.mcpServer);
    vi.spyOn(toolManager, 'registerTool');

    ordersFactory = new OrdersClientMockFactory();
    mockOrdersClient = ordersFactory.create();
    authConfig = TestDataBuilder.createAuthConfig();
  });

  afterEach(() => {
    ordersFactory.reset();
    vi.resetAllMocks();
  });

  it('should handle process order tool execution for CONFIRM action', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: true,
    });

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];
    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'CONFIRM',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Action:** CONFIRM');
    expect(result.content[0].text).toContain('**Status:** Success');
    expect(result.content[0].text).toContain(
      'Order 123-4567890-1234567 has been confirmed successfully'
    );
    expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

    expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
      amazonOrderId: '123-4567890-1234567',
      action: 'CONFIRM',
      details: undefined,
    });
  });

  it('should handle process order tool execution for CANCEL action', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: true,
    });

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];
    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'CANCEL',
      details: {
        cancellationReason: 'Out of stock',
      },
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Action:** CANCEL');
    expect(result.content[0].text).toContain('**Status:** Success');
    expect(result.content[0].text).toContain(
      'Order 123-4567890-1234567 has been canceled successfully'
    );
    expect(result.content[0].text).toContain('**Cancellation Reason:** Out of stock');
    expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

    expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
      amazonOrderId: '123-4567890-1234567',
      action: 'CANCEL',
      details: {
        cancellationReason: 'Out of stock',
      },
    });
  });

  it('should handle process order tool execution for SHIP action', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: true,
    });

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];
    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'SHIP',
      details: {
        shippingDetails: {
          carrierCode: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          shipDate: '2025-07-20',
          items: [
            {
              orderItemId: 'item-1',
              quantity: 1,
            },
          ],
        },
      },
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Action:** SHIP');
    expect(result.content[0].text).toContain('**Status:** Success');
    expect(result.content[0].text).toContain(
      'Order 123-4567890-1234567 has been marked as shipped successfully'
    );
    expect(result.content[0].text).toContain('**Carrier:** UPS');
    expect(result.content[0].text).toContain('**Tracking Number:** 1Z999AA10123456784');
    expect(result.content[0].text).toContain('**Ship Date:** 2025-07-20');
    expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

    expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
      amazonOrderId: '123-4567890-1234567',
      action: 'SHIP',
      details: {
        shippingDetails: {
          carrierCode: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          shipDate: '2025-07-20',
          items: [
            {
              orderItemId: 'item-1',
              quantity: 1,
            },
          ],
        },
      },
    });
  });

  it('should validate CANCEL action requires cancellation reason', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'CANCEL',
      details: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Error: Cancellation reason is required for CANCEL action'
    );

    expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('should validate SHIP action requires shipping details', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'SHIP',
      details: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Error: Shipping details are required for SHIP action'
    );

    expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('should handle failed order processing', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: false,
      errorMessage: 'Order already processed',
    });

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'CONFIRM',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Action:** CONFIRM');
    expect(result.content[0].text).toContain('**Status:** Failed');
    expect(result.content[0].text).toContain('**Error:** Order already processed');
  });

  it('should handle errors when processing an order', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockRejectedValue(new Error('API error'));

    const processOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

    const result = await processOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      action: 'CONFIRM',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error processing order: API error');
  });
});
