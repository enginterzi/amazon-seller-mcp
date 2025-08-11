/**
 * Tests for the Inventory API client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryClient } from '../../../src/api/inventory-client.js';
import {
  InventoryClientMockFactory,
  type MockInventoryClient,
} from '../../utils/mock-factories/api-client-factory.js';
import { TestSetup } from '../../utils/test-setup.js';
import { TestAssertions } from '../../utils/test-assertions.js';
import { TestDataBuilder } from '../../utils/test-data-builder.js';

describe('InventoryClient', () => {
  let inventoryClient: InventoryClient;
  let mockFactory: InventoryClientMockFactory;
  let mockClient: MockInventoryClient;

  beforeEach(() => {
    const authConfig = TestSetup.createTestAuthConfig();
    inventoryClient = new InventoryClient(authConfig);

    mockFactory = new InventoryClientMockFactory();
    mockClient = mockFactory.create();

    // Replace the client's request method with our mock
    (inventoryClient as any).request = mockClient.request;
  });

  it('should retrieve inventory with default parameters successfully', async () => {
    const expectedInventory = [
      TestDataBuilder.createInventorySummary({
        sellerSku: 'test-sku-1',
        asin: 'B00TEST123',
        totalQuantity: 10,
      }),
    ];

    mockFactory.mockGetInventory(mockClient, expectedInventory);

    const result = await inventoryClient.getInventory();

    expect(result.items).toHaveLength(1);
    TestAssertions.expectValidInventorySummary(result.items[0], 'test-sku-1');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: '/fba/inventory/v1/inventories',
    });
  });

  it('should retrieve inventory with filter parameters successfully', async () => {
    const expectedInventory = [
      TestDataBuilder.createInventorySummary({
        sellerSku: 'test-sku-1',
        asin: 'B00TEST123',
      }),
    ];

    mockFactory.mockGetInventory(mockClient, expectedInventory, {
      nextToken: 'next-page-token',
    });

    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-01-31');
    const result = await inventoryClient.getInventory({
      sellerSkus: ['test-sku-1', 'test-sku-2'],
      asins: ['B00TEST123'],
      fulfillmentChannels: ['AMAZON'],
      startDateTime: startDate,
      endDateTime: endDate,
      pageSize: 50,
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextToken).toBe('next-page-token');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: '/fba/inventory/v1/inventories',
      query: expect.objectContaining({
        sellerSkus: ['test-sku-1', 'test-sku-2'],
        asins: ['B00TEST123'],
        pageSize: 50,
      }),
    });
  });

  it('should retrieve inventory for specific SKU successfully', async () => {
    const expectedInventory = TestDataBuilder.createInventorySummary({
      sellerSku: 'test-sku-1',
      asin: 'B00TEST123',
      totalQuantity: 10,
    });

    mockFactory.mockGetInventory(mockClient, [expectedInventory]);

    const result = await inventoryClient.getInventoryBySku('test-sku-1');

    TestAssertions.expectValidInventorySummary(result, 'test-sku-1');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: '/fba/inventory/v1/inventories',
      query: expect.objectContaining({
        sellerSkus: ['test-sku-1'],
      }),
    });
  });

  it('should handle SKU not found error', async () => {
    mockFactory.mockGetInventory(mockClient, []); // Empty inventory

    await expect(inventoryClient.getInventoryBySku('non-existent-sku')).rejects.toThrow(
      'Inventory for SKU non-existent-sku not found'
    );

    TestAssertions.expectApiCall(mockClient.request, {
      method: 'GET',
      path: '/fba/inventory/v1/inventories',
      query: expect.objectContaining({
        sellerSkus: ['non-existent-sku'],
      }),
    });
  });

  it('should update inventory quantity successfully', async () => {
    mockFactory.mockUpdateInventory(mockClient, 'test-sku-1');

    const result = await inventoryClient.updateInventory({
      sku: 'test-sku-1',
      quantity: 20,
      fulfillmentChannel: 'AMAZON',
    });

    expect(result.sku).toBe('test-sku-1');
    expect(result.status).toBe('SUCCESSFUL');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'PUT',
      path: '/fba/inventory/v1/inventories/test-sku-1',
      data: expect.objectContaining({
        inventory: expect.objectContaining({
          sku: 'test-sku-1',
          quantity: 20,
          fulfillmentChannel: 'AMAZON',
        }),
      }),
    });
  });

  it('should update inventory with restock date successfully', async () => {
    mockFactory.mockUpdateInventory(mockClient, 'test-sku-1');

    const restockDate = new Date('2023-02-15');
    const result = await inventoryClient.updateInventory({
      sku: 'test-sku-1',
      quantity: 50,
      fulfillmentChannel: 'SELLER',
      restockDate,
    });

    expect(result.sku).toBe('test-sku-1');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'PUT',
      path: '/fba/inventory/v1/inventories/test-sku-1',
      data: expect.objectContaining({
        inventory: expect.objectContaining({
          sku: 'test-sku-1',
          quantity: 50,
          fulfillmentChannel: 'SELLER',
          restockDate: restockDate.toISOString(),
        }),
      }),
    });
  });

  it('should handle inventory update validation errors', async () => {
    const validationError = TestDataBuilder.createApiError('VALIDATION_ERROR', {
      message: 'Inventory update validation failed',
      statusCode: 400,
    });

    mockClient.request.mockRejectedValue(validationError);

    await expect(
      inventoryClient.updateInventory({
        sku: '',
        quantity: -10,
        fulfillmentChannel: 'INVALID' as any,
      })
    ).rejects.toThrow('Inventory update validation failed');
  });

  it('should set inventory replenishment settings successfully', async () => {
    mockFactory.mockSetInventoryReplenishment(mockClient, 'test-sku-1');

    const result = await inventoryClient.setInventoryReplenishment({
      sku: 'test-sku-1',
      restockLevel: 10,
      targetLevel: 30,
      maximumLevel: 50,
      leadTimeDays: 7,
    });

    expect(result.status).toBe('SUCCESSFUL');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'PUT',
      path: '/fba/inventory/v1/inventories/test-sku-1/replenishment',
      data: expect.objectContaining({
        replenishmentSettings: expect.objectContaining({
          restockLevel: 10,
          targetLevel: 30,
          maximumLevel: 50,
          leadTimeDays: 7,
        }),
      }),
    });
  });

  it('should set minimal inventory replenishment settings successfully', async () => {
    mockFactory.mockSetInventoryReplenishment(mockClient, 'test-sku-1');

    const result = await inventoryClient.setInventoryReplenishment({
      sku: 'test-sku-1',
      restockLevel: 5,
      targetLevel: 20,
    });

    expect(result.status).toBe('SUCCESSFUL');
    TestAssertions.expectApiCall(mockClient.request, {
      method: 'PUT',
      path: '/fba/inventory/v1/inventories/test-sku-1/replenishment',
      data: expect.objectContaining({
        replenishmentSettings: expect.objectContaining({
          restockLevel: 5,
          targetLevel: 20,
        }),
      }),
    });
  });

  it('should handle replenishment validation errors', async () => {
    const validationError = TestDataBuilder.createApiError('VALIDATION_ERROR', {
      message: 'Replenishment settings validation failed',
      statusCode: 400,
    });

    mockClient.request.mockRejectedValue(validationError);

    await expect(
      inventoryClient.setInventoryReplenishment({
        sku: 'test-sku-1',
        restockLevel: 30,
        targetLevel: 20, // Target level less than restock level
      })
    ).rejects.toThrow('Replenishment settings validation failed');

    await expect(
      inventoryClient.setInventoryReplenishment({
        sku: 'test-sku-1',
        restockLevel: 10,
        targetLevel: 30,
        maximumLevel: 20, // Maximum level less than target level
      })
    ).rejects.toThrow('Replenishment settings validation failed');
  });
});
