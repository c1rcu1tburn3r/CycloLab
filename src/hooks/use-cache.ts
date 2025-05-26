'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Tipi per il sistema di cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface CacheOptions {
  ttl?: number; // Default 5 minuti
  staleWhileRevalidate?: boolean; // Default true
  maxSize?: number; // Default 100 entries
}

interface UseCacheOptions<T> extends CacheOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

// Cache globale in memoria
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // Se la cache è piena, rimuovi l'entry più vecchia
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    });
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  isStale(key: string, staleTime = 30000): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    const now = Date.now();
    return now - entry.timestamp > staleTime;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Istanza globale della cache
const globalCache = new MemoryCache(200);

// Hook principale per il caching
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions<T> = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minuti default
    staleWhileRevalidate = true,
    enabled = true,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    try {
      setError(null);

      // Controlla cache solo se non è un refresh forzato
      if (!forceRefresh) {
        const cached = globalCache.get<T>(key);
        if (cached) {
          setData(cached.data);
          setIsStale(globalCache.isStale(key));
          
          // Se staleWhileRevalidate è abilitato e i dati sono stale, 
          // aggiorna in background
          if (staleWhileRevalidate && globalCache.isStale(key)) {
            setIsLoading(true);
            try {
              const freshData = await fetcherRef.current();
              globalCache.set(key, freshData, ttl);
              setData(freshData);
              setIsStale(false);
              onSuccess?.(freshData);
            } catch (bgError) {
              console.warn('Background refresh failed:', bgError);
            } finally {
              setIsLoading(false);
            }
          }
          return cached.data;
        }
      }

      // Nessun dato in cache o refresh forzato
      setIsLoading(true);
      const freshData = await fetcherRef.current();
      
      globalCache.set(key, freshData, ttl);
      setData(freshData);
      setIsStale(false);
      onSuccess?.(freshData);
      
      return freshData;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, ttl, enabled, staleWhileRevalidate, onError, onSuccess]);

  // Carica i dati al mount o quando cambia la key
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  // Funzioni di utilità
  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      globalCache.set(key, newData, ttl);
      setData(newData);
      setIsStale(false);
    } else {
      return fetchData(true);
    }
  }, [key, ttl, fetchData]);

  const invalidate = useCallback(() => {
    globalCache.invalidate(key);
    setData(null);
    setIsStale(true);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    isStale,
    mutate,
    invalidate,
    refetch: () => fetchData(true)
  };
}

// Hook specializzato per query Supabase
export function useSupabaseCache<T>(
  key: string,
  query: () => Promise<{ data: T | null; error: any }>,
  options: UseCacheOptions<T> = {}
) {
  const fetcher = useCallback(async () => {
    const result = await query();
    if (result.error) {
      throw new Error(result.error.message || 'Supabase query failed');
    }
    return result.data!;
  }, [query]);

  return useCache(key, fetcher, options);
}

// Hook per invalidazione di pattern
export function useCacheInvalidation() {
  const invalidatePattern = useCallback((pattern: string) => {
    globalCache.invalidatePattern(pattern);
  }, []);

  const invalidateKey = useCallback((key: string) => {
    globalCache.invalidate(key);
  }, []);

  const clearAll = useCallback(() => {
    globalCache.clear();
  }, []);

  const getStats = useCallback(() => {
    return globalCache.getStats();
  }, []);

  return {
    invalidatePattern,
    invalidateKey,
    clearAll,
    getStats
  };
}

// Hook per cache con dipendenze (per invalidazione automatica)
export function useCacheWithDeps<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: string[],
  options: UseCacheOptions<T> = {}
) {
  const cache = useCache(key, fetcher, options);
  const { invalidatePattern } = useCacheInvalidation();

  // Funzione per invalidare cache correlate quando i dati cambiano
  const invalidateRelated = useCallback(() => {
    dependencies.forEach(dep => {
      invalidatePattern(dep);
    });
  }, [dependencies, invalidatePattern]);

  return {
    ...cache,
    invalidateRelated
  };
}

// Utility per creare chiavi di cache consistenti
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

// Hook per cache con refresh automatico
export function useAutoRefreshCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  refreshInterval: number = 60000, // 1 minuto default
  options: UseCacheOptions<T> = {}
) {
  const cache = useCache(key, fetcher, options);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        cache.refetch();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, cache.refetch]);

  return cache;
}

export default useCache; 