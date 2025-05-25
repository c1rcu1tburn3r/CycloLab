import { useState, useEffect } from 'react';
import type { Athlete, AthleteProfileEntry, Activity } from '@/lib/types';

interface AthleteData {
  athlete: Athlete | null;
  profileEntries: AthleteProfileEntry[];
  activities: Activity[];
  lastFetched: number;
}

interface CacheEntry {
  data: AthleteData;
  timestamp: number;
}

// Cache globale per i dati atleti
const athleteCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

export function useAthleteCache(athleteId: string) {
  const [cachedData, setCachedData] = useState<AthleteData | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    const cacheKey = `athlete_${athleteId}`;
    const cached = athleteCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setCachedData(cached.data);
      setIsFromCache(true);
    } else {
      setIsFromCache(false);
    }
  }, [athleteId]);

  const setCacheData = (data: AthleteData) => {
    const cacheKey = `athlete_${athleteId}`;
    athleteCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    setCachedData(data);
  };

  const clearCache = (athleteId?: string) => {
    if (athleteId) {
      athleteCache.delete(`athlete_${athleteId}`);
    } else {
      athleteCache.clear();
    }
  };

  return {
    cachedData,
    isFromCache,
    setCacheData,
    clearCache
  };
} 