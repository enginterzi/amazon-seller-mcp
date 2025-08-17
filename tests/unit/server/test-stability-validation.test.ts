/**
 * Test stability validation - comprehensive test for port conflicts and timeout issues
 */

import { describe, it, expect, afterEach } from 'vitest';
import { TestSetup } from '../../utils/test-setup.js';
import type { AmazonSellerMcpServer } from '../../../src/server/server.js';

describe('Test Stability Validation', () => {
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

  it('should handle concurrent server creation without port conflicts', async () => {
    // Create multiple servers concurrently to test port allocation
    const serverPromises = Array.from({ length: 5 }, (_, i) =>
      TestSetup.createHttpServerTestEnvironment({}, {}, `concurrent-stability-${i}`)
    );

    const serverEnvs = await Promise.all(serverPromises);
    servers.push(...serverEnvs);

    // Verify all servers got unique ports
    const ports = serverEnvs.map((env) => env.transportConfig.httpOptions.port);
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(5); // All ports should be unique

    // Connect all servers sequentially to avoid race conditions
    for (const serverEnv of serverEnvs) {
      await serverEnv.server.connect(serverEnv.transportConfig);
      expect(serverEnv.server.isServerConnected()).toBe(true);
    }

    // Verify all ports are in valid range
    ports.forEach((port) => {
      expect(port).toBeGreaterThanOrEqual(3000);
      expect(port).toBeLessThan(3200);
    });
  }, 20000); // Increased timeout for concurrent test

  it('should handle rapid server lifecycle without resource leaks', async () => {
    const iterations = 10;
    const usedPorts: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const testId = `lifecycle-${i}`;
      const serverEnv = await TestSetup.createHttpServerTestEnvironment({}, {}, testId);

      usedPorts.push(serverEnv.transportConfig.httpOptions.port);

      // Connect and immediately disconnect
      await serverEnv.server.connect(serverEnv.transportConfig);
      expect(serverEnv.server.isServerConnected()).toBe(true);

      await serverEnv.cleanup();

      // Small delay to ensure proper cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Verify we got valid ports throughout the test
    expect(usedPorts).toHaveLength(iterations);
    usedPorts.forEach((port) => {
      expect(port).toBeGreaterThanOrEqual(3000);
      expect(port).toBeLessThan(3200);
    });
  }, 25000); // Increased timeout for lifecycle test

  it('should handle mixed transport types without conflicts', async () => {
    // Create stdio servers
    const stdioEnvs = await Promise.all([
      TestSetup.createServerTestEnvironment(),
      TestSetup.createServerTestEnvironment(),
    ]);

    // Create HTTP servers
    const httpEnvs = await Promise.all([
      TestSetup.createHttpServerTestEnvironment({}, {}, 'mixed-http-1'),
      TestSetup.createHttpServerTestEnvironment({}, {}, 'mixed-http-2'),
      TestSetup.createHttpServerTestEnvironment({}, {}, 'mixed-http-3'),
    ]);

    servers.push(...stdioEnvs, ...httpEnvs);

    // Connect all stdio servers
    for (const stdioEnv of stdioEnvs) {
      await stdioEnv.server.connect({ type: 'stdio' });
      expect(stdioEnv.server.isServerConnected()).toBe(true);
    }

    // Connect all HTTP servers
    for (const httpEnv of httpEnvs) {
      await httpEnv.server.connect(httpEnv.transportConfig);
      expect(httpEnv.server.isServerConnected()).toBe(true);
    }

    // Verify HTTP servers have unique ports
    const httpPorts = httpEnvs.map((env) => env.transportConfig.httpOptions.port);
    const uniqueHttpPorts = new Set(httpPorts);
    expect(uniqueHttpPorts.size).toBe(3);

    // Verify all servers are connected
    [...stdioEnvs, ...httpEnvs].forEach((env) => {
      expect(env.server.isServerConnected()).toBe(true);
    });
  }, 15000); // Increased timeout for mixed transport test

  it('should handle server errors gracefully without affecting other servers', async () => {
    // Create multiple servers
    const serverEnv1 = await TestSetup.createHttpServerTestEnvironment({}, {}, 'error-test-1');
    const serverEnv2 = await TestSetup.createHttpServerTestEnvironment({}, {}, 'error-test-2');
    const serverEnv3 = await TestSetup.createHttpServerTestEnvironment({}, {}, 'error-test-3');

    servers.push(serverEnv1, serverEnv2, serverEnv3);

    // Connect all servers
    await serverEnv1.server.connect(serverEnv1.transportConfig);
    await serverEnv2.server.connect(serverEnv2.transportConfig);
    await serverEnv3.server.connect(serverEnv3.transportConfig);

    // Verify all are connected
    expect(serverEnv1.server.isServerConnected()).toBe(true);
    expect(serverEnv2.server.isServerConnected()).toBe(true);
    expect(serverEnv3.server.isServerConnected()).toBe(true);

    // Force close one server (simulating an error)
    await serverEnv2.cleanup();

    // Verify other servers are still connected
    expect(serverEnv1.server.isServerConnected()).toBe(true);
    expect(serverEnv3.server.isServerConnected()).toBe(true);

    // Verify ports are different
    expect(serverEnv1.transportConfig.httpOptions.port).not.toBe(
      serverEnv3.transportConfig.httpOptions.port
    );
  }, 12000); // Increased timeout for error handling test

  it('should maintain performance under load', async () => {
    const startTime = Date.now();

    // Create and connect multiple servers quickly
    const serverPromises = Array.from({ length: 8 }, (_, i) =>
      TestSetup.createHttpServerTestEnvironment({}, {}, `performance-${i}`)
    );

    const serverEnvs = await Promise.all(serverPromises);
    servers.push(...serverEnvs);

    // Connect all servers
    const connectPromises = serverEnvs.map((env) => env.server.connect(env.transportConfig));
    await Promise.all(connectPromises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all servers are connected
    serverEnvs.forEach((env) => {
      expect(env.server.isServerConnected()).toBe(true);
    });

    // Verify reasonable performance (should complete within 10 seconds)
    expect(duration).toBeLessThan(10000);

    // Verify unique ports
    const ports = serverEnvs.map((env) => env.transportConfig.httpOptions.port);
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(8);
  }, 15000); // Increased timeout for performance test
});
