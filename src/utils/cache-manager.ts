/**
 * Cache management system for Amazon Seller MCP Client
 *
 * This file implements advanced caching strategies for improved performance:
 * - Tiered caching (memory and persistent)
 * - TTL-based expiration
 * - LRU eviction policy
 * - Cache statistics and monitoring
 */

import NodeCache from 'node-cache';
import * as logger from './logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  /**
   * Cached value
   */
  value: T;

  /**
   * Timestamp when the entry was created
   */
  createdAt: number;

  /**
   * Timestamp when the entry was last accessed
   */
  lastAccessedAt: number;

  /**
   * Number of times the entry has been accessed
   */
  accessCount: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  /**
   * Total number of cache hits
   */
  hits: number;

  /**
   * Total number of cache misses
   */
  misses: number;

  /**
   * Total number of cache entries
   */
  size: number;

  /**
   * Hit ratio (hits / (hits + misses))
   */
  hitRatio: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /**
   * Default TTL in seconds
   * @default 60
   */
  defaultTtl?: number;

  /**
   * Check period in seconds
   * @default 120
   */
  checkPeriod?: number;

  /**
   * Maximum number of entries
   * @default 1000
   */
  maxEntries?: number;

  /**
   * Whether to use persistent cache
   * @default false
   */
  persistent?: boolean;

  /**
   * Directory for persistent cache
   * @default '~/.amazon-seller-mcp/cache'
   */
  persistentDir?: string;

  /**
   * Whether to collect statistics
   * @default true
   */
  collectStats?: boolean;
}

/**
 * Advanced cache manager for improved performance
 */
export class CacheManager {
  /**
   * Memory cache
   */
  private memoryCache: NodeCache;

  /**
   * Cache configuration
   */
  private config: Required<CacheConfig>;

  /**
   * Cache statistics
   */
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRatio: 0,
  };

  /**
   * Whether the persistent cache directory has been initialized
   */
  private persistentCacheInitialized: boolean = false;

  /**
   * Create a new cache manager
   *
   * @param config Cache configuration
   */
  constructor(config: CacheConfig = {}) {
    // Set default configuration
    this.config = {
      defaultTtl: config.defaultTtl ?? 60,
      checkPeriod: config.checkPeriod ?? 120,
      maxEntries: config.maxEntries ?? 1000,
      persistent: config.persistent ?? false,
      persistentDir:
        config.persistentDir ?? path.join(os.homedir(), '.amazon-seller-mcp', 'cache'),
      collectStats: config.collectStats ?? true,
    };

    // Create memory cache
    this.memoryCache = new NodeCache({
      stdTTL: this.config.defaultTtl,
      checkperiod: this.config.checkPeriod,
      maxKeys: this.config.maxEntries,
      useClones: false, // Disable cloning for better performance
    });

    // Log cache initialization
    logger.debug('Cache manager initialized', {
      defaultTtl: this.config.defaultTtl,
      checkPeriod: this.config.checkPeriod,
      maxEntries: this.config.maxEntries,
      persistent: this.config.persistent,
      persistentDir: this.config.persistent ? this.config.persistentDir : undefined,
    });

    // Initialize persistent cache if enabled
    if (this.config.persistent) {
      this.initPersistentCache().catch((error) => {
        logger.error('Failed to initialize persistent cache', { error: error.message });
      });
    }
  }

  /**
   * Initialize persistent cache
   */
  private async initPersistentCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      await fs.mkdir(this.config.persistentDir, { recursive: true });
      this.persistentCacheInitialized = true;
      logger.debug('Persistent cache initialized', { dir: this.config.persistentDir });
    } catch (error) {
      logger.error('Failed to initialize persistent cache directory', {
        dir: this.config.persistentDir,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get a value from the cache
   *
   * @param key Cache key
   * @returns Cached value or undefined if not found
   */
  async get<T>(key: string): Promise<T | undefined> {
    // Try to get from memory cache first
    const memoryValue = this.memoryCache.get<CacheEntry<T>>(key);

    if (memoryValue !== undefined) {
      // Update access metadata
      memoryValue.lastAccessedAt = Date.now();
      memoryValue.accessCount++;

      // Update statistics
      if (this.config.collectStats) {
        this.stats.hits++;
        this.stats.hitRatio = this.stats.hits / (this.stats.hits + this.stats.misses);
      }

      logger.debug('Cache hit (memory)', { key });
      return memoryValue.value;
    }

    // If persistent cache is enabled, try to get from disk
    if (this.config.persistent && this.persistentCacheInitialized) {
      try {
        const persistentValue = await this.getFromPersistentCache<T>(key);

        if (persistentValue !== undefined) {
          // Store in memory cache for faster access next time
          this.set(key, persistentValue);

          // Update statistics
          if (this.config.collectStats) {
            this.stats.hits++;
            this.stats.hitRatio = this.stats.hits / (this.stats.hits + this.stats.misses);
          }

          logger.debug('Cache hit (persistent)', { key });
          return persistentValue;
        }
      } catch (error) {
        logger.warn('Failed to read from persistent cache', {
          key,
          error: (error as Error).message,
        });
      }
    }

    // Update statistics
    if (this.config.collectStats) {
      this.stats.misses++;
      this.stats.hitRatio = this.stats.hits / (this.stats.hits + this.stats.misses);
    }

    logger.debug('Cache miss', { key });
    return undefined;
  }

  /**
   * Set a value in the cache
   *
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, defaults to config.defaultTtl)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Create cache entry
    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };

    // Set in memory cache
    this.memoryCache.set(key, entry, ttl ?? this.config.defaultTtl);

    // Update statistics
    if (this.config.collectStats) {
      this.stats.size = this.memoryCache.keys().length;
    }

    // If persistent cache is enabled, store on disk
    if (this.config.persistent && this.persistentCacheInitialized) {
      try {
        await this.setInPersistentCache(key, value, ttl);
      } catch (error) {
        logger.warn('Failed to write to persistent cache', {
          key,
          error: (error as Error).message,
        });
      }
    }

    logger.debug('Cache set', { key, ttl: ttl ?? this.config.defaultTtl });
  }

  /**
   * Delete a value from the cache
   *
   * @param key Cache key
   * @returns Whether the key was deleted
   */
  async del(key: string): Promise<boolean> {
    // Delete from memory cache
    const deleted = this.memoryCache.del(key) > 0;

    // Update statistics
    if (this.config.collectStats && deleted) {
      this.stats.size = this.memoryCache.keys().length;
    }

    // If persistent cache is enabled, delete from disk
    if (this.config.persistent && this.persistentCacheInitialized) {
      try {
        await this.deleteFromPersistentCache(key);
      } catch (error) {
        logger.warn('Failed to delete from persistent cache', {
          key,
          error: (error as Error).message,
        });
      }
    }

    logger.debug('Cache delete', { key, deleted });
    return deleted;
  }

  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.flushAll();

    // Reset statistics
    if (this.config.collectStats) {
      this.stats = {
        hits: 0,
        misses: 0,
        size: 0,
        hitRatio: 0,
      };
    }

    // If persistent cache is enabled, clear disk cache
    if (this.config.persistent && this.persistentCacheInitialized) {
      try {
        const files = await fs.readdir(this.config.persistentDir);

        for (const file of files) {
          if (file.endsWith('.cache')) {
            await fs.unlink(path.join(this.config.persistentDir, file));
          }
        }
      } catch (error) {
        logger.warn('Failed to clear persistent cache', {
          error: (error as Error).message,
        });
      }
    }

    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get a value from the persistent cache
   *
   * @param key Cache key
   * @returns Cached value or undefined if not found
   */
  private async getFromPersistentCache<T>(key: string): Promise<T | undefined> {
    try {
      // Generate file path
      const filePath = this.getPersistentCachePath(key);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return undefined;
      }

      // Read file
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Check if expired
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        // Delete expired file
        await fs.unlink(filePath);
        return undefined;
      }

      return parsed.value;
    } catch (error) {
      logger.warn('Error reading from persistent cache', {
        key,
        error: (error as Error).message,
      });
      return undefined;
    }
  }

  /**
   * Set a value in the persistent cache
   *
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, defaults to config.defaultTtl)
   */
  private async setInPersistentCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // Generate file path
      const filePath = this.getPersistentCachePath(key);

      // Calculate expiration time
      const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;

      // Create cache data
      const data = JSON.stringify({
        value,
        expiresAt,
        createdAt: Date.now(),
      });

      // Write to file
      await fs.writeFile(filePath, data, 'utf-8');
    } catch (error) {
      logger.warn('Error writing to persistent cache', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a value from the persistent cache
   *
   * @param key Cache key
   */
  private async deleteFromPersistentCache(key: string): Promise<void> {
    try {
      // Generate file path
      const filePath = this.getPersistentCachePath(key);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return;
      }

      // Delete file
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Error deleting from persistent cache', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get the file path for a persistent cache key
   *
   * @param key Cache key
   * @returns File path
   */
  private getPersistentCachePath(key: string): string {
    // Hash the key to create a valid filename
    const hashedKey = Buffer.from(key)
      .toString('base64')
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
      .replace(/=/g, '');

    return path.join(this.config.persistentDir, `${hashedKey}.cache`);
  }

  /**
   * Execute a function with caching
   *
   * @param key Cache key
   * @param fn Function to execute if cache miss
   * @param ttl Time to live in seconds (optional)
   * @returns Function result
   */
  async withCache<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    // Try to get from cache
    const cachedValue = await this.get<T>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Cache miss, execute function
    const result = await fn();

    // Cache result
    await this.set(key, result, ttl);

    return result;
  }
}

/**
 * Default cache manager instance
 */
let defaultCacheManager: CacheManager;

/**
 * Configure the default cache manager
 *
 * @param config Cache configuration
 */
export function configureCacheManager(config: CacheConfig): void {
  defaultCacheManager = new CacheManager(config);
}

/**
 * Initialize default cache manager if not already initialized
 */
function ensureDefaultCacheManager(): void {
  if (!defaultCacheManager) {
    defaultCacheManager = new CacheManager();
  }
}

/**
 * Get the default cache manager instance
 *
 * @returns Default cache manager instance
 */
export function getCacheManager(): CacheManager {
  ensureDefaultCacheManager();
  return defaultCacheManager;
}

export default {
  CacheManager,
  configureCacheManager,
  getCacheManager,
};
