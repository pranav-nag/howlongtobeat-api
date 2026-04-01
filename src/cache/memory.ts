import NodeCache from 'node-cache';

export class CacheManager {
  private cache: NodeCache;

  constructor(ttlSeconds: number = 86400) { // Default 24 hours
    this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: 120 });
  }

  get<T>(key: string): T | null {
    const value = this.cache.get<T>(key);
    return value !== undefined ? value : null;
  }

  set<T>(key: string, value: T): boolean {
    return this.cache.set(key, value);
  }
}

export const appCache = new CacheManager();
