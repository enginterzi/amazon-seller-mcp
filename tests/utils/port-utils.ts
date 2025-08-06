/**
 * Port utilities for dynamic port allocation in tests
 */

import { createServer } from 'node:http';

/**
 * Find an available port starting from a base port
 * @param basePort Starting port to check (default: 3000)
 * @param maxAttempts Maximum number of ports to try (default: 100)
 * @returns Promise that resolves to an available port number
 */
export async function findAvailablePort(basePort: number = 3000, maxAttempts: number = 100): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = basePort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found after checking ${maxAttempts} ports starting from ${basePort}`);
}

/**
 * Check if a specific port is available
 * @param port Port number to check
 * @returns Promise that resolves to true if port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get multiple available ports
 * @param count Number of ports needed
 * @param basePort Starting port to check (default: 3000)
 * @returns Promise that resolves to an array of available port numbers
 */
export async function getAvailablePorts(count: number, basePort: number = 3000): Promise<number[]> {
  const ports: number[] = [];
  let currentPort = basePort;
  
  while (ports.length < count) {
    const availablePort = await findAvailablePort(currentPort);
    ports.push(availablePort);
    currentPort = availablePort + 1;
  }
  
  return ports;
}

/**
 * Port manager for test isolation
 */
export class TestPortManager {
  private static instance: TestPortManager;
  private usedPorts: Set<number> = new Set();
  private basePort: number = 3000;

  private constructor() {}

  static getInstance(): TestPortManager {
    if (!TestPortManager.instance) {
      TestPortManager.instance = new TestPortManager();
    }
    return TestPortManager.instance;
  }

  /**
   * Allocate a port for testing
   * @returns Promise that resolves to an allocated port number
   */
  async allocatePort(): Promise<number> {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const port = this.basePort + attempts;
      
      if (!this.usedPorts.has(port) && await isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
      
      attempts++;
    }

    throw new Error(`Failed to allocate port after ${maxAttempts} attempts`);
  }

  /**
   * Release a port back to the pool
   * @param port Port number to release
   */
  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  /**
   * Release all allocated ports
   */
  releaseAllPorts(): void {
    this.usedPorts.clear();
  }

  /**
   * Get the number of currently allocated ports
   */
  getAllocatedPortCount(): number {
    return this.usedPorts.size;
  }
}