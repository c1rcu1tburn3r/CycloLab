'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { calculateVO2max, type VO2maxInput, type VO2maxResult } from '@/lib/vo2maxCalculations';
import type { Athlete, Activity, AthleteProfileEntry } from '@/lib/types';

export interface VO2maxProfileData {
  vo2max_ml_kg_min: number;
  vo2max_method: string;
  vo2max_confidence: number;
  vo2max_reasoning: string;
}

/**
 * Determina se il VO2max deve essere ricalcolato
 */
function shouldRecalculateVO2max(
  lastProfile: AthleteProfileEntry | null,
  activities: Activity[],
  athlete: Athlete
): boolean {
  // Se non c'è profilo con VO2max, calcola sempre
  if (!lastProfile?.vo2max_ml_kg_min) {
    return true;
  }

  // Se sono cambiati dati fondamentali dell'atleta
  const lastUpdate = new Date(lastProfile.effective_date);
  const athleteUpdated = new Date(athlete.created_at);
  if (athleteUpdated > lastUpdate) {
    return true;
  }

  // Se ci sono nuove attività con personal bests dopo l'ultimo calcolo
  const newActivitiesWithPB = activities.filter(activity => {
    const activityDate = new Date(activity.activity_date);
    return activityDate > lastUpdate && (
      activity.pb_power_300s_watts || 
      activity.pb_power_60s_watts || 
      activity.pb_power_1200s_watts
    );
  });

  if (newActivitiesWithPB.length > 0) {
    return true;
  }

  // Se l'ultimo calcolo ha bassa confidenza (<70%) e abbiamo più dati ora
  if (lastProfile.vo2max_confidence && lastProfile.vo2max_confidence < 0.7) {
    const totalActivities = activities.length;
    const activitiesAtLastCalc = activities.filter(a => 
      new Date(a.activity_date) <= lastUpdate
    ).length;
    
    // Se abbiamo almeno 5 attività in più, riprova
    if (totalActivities - activitiesAtLastCalc >= 5) {
      return true;
    }
  }

  // Se sono passati più di 90 giorni dall'ultimo calcolo
  const daysSinceLastCalc = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastCalc > 90) {
    return true;
  }

  return false;
}

/**
 * Calcola VO2max per un atleta usando tutti i dati disponibili
 */
function calculateAthleteVO2max(
  athlete: Athlete,
  activities: Activity[],
  latestProfile: AthleteProfileEntry | null
): VO2maxResult | null {
  // Raccogli tutti i personal bests dalle attività
  const personalBests = activities.reduce((bests, activity) => {
    return {
      pb_power_300s_watts: Math.max(bests.pb_power_300s_watts || 0, activity.pb_power_300s_watts || 0) || undefined,
      pb_power_60s_watts: Math.max(bests.pb_power_60s_watts || 0, activity.pb_power_60s_watts || 0) || undefined,
      pb_power_1200s_watts: Math.max(bests.pb_power_1200s_watts || 0, activity.pb_power_1200s_watts || 0) || undefined,
    };
  }, {} as { pb_power_300s_watts?: number; pb_power_60s_watts?: number; pb_power_1200s_watts?: number });

  const vo2maxInput: VO2maxInput = {
    birth_date: athlete.birth_date,
    sex: athlete.sex as 'M' | 'F' | undefined,
    weight_kg: latestProfile?.weight_kg || athlete.weight_kg || undefined,
    ftp_watts: latestProfile?.ftp_watts || undefined,
    ...personalBests
  };

  return calculateVO2max(vo2maxInput);
}

/**
 * Salva o aggiorna VO2max nel profilo atleta
 */
async function saveVO2maxToProfile(
  athleteId: string,
  vo2maxResult: VO2maxResult,
  effectiveDate: string = new Date().toISOString().split('T')[0]
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Cerca se esiste già un profilo per questa data
    const { data: existingProfile, error: searchError } = await supabase
      .from('athlete_profile_entries')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('effective_date', effectiveDate)
      .maybeSingle();

    if (searchError) {
      console.error('Errore ricerca profilo esistente:', searchError);
      return { success: false, error: searchError.message };
    }

    const vo2maxData: VO2maxProfileData = {
      vo2max_ml_kg_min: vo2maxResult.vo2max,
      vo2max_method: vo2maxResult.method,
      vo2max_confidence: vo2maxResult.confidence,
      vo2max_reasoning: vo2maxResult.reasoning
    };

    if (existingProfile) {
      // Aggiorna profilo esistente
      const { error: updateError } = await supabase
        .from('athlete_profile_entries')
        .update({
          ...vo2maxData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Errore aggiornamento VO2max:', updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // Crea nuovo profilo con solo VO2max
      const { error: insertError } = await supabase
        .from('athlete_profile_entries')
        .insert({
          athlete_id: athleteId,
          effective_date: effectiveDate,
          ...vo2maxData
        });

      if (insertError) {
        console.error('Errore inserimento VO2max:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Errore salvataggio VO2max:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Calcola e salva VO2max se necessario
 */
export async function updateVO2maxIfNeeded(
  athlete: Athlete,
  activities: Activity[],
  latestProfile: AthleteProfileEntry | null
): Promise<{ updated: boolean; vo2max?: number; method?: string; confidence?: number; error?: string }> {
  try {
    // Controlla se serve ricalcolare
    if (!shouldRecalculateVO2max(latestProfile, activities, athlete)) {
      return { 
        updated: false, 
        vo2max: latestProfile?.vo2max_ml_kg_min || undefined,
        method: latestProfile?.vo2max_method || undefined,
        confidence: latestProfile?.vo2max_confidence || undefined
      };
    }

    // Calcola nuovo VO2max
    const vo2maxResult = calculateAthleteVO2max(athlete, activities, latestProfile);
    
    if (!vo2maxResult || vo2maxResult.vo2max === 0) {
      return { updated: false, error: 'Dati insufficienti per calcolo VO2max' };
    }

    // Salva nel database
    const saveResult = await saveVO2maxToProfile(athlete.id, vo2maxResult);
    
    if (!saveResult.success) {
      return { updated: false, error: saveResult.error };
    }

    return { 
      updated: true, 
      vo2max: vo2maxResult.vo2max,
      method: vo2maxResult.method,
      confidence: vo2maxResult.confidence
    };
  } catch (error: any) {
    console.error('Errore aggiornamento VO2max:', error);
    return { updated: false, error: error.message };
  }
}

/**
 * Server Action: Recupera lo storico VO2max di un atleta
 */
export async function getVO2maxHistory(
  athleteId: string,
  limitRecords: number = 12
): Promise<{ 
  data?: Array<{
    effective_date: string;
    vo2max_ml_kg_min: number;
    vo2max_method: string;
    vo2max_confidence: number;
  }>; 
  error?: string 
}> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data, error } = await supabase
      .from('athlete_profile_entries')
      .select('effective_date, vo2max_ml_kg_min, vo2max_method, vo2max_confidence')
      .eq('athlete_id', athleteId)
      .not('vo2max_ml_kg_min', 'is', null)
      .order('effective_date', { ascending: false })
      .limit(limitRecords);

    if (error) {
      console.error('Errore recupero storico VO2max:', error);
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (error: any) {
    console.error('Errore recupero storico VO2max:', error);
    return { error: error.message };
  }
} 