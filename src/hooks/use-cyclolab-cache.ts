'use client';

import { useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCache, useCacheWithDeps, createCacheKey, useCacheInvalidation } from './use-cache';
import type { Athlete, Activity } from '@/lib/types';

// Hook per atleti dell'utente corrente
export function useAthletes(userId?: string) {
  const supabase = createClient();
  
  const query = useCallback(async () => {
    if (!userId) throw new Error('User ID required');
    
    const result = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (result.error) throw new Error(result.error.message);
    return result.data || [];
  }, [userId]);

  const cacheKey = createCacheKey('athletes', { userId: userId || 'none' });
  
  return useCache<Athlete[]>(cacheKey, query, {
    ttl: 10 * 60 * 1000, // 10 minuti - dati relativamente statici
    enabled: !!userId
  });
}

// Hook per attività di un atleta specifico
export function useAthleteActivities(athleteId?: string, userId?: string, limit = 20) {
  const supabase = createClient();
  
  const query = useCallback(async () => {
    if (!athleteId || !userId) throw new Error('Athlete ID and User ID required');
    
    const result = await supabase
      .from('activities')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(limit);
    
    if (result.error) throw new Error(result.error.message);
    return result.data || [];
  }, [athleteId, userId, limit]);

  const cacheKey = createCacheKey('athlete_activities', { 
    athleteId: athleteId || 'none', 
    userId: userId || 'none',
    limit 
  });
  
  return useCacheWithDeps<Activity[]>(
    cacheKey, 
    query, 
    [`activities:${userId}`, `athlete:${athleteId}`], // Dipendenze per invalidazione
    {
      ttl: 5 * 60 * 1000, // 5 minuti - dati più dinamici
      enabled: !!athleteId && !!userId
    }
  );
}

// Hook per invalidazione intelligente
export function useCycloLabCacheInvalidation() {
  const { invalidatePattern, invalidateKey } = useCacheInvalidation();
  
  // Invalida cache quando viene aggiunto un nuovo atleta
  const invalidateOnAthleteChange = useCallback((userId: string) => {
    invalidatePattern(`athletes:.*userId:${userId}`);
  }, [invalidatePattern]);
  
  // Invalida cache quando viene aggiunta/modificata un'attività
  const invalidateOnActivityChange = useCallback((userId: string, athleteId?: string) => {
    invalidatePattern(`user_activities:.*userId:${userId}`);
    
    if (athleteId) {
      invalidatePattern(`athlete_activities:.*athleteId:${athleteId}`);
    }
  }, [invalidatePattern]);

  return {
    invalidateOnAthleteChange,
    invalidateOnActivityChange,
    invalidatePattern,
    invalidateKey
  };
} 