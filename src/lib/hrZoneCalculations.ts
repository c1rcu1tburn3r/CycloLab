/**
 * Sistema professionale per il calcolo automatico delle zone di frequenza cardiaca
 * Supporta multiple metodologie scientificamente validate
 */

// Metodi standard industria per determinazione zone HR
export const HR_ZONE_METHODS = {
  // Metodo HRmax test (gold standard)
  HRMAX_TEST: {
    name: 'Test HRmax',
    confidence: 0.98,
    description: 'Frequenza cardiaca massima rilevata da test all-out'
  },
  
  // Metodo soglia lattacida (LTHR)
  LACTATE_THRESHOLD: {
    name: 'Soglia Lattacida',
    confidence: 0.95,
    description: 'LTHR da test di 20-30 minuti a intensità costante'
  },
  
  // Metodo età (Karvonen formula)
  AGE_FORMULA: {
    name: 'Formula Età',
    confidence: 0.70,
    description: 'Stima basata su età (220 - età) - meno accurata'
  },
  
  // Analisi automatica dalle attività
  ACTIVITY_ANALYSIS: {
    name: 'Analisi Attività',
    confidence: 0.85,
    description: 'Analisi automatica da pattern delle attività'
  }
} as const;

export type HRZoneMethod = keyof typeof HR_ZONE_METHODS;

export interface HRZoneEstimationResult {
  estimatedHRMax: number;
  estimatedLTHR: number | null;
  method: HRZoneMethod;
  confidence: number;
  sourceActivity?: {
    id: string;
    date: string;
    name: string;
    maxHR: number;
    avgHR: number;
    duration: number;
  };
  reasoning: string;
  isReliable: boolean;
  lastUpdated: string;
}

export interface HRZone {
  zone: string;
  name: string;
  description: string;
  minBPM: number;
  maxBPM: number;
  minPercent: number;
  maxPercent: number;
  color: string;
  trainingEffect: string;
}

/**
 * Calcola le zone HR basate su HRmax
 */
export function calculateHRZonesFromMax(hrMax: number): HRZone[] {
  return [
    {
      zone: 'Z1',
      name: 'Recupero Attivo',
      description: 'Recupero attivo, circolazione',
      minBPM: Math.round(hrMax * 0.50),
      maxBPM: Math.round(hrMax * 0.60),
      minPercent: 50,
      maxPercent: 60,
      color: '#6b7280',
      trainingEffect: 'Recupero, circolazione, brucia grassi'
    },
    {
      zone: 'Z2',
      name: 'Base Aerobica',
      description: 'Resistenza aerobica base',
      minBPM: Math.round(hrMax * 0.60),
      maxBPM: Math.round(hrMax * 0.70),
      minPercent: 60,
      maxPercent: 70,
      color: '#10b981',
      trainingEffect: 'Migliora capacità aerobica, efficienza metabolica'
    },
    {
      zone: 'Z3',
      name: 'Aerobica',
      description: 'Ritmo aerobico sostenuto',
      minBPM: Math.round(hrMax * 0.70),
      maxBPM: Math.round(hrMax * 0.80),
      minPercent: 70,
      maxPercent: 80,
      color: '#f59e0b',
      trainingEffect: 'Sviluppa efficienza cardio-respiratoria'
    },
    {
      zone: 'Z4',
      name: 'Soglia Lattacida',
      description: 'Intensità di soglia anaerobica',
      minBPM: Math.round(hrMax * 0.80),
      maxBPM: Math.round(hrMax * 0.90),
      minPercent: 80,
      maxPercent: 90,
      color: '#ef4444',
      trainingEffect: 'Aumenta tolleranza al lattato, potenza sostenibile'
    },
    {
      zone: 'Z5',
      name: 'VO2max',
      description: 'Massimo consumo ossigeno',
      minBPM: Math.round(hrMax * 0.90),
      maxBPM: hrMax,
      minPercent: 90,
      maxPercent: 100,
      color: '#8b5cf6',
      trainingEffect: 'Sviluppa VO2max, capacità anaerobica'
    }
  ];
}

/**
 * Calcola le zone HR basate su LTHR (più preciso per endurance)
 */
export function calculateHRZonesFromLTHR(lthr: number): HRZone[] {
  // Stima HRmax da LTHR (tipicamente LTHR è 85-95% di HRmax)
  const estimatedHRMax = Math.round(lthr / 0.90);
  
  return [
    {
      zone: 'Z1',
      name: 'Recupero Attivo',
      description: 'Recupero attivo, circolazione',
      minBPM: Math.round(lthr * 0.65),
      maxBPM: Math.round(lthr * 0.75),
      minPercent: 65,
      maxPercent: 75,
      color: '#6b7280',
      trainingEffect: 'Recupero, rigenerazione'
    },
    {
      zone: 'Z2',
      name: 'Base Aerobica',
      description: 'Zona aerobica, brucia grassi',
      minBPM: Math.round(lthr * 0.75),
      maxBPM: Math.round(lthr * 0.85),
      minPercent: 75,
      maxPercent: 85,
      color: '#10b981',
      trainingEffect: 'Base aerobica, efficienza metabolica'
    },
    {
      zone: 'Z3',
      name: 'Tempo',
      description: 'Ritmo gara media distanza',
      minBPM: Math.round(lthr * 0.85),
      maxBPM: Math.round(lthr * 0.95),
      minPercent: 85,
      maxPercent: 95,
      color: '#f59e0b',
      trainingEffect: 'Resistenza muscolare, forza aerobica'
    },
    {
      zone: 'Z4',
      name: 'Soglia Lattacida',
      description: 'Soglia anaerobica, LTHR',
      minBPM: Math.round(lthr * 0.95),
      maxBPM: Math.round(lthr * 1.05),
      minPercent: 95,
      maxPercent: 105,
      color: '#ef4444',
      trainingEffect: 'Migliora soglia lattacida, potenza FTP'
    },
    {
      zone: 'Z5',
      name: 'VO2max',
      description: 'Massimo consumo ossigeno',
      minBPM: Math.round(lthr * 1.05),
      maxBPM: estimatedHRMax,
      minPercent: 105,
      maxPercent: Math.round((estimatedHRMax / lthr) * 100),
      color: '#8b5cf6',
      trainingEffect: 'VO2max, potenza anaerobica'
    }
  ];
}

/**
 * Analizza le attività per stimare HRmax e LTHR automaticamente
 * Versione migliorata che utilizza tutte le attività disponibili e fa stime anche con dati limitati
 */
export function analyzeHRFromActivities(
  activities: any[],
  minActivities: number = 2, // Ridotto da 5 a 2
  daysLookback: number = 365 * 3 // Esteso a 3 anni invece di 90 giorni
): HRZoneEstimationResult | null {
  
  // Prima prova con tutte le attività con dati HR validi (senza filtro temporale)
  let hrActivities = activities
    .filter(a => {
      return a.max_heart_rate_bpm && 
             a.max_heart_rate_bpm > 50 && // Soglia minima realistica
             a.max_heart_rate_bpm < 220 && // Soglia massima realistica
             a.avg_heart_rate_bpm &&
             a.avg_heart_rate_bpm > 40 &&
             a.duration_seconds && 
             a.duration_seconds > 300; // Almeno 5 minuti (ridotto da 10)
    })
    .sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime());

  // Se non abbiamo abbastanza dati, ritorna null
  if (hrActivities.length < minActivities) {
    return null;
  }

  // Se abbiamo più di 50 attività, usa solo le più recenti per performance
  if (hrActivities.length > 50) {
    hrActivities = hrActivities.slice(0, 50);
  }

  // Trova HRmax dalle attività (prendi il 95° percentile per evitare outlier)
  const maxHRValues = hrActivities.map(a => a.max_heart_rate_bpm).sort((a, b) => b - a);
  const percentile95Index = Math.floor(maxHRValues.length * 0.05);
  const maxHRFound = maxHRValues[percentile95Index] || maxHRValues[0];
  
  // Analizza pattern per identificare test o sforzi massimali
  const intensiveActivities = hrActivities.filter(a => {
    const hrIntensity = a.max_heart_rate_bpm / maxHRFound;
    const duration = a.duration_seconds;
    
    // Attività ad alta intensità (>88% HRmax) di durata 5-60 minuti (più flessibile)
    return hrIntensity > 0.88 && duration >= 300 && duration <= 3600;
  });

  let estimatedLTHR: number | null = null;
  let method: HRZoneMethod = 'ACTIVITY_ANALYSIS';
  let confidence = 0.7; // Base confidence
  let reasoning = '';
  let sourceActivity = undefined;

  // Determina la qualità dei dati e confidence
  if (hrActivities.length >= 10) {
    confidence = 0.85;
  } else if (hrActivities.length >= 5) {
    confidence = 0.75;
  }

  // Cerca sforzi di soglia per stimare LTHR
  if (intensiveActivities.length > 0) {
    const thresholdActivities = intensiveActivities.filter(a => {
      const duration = a.duration_seconds;
      const avgHRPercent = a.avg_heart_rate_bpm / maxHRFound;
      
      // Test di soglia: 10-40 min con HR media alta (più flessibile)
      return duration >= 600 && duration <= 2400 && avgHRPercent > 0.80;
    });

    if (thresholdActivities.length > 0) {
      // Prendi la media dei migliori 3 per maggiore accuratezza
      const bestActivities = thresholdActivities.slice(0, 3);
      const avgLTHR = bestActivities.reduce((sum, a) => sum + a.avg_heart_rate_bpm, 0) / bestActivities.length;
      estimatedLTHR = Math.round(avgLTHR);
      
      method = 'LACTATE_THRESHOLD';
      confidence = Math.min(confidence + 0.1, 0.95); // Bonus per LTHR trovata
      reasoning = `LTHR stimata da ${bestActivities.length} test di soglia (${Math.round(bestActivities[0].duration_seconds / 60)} min)`;
      
      sourceActivity = {
        id: bestActivities[0].id,
        date: bestActivities[0].activity_date,
        name: bestActivities[0].title || 'Test Soglia',
        maxHR: bestActivities[0].max_heart_rate_bpm,
        avgHR: bestActivities[0].avg_heart_rate_bpm,
        duration: bestActivities[0].duration_seconds
      };
    } else {
      // Fallback: stima LTHR come 85% della HRmax
      estimatedLTHR = Math.round(maxHRFound * 0.85);
      reasoning = `LTHR stimata come 85% di HRmax (${maxHRFound} bpm)`;
    }
  } else {
    // Fallback: stima LTHR come 85% della HRmax
    estimatedLTHR = Math.round(maxHRFound * 0.85);
    reasoning = `LTHR stimata come 85% di HRmax (${maxHRFound} bpm)`;
  }

  // Controlla se HRmax sembra da test all-out
  const maxHRActivity = hrActivities.find(a => a.max_heart_rate_bpm === maxHRFound);
  if (maxHRActivity && maxHRFound > 170) { // Soglia più bassa per essere inclusivi
    method = 'HRMAX_TEST';
    confidence = Math.min(confidence + 0.05, 0.98);
    
    if (!sourceActivity) {
      sourceActivity = {
        id: maxHRActivity.id,
        date: maxHRActivity.activity_date,
        name: maxHRActivity.title || 'Test HRmax',
        maxHR: maxHRActivity.max_heart_rate_bpm,
        avgHR: maxHRActivity.avg_heart_rate_bpm,
        duration: maxHRActivity.duration_seconds
      };
    }
  }

  // Aggiorna reasoning se non impostato
  if (!reasoning) {
    reasoning = `HRmax e LTHR stimate da analisi di ${hrActivities.length} attività`;
  }

  // Aggiungi info sulla qualità dei dati al reasoning
  const dataQuality = hrActivities.length >= 10 ? 'alta' : 
                     hrActivities.length >= 5 ? 'media' : 'limitata';
  reasoning += ` (qualità dati: ${dataQuality})`;

  return {
    estimatedHRMax: maxHRFound,
    estimatedLTHR,
    method,
    confidence,
    sourceActivity,
    reasoning,
    isReliable: confidence > 0.6, // Soglia più bassa per essere inclusivi
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Valuta se suggerire aggiornamento zone HR
 */
export function shouldSuggestHRUpdate(
  estimation: HRZoneEstimationResult,
  currentHRMax?: number | null,
  currentLTHR?: number | null,
  threshold: number = 0.05 // 5% di differenza
): boolean {
  if (!estimation.isReliable) return false;
  
  // Se non ci sono zone attuali, suggerisci sempre
  if (!currentHRMax && !currentLTHR) return true;
  
  // Controlla differenza significativa
  if (currentHRMax) {
    const hrMaxDifference = Math.abs(estimation.estimatedHRMax - currentHRMax) / currentHRMax;
    if (hrMaxDifference >= threshold) return true;
  }
  
  if (currentLTHR && estimation.estimatedLTHR) {
    const lthrDifference = Math.abs(estimation.estimatedLTHR - currentLTHR) / currentLTHR;
    if (lthrDifference >= threshold) return true;
  }
  
  return false;
}

/**
 * Calcola statistiche HR da attività recenti
 */
export function calculateHRStats(activities: any[], days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentHRActivities = activities.filter(a => {
    const activityDate = new Date(a.activity_date || '');
    return activityDate >= cutoffDate && a.avg_heart_rate_bpm && a.avg_heart_rate_bpm > 0;
  });

  if (recentHRActivities.length === 0) {
    return null;
  }

  const avgHR = Math.round(
    recentHRActivities.reduce((sum, a) => sum + a.avg_heart_rate_bpm, 0) / recentHRActivities.length
  );
  
  const maxHR = Math.max(...recentHRActivities.map(a => a.max_heart_rate_bpm || 0));
  const minHR = Math.min(...recentHRActivities.map(a => a.avg_heart_rate_bpm));
  
  return {
    avgHR,
    maxHR,
    minHR,
    activitiesWithHR: recentHRActivities.length,
    totalActivities: activities.length
  };
} 