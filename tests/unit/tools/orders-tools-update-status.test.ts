/**
 * Tests for update order status tool functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerOrdersTools } from '../../../src/tools/orders-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import {
  OrdersClientMockFactory,
  type MockOrdersClient,
} from '../../utils/mock-factories/index.js';
import type { AuthConfig } from '../../../src/types/auth.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Update Order Status Tool', () => {
  let toolManager: ToolRegistrationManager;
  let mockOrdersClient: MockOrdersClient;
  let ordersFactory: OrdersClientMockFactory;
  let authConfig: AuthConfig;

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

  it('should handle update order status tool execution for CANCELED status', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: true,
    });

    const updateOrderStatusHandler = (
      toolManager.registerTool as vi.MockedFunction<typeof toolManager.registerTool>
    ).mock.calls[3][2];

    const result = await updateOrderStatusHandler({
      amazonOrderId: '123-4567890-1234567',
      status: 'CANCELED',
      reason: 'Customer request',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Requested Status:** CANCELED');
    expect(result.content[0].text).toContain('**Status:** Success');
    expect(result.content[0].text).toContain(
      'Order 123-4567890-1234567 status has been updated successfully'
    );
    expect(result.content[0].text).toContain('**Reason:** Customer request');
    expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

    expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
      amazonOrderId: '123-4567890-1234567',
      action: 'CANCEL',
      details: {
        cancellationReason: 'Customer request',
      },
    });
  });

  it('should handle update order status tool execution for UNSHIPPED status', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: true,
    });

    const updateOrderStatusHandler = (
      toolManager.registerTool as vi.MockedFunction<typeof toolManager.registerTool>
    ).mock.calls[3][2];

    const result = await updateOrderStatusHandler({
      amazonOrderId: '123-4567890-1234567',
      status: 'UNSHIPPED',
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Requested Status:** UNSHIPPED');
    expect(result.content[0].text).toContain('**Status:** Success');
    expect(result.content[0].text).toContain(
      'Order 123-4567890-1234567 status has been updated successfully'
    );
    expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

    expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
      amazonOrderId: '123-4567890-1234567',
      action: 'CONFIRM',
      details: {},
    });
  });

  it('should reject unsupported status updates', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    const updateOrderStatusHandler = (
      toolManager.registerTool as vi.MockedFunction<typeof toolManager.registerTool>
    ).mock.calls[3][2];

    const result = await updateOrderStatusHandler({
      amazonOrderId: '123-4567890-1234567',
      status: 'SHIPPED',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'To mark an order as shipped, please use the process-order tool with action=SHIP and provide shipping details'
    );

    expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('should handle errors when updating order status', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockRejectedValue(new Error('API error'));

    const updateOrderStatusHandler = (
      toolManager.registerTool as vi.MockedFunction<typeof toolManager.registerTool>
    ).mock.calls[3][2];

    const result = await updateOrderStatusHandler({
      amazonOrderId: '123-4567890-1234567',
      status: 'CANCELED',
      reason: 'Customer request',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error updating order status: API error');
  });
});
