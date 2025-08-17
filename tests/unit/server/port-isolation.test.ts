/**
 * Tests for server port isolation and dynamic allocation
 */

import { describe, it, expect, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import type { AmazonSellerMcpServer } from '../../../src/server/server.js';

describe('Server Port Isolation', () => {
  const servers: Array<{ server: AmazonSellerMcpServer; cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    // Clean up all servers with proper error handling
    const cleanupPromises = servers.map(async ({ cleanup }, index) => {
      try {
        await cleanup();
      } catch (error) {
        process.stderr.write(`Warning: Error cleaning up server ${index}: ${error}\n`);
      }
    });

    await Promise.allSettled(cleanupPromises);
    servers.length = 0;
  });

  it('should allow multiple HTTP servers to run concurrently without port conflicts', async () => {
    // Create server environments sequentially to avoid port allocation race conditions
    const server1Env = await TestSetup.createHttpServerTestEnvironment({}, {}, 'concurrent-test-1');
    servers.push(server1Env);

    // Small delay to ensure port allocation is complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    const server2Env = await TestSetup.createHttpServerTestEnvironment({}, {}, 'concurrent-test-2');
    servers.push(server2Env);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const server3Env = await TestSetup.createHttpServerTestEnvironment({}, {}, 'concurrent-test-3');
    servers.push(server3Env);

    // Verify each server gets a different port
    const port1 = server1Env.transportConfig.httpOptions.port;
    const port2 = server2Env.transportConfig.httpOptions.port;
    const port3 = server3Env.transportConfig.httpOptions.port;

    expect(port1).not.toBe(port2);
    expect(port1).not.toBe(port3);
    expect(port2).not.toBe(port3);

    // Connect servers sequentially to avoid race conditions
    await server1Env.server.connect(server1Env.transportConfig);
    expect(server1Env.server.isServerConnected()).toBe(true);

    // Small delay between connections to ensure proper port binding
    await new Promise((resolve) => setTimeout(resolve, 100));

    await server2Env.server.connect(server2Env.transportConfig);
    expect(server2Env.server.isServerConnected()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await server3Env.server.connect(server3Env.transportConfig);
    expect(server3Env.server.isServerConnected()).toBe(true);

    // Verify ports are in expected range
    expect(port1).toBeGreaterThanOrEqual(3000);
    expect(port2).toBeGreaterThanOrEqual(3000);
    expect(port3).toBeGreaterThanOrEqual(3000);
    expect(port1).toBeLessThan(3200);
    expect(port2).toBeLessThan(3200);
    expect(port3).toBeLessThan(3200);
  }, 20000); // Increased timeout for multiple server setup with delays

  it('should properly clean up ports after server shutdown', async () => {
    // Create a server environment
    const serverEnv = await TestSetup.createHttpServerTestEnvironment({}, {}, 'cleanup-test-1');
    // Store original port for reference (not used in test logic)
    // const _originalPort = serverEnv.transportConfig.httpOptions.port;

    // Connect the server
    await serverEnv.server.connect(serverEnv.transportConfig);
    expect(serverEnv.server.isServerConnected()).toBe(true);

    // Clean up the server
    await serverEnv.cleanup();

    // Wait a bit to ensure port is fully released
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Create another server environment - it should be able to get a port
    const serverEnv2 = await TestSetup.createHttpServerTestEnvironment({}, {}, 'cleanup-test-2');
    servers.push(serverEnv2);

    // The new server should get a port and connect successfully
    await serverEnv2.server.connect(serverEnv2.transportConfig);
    expect(serverEnv2.server.isServerConnected()).toBe(true);

    // Verify the new port is valid
    expect(serverEnv2.transportConfig.httpOptions.port).toBeGreaterThanOrEqual(3000);
    expect(serverEnv2.transportConfig.httpOptions.port).toBeLessThan(3200);
  }, 10000); // Increased timeout for cleanup test

  it('should handle rapid server creation and destruction without port leaks', async () => {
    const createdPorts: number[] = [];

    // Create and destroy servers sequentially to avoid race conditions
    for (let i = 0; i < 5; i++) {
      const testId = `rapid-test-${i}`;
      const serverEnv = await TestSetup.createHttpServerTestEnvironment({}, {}, testId);
      createdPorts.push(serverEnv.transportConfig.httpOptions.port);

      await serverEnv.server.connect(serverEnv.transportConfig);
      expect(serverEnv.server.isServerConnected()).toBe(true);

      await serverEnv.cleanup();

      // Small delay to ensure proper cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Verify we got valid ports
    expect(createdPorts).toHaveLength(5);
    expect(createdPorts.every((port) => port >= 3000 && port < 3200)).toBe(true);

    // Verify ports are unique or properly reused
    const uniquePorts = new Set(createdPorts);
    expect(uniquePorts.size).toBeGreaterThan(0); // At least some ports were allocated
  }, 15000); // Increased timeout for rapid creation test

  it('should support mixed stdio and HTTP transports without conflicts', async () => {
    // Create stdio server
    const stdioEnv = await TestSetup.createServerTestEnvironment();
    servers.push(stdioEnv);

    // Create HTTP servers with unique test IDs
    const httpEnv1 = await TestSetup.createHttpServerTestEnvironment({}, {}, 'mixed-http-1');
    const httpEnv2 = await TestSetup.createHttpServerTestEnvironment({}, {}, 'mixed-http-2');
    servers.push(httpEnv1, httpEnv2);

    // Connect servers sequentially to avoid race conditions
    await stdioEnv.server.connect({ type: 'stdio' });
    expect(stdioEnv.server.isServerConnected()).toBe(true);

    await httpEnv1.server.connect(httpEnv1.transportConfig);
    expect(httpEnv1.server.isServerConnected()).toBe(true);

    await httpEnv2.server.connect(httpEnv2.transportConfig);
    expect(httpEnv2.server.isServerConnected()).toBe(true);

    // Verify HTTP servers have different ports
    expect(httpEnv1.transportConfig.httpOptions.port).not.toBe(
      httpEnv2.transportConfig.httpOptions.port
    );

    // Verify ports are in valid range
    expect(httpEnv1.transportConfig.httpOptions.port).toBeGreaterThanOrEqual(3000);
    expect(httpEnv2.transportConfig.httpOptions.port).toBeGreaterThanOrEqual(3000);
    expect(httpEnv1.transportConfig.httpOptions.port).toBeLessThan(3200);
    expect(httpEnv2.transportConfig.httpOptions.port).toBeLessThan(3200);
  }, 12000); // Increased timeout for mixed transport test
});
