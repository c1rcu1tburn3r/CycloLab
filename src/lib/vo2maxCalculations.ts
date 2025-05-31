/**
 * Calcoli VO2max scientificamente accurati per CycloLab
 * Implementa formule validate dalla letteratura scientifica con strategia adattiva
 */

import { differenceInYears } from 'date-fns';

export type VO2maxMethod = 'storer_ppo' | 'storer_cp' | 'ftp_advanced' | 'ftp_basic' | 'estimation';
export type Sex = 'M' | 'F';

export interface VO2maxInput {
  // Dati atleta
  birth_date?: string;
  sex?: Sex;
  weight_kg?: number;
  
  // Dati performance
  ftp_watts?: number;
  
  // Personal bests per PPO (Peak Power Output)
  pb_power_300s_watts?: number;  // PPO 5 min (migliore per VO2max)
  pb_power_60s_watts?: number;   // PPO 1 min (backup)
  pb_power_1200s_watts?: number; // PPO 20 min (Critical Power)
}

export interface VO2maxResult {
  vo2max: number;                // ml/kg/min
  method: VO2maxMethod;
  confidence: number;            // 0-1 (0 = non affidabile, 1 = molto affidabile)
  reasoning: string;
  powerUsed?: number;            // Watt utilizzati per il calcolo
  adaptiveMessage?: string;      // Messaggio se ha usato fallback
}

/**
 * Calcola l'età da data di nascita
 */
function calculateAge(birthDate: string): number {
  return differenceInYears(new Date(), new Date(birthDate));
}

/**
 * Formula di Storer et al. per calcolo VO2max da PPO
 * Riferimento: Storer TW, Davis JA, Caiozzo VJ (1990)
 * 
 * Uomini: VO2max = (10.51×PPO + 6.35×Peso - 10.49×Età + 519.3)/Peso
 * Donne: VO2max = (9.39×PPO + 7.7×Peso - 5.88×Età + 137.7)/Peso
 */
function calculateVO2maxStorer(
  ppo: number, 
  weight: number, 
  age: number, 
  sex: Sex
): number {
  let vo2maxAbsolute: number;
  
  if (sex === 'M') {
    vo2maxAbsolute = 10.51 * ppo + 6.35 * weight - 10.49 * age + 519.3;
  } else {
    vo2maxAbsolute = 9.39 * ppo + 7.7 * weight - 5.88 * age + 137.7;
  }
  
  // Converti in ml/kg/min
  const vo2maxRelative = vo2maxAbsolute / weight;
  
  // Sanity check: VO2max realistici per ciclisti
  const minVO2max = 25; // Principiante
  const maxVO2max = 85; // Elite mondiale
  
  return Math.max(minVO2max, Math.min(maxVO2max, vo2maxRelative));
}

/**
 * Formula migliorata basata su FTP con fattori correttivi
 * Basata su correlazioni empiriche FTP-VO2max con aggiustamenti scientifici
 */
function calculateVO2maxFromFTP(
  ftp: number,
  weight: number,
  age?: number,
  sex?: Sex
): number {
  // Fattore base: correlazione media FTP-VO2max
  // Letteratura: VO2max ≈ 10.8-12.8 ml/min/W * W/kg
  let baseFactor = 11.5; // ml/min per watt/kg (valore medio)
  
  // Fattore correttivo per età (declino ~0.5% annuo dopo i 25)
  let ageFactor = 1.0;
  if (age && age > 25) {
    ageFactor = 1.0 - (age - 25) * 0.005;
    ageFactor = Math.max(0.7, ageFactor); // Min 70% efficienza
  }
  
  // Fattore correttivo per sesso
  let sexFactor = 1.0;
  if (sex === 'F') {
    sexFactor = 0.88; // Donne ~12% inferiore a parità di W/kg
  }
  
  // Calcola W/kg
  const wPerKg = ftp / weight;
  
  // Calcola VO2max con fattori correttivi
  let vo2max = baseFactor * wPerKg * ageFactor * sexFactor;
  
  // Sanity check
  const minVO2max = 25;
  const maxVO2max = 85;
  
  return Math.max(minVO2max, Math.min(maxVO2max, vo2max));
}

/**
 * Calcolo VO2max con strategia adattiva
 * Usa il metodo migliore disponibile basato sui dati forniti
 */
export function calculateVO2max(input: VO2maxInput): VO2maxResult {
  const age = input.birth_date ? calculateAge(input.birth_date) : undefined;
  
  // METODO 1: Formula Storer con PPO 5 min (gold standard)
  if (input.pb_power_300s_watts && input.weight_kg && age && input.sex) {
    const vo2max = calculateVO2maxStorer(
      input.pb_power_300s_watts,
      input.weight_kg,
      age,
      input.sex
    );
    
    return {
      vo2max: Math.round(vo2max),
      method: 'storer_ppo',
      confidence: 0.90,
      reasoning: `Formula Storer con PPO 5min (${input.pb_power_300s_watts}W), età ${age}, sesso ${input.sex}`,
      powerUsed: input.pb_power_300s_watts
    };
  }
  
  // METODO 2: Formula Storer con PPO 1 min (meno accurato ma valido)
  if (input.pb_power_60s_watts && input.weight_kg && age && input.sex) {
    // PPO 1min è ~15% superiore al PPO 5min, aggiustiamo
    const estimatedPPO5min = input.pb_power_60s_watts * 0.85;
    
    const vo2max = calculateVO2maxStorer(
      estimatedPPO5min,
      input.weight_kg,
      age,
      input.sex
    );
    
    return {
      vo2max: Math.round(vo2max),
      method: 'storer_ppo',
      confidence: 0.80,
      reasoning: `Formula Storer con PPO 1min stimato (${Math.round(estimatedPPO5min)}W da ${input.pb_power_60s_watts}W), età ${age}, sesso ${input.sex}`,
      powerUsed: input.pb_power_60s_watts,
      adaptiveMessage: 'Usato PPO 1min con stima PPO 5min (-15%)'
    };
  }
  
  // METODO 3: Formula Storer con Critical Power (FTP 20min)
  if (input.pb_power_1200s_watts && input.weight_kg && age && input.sex) {
    // CP 20min è ~5% superiore al PPO 5min stimato
    const estimatedPPO5min = input.pb_power_1200s_watts * 0.95;
    
    const vo2max = calculateVO2maxStorer(
      estimatedPPO5min,
      input.weight_kg,
      age,
      input.sex
    );
    
    return {
      vo2max: Math.round(vo2max),
      method: 'storer_cp',
      confidence: 0.75,
      reasoning: `Formula Storer con Critical Power (${Math.round(estimatedPPO5min)}W da ${input.pb_power_1200s_watts}W), età ${age}, sesso ${input.sex}`,
      powerUsed: input.pb_power_1200s_watts,
      adaptiveMessage: 'Usato Critical Power 20min con stima PPO 5min (-5%)'
    };
  }
  
  // METODO 4: FTP avanzato (con età e sesso)
  if (input.ftp_watts && input.weight_kg && age && input.sex) {
    const vo2max = calculateVO2maxFromFTP(
      input.ftp_watts,
      input.weight_kg,
      age,
      input.sex
    );
    
    return {
      vo2max: Math.round(vo2max),
      method: 'ftp_advanced',
      confidence: 0.70,
      reasoning: `FTP-based avanzato con fattori età (${age}) e sesso (${input.sex})`,
      powerUsed: input.ftp_watts,
      adaptiveMessage: 'Usato FTP con correzioni scientifiche'
    };
  }
  
  // METODO 5: FTP base (fallback)
  if (input.ftp_watts && input.weight_kg) {
    const vo2max = calculateVO2maxFromFTP(input.ftp_watts, input.weight_kg);
    
    return {
      vo2max: Math.round(vo2max),
      method: 'ftp_basic',
      confidence: 0.60,
      reasoning: 'Formula FTP semplificata (limitata senza età/sesso)',
      powerUsed: input.ftp_watts,
      adaptiveMessage: 'Calcolo limitato: aggiungi età e sesso per maggiore accuratezza'
    };
  }
  
  // METODO 6: Nessun dato sufficiente
  return {
    vo2max: 0,
    method: 'estimation',
    confidence: 0,
    reasoning: 'Dati insufficienti: servono peso + (FTP o personal bests)',
    adaptiveMessage: 'Aggiungi misurazioni peso e attività con dati di potenza'
  };
}

/**
 * Valuta la qualità del VO2max calcolato
 */
export function evaluateVO2maxQuality(vo2max: number, age?: number, sex?: Sex): {
  category: 'poor' | 'fair' | 'good' | 'very_good' | 'excellent' | 'superior';
  percentile: string;
  description: string;
} {
  // Tabelle normative per ciclisti (approssimate)
  // Riferimento: Norms from cycling literature
  
  if (!age) {
    // Valutazione generica senza età
    if (vo2max < 35) return { category: 'poor', percentile: '<20%', description: 'Sotto la media' };
    if (vo2max < 45) return { category: 'fair', percentile: '20-40%', description: 'Media' };
    if (vo2max < 55) return { category: 'good', percentile: '40-60%', description: 'Buona' };
    if (vo2max < 65) return { category: 'very_good', percentile: '60-80%', description: 'Molto buona' };
    if (vo2max < 75) return { category: 'excellent', percentile: '80-95%', description: 'Eccellente' };
    return { category: 'superior', percentile: '>95%', description: 'Elite' };
  }
  
  // Valutazione specifica per età e sesso
  const isMale = sex === 'M';
  let thresholds: number[];
  
  if (isMale) {
    if (age < 30) {
      thresholds = [40, 48, 56, 64, 72]; // Uomini <30
    } else if (age < 40) {
      thresholds = [38, 46, 54, 62, 70]; // Uomini 30-39
    } else if (age < 50) {
      thresholds = [36, 44, 52, 60, 68]; // Uomini 40-49
    } else {
      thresholds = [34, 42, 50, 58, 66]; // Uomini >50
    }
  } else {
    if (age < 30) {
      thresholds = [35, 42, 50, 58, 66]; // Donne <30
    } else if (age < 40) {
      thresholds = [33, 40, 48, 56, 64]; // Donne 30-39
    } else if (age < 50) {
      thresholds = [31, 38, 46, 54, 62]; // Donne 40-49
    } else {
      thresholds = [29, 36, 44, 52, 60]; // Donne >50
    }
  }
  
  if (vo2max < thresholds[0]) return { category: 'poor', percentile: '<20%', description: 'Sotto la media per età/sesso' };
  if (vo2max < thresholds[1]) return { category: 'fair', percentile: '20-40%', description: 'Media per età/sesso' };
  if (vo2max < thresholds[2]) return { category: 'good', percentile: '40-60%', description: 'Buona per età/sesso' };
  if (vo2max < thresholds[3]) return { category: 'very_good', percentile: '60-80%', description: 'Molto buona per età/sesso' };
  if (vo2max < thresholds[4]) return { category: 'excellent', percentile: '80-95%', description: 'Eccellente per età/sesso' };
  return { category: 'superior', percentile: '>95%', description: 'Livello elite per età/sesso' };
} 