/**
 * Tests for orders tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerOrdersTools } from '../../../src/tools/orders-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { OrdersClient } from '../../../src/api/orders-client.js';

// Mock the orders client
vi.mock('../../../src/api/orders-client.js', () => {
  return {
    OrdersClient: vi.fn().mockImplementation(() => ({
      updateOrderStatus: vi.fn(),
    })),
  };
});

describe('Orders Tools', () => {
  let toolManager: ToolRegistrationManager;
  let mockOrdersClient: any;
  let authConfig: any;

  beforeEach(() => {
    // Create a mock MCP server
    const mockServer = {
      registerTool: vi.fn(),
    };

    // Create a new tool manager
    toolManager = new ToolRegistrationManager(mockServer as any);

    // Create a spy for the tool registration
    vi.spyOn(toolManager, 'registerTool');

    // Reset the mock orders client
    mockOrdersClient = {
      updateOrderStatus: vi.fn(),
    };

    // Reset the OrdersClient mock
    (OrdersClient as any).mockImplementation(() => mockOrdersClient);

    // Create mock auth config
    authConfig = {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      region: {
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
        region: 'us-east-1',
      },
      marketplaceId: 'ATVPDKIKX0DER',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should register orders tools', () => {
    // Register orders tools
    registerOrdersTools(toolManager, authConfig);

    // Verify that the tools were registered
    expect(toolManager.registerTool).toHaveBeenCalledTimes(3);
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'process-order',
      expect.objectContaining({
        title: 'Process Amazon Order',
        description: 'Process an Amazon order (confirm, ship, or cancel)',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'update-order-status',
      expect.objectContaining({
        title: 'Update Amazon Order Status',
        description: 'Update the status of an Amazon order',
      }),
      expect.any(Function)
    );
    expect(toolManager.registerTool).toHaveBeenCalledWith(
      'fulfill-order',
      expect.objectContaining({
        title: 'Fulfill Amazon Order',
        description: 'Fulfill an Amazon order with shipping information',
      }),
      expect.any(Function)
    );
  });

  describe('process-order tool', () => {
    it('should handle process order tool execution for CONFIRM action', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: true,
      });

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await processOrderHandler({
        amazonOrderId: '123-4567890-1234567',
        action: 'CONFIRM',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
      expect(result.content[0].text).toContain('**Action:** CONFIRM');
      expect(result.content[0].text).toContain('**Status:** Success');
      expect(result.content[0].text).toContain(
        'Order 123-4567890-1234567 has been confirmed successfully'
      );
      expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

      // Verify that the orders client was called with the correct parameters
      expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
        amazonOrderId: '123-4567890-1234567',
        action: 'CONFIRM',
        details: undefined,
      });
    });

    it('should handle process order tool execution for CANCEL action', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: true,
      });

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await processOrderHandler({
        amazonOrderId: '123-4567890-1234567',
        action: 'CANCEL',
        details: {
          cancellationReason: 'Out of stock',
        },
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
      expect(result.content[0].text).toContain('**Action:** CANCEL');
      expect(result.content[0].text).toContain('**Status:** Success');
      expect(result.content[0].text).toContain(
        'Order 123-4567890-1234567 has been canceled successfully'
      );
      expect(result.content[0].text).toContain('**Cancellation Reason:** Out of stock');
      expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

      // Verify that the orders client was called with the correct parameters
      expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
        amazonOrderId: '123-4567890-1234567',
        action: 'CANCEL',
        details: {
          cancellationReason: 'Out of stock',
        },
      });
    });

    it('should handle process order tool execution for SHIP action', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: true,
      });

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
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

      // Verify the result
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

      // Verify that the orders client was called with the correct parameters
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
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool without cancellation reason
      const result = await processOrderHandler({
        amazonOrderId: '123-4567890-1234567',
        action: 'CANCEL',
        details: {},
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: Cancellation reason is required for CANCEL action'
      );

      // Verify that the orders client was not called
      expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should validate SHIP action requires shipping details', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool without shipping details
      const result = await processOrderHandler({
        amazonOrderId: '123-4567890-1234567',
        action: 'SHIP',
        details: {},
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: Shipping details are required for SHIP action'
      );

      // Verify that the orders client was not called
      expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should handle failed order processing', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response with failure
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: false,
        errorMessage: 'Order already processed',
      });

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await processOrderHandler({
        amazonOrderId: '123-4567890-1234567',
        action: 'CONFIRM',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
      expect(result.content[0].text).toContain('**Action:** CONFIRM');
      expect(result.content[0].text).toContain('**Status:** Failed');
      expect(result.content[0].text).toContain('**Error:** Order already processed');
    });

    it('should handle errors when processing an order', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status error
      mockOrdersClient.updateOrderStatus.mockRejectedValue(new Error('API error'));

      // Get the process order tool handler
      const processOrderHandler = (toolManager.registerTool as any).mock.calls[0][2];

      // Execute the tool
      const result = await processOrderHandler({
        amazonOrderId: '123-4567890-1234567',
        action: 'CONFIRM',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error processing order: API error');
    });
  });

  describe('update-order-status tool', () => {
    it('should handle update order status tool execution for CANCELED status', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: true,
      });

      // Get the update order status tool handler
      const updateOrderStatusHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateOrderStatusHandler({
        amazonOrderId: '123-4567890-1234567',
        status: 'CANCELED',
        reason: 'Customer request',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
      expect(result.content[0].text).toContain('**Requested Status:** CANCELED');
      expect(result.content[0].text).toContain('**Status:** Success');
      expect(result.content[0].text).toContain(
        'Order 123-4567890-1234567 status has been updated successfully'
      );
      expect(result.content[0].text).toContain('**Reason:** Customer request');
      expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

      // Verify that the orders client was called with the correct parameters
      expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
        amazonOrderId: '123-4567890-1234567',
        action: 'CANCEL',
        details: {
          cancellationReason: 'Customer request',
        },
      });
    });

    it('should handle update order status tool execution for UNSHIPPED status', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: true,
      });

      // Get the update order status tool handler
      const updateOrderStatusHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateOrderStatusHandler({
        amazonOrderId: '123-4567890-1234567',
        status: 'UNSHIPPED',
      });

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('**Order ID:** 123-4567890-1234567');
      expect(result.content[0].text).toContain('**Requested Status:** UNSHIPPED');
      expect(result.content[0].text).toContain('**Status:** Success');
      expect(result.content[0].text).toContain(
        'Order 123-4567890-1234567 status has been updated successfully'
      );
      expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

      // Verify that the orders client was called with the correct parameters
      expect(mockOrdersClient.updateOrderStatus).toHaveBeenCalledWith({
        amazonOrderId: '123-4567890-1234567',
        action: 'CONFIRM',
        details: {},
      });
    });

    it('should reject unsupported status updates', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Get the update order status tool handler
      const updateOrderStatusHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool with SHIPPED status (which requires shipping details)
      const result = await updateOrderStatusHandler({
        amazonOrderId: '123-4567890-1234567',
        status: 'SHIPPED',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'To mark an order as shipped, please use the process-order tool with action=SHIP and provide shipping details'
      );

      // Verify that the orders client was not called
      expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should handle errors when updating order status', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status error
      mockOrdersClient.updateOrderStatus.mockRejectedValue(new Error('API error'));

      // Get the update order status tool handler
      const updateOrderStatusHandler = (toolManager.registerTool as any).mock.calls[1][2];

      // Execute the tool
      const result = await updateOrderStatusHandler({
        amazonOrderId: '123-4567890-1234567',
        status: 'CANCELED',
        reason: 'Customer request',
      });

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error updating order status: API error');
    });
  });

  describe('fulfill-order tool', () => {
    it('should handle fulfill order tool execution', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: true,
      });

      // Get the fulfill order tool handler
      const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
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

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Order ID: 123-4567890-1234567');
      expect(result.content[0].text).toContain('Status: Success');
      expect(result.content[0].text).toContain(
        'Order 123-4567890-1234567 has been fulfilled successfully'
      );
      expect(result.content[0].text).toContain('Carrier: UPS');
      expect(result.content[0].text).toContain('Tracking Number: 1Z999AA10123456784');
      expect(result.content[0].text).toContain('Ship Date: 2025-07-20');
      expect(result.content[0].text).toContain('Shipped Items:');
      expect(result.content[0].text).toContain('1. Item ID: item-1, Quantity: 1');
      expect(result.content[0].text).toContain('2. Item ID: item-2, Quantity: 2');
      expect(result.content[0].text).toContain('Customer has been notified about the shipment');
      expect(result.content[0].text).toContain('Resource URI: amazon-orders://123-4567890-1234567');

      // Verify that the orders client was called with the correct parameters
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
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Get the fulfill order tool handler
      const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool with invalid ship date format
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

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Ship date must be in YYYY-MM-DD format');

      // Verify that the orders client was not called
      expect(mockOrdersClient.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('should handle failed order fulfillment', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status response with failure
      mockOrdersClient.updateOrderStatus.mockResolvedValue({
        amazonOrderId: '123-4567890-1234567',
        success: false,
        errorMessage: 'Order already fulfilled',
      });

      // Get the fulfill order tool handler
      const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
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

      // Verify the result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Order ID: 123-4567890-1234567');
      expect(result.content[0].text).toContain('Status: Failed');
      expect(result.content[0].text).toContain('Error: Order already fulfilled');
    });

    it('should handle errors when fulfilling an order', async () => {
      // Register orders tools
      registerOrdersTools(toolManager, authConfig);

      // Mock the update order status error
      mockOrdersClient.updateOrderStatus.mockRejectedValue(new Error('API error'));

      // Get the fulfill order tool handler
      const fulfillOrderHandler = (toolManager.registerTool as any).mock.calls[2][2];

      // Execute the tool
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

      // Verify the result
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fulfilling order: API error');
    });
  });
});
