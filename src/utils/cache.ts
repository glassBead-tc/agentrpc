/**
 * Cache entry
 */
interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** The timestamp when the entry was created */
  timestamp: number;
  /** The time-to-live in milliseconds */
  ttlMs: number;
}

/**
 * Simple in-memory cache for tool execution results
 */
export class ToolCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxEntries: number;
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Create a new tool cache
   * @param options Options for the cache
   */
  constructor(options: { maxEntries?: number; cleanupIntervalMs?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 1000;

    // Start the cleanup interval if specified
    if (options.cleanupIntervalMs) {
      this.startCleanup(options.cleanupIntervalMs);
    }
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttlMs The time-to-live in milliseconds (0 for no expiration)
   */
  set<T>(key: string, value: T, ttlMs: number = 0): void {
    // If the cache is full, remove the oldest entry
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttlMs,
    });
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value, or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if the entry has expired
    if (entry.ttlMs > 0 && Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param key The cache key
   * @returns True if the key exists and is not expired, false otherwise
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if the entry has expired
    if (entry.ttlMs > 0 && Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   * @param key The cache key
   * @returns True if the key was deleted, false if it didn't exist
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   * @returns The number of entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Start the cleanup interval
   * @param intervalMs The interval in milliseconds
   */
  startCleanup(intervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttlMs > 0 && now - entry.timestamp > entry.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Find the oldest entry in the cache
   * @returns The key of the oldest entry, or undefined if the cache is empty
   */
  private findOldestEntry(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestKey = key;
        oldestTimestamp = entry.timestamp;
      }
    }

    return oldestKey;
  }
}

// Create a default cache instance
export const toolCache = new ToolCache({ cleanupIntervalMs: 300000 });
