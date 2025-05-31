'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { 
  analyzeHRFromActivities, 
  calculateHRZonesFromMax, 
  calculateHRZonesFromLTHR,
  shouldSuggestHRUpdate,
  type HRZoneEstimationResult 
} from '@/lib/hrZoneCalculations';

/**
 * Analizza automaticamente le zone HR dell'atleta
 */
export async function analyzeAthleteHRZones(athleteId: string) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Recupera attività con dati HR degli ultimi 3 mesi
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        activity_date,
        title,
        duration_seconds,
        avg_heart_rate_bpm,
        max_heart_rate_bpm,
        avg_power_watts
      `)
      .eq('athlete_id', athleteId)
      .gte('activity_date', threeMonthsAgo.toISOString().split('T')[0])
      .order('activity_date', { ascending: false });

    if (activitiesError) {
      return { error: activitiesError.message };
    }

    if (!activities || activities.length === 0) {
      return { error: 'Nessuna attività disponibile per l\'analisi' };
    }

    // Analizza HR automaticamente
    const hrAnalysis = analyzeHRFromActivities(activities);

    if (!hrAnalysis) {
      return { error: 'Dati insufficienti per analizzare le zone HR' };
    }

    // Recupera profilo attuale per confronto
    const { data: currentProfile, error: profileError } = await supabase
      .from('athlete_profile_entries')
      .select('max_hr_bpm')
      .eq('athlete_id', athleteId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Errore nel caricamento del profilo: ${profileError.message}`);
    }

    // Calcola metriche dalle attività
    const currentHRMax = currentProfile?.max_hr_bpm || null;

    // Determina se ci sono dati affidabili
    const activitiesWithHR = activities.filter(a => 
      a.avg_heart_rate_bpm && a.avg_heart_rate_bpm > 0 && 
      a.max_heart_rate_bpm && a.max_heart_rate_bpm > 0 &&
      a.duration_seconds && a.duration_seconds > 1200 // Almeno 20 minuti per LTHR
    );
    
    const hasReliableData = activitiesWithHR.length >= 5;

    let suggestedHRMax: number | null = null;
    let suggestedLTHR: number | null = null;
    let estimationDetails: any = null;

    if (hasReliableData) {
      // Stima HR Max dal 95° percentile dei valori massimi
      const maxHRValues = activitiesWithHR
        .map(a => a.max_heart_rate_bpm!)
        .sort((a, b) => b - a);
      
      if (maxHRValues.length > 0) {
        const percentile95Index = Math.floor(maxHRValues.length * 0.05);
        suggestedHRMax = maxHRValues[percentile95Index];
      }

      // Stima LTHR dalla media HR delle attività più intense e lunghe
      const longIntenseActivities = activitiesWithHR.filter(a => 
        a.duration_seconds! > 2400 && // Almeno 40 minuti
        a.avg_heart_rate_bpm! > (suggestedHRMax || 180) * 0.7 // Almeno 70% della FC Max
      );

      if (longIntenseActivities.length >= 3) {
        // LTHR = 95° percentile delle FC medie delle attività intense
        const avgHRValues = longIntenseActivities
          .map(a => a.avg_heart_rate_bpm!)
          .sort((a, b) => b - a);
        
        const lthrIndex = Math.floor(avgHRValues.length * 0.05);
        suggestedLTHR = avgHRValues[lthrIndex];
        
        estimationDetails = {
          method: 'ACTIVITY_ANALYSIS',
          activitiesAnalyzed: maxHRValues.length,
          lthrActivities: longIntenseActivities.length,
          confidence: maxHRValues.length >= 10 ? 0.9 : 0.7,
          reasoning: `Analisi di ${maxHRValues.length} attività con dati HR validi, LTHR da ${longIntenseActivities.length} attività intense`
        };
      } else {
        // Fallback: LTHR stimata come 85% della FC Max
        if (suggestedHRMax) {
          suggestedLTHR = Math.round(suggestedHRMax * 0.85);
        }
        
        estimationDetails = {
          method: 'ESTIMATED_FROM_MAX',
          activitiesAnalyzed: maxHRValues.length,
          lthrActivities: 0,
          confidence: 0.6,
          reasoning: `LTHR stimata come 85% della FC Max (${suggestedHRMax} bpm). Servono più attività intense per calcolo preciso.`
        };
      }
    }

    const shouldUpdate = (suggestedHRMax && currentHRMax && 
      Math.abs(suggestedHRMax - currentHRMax) > currentHRMax * 0.05) ||
      (suggestedLTHR && !currentHRMax); // Suggerisci se non c'è nemmeno FC Max

    return {
      success: true,
      analysis: {
        estimatedHRMax: suggestedHRMax,
        estimatedLTHR: suggestedLTHR,
        isReliable: hasReliableData,
        method: estimationDetails?.method || 'INSUFFICIENT_DATA',
        confidence: estimationDetails?.confidence || 0,
        reasoning: estimationDetails?.reasoning || 'Dati insufficienti per l\'analisi',
        lastUpdated: new Date().toISOString()
      },
      zones: suggestedLTHR ? calculateHRZonesFromLTHR(suggestedLTHR) : 
             (suggestedHRMax ? calculateHRZonesFromMax(suggestedHRMax) : null),
      shouldUpdate,
      currentHRMax,
    };

  } catch (error) {
    console.error('Errore analisi zone HR:', error);
    return { error: 'Errore durante l\'analisi delle zone HR' };
  }
}

/**
 * Aggiorna le zone HR del profilo atleta
 */
export async function updateAthleteHRZones(
  athleteId: string,
  hrMax: number,
  lthr?: number | null,
  method: string = 'ACTIVITY_ANALYSIS'
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Trova il profilo più recente
    const { data: currentProfile, error: currentError } = await supabase
      .from('athlete_profile_entries')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (currentError) {
      return { error: 'Profilo atleta non trovato' };
    }

    // Aggiorna il profilo esistente o crea uno nuovo con data odierna
    const today = new Date().toISOString().split('T')[0];
    
    const updatedProfile = {
      ...currentProfile,
      max_hr_bpm: hrMax,
      effective_date: today,
      last_hr_analysis_method: method,
      last_hr_update: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('athlete_profile_entries')
      .insert(updatedProfile)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { success: true, profile: data };

  } catch (error) {
    console.error('Errore aggiornamento zone HR:', error);
    return { error: 'Errore durante l\'aggiornamento delle zone HR' };
  }
}

/**
 * Recupera le statistiche HR recenti dell'atleta
 */
export async function getAthleteHRStats(athleteId: string, days: number = 30) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        avg_heart_rate_bpm,
        max_heart_rate_bpm,
        activity_date,
        duration_seconds
      `)
      .eq('athlete_id', athleteId)
      .gte('activity_date', cutoffDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    const hrActivities = activities?.filter(a => 
      a.avg_heart_rate_bpm && a.avg_heart_rate_bpm > 0
    ) || [];

    if (hrActivities.length === 0) {
      return { 
        success: true, 
        stats: null 
      };
    }

    const avgHR = Math.round(
      hrActivities.reduce((sum, a) => sum + a.avg_heart_rate_bpm, 0) / hrActivities.length
    );

    const maxHR = Math.max(...hrActivities.map(a => a.max_heart_rate_bpm || 0));
    const minHR = Math.min(...hrActivities.map(a => a.avg_heart_rate_bpm));

    // Calcola trend HR (confronto prima e seconda metà del periodo)
    const midPoint = Math.floor(hrActivities.length / 2);
    const recentActivities = hrActivities.slice(0, midPoint);
    const olderActivities = hrActivities.slice(midPoint);

    let hrTrend = 0;
    if (recentActivities.length > 0 && olderActivities.length > 0) {
      const recentAvg = recentActivities.reduce((sum, a) => sum + a.avg_heart_rate_bpm, 0) / recentActivities.length;
      const olderAvg = olderActivities.reduce((sum, a) => sum + a.avg_heart_rate_bpm, 0) / olderActivities.length;
      hrTrend = recentAvg - olderAvg;
    }

    return {
      success: true,
      stats: {
        avgHR,
        maxHR,
        minHR,
        activitiesWithHR: hrActivities.length,
        totalActivities: activities?.length || 0,
        hrTrend: Math.round(hrTrend * 10) / 10, // Arrotonda a 1 decimale
        period: days
      }
    };

  } catch (error) {
    console.error('Errore statistiche HR:', error);
    return { error: 'Errore durante il calcolo delle statistiche HR' };
  }
}

/**
 * Recupera storico aggiornamenti zone HR
 */
export async function getHRZoneHistory(athleteId: string) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: profiles, error } = await supabase
      .from('athlete_profile_entries')
      .select(`
        effective_date,
        max_hr_bpm,
        last_hr_analysis_method,
        last_hr_update
      `)
      .eq('athlete_id', athleteId)
      .not('max_hr_bpm', 'is', null)
      .order('effective_date', { ascending: false })
      .limit(10);

    if (error) {
      return { error: error.message };
    }

    const history = profiles?.map(profile => ({
      date: profile.effective_date,
      hrMax: profile.max_hr_bpm,
      method: profile.last_hr_analysis_method || 'MANUAL',
      lastUpdate: profile.last_hr_update
    })) || [];

    return { success: true, history };

  } catch (error) {
    console.error('Errore storico zone HR:', error);
    return { error: 'Errore durante il recupero dello storico' };
  }
}

/**
 * Calcola efficienza cardiaca (correlazione HR/Potenza)
 */
export async function calculateHREfficiency(athleteId: string, days: number = 90) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        activity_date,
        avg_heart_rate_bpm,
        avg_power_watts,
        duration_seconds,
        normalized_power_watts
      `)
      .eq('athlete_id', athleteId)
      .gte('activity_date', cutoffDate.toISOString().split('T')[0])
      .not('avg_heart_rate_bpm', 'is', null)
      .not('avg_power_watts', 'is', null)
      .gt('avg_heart_rate_bpm', 0)
      .gt('avg_power_watts', 0)
      .gt('duration_seconds', 1200) // Almeno 20 minuti
      .order('activity_date', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    if (!activities || activities.length < 5) {
      return { error: 'Dati insufficienti per calcolare efficienza cardiaca' };
    }

    // Calcola efficienza cardiaca (Watts per BPM)
    const efficiencies = activities.map(activity => {
      const power = activity.normalized_power_watts || activity.avg_power_watts;
      return {
        date: activity.activity_date,
        efficiency: power / activity.avg_heart_rate_bpm,
        power,
        hr: activity.avg_heart_rate_bpm,
        duration: activity.duration_seconds
      };
    });

    // Calcola media e trend
    const avgEfficiency = efficiencies.reduce((sum, e) => sum + e.efficiency, 0) / efficiencies.length;
    
    // Trend delle ultime 4 settimane vs 4 settimane precedenti
    const midPoint = Math.floor(efficiencies.length / 2);
    const recentEfficiencies = efficiencies.slice(0, midPoint);
    const olderEfficiencies = efficiencies.slice(midPoint);

    let efficiencyTrend = 0;
    if (recentEfficiencies.length > 0 && olderEfficiencies.length > 0) {
      const recentAvg = recentEfficiencies.reduce((sum, e) => sum + e.efficiency, 0) / recentEfficiencies.length;
      const olderAvg = olderEfficiencies.reduce((sum, e) => sum + e.efficiency, 0) / olderEfficiencies.length;
      efficiencyTrend = ((recentAvg - olderAvg) / olderAvg) * 100; // Percentuale di miglioramento
    }

    return {
      success: true,
      efficiency: {
        current: Math.round(avgEfficiency * 100) / 100,
        trend: Math.round(efficiencyTrend * 10) / 10,
        activities: efficiencies.length,
        period: days,
        interpretation: interpretEfficiencyTrend(efficiencyTrend)
      }
    };

  } catch (error) {
    console.error('Errore calcolo efficienza cardiaca:', error);
    return { error: 'Errore durante il calcolo dell\'efficienza cardiaca' };
  }
}

function interpretEfficiencyTrend(trend: number): string {
  if (trend > 5) {
    return 'Significativo miglioramento dell\'efficienza cardiaca';
  } else if (trend > 2) {
    return 'Leggero miglioramento dell\'efficienza cardiaca';
  } else if (trend < -5) {
    return 'Potenziale affaticamento o sovrallenamento';
  } else if (trend < -2) {
    return 'Leggero calo dell\'efficienza, considera il recupero';
  } else {
    return 'Efficienza cardiaca stabile';
  }
} 