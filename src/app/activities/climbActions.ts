'use server';

// =====================================================
// CYCLOLAB CLIMB DETECTION SERVER ACTIONS
// =====================================================
// Server actions per gestione salite rilevate automaticamente
// =====================================================

import { createClient } from '@/utils/supabase/server';
import { detectClimbs, DetectedClimb, generateClimbName } from '@/lib/climbDetection';
import { RoutePoint } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Tipi per database
export interface DbDetectedClimb {
  id: string;
  user_id: string;
  activity_id: string;
  name: string | null;
  start_point_index: number;
  end_point_index: number;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  distance_meters: number;
  elevation_gain_meters: number;
  elevation_loss_meters: number;
  avg_gradient_percent: number;
  max_gradient_percent: number;
  min_gradient_percent: number;
  duration_seconds: number;
  avg_speed_kph: number;
  avg_power_watts: number | null;
  max_power_watts: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_cadence: number | null;
  vam_meters_per_hour: number;
  climb_score: number;
  category: string;
  difficulty_rating: number;
  is_significant: boolean;
  is_named: boolean;
  is_favorite: boolean;
  detection_algorithm_version: string;
  created_at: string;
  updated_at: string;
}

export interface ClimbPerformance {
  id: string;
  user_id: string;
  athlete_id: string;
  detected_climb_id: string;
  activity_id: string;
  time_seconds: number;
  avg_power_watts: number | null;
  normalized_power_watts: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_cadence: number | null;
  vam_meters_per_hour: number;
  power_to_weight_ratio: number | null;
  efficiency_score: number | null;
  personal_rank: number | null;
  is_personal_best: boolean;
  improvement_seconds: number | null;
  created_at: string;
}

export interface PersonalClimbRanking {
  id: string;
  user_id: string;
  athlete_id: string;
  detected_climb_id: string;
  best_time_seconds: number;
  best_power_watts: number | null;
  best_vam_meters_per_hour: number | null;
  total_attempts: number;
  last_attempt_date: string;
  improvement_trend: string | null;
  consistency_score: number | null;
}

// =====================================================
// RILEVAMENTO E SALVATAGGIO SALITE
// =====================================================

/**
 * Rileva e salva automaticamente le salite da un'attività
 */
export async function detectAndSaveClimbs(
  activityId: string,
  routePoints: RoutePoint[],
  activityTitle?: string
): Promise<{ success: boolean; climbs: DbDetectedClimb[]; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, climbs: [], error: 'Non autenticato' };
    }

    // Ottieni dati attività per athlete_id
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('athlete_id, title')
      .eq('id', activityId)
      .eq('user_id', user.id)
      .single();

    if (activityError || !activity) {
      return { success: false, climbs: [], error: 'Attività non trovata' };
    }

    // Rileva salite dai dati GPS
    const detectedClimbs = detectClimbs(routePoints);
    
    if (detectedClimbs.length === 0) {
      return { success: true, climbs: [], error: 'Nessuna salita significativa rilevata' };
    }

    // Prepara dati per inserimento database
    const climbsToInsert = detectedClimbs.map(climb => ({
      user_id: user.id,
      activity_id: activityId,
      name: generateClimbName(climb, activityTitle || activity.title),
      start_point_index: climb.startIndex,
      end_point_index: climb.endIndex,
      start_lat: climb.startPoint.lat,
      start_lon: climb.startPoint.lng,
      end_lat: climb.endPoint.lat,
      end_lon: climb.endPoint.lng,
      distance_meters: Math.round(climb.distance),
      elevation_gain_meters: Math.round(climb.elevationGain),
      elevation_loss_meters: Math.round(climb.elevationLoss),
      avg_gradient_percent: Number(climb.avgGradient.toFixed(2)),
      max_gradient_percent: Number(climb.maxGradient.toFixed(2)),
      min_gradient_percent: Number(climb.minGradient.toFixed(2)),
      duration_seconds: Math.round(climb.duration),
      avg_speed_kph: Number(climb.avgSpeed.toFixed(2)),
      avg_power_watts: climb.avgPower ? Math.round(climb.avgPower) : null,
      max_power_watts: climb.maxPower ? Math.round(climb.maxPower) : null,
      avg_heart_rate: climb.avgHeartRate ? Math.round(climb.avgHeartRate) : null,
      max_heart_rate: climb.maxHeartRate ? Math.round(climb.maxHeartRate) : null,
      avg_cadence: climb.avgCadence ? Number(climb.avgCadence.toFixed(1)) : null,
      vam_meters_per_hour: Math.round(climb.vam),
      climb_score: Math.round(climb.climbScore),
      category: climb.category,
      difficulty_rating: Math.round(climb.difficultyRating),
      is_significant: climb.isSignificant,
      is_named: false,
      is_favorite: false,
      detection_algorithm_version: '3.0'
    }));

    // Inserisci salite nel database
    const { data: insertedClimbs, error: insertError } = await supabase
      .from('detected_climbs')
      .insert(climbsToInsert)
      .select();

    if (insertError) {
      console.error('Errore inserimento salite:', insertError);
      return { success: false, climbs: [], error: 'Errore salvataggio salite' };
    }

    // Crea performance records per ogni salita
    const performancesToInsert = insertedClimbs.map((dbClimb, index) => {
      const originalClimb = detectedClimbs[index];
      return {
        user_id: user.id,
        athlete_id: activity.athlete_id,
        detected_climb_id: dbClimb.id,
        activity_id: activityId,
        time_seconds: Math.round(originalClimb.duration),
        avg_power_watts: originalClimb.avgPower ? Math.round(originalClimb.avgPower) : null,
        avg_heart_rate: originalClimb.avgHeartRate ? Math.round(originalClimb.avgHeartRate) : null,
        max_heart_rate: originalClimb.maxHeartRate ? Math.round(originalClimb.maxHeartRate) : null,
        avg_cadence: originalClimb.avgCadence ? Number(originalClimb.avgCadence.toFixed(1)) : null,
        vam_meters_per_hour: Math.round(originalClimb.vam),
        is_personal_best: true
      };
    });

    const { error: performanceError } = await supabase
      .from('climb_performances')
      .insert(performancesToInsert);

    if (performanceError) {
      console.error('Errore inserimento performance:', performanceError);
      // Non blocchiamo per errori performance, salite già salvate
    }

    // Revalida cache
    revalidatePath(`/activities/${activityId}`);
    revalidatePath('/activities');

    return { success: true, climbs: insertedClimbs as DbDetectedClimb[] };

  } catch (error) {
    console.error('Errore rilevamento salite:', error);
    return { success: false, climbs: [], error: 'Errore interno server' };
  }
}

// =====================================================
// RECUPERO SALITE
// =====================================================

/**
 * Ottieni tutte le salite rilevate per un'attività
 */
export async function getActivityClimbs(
  activityId: string
): Promise<{ success: boolean; climbs: DbDetectedClimb[]; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, climbs: [], error: 'Non autenticato' };
    }

    const { data: climbs, error } = await supabase
      .from('detected_climbs')
      .select('*')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .eq('is_significant', true)
      .order('climb_score', { ascending: false });

    if (error) {
      console.error('Errore recupero salite:', error);
      return { success: false, climbs: [], error: 'Errore recupero salite' };
    }

    return { success: true, climbs: (climbs || []) as DbDetectedClimb[] };

  } catch (error) {
    console.error('Errore recupero salite:', error);
    return { success: false, climbs: [], error: 'Errore interno server' };
  }
}

/**
 * Ottieni top salite personali per un atleta
 */
export async function getAthleteTopClimbs(
  athleteId: string,
  limit: number = 10
): Promise<{ success: boolean; climbs: any[]; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, climbs: [], error: 'Non autenticato' };
    }

    const { data: climbs, error } = await supabase
      .from('user_top_climbs')
      .select('*')
      .eq('user_id', user.id)
      .limit(limit);

    if (error) {
      console.error('Errore recupero top salite:', error);
      return { success: false, climbs: [], error: 'Errore recupero top salite' };
    }

    return { success: true, climbs: climbs || [] };

  } catch (error) {
    console.error('Errore recupero top salite:', error);
    return { success: false, climbs: [], error: 'Errore interno server' };
  }
}

/**
 * Ottieni performance recenti su salite
 */
export async function getRecentClimbPerformances(
  athleteId: string,
  limit: number = 20
): Promise<{ success: boolean; performances: any[]; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, performances: [], error: 'Non autenticato' };
    }

    const { data: performances, error } = await supabase
      .from('recent_climb_performances')
      .select('*')
      .eq('user_id', user.id)
      .eq('athlete_id', athleteId)
      .limit(limit);

    if (error) {
      console.error('Errore recupero performance recenti:', error);
      return { success: false, performances: [], error: 'Errore recupero performance' };
    }

    return { success: true, performances: performances || [] };

  } catch (error) {
    console.error('Errore recupero performance recenti:', error);
    return { success: false, performances: [], error: 'Errore interno server' };
  }
}

// =====================================================
// GESTIONE SALITE
// =====================================================

/**
 * Aggiorna nome di una salita
 */
export async function updateClimbName(
  climbId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non autenticato' };
    }

    const { error } = await supabase
      .from('detected_climbs')
      .update({ 
        name: newName,
        is_named: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', climbId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Errore aggiornamento nome salita:', error);
      return { success: false, error: 'Errore aggiornamento nome' };
    }

    revalidatePath('/activities');
    return { success: true };

  } catch (error) {
    console.error('Errore aggiornamento nome salita:', error);
    return { success: false, error: 'Errore interno server' };
  }
}

/**
 * Segna/rimuovi salita come preferita
 */
export async function toggleClimbFavorite(
  climbId: string
): Promise<{ success: boolean; isFavorite: boolean; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, isFavorite: false, error: 'Non autenticato' };
    }

    // Ottieni stato attuale
    const { data: climb, error: fetchError } = await supabase
      .from('detected_climbs')
      .select('is_favorite')
      .eq('id', climbId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !climb) {
      return { success: false, isFavorite: false, error: 'Salita non trovata' };
    }

    const newFavoriteState = !climb.is_favorite;

    const { error } = await supabase
      .from('detected_climbs')
      .update({ 
        is_favorite: newFavoriteState,
        updated_at: new Date().toISOString()
      })
      .eq('id', climbId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Errore toggle preferita:', error);
      return { success: false, isFavorite: false, error: 'Errore aggiornamento' };
    }

    revalidatePath('/activities');
    return { success: true, isFavorite: newFavoriteState };

  } catch (error) {
    console.error('Errore toggle preferita:', error);
    return { success: false, isFavorite: false, error: 'Errore interno server' };
  }
}

/**
 * Elimina una salita rilevata
 */
export async function deleteDetectedClimb(
  climbId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non autenticato' };
    }

    // Elimina prima le performance associate
    const { error: performanceError } = await supabase
      .from('climb_performances')
      .delete()
      .eq('detected_climb_id', climbId)
      .eq('user_id', user.id);

    if (performanceError) {
      console.error('Errore eliminazione performance:', performanceError);
    }

    // Elimina ranking personali
    const { error: rankingError } = await supabase
      .from('personal_climb_rankings')
      .delete()
      .eq('detected_climb_id', climbId)
      .eq('user_id', user.id);

    if (rankingError) {
      console.error('Errore eliminazione ranking:', rankingError);
    }

    // Elimina salita
    const { error } = await supabase
      .from('detected_climbs')
      .delete()
      .eq('id', climbId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Errore eliminazione salita:', error);
      return { success: false, error: 'Errore eliminazione salita' };
    }

    revalidatePath('/activities');
    return { success: true };

  } catch (error) {
    console.error('Errore eliminazione salita:', error);
    return { success: false, error: 'Errore interno server' };
  }
}

// =====================================================
// STATISTICHE E ANALISI
// =====================================================

/**
 * Ottieni statistiche salite per un atleta
 */
export async function getAthleteClimbStats(
  athleteId: string
): Promise<{ 
  success: boolean; 
  stats: {
    totalClimbs: number;
    totalElevationGain: number;
    avgClimbScore: number;
    bestCategory: string;
    favoriteClimbs: number;
    personalBests: number;
  }; 
  error?: string 
}> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { 
        success: false, 
        stats: {
          totalClimbs: 0,
          totalElevationGain: 0,
          avgClimbScore: 0,
          bestCategory: 'uncategorized',
          favoriteClimbs: 0,
          personalBests: 0
        }, 
        error: 'Non autenticato' 
      };
    }

    // Query statistiche aggregate
    const { data: stats, error } = await supabase
      .from('detected_climbs')
      .select(`
        id,
        elevation_gain_meters,
        climb_score,
        category,
        is_favorite
      `)
      .eq('user_id', user.id)
      .eq('is_significant', true);

    if (error) {
      console.error('Errore recupero statistiche:', error);
      return { 
        success: false, 
        stats: {
          totalClimbs: 0,
          totalElevationGain: 0,
          avgClimbScore: 0,
          bestCategory: 'uncategorized',
          favoriteClimbs: 0,
          personalBests: 0
        }, 
        error: 'Errore recupero statistiche' 
      };
    }

    // Calcola statistiche
    const totalClimbs = stats?.length || 0;
    const totalElevationGain = stats?.reduce((sum, climb) => sum + climb.elevation_gain_meters, 0) || 0;
    const avgClimbScore = totalClimbs > 0 ? stats.reduce((sum, climb) => sum + climb.climb_score, 0) / totalClimbs : 0;
    const favoriteClimbs = stats?.filter(climb => climb.is_favorite).length || 0;
    
    // Trova migliore categoria
    const categories = stats?.map(climb => climb.category) || [];
    const categoryPriority = { 'HC': 5, '1': 4, '2': 3, '3': 2, '4': 1, 'uncategorized': 0 };
    const bestCategory = categories.reduce((best, current) => 
      categoryPriority[current as keyof typeof categoryPriority] > categoryPriority[best as keyof typeof categoryPriority] ? current : best, 
      'uncategorized'
    );

    // Conta personal bests
    const { data: pbCount } = await supabase
      .from('climb_performances')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_personal_best', true);

    return { 
      success: true, 
      stats: {
        totalClimbs,
        totalElevationGain,
        avgClimbScore,
        bestCategory,
        favoriteClimbs,
        personalBests: pbCount?.length || 0
      }
    };

  } catch (error) {
    console.error('Errore recupero statistiche:', error);
    return { 
      success: false, 
      stats: {
        totalClimbs: 0,
        totalElevationGain: 0,
        avgClimbScore: 0,
        bestCategory: 'uncategorized',
        favoriteClimbs: 0,
        personalBests: 0
      }, 
      error: 'Errore interno server' 
    };
  }
}

/**
 * Ricalcola le salite esistenti con algoritmo aggiornato
 */
export async function recalculateClimbsWithNewAlgorithm(
  activityId?: string, // Se specificato, ricalcola solo questa attività
  forceVersion?: string // Forza ricalcolo per questa versione
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const supabase = createClient(cookies());
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, updated: 0, error: 'Non autenticato' };
    }

    // Query per trovare salite da ricalcolare
    let query = supabase
      .from('detected_climbs')
      .select('*, activities!inner(route_points, title)')
      .eq('user_id', user.id);

    if (activityId) {
      query = query.eq('activity_id', activityId);
    } else {
      // Ricalcola solo salite con versione vecchia
      query = query.neq('detection_algorithm_version', '2.0');
    }

    if (forceVersion) {
      query = query.eq('detection_algorithm_version', forceVersion);
    }

    const { data: climbsToUpdate, error: fetchError } = await query;

    if (fetchError) {
      console.error('Errore recupero salite da aggiornare:', fetchError);
      return { success: false, updated: 0, error: 'Errore recupero dati' };
    }

    if (!climbsToUpdate || climbsToUpdate.length === 0) {
      return { success: true, updated: 0, error: 'Nessuna salita da aggiornare' };
    }

    let updatedCount = 0;

    for (const oldClimb of climbsToUpdate) {
      try {
        // Ottieni i route points dell'attività
        const routePoints = oldClimb.activities?.route_points;
        if (!routePoints || !Array.isArray(routePoints)) {
          console.warn(`Nessun route_points per attività ${oldClimb.activity_id}`);
          continue;
        }

        // Rileva salite con nuovo algoritmo
        const newClimbs = detectClimbs(routePoints);
        
        // Trova la salita corrispondente (basandosi su coordinate simili)
        const matchingClimb = newClimbs.find(newClimb => {
          const latDiff = Math.abs(newClimb.startPoint.lat - oldClimb.start_lat);
          const lonDiff = Math.abs(newClimb.startPoint.lng - oldClimb.start_lon);
          return latDiff < 0.001 && lonDiff < 0.001; // Tolleranza ~100m
        });

        if (!matchingClimb) {
          console.warn(`Nessuna salita corrispondente trovata per ${oldClimb.id}`);
          continue;
        }

        // Aggiorna la salita con i nuovi valori
        const { error: updateError } = await supabase
          .from('detected_climbs')
          .update({
            // Aggiorna solo i valori calcolati, non le coordinate
            distance_meters: Math.round(matchingClimb.distance),
            elevation_gain_meters: Math.round(matchingClimb.elevationGain),
            elevation_loss_meters: Math.round(matchingClimb.elevationLoss),
            avg_gradient_percent: Number(matchingClimb.avgGradient.toFixed(2)),
            max_gradient_percent: Number(matchingClimb.maxGradient.toFixed(2)),
            min_gradient_percent: Number(matchingClimb.minGradient.toFixed(2)),
            duration_seconds: Math.round(matchingClimb.duration),
            avg_speed_kph: Number(matchingClimb.avgSpeed.toFixed(2)),
            avg_power_watts: matchingClimb.avgPower ? Math.round(matchingClimb.avgPower) : null,
            max_power_watts: matchingClimb.maxPower ? Math.round(matchingClimb.maxPower) : null,
            avg_heart_rate: matchingClimb.avgHeartRate ? Math.round(matchingClimb.avgHeartRate) : null,
            max_heart_rate: matchingClimb.maxHeartRate ? Math.round(matchingClimb.maxHeartRate) : null,
            avg_cadence: matchingClimb.avgCadence ? Number(matchingClimb.avgCadence.toFixed(1)) : null,
            vam_meters_per_hour: Math.round(matchingClimb.vam),
            climb_score: Math.round(matchingClimb.climbScore),
            category: matchingClimb.category,
            difficulty_rating: Math.round(matchingClimb.difficultyRating),
            is_significant: matchingClimb.isSignificant,
            detection_algorithm_version: '3.0', // Aggiorna versione
            updated_at: new Date().toISOString()
          })
          .eq('id', oldClimb.id);

        if (updateError) {
          console.error(`Errore aggiornamento salita ${oldClimb.id}:`, updateError);
          continue;
        }

        updatedCount++;
        console.log(`✅ Aggiornata salita ${oldClimb.id} con nuovi valori`);

      } catch (error) {
        console.error(`Errore elaborazione salita ${oldClimb.id}:`, error);
        continue;
      }
    }

    // Revalida cache
    if (activityId) {
      revalidatePath(`/activities/${activityId}`);
    }
    revalidatePath('/activities');

    return { success: true, updated: updatedCount };

  } catch (error) {
    console.error('Errore ricalcolo salite:', error);
    return { success: false, updated: 0, error: 'Errore interno server' };
  }
} 