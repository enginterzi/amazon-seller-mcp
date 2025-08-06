/**
 * Tests for fulfill order tool functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerOrdersTools } from '../../../src/tools/orders-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { OrdersClientMockFactory } from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Fulfill Order Tool', () => {
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

  it('should handle fulfill order tool execution', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: true,
    });

    const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[4][2];

    const result = await fulfillOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      carrierCode: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      shipDate: '2025-07-20',
      items: [
        {
          orderItemId: 'item-1',
          quantity: 1,
        },
        {
          orderItemId: 'item-2',
          quantity: 2,
        },
      ],
      notifyCustomer: true,
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Status:** Success');
    expect(result.content[0].text).toContain(
      'Order 123-4567890-1234567 has been fulfilled successfully'
    );
    expect(result.content[0].text).toContain('**Carrier:** UPS');
    expect(result.content[0].text).toContain('**Tracking Number:** 1Z999AA10123456784');
    expect(result.content[0].text).toContain('**Ship Date:** 2025-07-20');
    expect(result.content[0].text).toContain('Shipped Items:');
    expect(result.content[0].text).toContain('1. Item ID: item-1, Quantity: 1');
    expect(result.content[0].text).toContain('2. Item ID: item-2, Quantity: 2');
    expect(result.content[0].text).toContain('Customer has been notified about the shipment');
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
            {
              orderItemId: 'item-2',
              quantity: 2,
            },
          ],
        },
      },
    });
  });

  it('should validate ship date format', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[4][2];

    const result = await fulfillOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      carrierCode: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      shipDate: '07/20/2025', // Invalid format
      items: [
        {
          orderItemId: 'item-1',
          quantity: 1,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Ship date must be in YYYY-MM-DD format');

    expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('should handle failed order fulfillment', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockResolvedValue({
      amazonOrderId: '123-4567890-1234567',
      success: false,
      errorMessage: 'Order already fulfilled',
    });

    const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[4][2];

    const result = await fulfillOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      carrierCode: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      shipDate: '2025-07-20',
      items: [
        {
          orderItemId: 'item-1',
          quantity: 1,
        },
      ],
    });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
    expect(result.content[0].text).toContain('**Status:** Failed');
    expect(result.content[0].text).toContain('**Error:** Order already fulfilled');
  });

  it('should handle errors when fulfilling an order', async () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

    mockOrdersClient.updateOrderStatus.mockRejectedValue(new Error('API error'));

    const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[4][2];

    const result = await fulfillOrderHandler({
      amazonOrderId: '123-4567890-1234567',
      carrierCode: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      shipDate: '2025-07-20',
      items: [
        {
          orderItemId: 'item-1',
          quantity: 1,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error fulfilling order: API error');
  });
});