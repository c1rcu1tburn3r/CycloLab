'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import type { RoutePoint } from '@/lib/types';

// Costanti per validazione e calcoli
const CADENCE_RANGES = [
  { min: 60, max: 70, label: '60-70 rpm' },
  { min: 70, max: 80, label: '70-80 rpm' },
  { min: 80, max: 90, label: '80-90 rpm' },
  { min: 90, max: 100, label: '90-100 rpm' },
  { min: 100, max: 110, label: '100-110 rpm' },
  { min: 110, max: 130, label: '110+ rpm' } // Limitato a 130 per essere realistico
];

const POWER_ZONES = [
  { zone: 'Z1', name: 'Recovery', minPercent: 0, maxPercent: 55 },
  { zone: 'Z2', name: 'Endurance', minPercent: 55, maxPercent: 75 },
  { zone: 'Z3', name: 'Tempo', minPercent: 75, maxPercent: 90 },
  { zone: 'Z4', name: 'Threshold', minPercent: 90, maxPercent: 105 },
  { zone: 'Z5', name: 'VO2max', minPercent: 105, maxPercent: 120 },
  { zone: 'Z6', name: 'Anaerobic', minPercent: 120, maxPercent: 150 }
];

// Soglie per validazione statistica
const MIN_SAMPLES_EFFICIENCY = 100; // Minimo per analisi efficienza
const MIN_SAMPLES_ZONE = 50; // Minimo per analisi per zona
const MAX_REALISTIC_CADENCE = 140; // Cadenza massima realistica
const MIN_REALISTIC_CADENCE = 40; // Cadenza minima realistica

// Cadenze ottimali scientifiche per zona
const OPTIMAL_CADENCE_BY_ZONE: Record<string, number> = {
  'Z1': 85, 'Z2': 85, // Aerobico - efficienza metabolica
  'Z3': 90, 'Z4': 90, // Soglia - equilibrio potenza/fatica  
  'Z5': 95, 'Z6': 95  // VO2max/Anaerobico - reclutamento neuromuscolare
};

export interface CadenceAnalysisData {
  optimalCadence: number | null;
  cadenceByZone: CadenceZoneData[];
  efficiencyMetrics: EfficiencyMetric[];
  cadenceTrends: CadenceTrend[];
  recommendations: CadenceRecommendation[];
}

export interface CadenceZoneData {
  powerZone: string;
  zoneName: string;
  minWatts: number;
  maxWatts: number;
  averageCadence: number;
  optimalCadence: number;
  efficiency: number; // watts per rpm
  sampleSize: number;
}

export interface EfficiencyMetric {
  cadenceRange: string;
  averagePower: number;
  efficiency: number; // watts per rpm
  sustainabilityIndex: number; // 0-100
  timeSpent: number; // minutes
  heartRateImpact: number | null;
}

export interface CadenceTrend {
  date: string;
  averageCadence: number;
  optimalCadence: number;
  efficiency: number;
  powerOutput: number;
}

export interface CadenceRecommendation {
  type: 'training' | 'race' | 'recovery';
  title: string;
  description: string;
  targetCadence: number;
  duration: string;
  rationale: string;
}

/**
 * Analizza i dati di cadenza di un atleta per determinare l'efficienza ottimale
 * STRATEGIA ADATTIVA: Cerca attività nel periodo richiesto, ma se non ne trova,
 * estende automaticamente il periodo per garantire analisi significative
 */
export async function analyzeCadenceEfficiency(
  athleteId: string, 
  periodMonths: number = 6,
  ftpWatts?: number
): Promise<{
  data?: CadenceAnalysisData;
  error?: string;
  actualPeriodUsed?: number; // Periodo effettivamente utilizzato
  adaptiveMessage?: string;  // Messaggio per informare l'utente dell'adattamento
}> {
  try {
    // Validazione input
    if (!athleteId || athleteId.trim() === '') {
      return { error: 'ID atleta non valido' };
    }

    if (periodMonths < 1 || periodMonths > 24) {
      return { error: 'Periodo deve essere tra 1 e 24 mesi' };
    }

    if (ftpWatts && (ftpWatts < 50 || ftpWatts > 600)) {
      return { error: 'FTP deve essere tra 50W e 600W' };
    }

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
      
      // Recupera attività con dati di cadenza e potenza
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          activity_date,
          avg_power_watts,
          max_power_watts,
          avg_cadence,
          max_cadence,
          route_points,
          duration_seconds,
          avg_heart_rate
        `)
        .eq('athlete_id', athleteId)
        .gte('activity_date', startDate.toISOString().split('T')[0])
        .not('avg_cadence', 'is', null)
        .not('avg_power_watts', 'is', null)
        .order('activity_date', { ascending: false });

      if (activitiesError) {
        console.error('[analyzeCadenceEfficiency] Errore DB:', activitiesError);
        return { error: `Errore database: ${activitiesError.message}` };
      }

      if (activities && activities.length >= 2) { // Minimo 2 attività per analisi significativa
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
      console.log('[analyzeCadenceEfficiency] Nessuna attività nel periodo esteso, cerco tutte le attività disponibili...');
      
      const { data: allActivities, error: allActivitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          activity_date,
          avg_power_watts,
          max_power_watts,
          avg_cadence,
          max_cadence,
          route_points,
          duration_seconds,
          avg_heart_rate
        `)
        .eq('athlete_id', athleteId)
        .not('avg_cadence', 'is', null)
        .not('avg_power_watts', 'is', null)
        .order('activity_date', { ascending: false });

      if (allActivitiesError) {
        console.error('[analyzeCadenceEfficiency] Errore recupero tutte attività:', allActivitiesError);
        return { error: `Errore database: ${allActivitiesError.message}` };
      }

      if (!allActivities || allActivities.length === 0) {
        return { 
          error: 'Nessuna attività con dati di cadenza e potenza trovata in tutto lo storico. Carica attività con powermeter per abilitare l\'analisi.',
          actualPeriodUsed: periodMonths
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

    console.log(`[analyzeCadenceEfficiency] Analizzando ${foundActivities.length} attività per atleta ${athleteId} (periodo: ${actualPeriodUsed === 999 ? 'tutte' : actualPeriodUsed + 'm'})`);

    // Analizza efficienza per diverse fasce di cadenza
    const efficiencyMetrics = await calculateCadenceEfficiency(foundActivities);
    
    // Calcola cadenza ottimale per zone di potenza
    const cadenceByZone = await calculateCadenceByPowerZones(foundActivities, ftpWatts);
    
    // Trova cadenza ottimale globale
    const optimalCadence = findOptimalCadence(efficiencyMetrics);
    
    // Calcola trend nel tempo
    const cadenceTrends = calculateCadenceTrends(foundActivities);
    
    // Genera raccomandazioni
    const recommendations = generateCadenceRecommendations(
      optimalCadence, 
      cadenceByZone, 
      efficiencyMetrics
    );

    const analysisData: CadenceAnalysisData = {
      optimalCadence,
      cadenceByZone,
      efficiencyMetrics,
      cadenceTrends,
      recommendations
    };

    console.log(`[analyzeCadenceEfficiency] Analisi completata: ${efficiencyMetrics.length} metriche, ${cadenceByZone.length} zone, ${recommendations.length} raccomandazioni`);

    return { 
      data: analysisData,
      actualPeriodUsed,
      adaptiveMessage
    };

  } catch (error) {
    console.error('[analyzeCadenceEfficiency] Errore inaspettato:', error);
    return { 
      error: error instanceof Error ? error.message : 'Errore sconosciuto nell\'analisi cadenza' 
    };
  }
}

/**
 * Calcola l'efficienza di pedalata per diverse fasce di cadenza
 */
async function calculateCadenceEfficiency(activities: any[]): Promise<EfficiencyMetric[]> {
  const efficiencyMetrics: EfficiencyMetric[] = [];

  for (const range of CADENCE_RANGES) {
    const rangeData = {
      powerSum: 0,
      cadenceSum: 0,
      heartRateSum: 0,
      timeSpent: 0,
      sampleCount: 0,
      heartRateCount: 0
    };

    // Analizza route points per questa fascia di cadenza
    for (const activity of activities) {
      if (!activity.route_points) continue;

      try {
        const routePoints: RoutePoint[] = JSON.parse(activity.route_points);
        
        for (const point of routePoints) {
          // Validazione dati punto
          if (!point.cadence || !point.power || 
              point.cadence < MIN_REALISTIC_CADENCE || 
              point.cadence > MAX_REALISTIC_CADENCE ||
              point.power <= 0) {
            continue;
          }

          // Verifica se il punto è in questa fascia
          if (point.cadence >= range.min && point.cadence < range.max) {
            rangeData.powerSum += point.power;
            rangeData.cadenceSum += point.cadence;
            rangeData.timeSpent += 1; // 1 secondo per punto
            rangeData.sampleCount++;

            if (point.heart_rate && point.heart_rate > 0) {
              rangeData.heartRateSum += point.heart_rate;
              rangeData.heartRateCount++;
            }
          }
        }
      } catch (e) {
        console.warn(`Errore parsing route points attività ${activity.id}:`, e);
      }
    }

    // Verifica campioni sufficienti per statistica significativa
    if (rangeData.sampleCount >= MIN_SAMPLES_EFFICIENCY) {
      const averagePower = rangeData.powerSum / rangeData.sampleCount;
      const averageCadence = rangeData.cadenceSum / rangeData.sampleCount;
      const efficiency = averagePower / averageCadence; // watts per rpm
      
      // Calcola indice di sostenibilità migliorato
      // Basato su tempo totale e distribuzione (logaritmico per evitare bias verso sessioni corte)
      const timeMinutes = rangeData.timeSpent / 60;
      const sustainabilityIndex = Math.min(100, Math.log10(timeMinutes + 1) * 50);
      
      const averageHeartRate = rangeData.heartRateCount > 0 
        ? rangeData.heartRateSum / rangeData.heartRateCount 
        : null;

      efficiencyMetrics.push({
        cadenceRange: range.label,
        averagePower: Math.round(averagePower * 100) / 100, // 2 decimali
        efficiency: Math.round(efficiency * 100) / 100, // 2 decimali
        sustainabilityIndex: Math.round(sustainabilityIndex),
        timeSpent: Math.round(timeMinutes),
        heartRateImpact: averageHeartRate ? Math.round(averageHeartRate) : null
      });
    }
  }

  return efficiencyMetrics.sort((a, b) => b.efficiency - a.efficiency);
}

/**
 * Calcola cadenza ottimale per zone di potenza
 */
async function calculateCadenceByPowerZones(
  activities: any[], 
  ftpWatts?: number
): Promise<CadenceZoneData[]> {
  if (!ftpWatts || ftpWatts <= 0) {
    console.warn('FTP non valido per analisi zone:', ftpWatts);
    return [];
  }

  const cadenceByZone: CadenceZoneData[] = [];

  for (const zone of POWER_ZONES) {
    const minWatts = Math.round(ftpWatts * (zone.minPercent / 100));
    const maxWatts = Math.round(ftpWatts * (zone.maxPercent / 100));

    let cadenceSum = 0;
    let powerSum = 0;
    let sampleCount = 0;

    // Analizza dati per questa zona
    for (const activity of activities) {
      if (!activity.route_points) continue;

      try {
        const routePoints: RoutePoint[] = JSON.parse(activity.route_points);
        
        for (const point of routePoints) {
          // Validazione e filtro per zona
          if (point.cadence && point.power && 
              point.cadence >= MIN_REALISTIC_CADENCE && 
              point.cadence <= MAX_REALISTIC_CADENCE &&
              point.power >= minWatts && 
              point.power < maxWatts) {
            
            cadenceSum += point.cadence;
            powerSum += point.power;
            sampleCount++;
          }
        }
      } catch (e) {
        console.warn(`Errore parsing route points attività ${activity.id}:`, e);
      }
    }

    // Verifica campioni sufficienti
    if (sampleCount >= MIN_SAMPLES_ZONE) {
      const averageCadence = cadenceSum / sampleCount;
      const averagePower = powerSum / sampleCount;
      const efficiency = averagePower / averageCadence;
      
      // Cadenza ottimale scientifica per questa zona
      const optimalCadence = OPTIMAL_CADENCE_BY_ZONE[zone.zone] || 90;

      cadenceByZone.push({
        powerZone: zone.zone,
        zoneName: zone.name,
        minWatts,
        maxWatts,
        averageCadence: Math.round(averageCadence),
        optimalCadence,
        efficiency: Math.round(efficiency * 100) / 100,
        sampleSize: sampleCount
      });
    }
  }

  return cadenceByZone;
}

/**
 * Trova la cadenza globalmente ottimale con algoritmo migliorato
 */
function findOptimalCadence(efficiencyMetrics: EfficiencyMetric[]): number | null {
  if (efficiencyMetrics.length === 0) return null;

  let bestScore = 0;
  let optimalCadence = null;

  for (const metric of efficiencyMetrics) {
    // Score composito migliorato: peso bilanciato tra efficienza, sostenibilità e utilizzo
    const efficiencyWeight = 0.5; // 50% peso efficienza
    const sustainabilityWeight = 0.3; // 30% peso sostenibilità
    const usageWeight = 0.2; // 20% peso utilizzo temporale
    
    const normalizedUsage = Math.min(1, metric.timeSpent / 120); // Normalizza a 2h max
    
    const score = (metric.efficiency * efficiencyWeight) + 
                  ((metric.sustainabilityIndex / 100) * sustainabilityWeight) + 
                  (normalizedUsage * usageWeight);
    
    if (score > bestScore) {
      bestScore = score;
      // Estrae la cadenza media dal range
      const cadenceMatch = metric.cadenceRange.match(/(\d+)-(\d+)/);
      if (cadenceMatch) {
        const min = parseInt(cadenceMatch[1]);
        const max = parseInt(cadenceMatch[2]);
        optimalCadence = Math.round((min + max) / 2);
      }
    }
  }

  return optimalCadence;
}

/**
 * Calcola trend di cadenza nel tempo con ottimizzazioni
 */
function calculateCadenceTrends(activities: any[]): CadenceTrend[] {
  const monthlyTrends: CadenceTrend[] = [];
  const sortedActivities = activities.sort((a, b) => 
    new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime()
  );

  // Raggruppa per mese
  const monthlyData: { [key: string]: any[] } = {};
  
  for (const activity of sortedActivities) {
    const date = new Date(activity.activity_date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(activity);
  }

  // Calcola cadenza ottimale progressiva
  let progressiveOptimal = 90; // Valore iniziale
  
  // Calcola metriche mensili
  for (const [monthKey, monthActivities] of Object.entries(monthlyData)) {
    let cadenceSum = 0;
    let powerSum = 0;
    let count = 0;

    for (const activity of monthActivities) {
      if (activity.avg_cadence && activity.avg_power_watts && 
          activity.avg_cadence >= MIN_REALISTIC_CADENCE && 
          activity.avg_cadence <= MAX_REALISTIC_CADENCE) {
        cadenceSum += activity.avg_cadence;
        powerSum += activity.avg_power_watts;
        count++;
      }
    }

    if (count > 0) {
      const averageCadence = cadenceSum / count;
      const averagePower = powerSum / count;
      const efficiency = averagePower / averageCadence;

      // Aggiorna cadenza ottimale progressiva (leggero adattamento verso media osservata)
      progressiveOptimal = Math.round(progressiveOptimal * 0.9 + averageCadence * 0.1);

      monthlyTrends.push({
        date: `${monthKey}-01`,
        averageCadence: Math.round(averageCadence),
        optimalCadence: progressiveOptimal,
        efficiency: Math.round(efficiency * 100) / 100,
        powerOutput: Math.round(averagePower)
      });
    }
  }

  return monthlyTrends;
}

/**
 * Genera raccomandazioni personalizzate
 */
function generateCadenceRecommendations(
  optimalCadence: number | null,
  cadenceByZone: CadenceZoneData[],
  efficiencyMetrics: EfficiencyMetric[]
): CadenceRecommendation[] {
  const recommendations: CadenceRecommendation[] = [];

  if (optimalCadence) {
    // Raccomandazione per allenamenti base
    recommendations.push({
      type: 'training',
      title: 'Allenamento Cadenza Base',
      description: `Allenamenti Z2 a cadenza ${optimalCadence} rpm per migliorare efficienza`,
      targetCadence: optimalCadence,
      duration: '60-90 minuti',
      rationale: 'Basato sulla tua cadenza più efficiente nelle zone aerobiche'
    });

    // Raccomandazione per gare
    recommendations.push({
      type: 'race',
      title: 'Strategia Gara',
      description: `Mantieni ${optimalCadence}±5 rpm nelle fasi cruciali della gara`,
      targetCadence: optimalCadence,
      duration: 'Intere gare',
      rationale: 'Ottimizza il rapporto potenza/fatica per performance sostenibili'
    });
  }

  // Raccomandazioni specifiche per zone
  const z4Zone = cadenceByZone.find(z => z.powerZone === 'Z4');
  if (z4Zone && z4Zone.averageCadence < z4Zone.optimalCadence - 5) {
    recommendations.push({
      type: 'training',
      title: 'Allenamento Cadenza Soglia',
      description: `Aumenta cadenza in Z4 da ${z4Zone.averageCadence} a ${z4Zone.optimalCadence} rpm`,
      targetCadence: z4Zone.optimalCadence,
      duration: '15-20 minuti',
      rationale: 'La tua cadenza attuale in soglia è sotto-ottimale per il reclutamento muscolare'
    });
  }

  // Raccomandazione recupero
  const lowIntensityMetric = efficiencyMetrics.find(m => m.cadenceRange.includes('80-90'));
  if (lowIntensityMetric) {
    recommendations.push({
      type: 'recovery',
      title: 'Recupero Attivo',
      description: 'Usa 80-85 rpm durante i recuperi per mantenere fluidità',
      targetCadence: 82,
      duration: '10-15 minuti',
      rationale: 'Cadenza moderata aiuta la circolazione senza affaticare'
    });
  }

  return recommendations;
} 