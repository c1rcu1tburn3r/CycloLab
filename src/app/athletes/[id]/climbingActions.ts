'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import type { RoutePoint } from '@/lib/types';

// Interfacce per l'analisi climbing
export interface ClimbingPerformance {
  climbId: string;
  name: string;
  category: string | number;
  distance: number; // km
  elevation: number; // metri
  avgGradient: number; // %
  bestTime: number; // secondi
  bestVAM: number; // m/h
  bestWatts: number | null;
  bestWPerKg: number | null;
  attempts: number;
  lastAttempt: string;
  trend: 'improving' | 'declining' | 'stable';
  activityId?: string;
}

export interface VAMAnalysis {
  category: string;
  averageVAM: number;
  bestVAM: number;
  attempts: number;
  color: string;
  benchmark: number;
}

export interface ClimbingTrends {
  month: string;
  avgVAM: number;
  maxVAM: number;
  climbs: number;
  totalElevation: number;
}

export interface SegmentComparison {
  segmentName: string;
  personalTime: number;
  personalVAM: number;
  personalWatts: number | null;
  komTime: number | null;
  komVAM: number | null;
  percentageOff: number | null;
  rank: number | null;
  totalAttempts: number;
}

export interface ClimbingAnalysisData {
  performances: ClimbingPerformance[];
  vamAnalysis: VAMAnalysis[];
  trends: ClimbingTrends[];
  segments: SegmentComparison[];
}

// Costanti per analisi salite
const MIN_CLIMB_ELEVATION = 100; // minimo 100m dislivello per considerare "salita"
const MIN_CLIMB_GRADIENT = 3; // minimo 3% gradiente medio
const MIN_CLIMB_DISTANCE = 0.5; // minimo 500m distanza
const MAX_CLIMB_GRADIENT = 25; // massimo 25% (oltre è probabilmente errore GPS)

const CLIMB_CATEGORIES = {
  4: { min: 100, max: 300, name: 'Cat 4', color: '#16a34a', benchmark: 1000 },
  3: { min: 300, max: 600, name: 'Cat 3', color: '#65a30d', benchmark: 1200 },
  2: { min: 600, max: 900, name: 'Cat 2', color: '#d97706', benchmark: 1300 },
  1: { min: 900, max: 1500, name: 'Cat 1', color: '#ea580c', benchmark: 1400 },
  'HC': { min: 1500, max: 10000, name: 'HC', color: '#dc2626', benchmark: 1500 }
};

/**
 * Analizza le performance di salita di un atleta
 */
export async function analyzeClimbingPerformance(
  athleteId: string,
  periodMonths: number = 12
): Promise<{
  data?: ClimbingAnalysisData;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Calcola data di inizio periodo
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Recupera attività con route points
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        activity_date,
        distance_meters,
        duration_seconds,
        elevation_gain_meters,
        avg_power_watts,
        route_points
      `)
      .eq('athlete_id', athleteId)
      .gte('activity_date', startDate.toISOString().split('T')[0])
      .not('route_points', 'is', null)
      .not('elevation_gain_meters', 'is', null)
      .order('activity_date', { ascending: false });

    if (activitiesError) {
      return { error: activitiesError.message };
    }

    if (!activities || activities.length === 0) {
      return { error: 'Nessuna attività con dati GPS trovata nel periodo selezionato' };
    }

    console.log(`[analyzeClimbingPerformance] Analizzando ${activities.length} attività`);

    // Analizza salite per ogni attività
    const allClimbs: ClimbingPerformance[] = [];
    
    for (const activity of activities) {
      const climbs = await extractClimbsFromActivity(activity);
      allClimbs.push(...climbs);
    }

    // Raggruppa salite simili e calcola metriche
    const groupedClimbs = groupSimilarClimbs(allClimbs);
    const performances = await calculateClimbingMetrics(groupedClimbs);
    
    // Calcola analisi VAM per categoria
    const vamAnalysis = calculateVAMAnalysis(performances);
    
    // Calcola trend temporali
    const trends = calculateClimbingTrends(allClimbs);
    
    // Calcola confronti segmenti (versione semplificata)
    const segments = calculateSegmentComparisons(performances.slice(0, 6)); // top 6 salite

    const analysisData: ClimbingAnalysisData = {
      performances,
      vamAnalysis,
      trends,
      segments
    };

    console.log(`[analyzeClimbingPerformance] Analisi completata: ${performances.length} salite uniche`);

    return { data: analysisData };

  } catch (error) {
    console.error('[analyzeClimbingPerformance] Errore:', error);
    return { 
      error: error instanceof Error ? error.message : 'Errore analisi salite' 
    };
  }
}

/**
 * Estrae le salite da una singola attività
 */
async function extractClimbsFromActivity(activity: any): Promise<ClimbingPerformance[]> {
  try {
    if (!activity.route_points) return [];
    
    const routePoints: RoutePoint[] = JSON.parse(activity.route_points);
    
    if (routePoints.length < 10) return [];

    const climbs: ClimbingPerformance[] = [];
    let climbStart = -1;
    let currentElevation = 0;
    let maxElevation = 0;
    let minElevation = Infinity;

    // Filtra punti con elevazione valida
    const validPoints = routePoints.filter(p => 
      p.elevation !== undefined && 
      p.elevation !== null && 
      p.elevation > 0 && 
      p.elevation < 9000
    );

    if (validPoints.length < 10) return [];

    // Smooth elevazione per ridurre rumore GPS
    const smoothedPoints = smoothElevation(validPoints);

    for (let i = 1; i < smoothedPoints.length; i++) {
      const point = smoothedPoints[i];
      const prevPoint = smoothedPoints[i - 1];
      
      if (!point.elevation || !prevPoint.elevation) continue;

      // Inizia salita se elevazione aumenta significativamente
      if (climbStart === -1 && point.elevation > prevPoint.elevation + 2) {
        climbStart = i;
        minElevation = prevPoint.elevation;
        maxElevation = point.elevation;
        currentElevation = point.elevation;
      }
      
      // Continua salita
      if (climbStart !== -1) {
        maxElevation = Math.max(maxElevation, point.elevation);
        currentElevation = point.elevation;
        
        // Fine salita se discesa significativa o fine percorso
        if (point.elevation < currentElevation - 5 || i === smoothedPoints.length - 1) {
          const climbEnd = i;
          const climbData = analyzeClimbSegment(
            smoothedPoints.slice(climbStart, climbEnd + 1),
            activity,
            climbs.length
          );
          
          if (climbData && isValidClimb(climbData)) {
            climbs.push(climbData);
          }
          
          climbStart = -1;
        }
      }
    }

    return climbs;

  } catch (error) {
    console.warn(`Errore estrazione salite attività ${activity.id}:`, error);
    return [];
  }
}

/**
 * Smooth dell'elevazione per ridurre rumore GPS
 */
function smoothElevation(points: RoutePoint[]): RoutePoint[] {
  const smoothed = [...points];
  const windowSize = 5;
  
  for (let i = windowSize; i < points.length - windowSize; i++) {
    let sum = 0;
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      sum += points[j].elevation || 0;
    }
    if (smoothed[i].elevation !== undefined) {
      smoothed[i].elevation = sum / (windowSize * 2 + 1);
    }
  }
  
  return smoothed;
}

/**
 * Analizza un segmento di salita
 */
function analyzeClimbSegment(
  points: RoutePoint[],
  activity: any,
  climbIndex: number
): ClimbingPerformance | null {
  try {
    if (points.length < 5) return null;

    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    if (!startPoint.elevation || !endPoint.elevation) return null;

    // Calcola metriche base
    const elevation = endPoint.elevation - startPoint.elevation;
    const distance = calculateDistance(startPoint, endPoint) / 1000; // km
    const duration = (endPoint.time - startPoint.time); // secondi
    
    if (distance < MIN_CLIMB_DISTANCE || elevation < MIN_CLIMB_ELEVATION) return null;

    const avgGradient = (elevation / (distance * 1000)) * 100;
    
    if (avgGradient < MIN_CLIMB_GRADIENT || avgGradient > MAX_CLIMB_GRADIENT) return null;

    // Calcola VAM (Velocità Ascensionale Media)
    const vam = (elevation / (duration / 3600)); // m/h

    // Calcola potenza media se disponibile
    const powerPoints = points.filter(p => p.power && p.power > 0);
    const avgPower = powerPoints.length > 0 
      ? powerPoints.reduce((sum, p) => sum + (p.power || 0), 0) / powerPoints.length 
      : null;

    // Genera nome salita basato su posizione o attività
    const climbName = generateClimbName(activity, climbIndex, startPoint, distance, elevation);
    
    // Determina categoria
    const category = determineClimbCategory(elevation);

    return {
      climbId: `${activity.id}_${climbIndex}`,
      name: climbName,
      category,
      distance: Math.round(distance * 100) / 100,
      elevation: Math.round(elevation),
      avgGradient: Math.round(avgGradient * 10) / 10,
      bestTime: duration,
      bestVAM: Math.round(vam),
      bestWatts: avgPower ? Math.round(avgPower) : null,
      bestWPerKg: null, // Calcolato successivamente se peso disponibile
      attempts: 1,
      lastAttempt: activity.activity_date,
      trend: 'stable',
      activityId: activity.id
    };

  } catch (error) {
    console.warn('Errore analisi segmento salita:', error);
    return null;
  }
}

/**
 * Calcola distanza tra due punti GPS
 */
function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371000; // Raggio Terra in metri
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
           Math.cos(lat1Rad) * Math.cos(lat2Rad) *
           Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Genera nome per la salita
 */
function generateClimbName(activity: any, climbIndex: number, startPoint: RoutePoint, distance: number, elevation: number): string {
  // Usa il titolo dell'attività se disponibile
  if (activity.title && activity.title !== 'Untitled') {
    return climbIndex === 0 ? activity.title : `${activity.title} - Salita ${climbIndex + 1}`;
  }
  
  // Genera nome basato su metriche
  return `Salita ${distance.toFixed(1)}km +${elevation}m`;
}

/**
 * Determina categoria salita
 */
function determineClimbCategory(elevation: number): string | number {
  for (const [cat, range] of Object.entries(CLIMB_CATEGORIES)) {
    if (elevation >= range.min && elevation < range.max) {
      return cat === 'HC' ? 'HC' : parseInt(cat);
    }
  }
  return 4; // Default categoria 4
}

/**
 * Verifica se una salita è valida
 */
function isValidClimb(climb: ClimbingPerformance): boolean {
  return climb.distance >= MIN_CLIMB_DISTANCE &&
         climb.elevation >= MIN_CLIMB_ELEVATION &&
         climb.avgGradient >= MIN_CLIMB_GRADIENT &&
         climb.avgGradient <= MAX_CLIMB_GRADIENT &&
         climb.bestVAM > 200 && 
         climb.bestVAM < 3000;
}

/**
 * Raggruppa salite simili
 */
function groupSimilarClimbs(climbs: ClimbingPerformance[]): ClimbingPerformance[][] {
  const groups: ClimbingPerformance[][] = [];
  const used = new Set<string>();
  
  for (const climb of climbs) {
    if (used.has(climb.climbId)) continue;
    
    const group = [climb];
    used.add(climb.climbId);
    
    // Trova salite simili (stessa distanza ±20%, stessa elevazione ±15%)
    for (const otherClimb of climbs) {
      if (used.has(otherClimb.climbId)) continue;
      
      const distanceDiff = Math.abs(climb.distance - otherClimb.distance) / climb.distance;
      const elevationDiff = Math.abs(climb.elevation - otherClimb.elevation) / climb.elevation;
      
      if (distanceDiff < 0.2 && elevationDiff < 0.15) {
        group.push(otherClimb);
        used.add(otherClimb.climbId);
      }
    }
    
    groups.push(group);
  }
  
  return groups.sort((a, b) => b[0].elevation - a[0].elevation); // Ordina per elevazione
}

/**
 * Calcola metriche aggregate per gruppi di salite
 */
async function calculateClimbingMetrics(groups: ClimbingPerformance[][]): Promise<ClimbingPerformance[]> {
  const metrics: ClimbingPerformance[] = [];
  
  for (const group of groups) {
    if (group.length === 0) continue;
    
    // Prendi la migliore performance del gruppo
    const best = group.reduce((prev, current) => 
      current.bestVAM > prev.bestVAM ? current : prev
    );
    
    // Calcola trend (migliorando se l'ultima è migliore della prima)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (group.length > 1) {
      const sortedByDate = group.sort((a, b) => 
        new Date(a.lastAttempt).getTime() - new Date(b.lastAttempt).getTime()
      );
      const first = sortedByDate[0];
      const last = sortedByDate[sortedByDate.length - 1];
      
      const improvement = (last.bestVAM - first.bestVAM) / first.bestVAM;
      if (improvement > 0.05) trend = 'improving';
      else if (improvement < -0.05) trend = 'declining';
    }
    
    metrics.push({
      ...best,
      attempts: group.length,
      trend,
      lastAttempt: group.reduce((latest, current) => 
        new Date(current.lastAttempt) > new Date(latest.lastAttempt) ? current : latest
      ).lastAttempt
    });
  }
  
  return metrics.slice(0, 20); // Limita ai top 20
}

/**
 * Calcola analisi VAM per categoria
 */
function calculateVAMAnalysis(performances: ClimbingPerformance[]): VAMAnalysis[] {
  const analysis: VAMAnalysis[] = [];
  
  for (const [cat, config] of Object.entries(CLIMB_CATEGORIES)) {
    const categoryClimbs = performances.filter(p => p.category.toString() === cat);
    
    if (categoryClimbs.length === 0) {
      analysis.push({
        category: config.name,
        averageVAM: 0,
        bestVAM: 0,
        attempts: 0,
        color: config.color,
        benchmark: config.benchmark
      });
      continue;
    }
    
    const avgVAM = categoryClimbs.reduce((sum, climb) => sum + climb.bestVAM, 0) / categoryClimbs.length;
    const bestVAM = Math.max(...categoryClimbs.map(climb => climb.bestVAM));
    const totalAttempts = categoryClimbs.reduce((sum, climb) => sum + climb.attempts, 0);
    
    analysis.push({
      category: config.name,
      averageVAM: Math.round(avgVAM),
      bestVAM: Math.round(bestVAM),
      attempts: totalAttempts,
      color: config.color,
      benchmark: config.benchmark
    });
  }
  
  return analysis;
}

/**
 * Calcola trend climbing nel tempo
 */
function calculateClimbingTrends(climbs: ClimbingPerformance[]): ClimbingTrends[] {
  const trends: ClimbingTrends[] = [];
  const monthlyData: { [key: string]: ClimbingPerformance[] } = {};
  
  // Raggruppa per mese
  for (const climb of climbs) {
    const date = new Date(climb.lastAttempt);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(climb);
  }
  
  // Genera trend per ultimi 8 mesi
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('it-IT', { month: 'short' });
    
    const monthClimbs = monthlyData[monthKey] || [];
    
    const avgVAM = monthClimbs.length > 0 
      ? monthClimbs.reduce((sum, climb) => sum + climb.bestVAM, 0) / monthClimbs.length 
      : 0;
    
    const maxVAM = monthClimbs.length > 0 
      ? Math.max(...monthClimbs.map(climb => climb.bestVAM)) 
      : 0;
    
    const totalElevation = monthClimbs.reduce((sum, climb) => sum + climb.elevation, 0);
    
    trends.push({
      month: monthName,
      avgVAM: Math.round(avgVAM),
      maxVAM: Math.round(maxVAM),
      climbs: monthClimbs.length,
      totalElevation: Math.round(totalElevation)
    });
  }
  
  return trends;
}

/**
 * Calcola confronti segmenti (versione semplificata)
 */
function calculateSegmentComparisons(performances: ClimbingPerformance[]): SegmentComparison[] {
  return performances.slice(0, 4).map((performance, index) => {
    // Simula dati KOM (in futuro potrebbe integrare API Strava)
    const komTimeFactor = 0.75 + (Math.random() * 0.15); // KOM è 75-90% del tempo personale
    const komTime = Math.round(performance.bestTime * komTimeFactor);
    const komVAM = Math.round(performance.bestVAM / komTimeFactor);
    const percentageOff = Math.round(((performance.bestTime - komTime) / komTime) * 100 * 10) / 10;
    
    return {
      segmentName: `${performance.name} - Segmento ${index + 1}`,
      personalTime: performance.bestTime,
      personalVAM: performance.bestVAM,
      personalWatts: performance.bestWatts,
      komTime,
      komVAM,
      percentageOff,
      rank: Math.round(50 + Math.random() * 200), // Rank simulato
      totalAttempts: Math.round(100 + Math.random() * 500)
    };
  });
} 