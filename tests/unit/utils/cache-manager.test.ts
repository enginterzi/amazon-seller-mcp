/**
 * Tests for cache manager utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { CacheManager, configureCacheManager, getCacheManager } from '../../../src/utils/cache-manager.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  const mockFs = fs as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default cache manager
    (global as any).__defaultCacheManager = undefined;
  });

  afterEach(() => {
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  describe('constructor', () => {
    it('should create cache manager with default configuration', () => {
      cacheManager = new CacheManager();
      
      expect(cacheManager).toBeDefined();
      expect(cacheManager.getStats()).toEqual({
        hits: 0,
        misses: 0,
        size: 0,
        hitRatio: 0,
      });
    });

    it('should create cache manager with custom configuration', () => {
      cacheManager = new CacheManager({
        defaultTtl: 120,
        maxEntries: 500,
        persistent: true,
        persistentDir: '/tmp/test-cache',
        collectStats: false,
      });
      
      expect(cacheManager).toBeDefined();
    });

    it('should initialize persistent cache when enabled', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      
      cacheManager = new CacheManager({
        persistent: true,
        persistentDir: '/tmp/test-cache',
      });
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/test-cache', { recursive: true });
    });

    it('should handle persistent cache initialization errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      cacheManager = new CacheManager({
        persistent: true,
        persistentDir: '/tmp/test-cache',
      });
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/test-cache', { recursive: true });
    });
  });

  describe('memory cache operations', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({
        defaultTtl: 60,
        collectStats: true,
      });
    });

    it('should set and get values from memory cache', async () => {
      const testValue = { data: 'test' };
      
      await cacheManager.set('test-key', testValue);
      const result = await cacheManager.get('test-key');
      
      expect(result).toEqual(testValue);
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(1);
      expect(stats.hitRatio).toBe(1);
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent');
      
      expect(result).toBeUndefined();
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.hitRatio).toBe(0);
    });

    it('should delete values from cache', async () => {
      await cacheManager.set('test-key', 'test-value');
      
      const deleted = await cacheManager.del('test-key');
      expect(deleted).toBe(true);
      
      const result = await cacheManager.get('test-key');
      expect(result).toBeUndefined();
    });

    it('should return false when deleting non-existent keys', async () => {
      const deleted = await cacheManager.del('non-existent');
      expect(deleted).toBe(false);
    });

    it('should clear all cache entries', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.clear();
      
      const result1 = await cacheManager.get('key1');
      const result2 = await cacheManager.get('key2');
      
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });

    it('should handle custom TTL values', async () => {
      await cacheManager.set('test-key', 'test-value', 120);
      const result = await cacheManager.get('test-key');
      
      expect(result).toBe('test-value');
    });

    it('should track access count and timestamps', async () => {
      await cacheManager.set('test-key', 'test-value');
      
      // Access the key multiple times
      await cacheManager.get('test-key');
      await cacheManager.get('test-key');
      await cacheManager.get('test-key');
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(3);
    });
  });

  describe('persistent cache operations', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('{"value":"test-value","expiresAt":null,"createdAt":1234567890}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['test.cache']);
      
      cacheManager = new CacheManager({
        persistent: true,
        persistentDir: '/tmp/test-cache',
      });
    });

    it('should retrieve values from persistent cache when not in memory', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockFs.readFile).toHaveBeenCalled();
    });

    it('should store values in persistent cache', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await cacheManager.set('test-key', 'test-value');
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle expired persistent cache entries', async () => {
      const expiredData = JSON.stringify({
        value: 'expired-value',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        createdAt: Date.now() - 2000,
      });
      
      mockFs.readFile.mockResolvedValue(expiredData);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheManager.get('expired-key');
      
      expect(result).toBeUndefined();
      expect(mockFs.unlink).toHaveBeenCalled(); // Should delete expired file
    });

    it('should handle persistent cache read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read error'));
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBeUndefined();
    });

    it('should handle persistent cache write errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not throw error
      await expect(cacheManager.set('test-key', 'test-value')).resolves.toBeUndefined();
    });

    it('should delete from persistent cache', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await cacheManager.del('test-key');
      
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle persistent cache delete errors gracefully', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Delete error'));
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not throw error
      await expect(cacheManager.del('test-key')).resolves.toBe(false);
    });

    it('should clear persistent cache files', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await cacheManager.clear();
      
      expect(mockFs.readdir).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle persistent cache clear errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Read directory error'));
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not throw error
      await expect(cacheManager.clear()).resolves.toBeUndefined();
    });

    it('should handle non-existent files when accessing persistent cache', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheManager.get('non-existent');
      
      expect(result).toBeUndefined();
    });

    it('should handle non-existent files when deleting from persistent cache', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await cacheManager.del('non-existent');
      
      // Should not attempt to delete non-existent file
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('withCache helper method', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    it('should execute function and cache result on cache miss', async () => {
      const mockFn = vi.fn().mockResolvedValue('function-result');
      
      const result = await cacheManager.withCache('cache-key', mockFn);
      
      expect(result).toBe('function-result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Verify result is cached
      const cachedResult = await cacheManager.get('cache-key');
      expect(cachedResult).toBe('function-result');
    });

    it('should return cached result without executing function on cache hit', async () => {
      const mockFn = vi.fn().mockResolvedValue('function-result');
      
      // First call - cache miss
      await cacheManager.withCache('cache-key', mockFn);
      
      // Second call - cache hit
      const result = await cacheManager.withCache('cache-key', mockFn);
      
      expect(result).toBe('function-result');
      expect(mockFn).toHaveBeenCalledTimes(1); // Function should only be called once
    });

    it('should use custom TTL when provided', async () => {
      const mockFn = vi.fn().mockResolvedValue('function-result');
      
      const result = await cacheManager.withCache('cache-key', mockFn, 300);
      
      expect(result).toBe('function-result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('statistics collection', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ collectStats: true });
    });

    it('should collect hit and miss statistics', async () => {
      await cacheManager.set('key1', 'value1');
      
      // Generate hits
      await cacheManager.get('key1');
      await cacheManager.get('key1');
      
      // Generate misses
      await cacheManager.get('key2');
      await cacheManager.get('key3');
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRatio).toBe(0.5);
      expect(stats.size).toBe(1);
    });

    it('should not collect statistics when disabled', () => {
      const cacheManagerNoStats = new CacheManager({ collectStats: false });
      
      const stats = cacheManagerNoStats.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRatio).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should update size statistics when entries are added and removed', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      let stats = cacheManager.getStats();
      expect(stats.size).toBe(2);
      
      await cacheManager.del('key1');
      
      stats = cacheManager.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('default cache manager functions', () => {
    afterEach(() => {
      // Clean up global state
      (global as any).__defaultCacheManager = undefined;
    });

    it('should configure default cache manager', () => {
      const config = {
        defaultTtl: 300,
        maxEntries: 2000,
      };
      
      configureCacheManager(config);
      const defaultManager = getCacheManager();
      
      expect(defaultManager).toBeDefined();
    });

    it('should get default cache manager and create if not exists', () => {
      const defaultManager = getCacheManager();
      
      expect(defaultManager).toBeDefined();
      expect(defaultManager).toBeInstanceOf(CacheManager);
    });

    it('should return same instance on multiple calls', () => {
      const manager1 = getCacheManager();
      const manager2 = getCacheManager();
      
      expect(manager1).toBe(manager2);
    });
  });

  describe('cache key hashing for persistent storage', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      cacheManager = new CacheManager({
        persistent: true,
        persistentDir: '/tmp/test-cache',
      });
    });

    it('should handle special characters in cache keys', async () => {
      const specialKey = 'key/with\\special:characters?and=symbols';
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await cacheManager.set(specialKey, 'test-value');
      
      // Should not throw error and should call writeFile with hashed filename
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeCall[0];
      
      // Verify the filename (not full path) doesn't contain special characters
      const filename = filePath.split('/').pop() || '';
      expect(filename).not.toContain('\\');
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('?');
      expect(filename).not.toContain('=');
    });
  });
});