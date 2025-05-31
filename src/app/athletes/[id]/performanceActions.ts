'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { calculatePowerBests, PB_DURATIONS_SECONDS, PowerBests } from '@/lib/fitnessCalculations';
import type { RoutePoint } from '@/lib/types';

export interface PowerCurveData {
  duration: number;
  durationLabel: string;
  current: number | null;
  best: number | null;
  target?: number | null;
  previous?: number | null;
}

export interface PowerDistributionBand {
  range: string;
  minWatts: number;
  maxWatts: number;
  timeSeconds: number;
  percentage: number;
}

export interface PowerZoneData {
  zone: string;
  name: string;
  minWatts: number;
  maxWatts: number;
  minPercent: number;
  maxPercent: number;
  timeSeconds: number;
  percentage: number;
  color: string;
}

export interface ActivityPowerData {
  id: string;
  activity_date: string;
  avg_power_watts: number | null;
  normalized_power_watts: number | null;
  max_power_watts: number | null;
  duration_seconds: number | null;
  route_points: string | null;
  pb_power_5s_watts: number | null;
  pb_power_15s_watts: number | null;
  pb_power_30s_watts: number | null;
  pb_power_60s_watts: number | null;
  pb_power_300s_watts: number | null;
  pb_power_600s_watts: number | null;
  pb_power_1200s_watts: number | null;
  pb_power_1800s_watts: number | null;
  pb_power_3600s_watts: number | null;
  pb_power_5400s_watts: number | null;
}

/**
 * Recupera i dati di potenza di un atleta per le analisi performance
 * STRATEGIA ADATTIVA: Cerca attività nel periodo richiesto, ma se non ne trova,
 * estende automaticamente il periodo per garantire analisi significative
 */
export async function getAthletePowerData(athleteId: string, periodMonths: number = 12): Promise<{
  activities: ActivityPowerData[];
  powerCurve: PowerCurveData[];
  personalBests: Record<number, { value: number; activityId: string; date: string }>;
  actualPeriodUsed?: number;
  adaptiveMessage?: string;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // STRATEGIA ADATTIVA: Prova periodi progressivamente più lunghi
    const adaptivePeriods = [periodMonths, 12, 18, 24, 36]; // Periodi da provare in sequenza
    let foundActivities: any[] = [];
    let actualPeriodUsed = periodMonths;
    let adaptiveMessage: string | undefined;

    for (const testPeriod of adaptivePeriods) {
      // Calcola data di inizio per questo periodo
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - testPeriod);
      
      // Recupera attività con dati di potenza
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          activity_date,
          avg_power_watts,
          normalized_power_watts,
          max_power_watts,
          duration_seconds,
          route_points,
          pb_power_5s_watts,
          pb_power_15s_watts,
          pb_power_30s_watts,
          pb_power_60s_watts,
          pb_power_300s_watts,
          pb_power_600s_watts,
          pb_power_1200s_watts,
          pb_power_1800s_watts,
          pb_power_3600s_watts,
          pb_power_5400s_watts
        `)
        .eq('athlete_id', athleteId)
        .gte('activity_date', startDate.toISOString().split('T')[0])
        .not('avg_power_watts', 'is', null)
        .order('activity_date', { ascending: false });

      if (activitiesError) {
        console.error('[getAthletePowerData] Errore recupero attività:', activitiesError);
        return { activities: [], powerCurve: [], personalBests: {}, error: activitiesError.message };
      }

      if (activities && activities.length >= 3) { // Minimo 3 attività per analisi significativa
        foundActivities = activities;
        actualPeriodUsed = testPeriod;
        
        // Genera messaggio adattivo se abbiamo esteso il periodo
        if (testPeriod > periodMonths) {
          const yearsUsed = testPeriod >= 12 ? `${Math.floor(testPeriod / 12)} anni` : `${testPeriod} mesi`;
          adaptiveMessage = `⚡ Esteso automaticamente a ${yearsUsed} per analisi più robusta (${activities.length} attività trovate)`;
        }
        break;
      }
    }

    // Se ancora non abbiamo trovato nulla, proviamo TUTTE le attività disponibili
    if (foundActivities.length === 0) {
      console.log('[getAthletePowerData] Nessuna attività nel periodo esteso, cerco tutte le attività disponibili...');
      
      const { data: allActivities, error: allActivitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          activity_date,
          avg_power_watts,
          normalized_power_watts,
          max_power_watts,
          duration_seconds,
          route_points,
          pb_power_5s_watts,
          pb_power_15s_watts,
          pb_power_30s_watts,
          pb_power_60s_watts,
          pb_power_300s_watts,
          pb_power_600s_watts,
          pb_power_1200s_watts,
          pb_power_1800s_watts,
          pb_power_3600s_watts,
          pb_power_5400s_watts
        `)
        .eq('athlete_id', athleteId)
        .not('avg_power_watts', 'is', null)
        .order('activity_date', { ascending: false });

      if (allActivitiesError) {
        console.error('[getAthletePowerData] Errore recupero tutte attività:', allActivitiesError);
        return { activities: [], powerCurve: [], personalBests: {}, error: allActivitiesError.message };
      }

      if (!allActivities || allActivities.length === 0) {
        return { 
          activities: [], 
          powerCurve: [], 
          personalBests: {},
          actualPeriodUsed: periodMonths,
          error: 'Nessuna attività con dati di potenza trovata in tutto lo storico. Carica attività con powermeter per abilitare l\'analisi.'
        };
      }

      foundActivities = allActivities;
      actualPeriodUsed = 999; // Indica "tutte le attività"
      
      // Calcola il periodo reale dalle attività trovate
      const oldestActivity = allActivities[allActivities.length - 1];
      const oldestDate = new Date(oldestActivity.activity_date);
      const monthsSpan = Math.ceil((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      const timeSpanText = monthsSpan >= 12 
        ? `${Math.floor(monthsSpan / 12)} anni e ${monthsSpan % 12} mesi`
        : `${monthsSpan} mesi`;
        
      adaptiveMessage = `📊 Utilizzando tutto lo storico disponibile (${allActivities.length} attività in ${timeSpanText})`;
    }

    console.log(`[getAthletePowerData] Analizzando ${foundActivities.length} attività (periodo: ${actualPeriodUsed === 999 ? 'tutte' : actualPeriodUsed + 'm'})`);

    // Calcola personal bests attuali per tutte le durate
    const personalBests: Record<number, { value: number; activityId: string; date: string }> = {};
    
    for (const duration of PB_DURATIONS_SECONDS) {
      const pbField = `pb_power_${duration}s_watts` as keyof ActivityPowerData;
      
      for (const activity of foundActivities) {
        const pbValue = activity[pbField] as number | null;
        if (pbValue && pbValue > 0) {
          if (!personalBests[duration] || pbValue > personalBests[duration].value) {
            personalBests[duration] = {
              value: pbValue,
              activityId: activity.id,
              date: activity.activity_date
            };
          }
        }
      }
    }

    // Genera curve di potenza con etichette
    const durationLabels: Record<number, string> = {
      5: '5s',
      15: '15s',
      30: '30s',
      60: '1min',
      300: '5min',
      600: '10min',
      1200: '20min',
      1800: '30min',
      3600: '1h',
      5400: '90min'
    };

    const powerCurve: PowerCurveData[] = PB_DURATIONS_SECONDS.map(duration => {
      const currentBest = personalBests[duration];
      
      return {
        duration,
        durationLabel: durationLabels[duration],
        current: currentBest?.value || null,
        best: currentBest?.value || null, // Al momento current = best, ma potrebbe essere diverso con periodi
        target: duration === 1200 ? null : null, // Target FTP da implementare in futuro
        previous: null // Periodo precedente da implementare
      };
    });

    return {
      activities: foundActivities,
      powerCurve,
      personalBests,
      actualPeriodUsed,
      adaptiveMessage
    };

  } catch (error) {
    console.error('[getAthletePowerData] Errore inaspettato:', error);
    return { 
      activities: [], 
      powerCurve: [], 
      personalBests: {}, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
}

/**
 * Calcola la distribuzione di potenza da un'attività specifica
 */
export async function calculatePowerDistribution(
  athleteId: string, 
  activityId?: string,
  ftpWatts?: number
): Promise<{
  distribution: PowerDistributionBand[];
  zones: PowerZoneData[];
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Se non specificata attività, prende l'ultima con dati di potenza
    let targetActivity: any = null;
    
    if (activityId) {
      const { data } = await supabase
        .from('activities')
        .select('id, route_points, avg_power_watts')
        .eq('athlete_id', athleteId)
        .eq('id', activityId)
        .single();
      
      targetActivity = data;
    } else {
      const { data } = await supabase
        .from('activities')
        .select('id, route_points, avg_power_watts')
        .eq('athlete_id', athleteId)
        .not('route_points', 'is', null)
        .not('avg_power_watts', 'is', null)
        .order('activity_date', { ascending: false })
        .limit(1)
        .single();
      
      targetActivity = data;
    }

    if (!targetActivity || !targetActivity.route_points) {
      return { distribution: [], zones: [] };
    }

    // Parse route points
    const routePoints: RoutePoint[] = JSON.parse(targetActivity.route_points);
    const powerValues = routePoints
      .map(p => p.power)
      .filter((p): p is number => p !== undefined && p !== null && p > 0);

    if (powerValues.length === 0) {
      return { distribution: [], zones: [] };
    }

    // Calcola distribuzione in bande di potenza
    const bands = [
      { range: '0-100W', min: 0, max: 100 },
      { range: '100-150W', min: 100, max: 150 },
      { range: '150-200W', min: 150, max: 200 },
      { range: '200-250W', min: 200, max: 250 },
      { range: '250-300W', min: 250, max: 300 },
      { range: '300-350W', min: 300, max: 350 },
      { range: '350-400W', min: 350, max: 400 },
      { range: '400W+', min: 400, max: 9999 }
    ];

    const distribution: PowerDistributionBand[] = bands.map(band => {
      const pointsInBand = powerValues.filter(p => p >= band.min && p < band.max);
      const timeSeconds = pointsInBand.length; // Assumendo 1 punto per secondo
      const percentage = (timeSeconds / powerValues.length) * 100;

      return {
        range: band.range,
        minWatts: band.min,
        maxWatts: band.max,
        timeSeconds,
        percentage
      };
    }).filter(band => band.timeSeconds > 0); // Solo bande con dati

    // Calcola zone di potenza se FTP disponibile
    let zones: PowerZoneData[] = [];
    if (ftpWatts && ftpWatts > 0) {
      const zoneDefinitions = [
        { zone: 'Z1', name: 'Recovery', minPercent: 0, maxPercent: 55, color: '#9ca3af' },
        { zone: 'Z2', name: 'Endurance', minPercent: 55, maxPercent: 75, color: '#3b82f6' },
        { zone: 'Z3', name: 'Tempo', minPercent: 75, maxPercent: 90, color: '#10b981' },
        { zone: 'Z4', name: 'Threshold', minPercent: 90, maxPercent: 105, color: '#f59e0b' },
        { zone: 'Z5', name: 'VO2max', minPercent: 105, maxPercent: 120, color: '#ef4444' },
        { zone: 'Z6', name: 'Anaerobic', minPercent: 120, maxPercent: 150, color: '#8b5cf6' },
        { zone: 'Z7', name: 'Neuromuscular', minPercent: 150, maxPercent: 999, color: '#ec4899' }
      ];

      zones = zoneDefinitions.map(zoneDef => {
        const minWatts = Math.round(ftpWatts * (zoneDef.minPercent / 100));
        const maxWatts = zoneDef.maxPercent >= 999 ? 999 : Math.round(ftpWatts * (zoneDef.maxPercent / 100));
        
        const pointsInZone = powerValues.filter(p => p >= minWatts && p < maxWatts);
        const timeSeconds = pointsInZone.length;
        const percentage = (timeSeconds / powerValues.length) * 100;

        return {
          zone: zoneDef.zone,
          name: zoneDef.name,
          minWatts,
          maxWatts,
          minPercent: zoneDef.minPercent,
          maxPercent: zoneDef.maxPercent,
          timeSeconds,
          percentage,
          color: zoneDef.color
        };
      });
    }

    return { distribution, zones };

  } catch (error) {
    console.error('[calculatePowerDistribution] Errore:', error);
    return { 
      distribution: [], 
      zones: [], 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
}

/**
 * Aggiorna i personal bests di un'attività analizzando i route points
 */
export async function updateActivityPersonalBests(activityId: string): Promise<{
  success: boolean;
  updatedBests?: PowerBests;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Recupera l'attività con route points
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, route_points, athlete_id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity || !activity.route_points) {
      return { success: false, error: 'Attività non trovata o senza dati GPS' };
    }

    // Parse route points e calcola PB
    const routePoints: RoutePoint[] = JSON.parse(activity.route_points);
    const powerBests = calculatePowerBests(routePoints);

    // Aggiorna l'attività con i nuovi PB
    const { error: updateError } = await supabase
      .from('activities')
      .update({
        pb_power_5s_watts: powerBests.p5s,
        pb_power_15s_watts: powerBests.p15s,
        pb_power_30s_watts: powerBests.p30s,
        pb_power_60s_watts: powerBests.p60s,
        pb_power_300s_watts: powerBests.p300s,
        pb_power_600s_watts: powerBests.p600s,
        pb_power_1200s_watts: powerBests.p1200s,
        pb_power_1800s_watts: powerBests.p1800s,
        pb_power_3600s_watts: powerBests.p3600s,
        pb_power_5400s_watts: powerBests.p5400s,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, updatedBests: powerBests };

  } catch (error) {
    console.error('[updateActivityPersonalBests] Errore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
} 