/**
 * Event cleanup utilities for test isolation
 */

import { EventEmitter } from 'node:events';

/**
 * Event listener tracker for test cleanup
 */
export class EventListenerTracker {
  private static instance: EventListenerTracker;
  private trackedEmitters: Map<EventEmitter, { originalMaxListeners: number }> = new Map();

  private constructor() {}

  static getInstance(): EventListenerTracker {
    if (!EventListenerTracker.instance) {
      EventListenerTracker.instance = new EventListenerTracker();
    }
    return EventListenerTracker.instance;
  }

  /**
   * Track an event emitter and increase its max listeners for testing
   * @param emitter Event emitter to track
   * @param maxListeners Maximum number of listeners to allow (default: 20)
   */
  trackEmitter(emitter: EventEmitter, maxListeners: number = 20): void {
    if (!this.trackedEmitters.has(emitter)) {
      const originalMaxListeners = emitter.getMaxListeners();
      this.trackedEmitters.set(emitter, { originalMaxListeners });
      emitter.setMaxListeners(maxListeners);
    }
  }

  /**
   * Clean up all tracked event emitters
   */
  cleanup(): void {
    for (const [emitter, { originalMaxListeners }] of this.trackedEmitters) {
      try {
        // Remove all listeners
        emitter.removeAllListeners();
        // Restore original max listeners
        emitter.setMaxListeners(originalMaxListeners);
      } catch (error) {
        process.stderr.write(`WARNING: Error cleaning up event emitter: ${error}\n`);
      }
    }
    this.trackedEmitters.clear();
  }

  /**
   * Get the number of tracked emitters
   */
  getTrackedEmitterCount(): number {
    return this.trackedEmitters.size;
  }
}

/**
 * Utility to prevent EventEmitter memory leak warnings in tests
 * @param emitter Event emitter to configure
 * @param maxListeners Maximum number of listeners (default: 20)
 */
export function preventEventEmitterLeaks(emitter: EventEmitter, maxListeners: number = 20): void {
  const tracker = EventListenerTracker.getInstance();
  tracker.trackEmitter(emitter, maxListeners);
}

/**
 * Clean up all tracked event emitters
 */
export function cleanupEventEmitters(): void {
  const tracker = EventListenerTracker.getInstance();
  tracker.cleanup();
}

/**
 * Create a test-safe event emitter with increased max listeners
 * @param maxListeners Maximum number of listeners (default: 20)
 * @returns Event emitter configured for testing
 */
export function createTestEventEmitter(maxListeners: number = 20): EventEmitter {
  const emitter = new EventEmitter();
  preventEventEmitterLeaks(emitter, maxListeners);
  return emitter;
}

/**
 * Wrap a function to ensure event emitter cleanup
 * @param fn Function to wrap
 * @returns Wrapped function with automatic cleanup
 */
export function withEventCleanup<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.finally(() => {
          cleanupEventEmitters();
        });
      }
      return result;
    } finally {
      if (!(fn(...args) instanceof Promise)) {
        cleanupEventEmitters();
      }
    }
  }) as T;
}
