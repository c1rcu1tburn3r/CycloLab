// =====================================================
// CYCLOLAB CLIMB DETECTION ALGORITHMS
// =====================================================
// Algoritmi per rilevamento automatico salite da dati GPS
// =====================================================

import { RoutePoint } from '@/lib/types';

// Tipi per il sistema di rilevamento salite
export interface DetectedClimb {
  startIndex: number;
  endIndex: number;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  segmentPoints: RoutePoint[]; // Punti GPS del segmento per visualizzazione mappa
  
  // Metriche base
  distance: number; // metri
  elevationGain: number; // metri
  elevationLoss: number; // metri
  duration: number; // secondi
  
  // Pendenze
  avgGradient: number; // percentuale
  maxGradient: number; // percentuale
  minGradient: number; // percentuale
  
  // Metriche performance
  avgSpeed: number; // km/h
  avgPower?: number; // watts
  maxPower?: number; // watts
  avgHeartRate?: number; // bpm
  maxHeartRate?: number; // bpm
  avgCadence?: number; // rpm
  
  // Metriche specializzate
  vam: number; // Velocità Ascensionale Media (m/h)
  climbScore: number; // Punteggio difficoltà
  category: ClimbCategory;
  
  // Flags
  isSignificant: boolean;
  difficultyRating: number; // 1-10
}

export type ClimbCategory = 'HC' | '1' | '2' | '3' | '4' | 'uncategorized';

export interface ClimbDetectionConfig {
  minElevationGain: number; // Dislivello minimo (default: 50m)
  minDistance: number; // Distanza minima (default: 500m)
  minAvgGradient: number; // Pendenza media minima (default: 2%)
  maxGradientVariation: number; // Variazione massima pendenza (default: 20%)
  smoothingWindow: number; // Finestra smoothing elevazione (default: 5 punti)
  minDuration: number; // Durata minima (default: 60 secondi)
}

// Configurazione default
const DEFAULT_CONFIG: ClimbDetectionConfig = {
  minElevationGain: 30,
  minDistance: 500,
  minAvgGradient: 1.5,
  maxGradientVariation: 20,
  smoothingWindow: 5,
  minDuration: 60
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calcola la distanza tra due punti GPS usando la formula di Haversine
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Raggio Terra in metri
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Smoothing dell'elevazione per ridurre il rumore GPS
 */
function smoothElevation(points: RoutePoint[], windowSize: number = 5): number[] {
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length - 1, i + halfWindow);
    
    let sum = 0;
    let count = 0;
    
    for (let j = start; j <= end; j++) {
      if (points[j].elevation !== undefined) {
        sum += points[j].elevation!;
        count++;
      }
    }
    
    smoothed[i] = count > 0 ? sum / count : (points[i].elevation || 0);
  }
  
  return smoothed;
}

/**
 * Calcola la pendenza tra due punti
 */
function calculateGradient(
  distance: number, 
  elevationDiff: number
): number {
  if (distance === 0) return 0;
  return (elevationDiff / distance) * 100;
}

/**
 * Calcola il Climb Score basato sulla scala ufficiale italiana
 * Formula: pendenza media × lunghezza in metri
 */
function calculateClimbScore(
  distance: number, 
  elevationGain: number, 
  avgGradient: number
): number {
  // Formula ufficiale italiana: pendenza media × lunghezza in metri
  const baseScore = avgGradient * distance;
  
  return baseScore;
}

/**
 * Categorizza la salita basandosi sulla scala ufficiale italiana
 */
function categorizeClimb(climbScore: number): ClimbCategory {
  // Scala ufficiale italiana basata su pendenza media × lunghezza in metri
  if (climbScore >= 80000) return 'HC'; // Fuori Categoria (Hors Catégorie)
  if (climbScore >= 64000) return '1';  // 1ª Categoria
  if (climbScore >= 32000) return '2';  // 2ª Categoria  
  if (climbScore >= 16000) return '3';  // 3ª Categoria
  if (climbScore >= 8000) return '4';   // 4ª Categoria
  return 'uncategorized';               // Non classificata (< 8000)
}

/**
 * Calcola VAM (Velocità Ascensionale Media)
 */
function calculateVAM(elevationGain: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0;
  const durationHours = durationSeconds / 3600;
  return elevationGain / durationHours; // metri/ora
}

/**
 * Calcola rating difficoltà 1-10 basato sulla scala ufficiale italiana
 */
function calculateDifficultyRating(
  climbScore: number, 
  avgGradient: number, 
  elevationGain: number
): number {
  let rating = 1;
  
  // Base sulla scala ufficiale italiana
  if (climbScore >= 80000) rating = 10;      // HC (Fuori Categoria)
  else if (climbScore >= 64000) rating = 9;  // 1ª Categoria (alto)
  else if (climbScore >= 32000) rating = 7;  // 2ª Categoria
  else if (climbScore >= 16000) rating = 5;  // 3ª Categoria
  else if (climbScore >= 8000) rating = 3;   // 4ª Categoria
  else if (climbScore >= 1500) rating = 2;   // Salita facile
  
  // Bonus per pendenza molto ripida
  if (avgGradient > 15) rating = Math.min(10, rating + 2);
  else if (avgGradient > 12) rating = Math.min(10, rating + 1);
  
  // Bonus per dislivello eccezionale
  if (elevationGain > 1500) rating = Math.min(10, rating + 1);
  else if (elevationGain > 1000) rating = Math.min(10, rating + 0.5);
  
  return Math.max(1, Math.min(10, Math.round(rating)));
}

// =====================================================
// ALGORITMO PRINCIPALE DI RILEVAMENTO
// =====================================================

/**
 * Rileva automaticamente le salite da un array di punti GPS
 */
export function detectClimbs(
  routePoints: RoutePoint[], 
  config: Partial<ClimbDetectionConfig> = {}
): DetectedClimb[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (routePoints.length < 10) {
    return []; // Troppo pochi punti per analisi
  }
  
  console.log(`🔍 [CLIMB DETECTION] Inizio analisi di ${routePoints.length} punti GPS`);
  console.log(`📊 [CONFIG] Min elevation: ${cfg.minElevationGain}m, Min distance: ${cfg.minDistance}m, Min gradient: ${cfg.minAvgGradient}%`);
  
  // 1. Smooth elevazione per ridurre rumore GPS
  const smoothedElevations = smoothElevation(routePoints, cfg.smoothingWindow);
  
  // 2. Calcola distanze cumulative e pendenze
  const distances: number[] = [0];
  const gradients: number[] = [0];
  
  for (let i = 1; i < routePoints.length; i++) {
    const dist = calculateDistance(
      routePoints[i-1].lat,
      routePoints[i-1].lng,
      routePoints[i].lat,
      routePoints[i].lng
    );
    
    distances[i] = distances[i-1] + dist;
    
    const elevDiff = smoothedElevations[i] - smoothedElevations[i-1];
    gradients[i] = calculateGradient(dist, elevDiff);
  }
  
  console.log(`📏 [DISTANCES] Distanza totale: ${(distances[distances.length-1]/1000).toFixed(1)}km`);
  console.log(`⛰️ [ELEVATION] Range: ${Math.min(...smoothedElevations).toFixed(0)}m - ${Math.max(...smoothedElevations).toFixed(0)}m`);
  
  // 3. ALGORITMO SEMPLICE E LOGICO: Segui la salita dall'inizio alla fine
  const climbSegments: Array<{start: number, end: number}> = [];
  
  console.log(`🔍 [SIMPLE ALGORITHM] Cerco salite con approccio sequenziale`);
  
  let i = 0;
  while (i < routePoints.length - 10) {
    
    // Cerca l'inizio di una salita
    let climbStart = -1;
    for (let j = i; j < routePoints.length - 10; j++) {
      // Controlla se inizia una salita guardando i prossimi punti
      const lookAheadEnd = Math.min(j + 20, routePoints.length - 1);
      const lookAheadDistance = distances[lookAheadEnd] - distances[j];
      const lookAheadElevationGain = smoothedElevations[lookAheadEnd] - smoothedElevations[j];
      const lookAheadGradient = calculateGradient(lookAheadDistance, Math.max(0, lookAheadElevationGain));
      
      // Log ogni 500 punti per vedere cosa succede
      if (j % 500 === 0) {
        console.log(`🔍 [SEARCH ${j}] km ${(distances[j]/1000).toFixed(1)}, elevation: ${smoothedElevations[j].toFixed(0)}m, lookAhead: ${lookAheadGradient.toFixed(1)}%, ${lookAheadElevationGain.toFixed(1)}m`);
      }
      
      // CRITERI MOLTO PIÙ PERMISSIVI per trovare inizio salita
      if (lookAheadGradient >= 0.8 && lookAheadElevationGain >= 3) {
        climbStart = j;
        console.log(`🚀 [CLIMB START] Inizio salita trovato a indice ${j} (km ${(distances[j]/1000).toFixed(1)}) - Gradient: ${lookAheadGradient.toFixed(1)}%, Elevation: ${lookAheadElevationGain.toFixed(0)}m`);
        break;
      }
    }
    
    if (climbStart === -1) {
      console.log(`❌ [NO CLIMB START] Nessun inizio salita trovato dopo indice ${i}`);
      break; // Nessuna salita trovata
    }
    
    // Ora segui la salita fino alla fine
    let climbEnd = climbStart;
    let lastValidClimbPoint = climbStart;
    let flatStreak = 0; // Contatore per tratti pianeggianti consecutivi
    const maxFlatStreak = 30; // Massimo 30 punti pianeggianti consecutivi
    
    console.log(`⛰️ [FOLLOWING CLIMB] Inizio a seguire la salita da indice ${climbStart}`);
    
    for (let j = climbStart + 1; j < routePoints.length; j++) {
      const segmentDistance = distances[j] - distances[j-1];
      const segmentElevationChange = smoothedElevations[j] - smoothedElevations[j-1];
      const segmentGradient = calculateGradient(segmentDistance, segmentElevationChange);
      
      // Log ogni 50 punti per non intasare
      if (j % 50 === 0) {
        console.log(`📍 [POINT ${j}] km ${(distances[j]/1000).toFixed(1)}, elevation: ${smoothedElevations[j].toFixed(0)}m, gradient: ${segmentGradient.toFixed(1)}%, flatStreak: ${flatStreak}`);
      }
      
      // Se è in salita (pendenza positiva)
      if (segmentGradient > 0.5 && segmentElevationChange > 0) {
        lastValidClimbPoint = j;
        climbEnd = j;
        flatStreak = 0; // Reset contatore pianura
        continue;
      }
      
      // Se è in discesa significativa, fermati
      if (segmentGradient < -2.0 || segmentElevationChange < -5) {
        console.log(`⬇️ [DESCENT] Discesa rilevata a indice ${j} (km ${(distances[j]/1000).toFixed(1)}), gradient: ${segmentGradient.toFixed(1)}%, elevation change: ${segmentElevationChange.toFixed(1)}m - FERMO SALITA`);
        break;
      }
      
      // Se è pianeggiante, conta
      if (Math.abs(segmentGradient) <= 2.0 && Math.abs(segmentElevationChange) <= 3) {
        flatStreak++;
        
        // Se troppi punti pianeggianti consecutivi, fermati
        if (flatStreak >= maxFlatStreak) {
          console.log(`🏁 [FLAT END] Troppi punti pianeggianti (${flatStreak}) a indice ${j} (km ${(distances[j]/1000).toFixed(1)}) - FERMO SALITA`);
          break;
        }
        
        continue;
      }
      
      // Altrimenti continua (piccole variazioni)
      climbEnd = j;
    }
    
    console.log(`🏁 [CLIMB END] Salita terminata a indice ${climbEnd} (km ${(distances[climbEnd]/1000).toFixed(1)}), ultimo punto valido: ${lastValidClimbPoint}`);
    
    // Usa l'ultimo punto valido come fine salita
    climbEnd = lastValidClimbPoint;
    
    // Verifica se la salita è significativa
    const totalDistance = distances[climbEnd] - distances[climbStart];
    const totalElevationGain = smoothedElevations[climbEnd] - smoothedElevations[climbStart];
    const avgGradient = calculateGradient(totalDistance, Math.max(0, totalElevationGain));
    
    console.log(`📊 [CLIMB ANALYSIS] Indici ${climbStart}-${climbEnd}: ${(totalDistance/1000).toFixed(1)}km, ${totalElevationGain.toFixed(0)}m, ${avgGradient.toFixed(1)}%`);
    
    // Criteri di validità
    if (totalDistance >= 500 && totalElevationGain >= 30 && avgGradient >= 1.0) {
      console.log(`✅ [VALID CLIMB] Salita valida aggiunta`);
      climbSegments.push({
        start: climbStart,
        end: climbEnd
      });
    } else {
      console.log(`❌ [INVALID CLIMB] Salita troppo piccola, scartata`);
    }
    
    // Continua la ricerca dopo questa salita
    i = climbEnd + 10;
  }
  
  console.log(`🏔️ [SEGMENTS] Trovati ${climbSegments.length} segmenti potenziali`);
  
  // 4. Analizza e filtra segmenti
  const detectedClimbs: DetectedClimb[] = [];
  
  for (const segment of climbSegments) {
    const climb = analyzeClimbSegment(
      routePoints,
      smoothedElevations,
      distances,
      gradients,
      segment.start,
      segment.end,
      cfg
    );
    
    if (climb) {
      console.log(`🔍 [ANALYSIS] Segmento ${segment.start}-${segment.end}: ${climb.isSignificant ? 'SIGNIFICATIVO' : 'NON SIGNIFICATIVO'}`);
      console.log(`   📊 Distanza: ${(climb.distance/1000).toFixed(1)}km, Dislivello: ${climb.elevationGain.toFixed(0)}m, Pendenza: ${climb.avgGradient.toFixed(1)}%`);
      
      if (climb.isSignificant) {
        detectedClimbs.push(climb);
      }
    }
  }
  
  // 5. Merge salite vicine se necessario
  const mergedClimbs = mergeNearbyClimbs(detectedClimbs, routePoints);
  
  console.log(`🎉 [RESULT] Rilevate ${mergedClimbs.length} salite significative`);
  mergedClimbs.forEach((climb, index) => {
    console.log(`   ${index + 1}. ${(climb.distance/1000).toFixed(1)}km, ${climb.elevationGain.toFixed(0)}m, ${climb.avgGradient.toFixed(1)}%, Score: ${climb.climbScore.toFixed(0)}, Categoria: ${climb.category}`);
  });
  
  return mergedClimbs.sort((a, b) => b.climbScore - a.climbScore);
}

/**
 * Analizza un singolo segmento di salita
 */
function analyzeClimbSegment(
  routePoints: RoutePoint[],
  smoothedElevations: number[],
  distances: number[],
  gradients: number[],
  startIndex: number,
  endIndex: number,
  config: ClimbDetectionConfig
): DetectedClimb | null {
  
  if (endIndex <= startIndex) return null;
  
  const startPoint = routePoints[startIndex];
  const endPoint = routePoints[endIndex];
  
  // Calcola metriche base
  const distance = distances[endIndex] - distances[startIndex];
  const elevationStart = smoothedElevations[startIndex];
  const elevationEnd = smoothedElevations[endIndex];
  const elevationGain = Math.max(0, elevationEnd - elevationStart);
  
  console.log(`🔬 [SEGMENT ANALYSIS] Indici ${startIndex}-${endIndex}`);
  console.log(`   📏 Distanza: ${(distance/1000).toFixed(2)}km (min: ${(config.minDistance/1000).toFixed(2)}km)`);
  console.log(`   ⛰️ Dislivello: ${elevationGain.toFixed(1)}m (min: ${config.minElevationGain}m)`);
  
  // Calcola elevazione persa (discese nel segmento)
  let elevationLoss = 0;
  for (let i = startIndex + 1; i <= endIndex; i++) {
    const diff = smoothedElevations[i] - smoothedElevations[i-1];
    if (diff < 0) elevationLoss += Math.abs(diff);
  }
  
  // Calcola durata
  const startTime = startPoint.time || 0;
  const endTime = endPoint.time || 0;
  const duration = endTime > startTime ? endTime - startTime : 0;
  
  console.log(`   ⏱️ Durata: ${duration.toFixed(0)}s (min: ${config.minDuration}s)`);
  console.log(`   🕐 Start time: ${startPoint.time}, End time: ${endPoint.time}`);
  console.log(`   🕐 Duration calculation: ${endTime} - ${startTime} = ${duration}s`);
  
  // Calcola pendenze
  const segmentGradients = gradients.slice(startIndex, endIndex + 1);
  const avgGradient = calculateGradient(distance, elevationGain);
  const maxGradient = Math.max(...segmentGradients);
  const minGradient = Math.min(...segmentGradients);
  
  console.log(`   📈 Pendenza media: ${avgGradient.toFixed(2)}% (min: ${config.minAvgGradient}%)`);
  console.log(`   📊 Pendenza range: ${minGradient.toFixed(1)}% - ${maxGradient.toFixed(1)}%`);
  
  // Usa sempre la durata reale, senza stime
  const finalDuration = duration;
  console.log(`   ✅ Durata finale: ${finalDuration.toFixed(0)}s`);
  
  // CRITERI PIÙ PERMISSIVI per il rilevamento
  const meetsDistanceCriteria = distance >= config.minDistance;
  const meetsElevationCriteria = elevationGain >= config.minElevationGain;
  const meetsGradientCriteria = avgGradient >= config.minAvgGradient * 0.8; // 20% più permissivo
  const meetsDurationCriteria = finalDuration >= config.minDuration * 0.8; // 20% più permissivo
  
  console.log(`   ✅ Criteri: Distanza=${meetsDistanceCriteria}, Dislivello=${meetsElevationCriteria}, Pendenza=${meetsGradientCriteria}, Durata=${meetsDurationCriteria}`);
  
  // Se non soddisfa i criteri base, prova con criteri alternativi per salite lunghe
  if (!meetsDistanceCriteria || !meetsElevationCriteria || !meetsGradientCriteria) {
    // Criteri alternativi per salite lunghe e graduali
    const isLongClimb = distance >= config.minDistance * 2; // Salita lunga (>1km)
    const hasSignificantElevation = elevationGain >= config.minElevationGain * 1.5; // Dislivello significativo (>75m)
    const hasReasonableGradient = avgGradient >= 1.5; // Pendenza minima assoluta 1.5%
    
    // Criteri speciali per salite molto lunghe (>3km)
    const isVeryLongClimb = distance >= config.minDistance * 6; // >3km
    const hasGoodElevation = elevationGain >= config.minElevationGain * 2; // >100m
    const hasMinimalGradient = avgGradient >= 1.0; // Pendenza minima 1%
    
    console.log(`   🔄 Criteri alternativi: Lunga=${isLongClimb}, DislivelloSig=${hasSignificantElevation}, PendenzaRag=${hasReasonableGradient}`);
    console.log(`   🔄 Criteri speciali: MoltoLunga=${isVeryLongClimb}, DislivelloBuono=${hasGoodElevation}, PendenzaMin=${hasMinimalGradient}`);
    
    const meetsAlternativeCriteria = (isLongClimb && hasSignificantElevation && hasReasonableGradient) ||
                                   (isVeryLongClimb && hasGoodElevation && hasMinimalGradient);
    
    if (!meetsAlternativeCriteria) {
      console.log(`   ❌ Segmento scartato: non soddisfa criteri base né alternativi`);
      return null;
    } else {
      console.log(`   ✅ Segmento accettato con criteri alternativi`);
    }
  } else {
    console.log(`   ✅ Segmento accettato con criteri standard`);
  }
  
  // Calcola metriche performance
  const avgSpeed = finalDuration > 0 ? (distance / 1000) / (finalDuration / 3600) : 0;
  
  // Calcola metriche power/HR/cadence se disponibili
  const climbSegmentPoints = routePoints.slice(startIndex, endIndex + 1);
  const powerValues = climbSegmentPoints.map(p => p.power).filter(p => p !== undefined) as number[];
  const hrValues = climbSegmentPoints.map(p => p.heart_rate).filter(hr => hr !== undefined) as number[];
  const cadenceValues = climbSegmentPoints.map(p => p.cadence).filter(c => c !== undefined) as number[];
  
  const avgPower = powerValues.length > 0 ? powerValues.reduce((a, b) => a + b, 0) / powerValues.length : undefined;
  const maxPower = powerValues.length > 0 ? Math.max(...powerValues) : undefined;
  const avgHeartRate = hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : undefined;
  const maxHeartRate = hrValues.length > 0 ? Math.max(...hrValues) : undefined;
  const avgCadence = cadenceValues.length > 0 ? cadenceValues.reduce((a, b) => a + b, 0) / cadenceValues.length : undefined;
  
  // Calcola metriche specializzate
  const vam = calculateVAM(elevationGain, finalDuration);
  const climbScore = calculateClimbScore(distance, elevationGain, avgGradient);
  const category = categorizeClimb(climbScore);
  const difficultyRating = calculateDifficultyRating(climbScore, avgGradient, elevationGain);
  
  console.log(`   📊 VAM calcolata: ${vam.toFixed(0)} m/h (elevation: ${elevationGain}m, duration: ${finalDuration}s)`);
  
  // Determina se è significativa (criteri più permissivi e realistici)
  const isSignificant = 
    // Criteri standard (più permissivi)
    (elevationGain >= config.minElevationGain * 0.8 && 
     distance >= config.minDistance * 0.8 &&
     avgGradient >= config.minAvgGradient * 0.7) ||
    // Salite lunghe con dislivello significativo
    (distance >= config.minDistance * 2 && 
     elevationGain >= config.minElevationGain * 1.5 &&
     avgGradient >= 1.5) ||
    // Salite molto lunghe con dislivello buono
    (distance >= config.minDistance * 6 && 
     elevationGain >= config.minElevationGain * 2 &&
     avgGradient >= 1.0) ||
    // Salite con dislivello eccezionale (indipendentemente dalla pendenza)
    (elevationGain >= config.minElevationGain * 4 && 
     distance >= config.minDistance &&
     avgGradient >= 0.8);
  
  console.log(`   🎯 Risultato finale: isSignificant=${isSignificant}, Score=${climbScore.toFixed(0)}, Categoria=${category}`);
  
  // Estrai i punti del segmento per visualizzazione mappa
  const segmentPoints = routePoints.slice(startIndex, endIndex + 1);
  
  return {
    startIndex,
    endIndex,
    startPoint,
    endPoint,
    segmentPoints,
    distance,
    elevationGain,
    elevationLoss,
    duration: finalDuration,
    avgGradient,
    maxGradient,
    minGradient,
    avgSpeed,
    avgPower,
    maxPower,
    avgHeartRate,
    maxHeartRate,
    avgCadence,
    vam,
    climbScore,
    category,
    isSignificant,
    difficultyRating
  };
}

/**
 * Merge salite vicine che potrebbero essere parte della stessa salita
 */
function mergeNearbyClimbs(
  climbs: DetectedClimb[], 
  routePoints: RoutePoint[]
): DetectedClimb[] {
  if (climbs.length <= 1) return climbs;
  
  // Ordina per indice di inizio
  const sortedClimbs = [...climbs].sort((a, b) => a.startIndex - b.startIndex);
  const merged: DetectedClimb[] = [];
  let current = sortedClimbs[0];
  
  for (let i = 1; i < sortedClimbs.length; i++) {
    const next = sortedClimbs[i];
    
    // Calcola distanza tra fine salita corrente e inizio prossima
    const gapDistance = calculateDistance(
      current.endPoint.lat,
      current.endPoint.lng,
      next.startPoint.lat,
      next.startPoint.lng
    );
    
    // Calcola gap in termini di indici
    const indexGap = next.startIndex - current.endIndex;
    
    console.log(`🔗 [MERGE CHECK] Gap tra salite: ${gapDistance.toFixed(0)}m, ${indexGap} punti`);
    
    // CRITERI PIÙ AGGRESSIVI per il merge
    const shouldMerge = 
      // Gap piccolo in distanza
      (gapDistance < 1000) || 
      // Gap piccolo in indici (punti GPS vicini)
      (indexGap < 100) ||
      // Salite molto vicine con dislivello simile
      (gapDistance < 2000 && Math.abs(current.elevationGain - next.elevationGain) < 50);
    
    if (shouldMerge) {
      // Verifica che non ci sia una discesa significativa nel gap
      const gapStartElevation = current.endPoint.elevation || 0;
      const gapEndElevation = next.startPoint.elevation || 0;
      const elevationDrop = gapStartElevation - gapEndElevation;
      
      console.log(`📉 [ELEVATION DROP] Discesa nel gap: ${elevationDrop.toFixed(1)}m`);
      
      // Merge solo se la discesa è piccola (< 30m)
      if (elevationDrop < 30) {
        console.log(`✅ [MERGING] Unisco le due salite`);
        current = mergeClimbs(current, next, routePoints);
        continue;
      } else {
        console.log(`❌ [NO MERGE] Discesa troppo grande: ${elevationDrop.toFixed(1)}m`);
      }
    } else {
      console.log(`❌ [NO MERGE] Gap troppo grande: ${gapDistance.toFixed(0)}m, ${indexGap} punti`);
    }
    
    merged.push(current);
    current = next;
  }
  
  merged.push(current);
  
  console.log(`🔗 [MERGE RESULT] ${climbs.length} salite → ${merged.length} salite dopo merge`);
  
  return merged;
}

/**
 * Merge due salite consecutive
 */
function mergeClimbs(
  climb1: DetectedClimb, 
  climb2: DetectedClimb, 
  routePoints: RoutePoint[]
): DetectedClimb {
  const totalDistance = climb1.distance + climb2.distance;
  const totalElevationGain = climb1.elevationGain + climb2.elevationGain;
  const totalDuration = climb1.duration + climb2.duration;
  
  const avgGradient = calculateGradient(totalDistance, totalElevationGain);
  const maxGradient = Math.max(climb1.maxGradient, climb2.maxGradient);
  const minGradient = Math.min(climb1.minGradient, climb2.minGradient);
  
  const vam = calculateVAM(totalElevationGain, totalDuration);
  const climbScore = calculateClimbScore(totalDistance, totalElevationGain, avgGradient);
  const category = categorizeClimb(climbScore);
  const difficultyRating = calculateDifficultyRating(climbScore, avgGradient, totalElevationGain);
  
  return {
    startIndex: climb1.startIndex,
    endIndex: climb2.endIndex,
    startPoint: climb1.startPoint,
    endPoint: climb2.endPoint,
    segmentPoints: [...climb1.segmentPoints, ...climb2.segmentPoints],
    distance: totalDistance,
    elevationGain: totalElevationGain,
    elevationLoss: climb1.elevationLoss + climb2.elevationLoss,
    duration: totalDuration,
    avgGradient,
    maxGradient,
    minGradient,
    avgSpeed: totalDuration > 0 ? (totalDistance / 1000) / (totalDuration / 3600) : 0,
    avgPower: climb1.avgPower && climb2.avgPower ? (climb1.avgPower + climb2.avgPower) / 2 : climb1.avgPower || climb2.avgPower,
    maxPower: climb1.maxPower && climb2.maxPower ? Math.max(climb1.maxPower, climb2.maxPower) : climb1.maxPower || climb2.maxPower,
    avgHeartRate: climb1.avgHeartRate && climb2.avgHeartRate ? Math.round((climb1.avgHeartRate + climb2.avgHeartRate) / 2) : climb1.avgHeartRate || climb2.avgHeartRate,
    maxHeartRate: climb1.maxHeartRate && climb2.maxHeartRate ? Math.max(climb1.maxHeartRate, climb2.maxHeartRate) : climb1.maxHeartRate || climb2.maxHeartRate,
    avgCadence: climb1.avgCadence && climb2.avgCadence ? (climb1.avgCadence + climb2.avgCadence) / 2 : climb1.avgCadence || climb2.avgCadence,
    vam,
    climbScore,
    category,
    isSignificant: true,
    difficultyRating
  };
}

// =====================================================
// UTILITY FUNCTIONS PER UI
// =====================================================

/**
 * Genera nome automatico per una salita
 */
export function generateClimbName(climb: DetectedClimb, activityTitle?: string): string {
  const elevation = Math.round(climb.elevationGain);
  const gradient = climb.avgGradient.toFixed(1);
  
  if (activityTitle) {
    return `Salita ${elevation}m (${gradient}%) - ${activityTitle}`;
  }
  
  return `Salita ${elevation}m (${gradient}%)`;
}

/**
 * Formatta categoria per display
 */
export function formatCategory(category: ClimbCategory): string {
  switch (category) {
    case 'HC': return 'Hors Catégorie';
    case '1': return '1ª Categoria';
    case '2': return '2ª Categoria';
    case '3': return '3ª Categoria';
    case '4': return '4ª Categoria';
    default: return 'Non Categorizzata';
  }
}

/**
 * Ottieni colore per categoria
 */
export function getCategoryColor(category: ClimbCategory): string {
  switch (category) {
    case 'HC': return '#8B0000'; // Rosso scuro
    case '1': return '#FF0000';  // Rosso
    case '2': return '#FF8C00';  // Arancione
    case '3': return '#FFD700';  // Oro
    case '4': return '#32CD32';  // Verde
    default: return '#808080';   // Grigio
  }
}

/**
 * Formatta tempo in formato leggibile
 */
export function formatClimbTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
} 