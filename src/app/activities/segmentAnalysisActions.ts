'use server';

import type { RoutePoint, SegmentMetrics } from '@/lib/types';
// import { createServerClient } from '@supabase/ssr'; // Necessario in futuro per dati atleta
// import { cookies } from 'next/headers'; // Necessario in futuro

// Helper function per calcolare la media di un array di numeri, ignorando null/undefined
function calculateAverage(numbers: (number | undefined | null)[]): number | null {
  const validNumbers = numbers.filter(n => typeof n === 'number') as number[];
  if (validNumbers.length === 0) return null;
  return validNumbers.reduce((acc, val) => acc + val, 0) / validNumbers.length;
}

// Helper function per trovare il massimo in un array di numeri, ignorando null/undefined
function calculateMax(numbers: (number | undefined | null)[]): number | null {
  const validNumbers = numbers.filter(n => typeof n === 'number') as number[];
  if (validNumbers.length === 0) return null;
  return Math.max(...validNumbers);
}

function calculateNormalizedPower(powerReadings: (number | undefined | null)[]): number | null {
  const validPowers = powerReadings.filter(p => typeof p === 'number' && p >= 0) as number[];

  if (validPowers.length === 0) return null; // Nessun dato di potenza valido

  // Se i dati sono inferiori a 30 campioni, NP è tipicamente considerato uguale ad AP.
  // O si potrebbe decidere di non calcolarlo (return null).
  // Per ora, se meno di 30 campioni, restituisce la media semplice.
  if (validPowers.length < 30) {
    return calculateAverage(validPowers);
  }

  const thirtySecondRollingAveragePowers: number[] = [];
  // Calcola la media mobile di 30 secondi
  for (let i = 29; i < validPowers.length; i++) { // Inizia dal 30esimo campione (indice 29)
    const window = validPowers.slice(i - 29, i + 1); // Finestra di 30 valori
    const windowAverage = window.reduce((acc, val) => acc + val, 0) / 30; // window.length è sempre 30 qui
    thirtySecondRollingAveragePowers.push(windowAverage);
  }
  
  if (thirtySecondRollingAveragePowers.length === 0) {
    // Questo caso dovrebbe essere coperto dalla condizione iniziale (validPowers.length < 30)
    // o se il segmento ha esattamente 0-29 punti validi dopo il filtro.
    // Per sicurezza, se non ci sono medie mobili, ritorna AP.
    return calculateAverage(validPowers); 
  }

  const fourthPowerAverages = thirtySecondRollingAveragePowers.map(p => Math.pow(p, 4));
  // calculateAverage gestisce array vuoti, quindi non serve un controllo extra qui per fourthPowerAverages.length === 0
  const averageOfFourthPowers = calculateAverage(fourthPowerAverages);

  if (averageOfFourthPowers === null || averageOfFourthPowers < 0) {
    // Se la media delle quarte potenze è nulla o negativa (improbabile con potenze >=0), NP non è calcolabile in modo standard
    return null; 
  }

  return Math.pow(averageOfFourthPowers, 0.25);
}

export async function analyzeActivitySegment(
  segmentRoutePoints: RoutePoint[],
  userId?: string | null, // Aggiunto userId opzionale
): Promise<{ data?: SegmentMetrics; error?: string }> {
  if (!segmentRoutePoints || segmentRoutePoints.length < 2) {
    return { error: 'Segmento troppo corto per l\'analisi (minimo 2 punti richiesti).' };
  }

  // --- Mock/Placeholder per Dati Atleta (da sostituire con fetch da DB) ---
  let athleteFTP: number | null = null;
  let athleteWeightKg: number | null = null;

  if (userId) {
    // TODO: In futuro, recuperare questi dati da Supabase usando userId
    // console.log(`[analyzeActivitySegment] Analisi per utente: ${userId} - recupero dati profilo...`);
    // Per ora, usiamo valori mock se un userId è fornito, altrimenti rimangono null
    athleteFTP = 250; // Esempio FTP
    athleteWeightKg = 70; // Esempio Peso
  } else {
    // console.warn('[analyzeActivitySegment] UserId non fornito, alcune metriche non saranno calcolate.');
  }
  // --- Fine Mock/Placeholder ---

  try {
    const firstPoint = segmentRoutePoints[0];
    const lastPoint = segmentRoutePoints[segmentRoutePoints.length - 1];

    // --- Metriche Generali ---
    const durationSeconds = lastPoint.time - firstPoint.time;
    // Gestione del caso in cui distance non sia definita per firstPoint o lastPoint
    const startDistance = firstPoint.distance === undefined || firstPoint.distance === null ? 0 : firstPoint.distance;
    const endDistance = lastPoint.distance === undefined || lastPoint.distance === null ? startDistance : lastPoint.distance;
    const distanceMeters = endDistance - startDistance;

    let totalElevationGain = 0;
    let totalElevationLoss = 0;
    for (let i = 1; i < segmentRoutePoints.length; i++) {
      const prev = segmentRoutePoints[i-1];
      const curr = segmentRoutePoints[i];
      if (prev.elevation !== undefined && curr.elevation !== undefined && prev.elevation !== null && curr.elevation !== null) {
        const diff = curr.elevation - prev.elevation;
        if (diff > 0) {
          totalElevationGain += diff;
        } else {
          totalElevationLoss += Math.abs(diff);
        }
      }
    }
    
    // --- Pendenza ---
    const grades = segmentRoutePoints.map(p => p.grade); 
    const averageGrade = calculateAverage(grades);
    const maxGrade = calculateMax(grades);

    // --- Velocità ---
    const speedsKph = segmentRoutePoints.map(p => p.speed);
    const averageSpeedKph = calculateAverage(speedsKph);
    const maxSpeedKph = calculateMax(speedsKph);
    
    const vam = (totalElevationGain > 0 && durationSeconds > 0) 
                ? (totalElevationGain / (durationSeconds / 3600)) 
                : null;

    // --- Potenza ---
    const powers = segmentRoutePoints.map(p => p.power);
    const averagePower = calculateAverage(powers);
    const normalizedPower = calculateNormalizedPower(powers);
    const maxPower = calculateMax(powers);
    const workKiloJoules = averagePower !== null && durationSeconds > 0 
                         ? (averagePower * durationSeconds) / 1000 
                         : null;
    
    // --- Frequenza Cardiaca ---
    const heartRates = segmentRoutePoints.map(p => p.heart_rate);
    const averageHeartRate = calculateAverage(heartRates);
    const maxHeartRate = calculateMax(heartRates);

    // --- Cadenza ---
    const cadences = segmentRoutePoints.map(p => p.cadence);
    const averageCadence = calculateAverage(cadences);
    const maxCadence = calculateMax(cadences);

    const metrics: SegmentMetrics = {
      durationSeconds,
      distanceMeters,
      totalElevationGain: parseFloat(totalElevationGain.toFixed(1)),
      totalElevationLoss: parseFloat(totalElevationLoss.toFixed(1)),
      averageGrade: averageGrade !== null ? parseFloat(averageGrade.toFixed(1)) : null,
      maxGrade: maxGrade !== null ? parseFloat(maxGrade.toFixed(1)) : null,
      averageSpeedKph: averageSpeedKph !== null ? parseFloat(averageSpeedKph.toFixed(1)) : null,
      maxSpeedKph: maxSpeedKph !== null ? parseFloat(maxSpeedKph.toFixed(1)) : null,
      vam: vam !== null ? parseFloat(vam.toFixed(0)) : null,
      averagePower: averagePower !== null ? parseFloat(averagePower.toFixed(0)) : null,
      normalizedPower: normalizedPower !== null ? parseFloat(normalizedPower.toFixed(0)) : null,
      maxPower,
      workKiloJoules: workKiloJoules !== null ? parseFloat(workKiloJoules.toFixed(1)) : null,
      averageHeartRate: averageHeartRate !== null ? parseFloat(averageHeartRate.toFixed(0)) : null,
      maxHeartRate,
      averageCadence: averageCadence !== null ? parseFloat(averageCadence.toFixed(0)) : null,
      maxCadence,
      variabilityIndex: null, // Calcolato dopo
      // Placeholder per metriche che dipendono da dati atleta
      wattsPerKg: null,
      intensityFactor: null,
      tss: null,
      powerToHeartRateDecoupling: null, 
      averageTorqueEffectiveness: null, 
      averagePedalSmoothness: null,     
      timeInPowerZones: {},             
      timeInHeartRateZones: {},         
    };

    if (averagePower !== null && averagePower > 0 && normalizedPower !== null) {
      metrics.variabilityIndex = parseFloat((normalizedPower / averagePower).toFixed(2));
    }

    // Calcola metriche dipendenti da dati atleta
    if (athleteWeightKg && athleteWeightKg > 0) {
      if (averagePower !== null) {
        // Potremmo voler offrire W/kg sia su AP che su NP
        // Per ora, usiamo AP per la metrica principale W/kg
        metrics.wattsPerKg = parseFloat((averagePower / athleteWeightKg).toFixed(2));
      }
    }

    if (athleteFTP && athleteFTP > 0 && normalizedPower !== null) {
      metrics.intensityFactor = parseFloat((normalizedPower / athleteFTP).toFixed(2));

      if (metrics.intensityFactor !== null && durationSeconds > 0) {
        // TSS = (duration_seconds * NP * IF) / (FTP * 3600) * 100
        metrics.tss = parseFloat(((durationSeconds * normalizedPower * metrics.intensityFactor) / (athleteFTP * 3600) * 100).toFixed(1));
      }
    }

    return { data: metrics };

  } catch (error: any) {
    console.error('Errore in analyzeActivitySegment:', error);
    return { error: 'Errore durante l\'analisi del segmento: ' + error.message };
  }
} 