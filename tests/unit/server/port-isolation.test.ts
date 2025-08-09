/**
 * Tests for server port isolation and dynamic allocation
 */

import { describe, it, expect, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import type { AmazonSellerMcpServer } from '../../../src/server/server.js';

describe('Server Port Isolation', () => {
  const servers: Array<{ server: AmazonSellerMcpServer; cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    // Clean up all servers
    for (const { cleanup } of servers) {
      await cleanup();
    }
    servers.length = 0;
  });

  it('should allow multiple HTTP servers to run concurrently without port conflicts', async () => {
    // Create multiple HTTP server test environments
    const server1Env = await TestSetup.createHttpServerTestEnvironment();
    const server2Env = await TestSetup.createHttpServerTestEnvironment();
    const server3Env = await TestSetup.createHttpServerTestEnvironment();

    servers.push(server1Env, server2Env, server3Env);

    // Verify each server gets a different port
    const port1 = server1Env.transportConfig.httpOptions.port;
    const port2 = server2Env.transportConfig.httpOptions.port;
    const port3 = server3Env.transportConfig.httpOptions.port;

    expect(port1).not.toBe(port2);
    expect(port1).not.toBe(port3);
    expect(port2).not.toBe(port3);

    // Connect all servers simultaneously
    await Promise.all([
      server1Env.server.connect(server1Env.transportConfig),
      server2Env.server.connect(server2Env.transportConfig),
      server3Env.server.connect(server3Env.transportConfig),
    ]);

    // Verify all servers are connected
    expect(server1Env.server.isServerConnected()).toBe(true);
    expect(server2Env.server.isServerConnected()).toBe(true);
    expect(server3Env.server.isServerConnected()).toBe(true);

    // Verify ports are in expected range
    expect(port1).toBeGreaterThanOrEqual(3000);
    expect(port2).toBeGreaterThanOrEqual(3000);
    expect(port3).toBeGreaterThanOrEqual(3000);
    expect(port1).toBeLessThan(3100);
    expect(port2).toBeLessThan(3100);
    expect(port3).toBeLessThan(3100);
  });

  it('should properly clean up ports after server shutdown', async () => {
    // Create a server environment
    const serverEnv = await TestSetup.createHttpServerTestEnvironment();

    // Connect the server
    await serverEnv.server.connect(serverEnv.transportConfig);
    expect(serverEnv.server.isServerConnected()).toBe(true);

    // Clean up the server
    await serverEnv.cleanup();

    // Create another server environment - it should be able to use the same port
    const serverEnv2 = await TestSetup.createHttpServerTestEnvironment();
    servers.push(serverEnv2);

    // The new server should get a port (may or may not be the same one, but should work)
    await serverEnv2.server.connect(serverEnv2.transportConfig);
    expect(serverEnv2.server.isServerConnected()).toBe(true);
  });

  it('should handle rapid server creation and destruction without port leaks', async () => {
    const createdPorts: number[] = [];

    // Rapidly create and destroy servers
    for (let i = 0; i < 5; i++) {
      const serverEnv = await TestSetup.createHttpServerTestEnvironment();
      createdPorts.push(serverEnv.transportConfig.httpOptions.port);

      await serverEnv.server.connect(serverEnv.transportConfig);
      expect(serverEnv.server.isServerConnected()).toBe(true);

      await serverEnv.cleanup();
    }

    // Verify we got different ports (or at least the system handled it gracefully)
    expect(createdPorts).toHaveLength(5);
    expect(createdPorts.every((port) => port >= 3000 && port < 3100)).toBe(true);
  });

  it('should support mixed stdio and HTTP transports without conflicts', async () => {
    // Create stdio server
    const stdioEnv = await TestSetup.createServerTestEnvironment();
    servers.push(stdioEnv);

    // Create HTTP servers
    const httpEnv1 = await TestSetup.createHttpServerTestEnvironment();
    const httpEnv2 = await TestSetup.createHttpServerTestEnvironment();
    servers.push(httpEnv1, httpEnv2);

    // Connect all servers
    await stdioEnv.server.connect({ type: 'stdio' });
    await httpEnv1.server.connect(httpEnv1.transportConfig);
    await httpEnv2.server.connect(httpEnv2.transportConfig);

    // Verify all are connected
    expect(stdioEnv.server.isServerConnected()).toBe(true);
    expect(httpEnv1.server.isServerConnected()).toBe(true);
    expect(httpEnv2.server.isServerConnected()).toBe(true);

    // Verify HTTP servers have different ports
    expect(httpEnv1.transportConfig.httpOptions.port).not.toBe(
      httpEnv2.transportConfig.httpOptions.port
    );
  });
});
