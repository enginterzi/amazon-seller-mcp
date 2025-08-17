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
export async function findAvailablePort(
  basePort: number = 3000,
  maxAttempts: number = 100
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = basePort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `No available port found after checking ${maxAttempts} ports starting from ${basePort}`
  );
}

/**
 * Check if a specific port is available
 * @param port Port number to check
 * @returns Promise that resolves to true if port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    let resolved = false;

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          server.close(() => {
            resolve(false);
          });
        } catch {
          resolve(false);
        }
      }
    }, 2000); // Increased timeout for better reliability

    server.listen(port, '127.0.0.1', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        server.close(() => {
          // Add small delay to ensure port is fully released
          setTimeout(() => resolve(true), 50);
        });
      }
    });

    server.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        // Check if it's specifically an EADDRINUSE error
        const isPortInUse = (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
        resolve(!isPortInUse);
      }
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
 * Port manager for test isolation with improved conflict resolution
 */
export class TestPortManager {
  private static instance: TestPortManager;
  private usedPorts: Set<number> = new Set();
  private basePort: number = 3000;
  private portReservations: Map<number, { timestamp: number; testId: string }> = new Map();

  private constructor() {}

  static getInstance(): TestPortManager {
    if (!TestPortManager.instance) {
      TestPortManager.instance = new TestPortManager();
    }
    return TestPortManager.instance;
  }

  /**
   * Allocate a port for testing with improved conflict resolution
   * @param testId Optional test identifier for debugging
   * @returns Promise that resolves to an allocated port number
   */
  async allocatePort(testId?: string): Promise<number> {
    let attempts = 0;
    const maxAttempts = 200; // Increased attempts for better reliability
    const currentTime = Date.now();
    const testIdentifier = testId || `test-${Math.random().toString(36).substr(2, 9)}`;

    // Clean up stale reservations (older than 30 seconds)
    this.cleanupStaleReservations(currentTime);

    while (attempts < maxAttempts) {
      // Use a wider port range and add randomization to reduce conflicts
      const portOffset = attempts + Math.floor(Math.random() * 50);
      const port = this.basePort + portOffset;

      // Skip if port is recently reserved
      if (this.portReservations.has(port)) {
        const reservation = this.portReservations.get(port)!;
        if (currentTime - reservation.timestamp < 15000) {
          // 15 second grace period for better isolation
          attempts++;
          continue;
        }
      }

      // Double-check port availability and reserve atomically
      if (!this.usedPorts.has(port)) {
        const isAvailable = await isPortAvailable(port);
        if (isAvailable) {
          // Reserve immediately to prevent race conditions
          this.usedPorts.add(port);
          this.portReservations.set(port, { timestamp: currentTime, testId: testIdentifier });

          // Verify the port is still available after reservation
          const stillAvailable = await isPortAvailable(port);
          if (stillAvailable) {
            return port;
          } else {
            // Port became unavailable, release and try next
            this.usedPorts.delete(port);
            this.portReservations.delete(port);
          }
        }
      }

      attempts++;

      // Add progressive delay to reduce contention
      if (attempts % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(attempts * 3, 100)));
      }
    }

    throw new Error(
      `Failed to allocate port after ${maxAttempts} attempts for test: ${testIdentifier}`
    );
  }

  /**
   * Release a port back to the pool with proper cleanup
   * @param port Port number to release
   */
  releasePort(port: number): void {
    this.usedPorts.delete(port);
    this.portReservations.delete(port);
  }

  /**
   * Release all allocated ports
   */
  releaseAllPorts(): void {
    this.usedPorts.clear();
    this.portReservations.clear();
  }

  /**
   * Clean up stale port reservations
   * @param currentTime Current timestamp
   */
  private cleanupStaleReservations(currentTime: number): void {
    for (const [port, reservation] of this.portReservations.entries()) {
      if (currentTime - reservation.timestamp > 30000) {
        // 30 seconds
        this.portReservations.delete(port);
        this.usedPorts.delete(port);
      }
    }
  }

  /**
   * Get the number of currently allocated ports
   */
  getAllocatedPortCount(): number {
    return this.usedPorts.size;
  }

  /**
   * Get debug information about port allocations
   */
  getDebugInfo(): {
    usedPorts: number[];
    reservations: Array<{ port: number; testId: string; age: number }>;
  } {
    const currentTime = Date.now();
    return {
      usedPorts: Array.from(this.usedPorts).sort(),
      reservations: Array.from(this.portReservations.entries()).map(([port, reservation]) => ({
        port,
        testId: reservation.testId,
        age: currentTime - reservation.timestamp,
      })),
    };
  }
}
