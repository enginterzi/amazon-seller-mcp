/**
 * Tests for orders tools registration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerOrdersTools } from '../../../src/tools/orders-tools.js';
import { ToolRegistrationManager } from '../../../src/server/tools.js';
import { OrdersClientMockFactory } from '../../utils/mock-factories/index.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('Orders Tools Registration', () => {
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

  it('should register orders tools', () => {
    registerOrdersTools(toolManager, authConfig, mockOrdersClient);

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
});
