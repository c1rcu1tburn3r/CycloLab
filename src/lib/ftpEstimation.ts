'use client';

import type { Activity } from '@/lib/types';

// Standard di industria per i metodi di stima FTP
export const FTP_ESTIMATION_METHODS = {
  // FTP dal test di 20 minuti (gold standard)
  TWENTY_MINUTE_TEST: {
    name: 'Test 20 minuti',
    factor: 0.95, // 95% della potenza media di 20 min
    confidence: 0.95,
    description: 'Metodo più accurato: 95% della potenza media sostenuta per 20 minuti'
  },
  
  // FTP dal test di 8 minuti (alternativo)
  EIGHT_MINUTE_TEST: {
    name: 'Test 8 minuti', 
    factor: 0.90, // 90% della potenza media di 8 min
    confidence: 0.85,
    description: 'Metodo alternativo: 90% della potenza media sostenuta per 8 minuti'
  },
  
  // FTP da potenza di 60 minuti (teoricamente perfetto)
  SIXTY_MINUTE_POWER: {
    name: 'Potenza 60 minuti',
    factor: 1.0, // 100% della potenza media di 60 min
    confidence: 0.98,
    description: 'Teoricamente perfetto: potenza media massima sostenibile per 1 ora'
  },
  
  // FTP da attività di soglia lunghe (allenamenti)
  THRESHOLD_WORKOUTS: {
    name: 'Allenamenti soglia',
    factor: 1.05, // 105% della potenza normalizzata in Z4
    confidence: 0.75,
    description: 'Da allenamenti in zona soglia: 105% della potenza normalizzata'
  },
  
  // FTP da best effort curve analysis
  CRITICAL_POWER: {
    name: 'Critical Power Model',
    factor: 1.0, // Interpolazione matematica della curva
    confidence: 0.80,
    description: 'Modello matematico basato su multiple durate (5min-60min)'
  }
} as const;

export type FTPEstimationMethod = keyof typeof FTP_ESTIMATION_METHODS;

export interface FTPEstimationResult {
  estimatedFTP: number;
  method: FTPEstimationMethod;
  confidence: number;
  sourceActivity?: {
    id: string;
    date: string;
    name: string;
    duration: number;
    avgPower: number;
    normalizedPower?: number | null;
  };
  reasoning: string;
  isReliable: boolean; // true se confidence > 0.8
  lastUpdated: string;
}

export interface ActivityPowerData {
  id: string;
  date: string;
  name: string;
  duration: number; // secondi
  avgPower: number; // Garantito non-null dal filtro
  normalizedPower: number | null;
  maxPower: number | null;
  intensityFactor: number | null;
  workType: 'test' | 'workout' | 'race' | 'endurance' | 'unknown';
}

/**
 * Determina il tipo di attività basandosi sui dati di potenza
 */
function classifyWorkoutType(activity: ActivityPowerData): 'test' | 'workout' | 'race' | 'endurance' | 'unknown' {
  const duration = activity.duration;
  const avgPower = activity.avgPower;
  const normalizedPower = activity.normalizedPower;
  const name = activity.name.toLowerCase();
  
  // Pattern per identificare test FTP
  const testPatterns = [
    /ftp.*test/i, /test.*ftp/i, /20.*min.*test/i, /8.*min.*test/i, 
    /threshold.*test/i, /test.*threshold/i, /cp.*test/i, /test.*cp/i
  ];
  
  if (testPatterns.some(pattern => pattern.test(name))) {
    return 'test';
  }
  
  // Se durata è tra 8-25 minuti con alta intensità, probabilmente test
  if (duration >= 480 && duration <= 1500 && normalizedPower && avgPower) {
    const intensityIndicator = normalizedPower / avgPower;
    if (intensityIndicator > 0.95) { // Potenza molto costante = test
      return 'test';
    }
  }
  
  // Riconosci salite lunghe e sostenute come potenziali test
  const climbPatterns = [
    /salita/i, /climb/i, /ascent/i, /monte/i, /passo/i, /col/i, /colle/i
  ];
  
  if (climbPatterns.some(pattern => pattern.test(name)) && 
      duration >= 1140 && duration <= 1800 && // 19-30 minuti
      normalizedPower && avgPower) {
    const intensityIndicator = normalizedPower / avgPower;
    if (intensityIndicator > 0.92) { // Salite sostenute = potenziali test
      return 'test';
    }
  }
  
  // Pattern per allenamenti strutturati
  const workoutPatterns = [
    /interval/i, /workout/i, /training/i, /sweet.*spot/i, /threshold/i, /tempo/i
  ];
  
  if (workoutPatterns.some(pattern => pattern.test(name))) {
    return 'workout';
  }
  
  // Pattern per gare
  const racePatterns = [
    /race/i, /gara/i, /criterium/i, /crit/i, /tt/i, /time.*trial/i, /crono/i
  ];
  
  if (racePatterns.some(pattern => pattern.test(name))) {
    return 'race';
  }
  
  // Attività lunghe a bassa intensità = endurance
  if (duration > 3600 && activity.intensityFactor && activity.intensityFactor < 0.75) {
    return 'endurance';
  }
  
  return 'unknown';
}

/**
 * Estrae i migliori sforzi dalle attività per diverse durate
 */
function extractBestEfforts(activities: ActivityPowerData[]): Record<number, { power: number; activityId: string; date: string }> {
  const bestEfforts: Record<number, { power: number; activityId: string; date: string }> = {};
  
  // Durate target in secondi per la curva di potenza
  const targetDurations = [300, 600, 1200, 1800, 3600]; // 5min, 10min, 20min, 30min, 60min
  
  for (const activity of activities) {
    if (!activity.avgPower || activity.avgPower <= 0) continue;
    
    for (const duration of targetDurations) {
      // Se l'attività è abbastanza lunga per contenere questa durata
      if (activity.duration >= duration) {
        // Per semplicità, usiamo avgPower come approssimazione del best effort
        // In un sistema reale, analizzeremmo i dati dettagliati power stream
        const estimatedBestPower = activity.normalizedPower || activity.avgPower;
        
        if (!bestEfforts[duration] || estimatedBestPower > bestEfforts[duration].power) {
          bestEfforts[duration] = {
            power: estimatedBestPower,
            activityId: activity.id,
            date: activity.date
          };
        }
      }
    }
  }
  
  return bestEfforts;
}

/**
 * Stima l'FTP usando il metodo del Critical Power Model
 */
function estimateFTPFromCriticalPower(bestEfforts: Record<number, { power: number; activityId: string; date: string }>): number | null {
  // Servono almeno 3 punti per fare una stima affidabile
  const efforts = Object.entries(bestEfforts).map(([duration, data]) => ({
    duration: parseInt(duration),
    power: data.power
  }));
  
  if (efforts.length < 3) return null;
  
  // Ordina per durata
  efforts.sort((a, b) => a.duration - b.duration);
  
  // Semplice interpolazione lineare per stimare la potenza a 60 minuti
  // In un sistema reale, useremo un modello Critical Power più sofisticato
  const longEfforts = efforts.filter(e => e.duration >= 1200); // >= 20 min
  
  if (longEfforts.length === 0) return null;
  
  // Se abbiamo un effort a 60 minuti, usalo direttamente
  const sixtyMinEffort = bestEfforts[3600];
  if (sixtyMinEffort) {
    return Math.round(sixtyMinEffort.power);
  }
  
  // Altrimenti, estrapola dalla potenza a 20-30 minuti
  const twentyMinEffort = bestEfforts[1200];
  if (twentyMinEffort) {
    // FTP stimato = 95% della potenza di 20 minuti
    return Math.round(twentyMinEffort.power * 0.95);
  }
  
  // Controlla effort a 30 minuti
  const thirtyMinEffort = bestEfforts[1800];
  if (thirtyMinEffort) {
    // FTP stimato = 98% della potenza di 30 minuti
    return Math.round(thirtyMinEffort.power * 0.98);
  }
  
  // Fallback: usa il miglior effort lungo disponibile con fattore appropriato
  const bestLongEffort = longEfforts[longEfforts.length - 1];
  
  // Applica fattore basato sulla durata dell'effort
  if (bestLongEffort.duration >= 1800) { // >= 30 min
    return Math.round(bestLongEffort.power * 0.98);
  } else if (bestLongEffort.duration >= 1200) { // >= 20 min
    return Math.round(bestLongEffort.power * 0.95);
  } else {
    return Math.round(bestLongEffort.power * 0.92); // < 20 min, più conservativo
  }
}

/**
 * Funzione principale per stimare l'FTP dalle attività dell'atleta
 */
export function estimateFTPFromActivities(
  activities: Activity[], 
  currentFTP?: number | null,
  minActivities: number = 3,
  daysLookback: number = 90 // Ripristino a 90 giorni come punto di partenza
): FTPEstimationResult | null {
  
  // LOGICA INTELLIGENTE: Prova prima con dati recenti, poi espande se necessario
  const lookbackPeriods = [90, 180, 365, 1095, 1460, 2190]; // 3 mesi, 6 mesi, 1 anno, 3 anni, 4 anni, 6 anni
  
  for (const period of lookbackPeriods) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);
    
    const recentActivities: ActivityPowerData[] = activities
      .filter(a => {
        const activityDate = new Date(a.activity_date || '');
        const hasValidDate = activityDate >= cutoffDate;
        const hasValidPower = a.avg_power_watts && a.avg_power_watts > 0;
        const hasValidDuration = a.duration_seconds && a.duration_seconds > 300;
        
        return hasValidDate && hasValidPower && hasValidDuration;
      })
      .map(a => ({
        id: a.id,
        date: a.activity_date || '',
        name: a.title || 'Attività senza nome',
        duration: a.duration_seconds!,
        avgPower: a.avg_power_watts!,
        normalizedPower: a.normalized_power_watts,
        maxPower: a.max_power_watts,
        intensityFactor: a.intensity_factor,
        workType: 'unknown' as const
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Più recenti prima
    
    // Se abbiamo abbastanza attività in questo periodo, procedi con l'analisi
    if (recentActivities.length >= minActivities) {
      return performFTPEstimation(recentActivities, period);
    }
    
    // FALLBACK: Se siamo all'ultimo periodo e abbiamo almeno 1 attività, prova comunque
    if (period === 2190 && recentActivities.length >= 1) {
      return performFTPEstimation(recentActivities, period);
    }
  }
  
  // Se nemmeno con 3 anni troviamo abbastanza attività, restituisci null
  return null;
}

/**
 * Esegue la stima FTP sulle attività filtrate
 */
function performFTPEstimation(recentActivities: ActivityPowerData[], periodUsed: number): FTPEstimationResult | null {
  // Classifica i tipi di allenamento
  recentActivities.forEach(activity => {
    activity.workType = classifyWorkoutType(activity);
  });
  
  // Cerca prima test FTP espliciti
  const ftpTests = recentActivities.filter(a => a.workType === 'test');
  
  for (const test of ftpTests) {
    // Verifica che avgPower sia valido prima di procedere
    if (!test.avgPower || test.avgPower <= 0) continue;
    
    // Test di 20 minuti
    if (test.duration >= 1140 && test.duration <= 1260) { // 19-21 minuti
      const estimatedFTP = Math.round(test.avgPower * FTP_ESTIMATION_METHODS.TWENTY_MINUTE_TEST.factor);
      return {
        estimatedFTP,
        method: 'TWENTY_MINUTE_TEST',
        confidence: FTP_ESTIMATION_METHODS.TWENTY_MINUTE_TEST.confidence,
        sourceActivity: {
          id: test.id,
          date: test.date,
          name: test.name,
          duration: test.duration,
          avgPower: test.avgPower,
          normalizedPower: test.normalizedPower
        },
        reasoning: `Test FTP di 20 minuti identificato (ultimi ${periodUsed} giorni). FTP stimato: ${estimatedFTP}W (95% di ${test.avgPower}W)`,
        isReliable: true,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Test di 8 minuti
    if (test.duration >= 450 && test.duration <= 540) { // 7.5-9 minuti
      const estimatedFTP = Math.round(test.avgPower * FTP_ESTIMATION_METHODS.EIGHT_MINUTE_TEST.factor);
      return {
        estimatedFTP,
        method: 'EIGHT_MINUTE_TEST',
        confidence: FTP_ESTIMATION_METHODS.EIGHT_MINUTE_TEST.confidence,
        sourceActivity: {
          id: test.id,
          date: test.date,
          name: test.name,
          duration: test.duration,
          avgPower: test.avgPower,
          normalizedPower: test.normalizedPower
        },
        reasoning: `Test FTP di 8 minuti identificato (ultimi ${periodUsed} giorni). FTP stimato: ${estimatedFTP}W (90% di ${test.avgPower}W)`,
        isReliable: true,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Test di 60 minuti
    if (test.duration >= 3540 && test.duration <= 3660) { // 59-61 minuti
      const estimatedFTP = Math.round(test.avgPower);
      return {
        estimatedFTP,
        method: 'SIXTY_MINUTE_POWER',
        confidence: FTP_ESTIMATION_METHODS.SIXTY_MINUTE_POWER.confidence,
        sourceActivity: {
          id: test.id,
          date: test.date,
          name: test.name,
          duration: test.duration,
          avgPower: test.avgPower,
          normalizedPower: test.normalizedPower
        },
        reasoning: `Test FTP di 60 minuti identificato (ultimi ${periodUsed} giorni). FTP stimato: ${estimatedFTP}W (100% di ${test.avgPower}W)`,
        isReliable: true,
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  // Se non ci sono test espliciti, usa il Critical Power Model
  const bestEfforts = extractBestEfforts(recentActivities);
  const criticalPowerFTP = estimateFTPFromCriticalPower(bestEfforts);
  
  if (criticalPowerFTP) {
    const sourceActivity = Object.values(bestEfforts).reduce((latest, current) => 
      new Date(current.date) > new Date(latest.date) ? current : latest
    );
    
    const activity = recentActivities.find(a => a.id === sourceActivity.activityId);
    
    return {
      estimatedFTP: criticalPowerFTP,
      method: 'CRITICAL_POWER',
      confidence: FTP_ESTIMATION_METHODS.CRITICAL_POWER.confidence,
      sourceActivity: activity ? {
        id: activity.id,
        date: activity.date,
        name: activity.name,
        duration: activity.duration,
        avgPower: activity.avgPower,
        normalizedPower: activity.normalizedPower
      } : undefined,
      reasoning: `FTP stimato da analisi curve di potenza (ultimi ${periodUsed} giorni). Basato su ${Object.keys(bestEfforts).length} best efforts`,
      isReliable: Object.keys(bestEfforts).length >= 3,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Se anche il Critical Power fallisce, prova threshold workouts
  const thresholdWorkouts = recentActivities.filter(a => 
    a.workType === 'workout' && 
    a.intensityFactor && 
    a.intensityFactor >= 0.85 && 
    a.intensityFactor <= 1.10 &&
    a.duration >= 1200 // Almeno 20 minuti
  );
  
  if (thresholdWorkouts.length > 0) {
    // Prendi il workout più recente in zona soglia
    const bestThresholdWorkout = thresholdWorkouts[0];
    const powerForCalculation = bestThresholdWorkout.normalizedPower || bestThresholdWorkout.avgPower;
    const estimatedFTP = Math.round(powerForCalculation * 1.05);
    
    return {
      estimatedFTP,
      method: 'THRESHOLD_WORKOUTS',
      confidence: FTP_ESTIMATION_METHODS.THRESHOLD_WORKOUTS.confidence,
      sourceActivity: {
        id: bestThresholdWorkout.id,
        date: bestThresholdWorkout.date,
        name: bestThresholdWorkout.name,
        duration: bestThresholdWorkout.duration,
        avgPower: bestThresholdWorkout.avgPower,
        normalizedPower: bestThresholdWorkout.normalizedPower
      },
      reasoning: `FTP stimato da allenamento in zona soglia (ultimi ${periodUsed} giorni, IF: ${bestThresholdWorkout.intensityFactor?.toFixed(2)}). Stima conservativa`,
      isReliable: false, // Meno affidabile dei test
      lastUpdated: new Date().toISOString()
    };
  }
  
  return null; // Nessuna stima possibile
}

/**
 * Valuta se una stima FTP dovrebbe essere suggerita all'utente
 */
export function shouldSuggestFTPUpdate(
  estimation: FTPEstimationResult,
  currentFTP?: number | null,
  threshold: number = 0.10 // 10% di differenza minima
): boolean {
  if (!estimation.isReliable) return false;
  
  // Se non c'è FTP attuale, suggerisci sempre (se affidabile)
  if (!currentFTP || currentFTP <= 0) return true;
  
  // Calcola la differenza percentuale
  const difference = Math.abs(estimation.estimatedFTP - currentFTP) / currentFTP;
  
  // Suggerisci solo se la differenza supera la soglia
  return difference >= threshold;
}

/**
 * Formatta il messaggio di suggerimento per l'utente
 */
export function formatFTPSuggestionMessage(
  estimation: FTPEstimationResult,
  currentFTP?: number | null
): string {
  const methodName = FTP_ESTIMATION_METHODS[estimation.method].name;
  const confidencePercent = Math.round(estimation.confidence * 100);
  
  if (!currentFTP) {
    return `Abbiamo rilevato un FTP stimato di ${estimation.estimatedFTP}W basato su "${methodName}" (confidenza: ${confidencePercent}%). Vuoi aggiornare il tuo profilo?`;
  }
  
  const difference = estimation.estimatedFTP - currentFTP;
  const changeText = difference > 0 ? 'miglioramento' : 'cambiamento';
  const differencePercent = Math.round(Math.abs(difference) / currentFTP * 100);
  
  return `Rilevato possibile ${changeText} dell'FTP: ${estimation.estimatedFTP}W vs ${currentFTP}W attuali (${differencePercent}% di differenza). Basato su "${methodName}" con ${confidencePercent}% di confidenza. Aggiornare?`;
}

/**
 * Versione retroattiva della stima FTP - analizza TUTTE le attività indipendentemente dalla data
 * Utilizzata quando si caricano attività storiche o si vuole una valutazione completa
 */
export function estimateFTPFromAllActivities(
  activities: Activity[], 
  currentFTP?: number | null,
  minActivities: number = 2 // Soglia più bassa per attività storiche
): FTPEstimationResult | null {
  
  // Filtra TUTTE le attività valide senza limiti temporali
  const validActivities: ActivityPowerData[] = activities
    .filter(a => {
      const hasValidPower = a.avg_power_watts && a.avg_power_watts > 0;
      const hasValidDuration = a.duration_seconds && a.duration_seconds > 300;
      const hasValidDate = a.activity_date && a.activity_date.trim() !== '';
      
      return hasValidDate && hasValidPower && hasValidDuration;
    })
    .map(a => ({
      id: a.id,
      date: a.activity_date || '',
      name: a.title || 'Attività senza nome',
      duration: a.duration_seconds!,
      avgPower: a.avg_power_watts!,
      normalizedPower: a.normalized_power_watts,
      maxPower: a.max_power_watts,
      intensityFactor: a.intensity_factor,
      workType: 'unknown' as const
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Più recenti prima
  
  // Se non abbiamo abbastanza attività, restituisci null
  if (validActivities.length < minActivities) {
    return null;
  }

  // Calcola il periodo effettivo analizzato
  const oldestActivity = validActivities[validActivities.length - 1];
  const newestActivity = validActivities[0];
  const daysCovered = Math.ceil(
    (new Date(newestActivity.date).getTime() - new Date(oldestActivity.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  console.log(`[estimateFTPFromAllActivities] Analizzando ${validActivities.length} attività in ${daysCovered} giorni (${oldestActivity.date} → ${newestActivity.date})`);

  // Usa la stessa logica di performFTPEstimation ma con tutte le attività
  return performFTPEstimation(validActivities, daysCovered);
}

/**
 * Confronta FTP stimato con FTP attuale e determina se suggerire un aggiornamento
 * Include logica specifica per attività storiche
 */
export function shouldSuggestFTPUpdateFromHistorical(
  estimation: FTPEstimationResult,
  currentFTP?: number | null,
  threshold: number = 0.15 // 15% per attività storiche (più conservativo)
): { shouldUpdate: boolean; message: string } {
  if (!currentFTP) {
    return {
      shouldUpdate: true,
      message: `🎯 **FTP Stimato**: ${estimation.estimatedFTP}W basato su analisi delle attività storiche. Consigliamo di aggiornare il profilo atleta.`
    };
  }

  const difference = estimation.estimatedFTP - currentFTP;
  const percentageChange = Math.abs(difference) / currentFTP;

  if (percentageChange >= threshold) {
    const direction = difference > 0 ? 'superiore' : 'inferiore';
    const changePercent = Math.round(percentageChange * 100);
    
    return {
      shouldUpdate: true,
      message: `📈 **FTP Suggerito**: ${estimation.estimatedFTP}W (${direction} del ${changePercent}% rispetto a ${currentFTP}W attuale)\n` +
               `📅 **Basato su**: Analisi attività storiche - ${estimation.reasoning}\n` +
               `🔍 **Metodo**: ${estimation.method} (affidabilità: ${Math.round(estimation.confidence * 100)}%)`
    };
  }

  return {
    shouldUpdate: false,
    message: `✅ FTP attuale (${currentFTP}W) coerente con le attività storiche (stima: ${estimation.estimatedFTP}W)`
  };
} 