'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Interfacce per l'analisi trends
export interface ComparisonData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

export interface SeasonalData {
  month: string;
  ftp: number;
  volume: number; // ore
  intensity: number; // watts medi
  peakPower: number;
}

export interface ImprovementData {
  category: string;
  currentValue: number;
  startValue: number;
  improvement: number;
  improvementPercent: number;
  unit: string;
  color: string;
}

export interface ForecastData {
  date: string;
  actualFTP: number | null;
  predictedFTP: number;
  confidenceMin: number;
  confidenceMax: number;
}

export interface TrendsAnalysisData {
  comparison: ComparisonData[];
  seasonal: SeasonalData[];
  improvements: ImprovementData[];
  forecast: ForecastData[];
}

/**
 * Analizza i trend di performance di un atleta
 * STRATEGIA ADATTIVA: Se non trova dati nel periodo richiesto, estende automaticamente
 */
export async function analyzePerformanceTrends(
  athleteId: string,
  comparisonPeriod: 'month' | 'quarter' | 'year' = 'quarter'
): Promise<{
  data?: TrendsAnalysisData;
  error?: string;
  adaptiveMessage?: string;
  actualPeriodUsed?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // STRATEGIA ADATTIVA: Prova periodi progressivamente più lunghi
    const adaptivePeriods = [
      { label: comparisonPeriod, months: comparisonPeriod === 'month' ? 1 : comparisonPeriod === 'quarter' ? 3 : 12 },
      { label: 'quarter' as const, months: 3 },
      { label: 'semester' as const, months: 6 },
      { label: 'year' as const, months: 12 },
      { label: 'all-time' as const, months: 24 },
      { label: 'extended' as const, months: 36 }
    ];

    let activitiesCurrentPeriod: any[] = [];
    let activitiesPreviousPeriod: any[] = [];
    let activitiesSeasonal: any[] = [];
    let actualPeriodUsed: string = comparisonPeriod;
    let adaptiveMessage: string | undefined;
    let profileEntries: any[] = [];
    let latestProfile: any = null;

    // Prova ogni periodo fino a trovare dati sufficienti
    for (const period of adaptivePeriods) {
      const now = new Date();
      const startCurrentPeriod = new Date();
      startCurrentPeriod.setMonth(now.getMonth() - period.months);
      
      const startPreviousPeriod = new Date();
      startPreviousPeriod.setMonth(now.getMonth() - (period.months * 2));
      
      const startSeasonalPeriod = new Date();
      startSeasonalPeriod.setMonth(now.getMonth() - Math.max(12, period.months));

      // Recupera dati atleta e profilo
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('id, name, surname, birth_date')
        .eq('id', athleteId)
        .single();

      if (athleteError) {
        return { error: athleteError.message };
      }

      // Recupera storico profilo
      const { data: profileData, error: profileError } = await supabase
        .from('athlete_profile_entries')
        .select('effective_date, ftp_watts, weight_kg')
        .eq('athlete_id', athleteId)
        .gte('effective_date', startSeasonalPeriod.toISOString().split('T')[0])
        .order('effective_date', { ascending: false });

      if (profileError) {
        return { error: profileError.message };
      }

      // Salva profilo per uso successivo
      profileEntries = profileData || [];
      latestProfile = profileEntries.length > 0 ? profileEntries[0] : null;

      // Recupera attività per il periodo corrente
      const { data: currentData, error: currentError } = await supabase
        .from('activities')
        .select(`
          activity_date,
          duration_seconds,
          avg_power_watts,
          max_power_watts,
          normalized_power_watts,
          tss,
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
        .gte('activity_date', startCurrentPeriod.toISOString().split('T')[0])
        .order('activity_date', { ascending: false });

      if (currentError) {
        return { error: currentError.message };
      }

      // Se troviamo attività sufficienti (almeno 2), procediamo
      if (currentData && currentData.length >= 2) {
        activitiesCurrentPeriod = currentData;
        actualPeriodUsed = period.label;
        
        if (period.label !== comparisonPeriod) {
          adaptiveMessage = `Periodo esteso a ${period.months} mesi per garantire analisi significative (${currentData.length} attività trovate)`;
        }

        // Recupera attività periodo precedente
        const { data: previousData, error: previousError } = await supabase
          .from('activities')
          .select(`
            activity_date,
            duration_seconds,
            avg_power_watts,
            max_power_watts,
            normalized_power_watts,
            tss
          `)
          .eq('athlete_id', athleteId)
          .gte('activity_date', startPreviousPeriod.toISOString().split('T')[0])
          .lt('activity_date', startCurrentPeriod.toISOString().split('T')[0])
          .order('activity_date', { ascending: false });

        if (!previousError) {
          activitiesPreviousPeriod = previousData || [];
        }

        // Recupera attività stagionali
        const { data: seasonalData, error: seasonalError } = await supabase
          .from('activities')
          .select(`
            activity_date,
            duration_seconds,
            avg_power_watts,
            max_power_watts,
            normalized_power_watts,
            tss
          `)
          .eq('athlete_id', athleteId)
          .gte('activity_date', startSeasonalPeriod.toISOString().split('T')[0])
          .order('activity_date', { ascending: false });

        if (!seasonalError) {
          activitiesSeasonal = seasonalData || [];
        }

        console.log(`[analyzePerformanceTrends] Successo con periodo ${period.label}: ${activitiesCurrentPeriod.length} attività correnti, ${activitiesPreviousPeriod.length} precedenti`);
        break;
      }
    }

    // Se anche con il periodo più lungo non troviamo abbastanza dati
    if (activitiesCurrentPeriod.length === 0) {
      return { 
        error: 'Nessuna attività trovata anche estendendo il periodo di ricerca. Carica più attività per abilitare l\'analisi trends.',
        adaptiveMessage: 'Strategia adattiva: cercato fino a 36 mesi di storico'
      };
    }

    if (activitiesCurrentPeriod.length === 1) {
      return { 
        error: 'Trovata solo 1 attività. Servono almeno 2 attività per l\'analisi trends.',
        adaptiveMessage: `Periodo cercato: ${actualPeriodUsed} (1 attività trovata)`
      };
    }

    // Calcola metriche di confronto
    const comparison = calculateComparisonMetrics(
      activitiesCurrentPeriod, 
      activitiesPreviousPeriod, 
      latestProfile?.ftp_watts || null,
      latestProfile?.weight_kg || null
    );

    // Calcola dati stagionali  
    const seasonal = calculateSeasonalData(
      activitiesSeasonal, 
      profileEntries
    );

    // Calcola miglioramenti
    const improvements = calculateImprovements(
      activitiesCurrentPeriod,
      activitiesSeasonal,
      profileEntries,
      latestProfile?.weight_kg || null
    );

    // Calcola previsioni
    const forecast = calculateForecast(seasonal, latestProfile?.ftp_watts || null);

    return {
      data: {
        comparison,
        seasonal,
        improvements,
        forecast
      },
      actualPeriodUsed,
      adaptiveMessage
    };

  } catch (error) {
    console.error('[analyzePerformanceTrends] Errore:', error);
    return { 
      error: error instanceof Error ? error.message : 'Errore sconosciuto nell\'analisi trends' 
    };
  }
}

/**
 * Calcola metriche di confronto tra periodi
 */
function calculateComparisonMetrics(
  currentActivities: any[],
  previousActivities: any[],
  currentFTP: number | null,
  currentWeight: number | null
): ComparisonData[] {
  const metrics: ComparisonData[] = [];

  // Calcola metriche periodo corrente
  const currentStats = calculatePeriodStats(currentActivities);
  const previousStats = calculatePeriodStats(previousActivities);

  // Solo se ci sono REALMENTE attività nel periodo precedente
  const hasRealPreviousData = previousActivities.length > 0;

  // FTP - solo se ci sono dati storici reali
  if (currentFTP && hasRealPreviousData && previousStats.avgPower > 0) {
    // Stima FTP precedente dalla media delle attività (con dati reali)
    const estimatedPreviousFTP = Math.round(previousStats.avgPower * 1.05);

    metrics.push(createComparisonMetric(
      'FTP',
      Math.round(currentFTP), // Arrotonda FTP per evitare decimali
      estimatedPreviousFTP,
      'W'
    ));
  }

  // Peso - solo se ci sono dati storici reali e differenza significativa
  if (currentWeight && hasRealPreviousData) {
    // Per il peso, se non ci sono dati storici reali, non mostrare confronto
    // Qui potresti recuperare il peso da profileEntries storici invece di stimarlo
    const estimatedPreviousWeight = Math.round(currentWeight * 100) / 100; // Arrotonda a 2 decimali
    
    // Solo se la differenza è significativa (>1kg)
    if (Math.abs(currentWeight - estimatedPreviousWeight) > 1) {
      metrics.push(createComparisonMetric(
        'Peso',
        Math.round(currentWeight * 100) / 100,
        estimatedPreviousWeight,
        'kg'
      ));
    }
  }

  // W/kg - solo se ci sono entrambi i valori e dati storici
  if (currentFTP && currentWeight && hasRealPreviousData && previousStats.avgPower > 0) {
    const currentWPerKg = currentFTP / currentWeight;
    const estimatedPreviousFTP = Math.round(previousStats.avgPower * 1.05);
    const estimatedPreviousWPerKg = estimatedPreviousFTP / currentWeight;
    
    metrics.push(createComparisonMetric(
      'W/kg',
      Math.round(currentWPerKg * 100) / 100, // Arrotonda a 2 decimali
      Math.round(estimatedPreviousWPerKg * 100) / 100,
      'W/kg'
    ));
  }

  // Volume settimanale - solo se ci sono attività in entrambi i periodi
  if (currentActivities.length > 0 && hasRealPreviousData) {
    const currentVolumeWeekly = (currentStats.totalDuration / 3600) / 
      Math.ceil((Date.now() - new Date(currentActivities[currentActivities.length - 1].activity_date).getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    const previousVolumeWeekly = (previousStats.totalDuration / 3600) / 
      Math.ceil((new Date(currentActivities[0]?.activity_date || Date.now()).getTime() - new Date(previousActivities[previousActivities.length - 1].activity_date).getTime()) / (1000 * 60 * 60 * 24 * 7));

    metrics.push(createComparisonMetric(
      'Ore/Settimana',
      Math.round(currentVolumeWeekly * 10) / 10, // Arrotonda a 1 decimale
      Math.round(previousVolumeWeekly * 10) / 10,
      'h'
    ));
  }

  // TSS settimanale - solo se ci sono dati TSS reali
  if (hasRealPreviousData && currentStats.avgTSS > 0 && previousStats.avgTSS > 0) {
    const currentVolumeWeekly = currentActivities.length > 0 ? 
      (currentStats.totalDuration / 3600) / Math.ceil((Date.now() - new Date(currentActivities[currentActivities.length - 1].activity_date).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;
    const previousVolumeWeekly = previousActivities.length > 0 ? 
      (previousStats.totalDuration / 3600) / Math.ceil((new Date(currentActivities[0]?.activity_date || Date.now()).getTime() - new Date(previousActivities[previousActivities.length - 1].activity_date).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;

    const currentTSSWeekly = currentStats.avgTSS * currentVolumeWeekly;
    const previousTSSWeekly = previousStats.avgTSS * previousVolumeWeekly;

    if (currentTSSWeekly > 0 && previousTSSWeekly > 0) {
      metrics.push(createComparisonMetric(
        'TSS/Settimana',
        Math.round(currentTSSWeekly),
        Math.round(previousTSSWeekly),
        ''
      ));
    }
  }

  // Intensità media - solo se ci sono dati reali in entrambi i periodi
  if (hasRealPreviousData && currentStats.avgPower > 0 && previousStats.avgPower > 0) {
    metrics.push(createComparisonMetric(
      'Intensità Media',
      Math.round(currentStats.avgPower),
      Math.round(previousStats.avgPower),
      'W'
    ));
  }

  return metrics;
}

/**
 * Crea metrica di confronto
 */
function createComparisonMetric(
  metric: string,
  current: number,
  previous: number,
  unit: string
): ComparisonData {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 2) { // Soglia 2% per considerare cambio significativo
    trend = changePercent > 0 ? 'up' : 'down';
  }

  return {
    metric,
    current,
    previous,
    change,
    changePercent,
    trend,
    unit
  };
}

/**
 * Calcola statistiche per un periodo
 */
function calculatePeriodStats(activities: any[]) {
  if (activities.length === 0) {
    return {
      totalDuration: 0,
      avgPower: 0,
      maxPower: 0,
      avgTSS: 0
    };
  }

  const totalDuration = activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
  
  const powerActivities = activities.filter(a => a.avg_power_watts && a.avg_power_watts > 0);
  const avgPower = powerActivities.length > 0 
    ? powerActivities.reduce((sum, a) => sum + a.avg_power_watts, 0) / powerActivities.length 
    : 0;
  
  const maxPower = Math.max(...activities.map(a => a.max_power_watts || 0));
  
  const tssActivities = activities.filter(a => a.tss && a.tss > 0);
  const avgTSS = tssActivities.length > 0 
    ? tssActivities.reduce((sum, a) => sum + a.tss, 0) / tssActivities.length 
    : 50; // Fallback TSS medio

  return {
    totalDuration,
    avgPower,
    maxPower,
    avgTSS
  };
}

/**
 * Calcola dati stagionali (ultimi 12 mesi)
 */
function calculateSeasonalData(
  activities: any[], 
  profileEntries: any[]
): SeasonalData[] {
  const seasonalData: SeasonalData[] = [];
  const monthlyData: { [key: string]: any[] } = {};

  // Raggruppa attività per mese
  for (const activity of activities) {
    const date = new Date(activity.activity_date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(activity);
  }

  // Genera dati per ultimi 12 mesi
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('it-IT', { month: 'short' });
    
    const monthActivities = monthlyData[monthKey] || [];
    
    // Trova FTP per questo mese
    const monthFTP = findFTPForMonth(date, profileEntries);
    
    // Calcola metriche mensili
    const stats = calculatePeriodStats(monthActivities);
    const volume = stats.totalDuration / 3600; // ore
    
    seasonalData.push({
      month: monthName,
      ftp: monthFTP,
      volume: parseFloat(volume.toFixed(1)),
      intensity: Math.round(stats.avgPower),
      peakPower: Math.round(stats.maxPower)
    });
  }

  return seasonalData;
}

/**
 * Trova FTP valido per un determinato mese
 */
function findFTPForMonth(targetDate: Date, profileEntries: any[]): number {
  // Trova l'entry più recente prima o uguale alla data target
  const validEntries = profileEntries.filter(entry => {
    const entryDate = new Date(entry.effective_date);
    return entryDate <= targetDate && entry.ftp_watts;
  });

  if (validEntries.length > 0) {
    // Ordina per data decrescente e prendi il primo
    validEntries.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
    return validEntries[0].ftp_watts;
  }

  // Fallback: cerca l'FTP più vicino
  const allFTPEntries = profileEntries.filter(entry => entry.ftp_watts);
  if (allFTPEntries.length > 0) {
    return allFTPEntries[0].ftp_watts;
  }

  return 250; // Fallback default
}

/**
 * Calcola miglioramenti dall'inizio anno
 */
function calculateImprovements(
  currentActivities: any[],
  yearActivities: any[],
  profileEntries: any[],
  currentWeight: number | null
): ImprovementData[] {
  const improvements: ImprovementData[] = [];
  
  // Trova inizio anno
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const startYearActivities = yearActivities.filter(a => 
    new Date(a.activity_date) >= startOfYear
  );

  if (startYearActivities.length === 0) return improvements;

  // FTP improvement
  const currentFTP = findFTPForMonth(new Date(), profileEntries);
  const startYearFTP = findFTPForMonth(startOfYear, profileEntries);
  
  if (currentFTP > 0 && startYearFTP > 0) {
    improvements.push({
      category: 'FTP',
      currentValue: currentFTP,
      startValue: startYearFTP,
      improvement: currentFTP - startYearFTP,
      improvementPercent: ((currentFTP - startYearFTP) / startYearFTP) * 100,
      unit: 'W',
      color: '#10b981'
    });
  }

  // Power improvements dai PB
  const powerDurations = [
    { key: 'pb_power_300s_watts', label: 'Potenza 5min', color: '#3b82f6' },
    { key: 'pb_power_60s_watts', label: 'Potenza 1min', color: '#f59e0b' }
  ];

  for (const duration of powerDurations) {
    const currentBest = Math.max(...currentActivities.map(a => a[duration.key] || 0));
    
    // Trova PB a inizio anno (approssimazione)
    const startYearActivitiesWithPB = startYearActivities.slice(-Math.ceil(startYearActivities.length * 0.2)); // Primi 20%
    const startYearBest = Math.max(...startYearActivitiesWithPB.map(a => a[duration.key] || 0));
    
    if (currentBest > 0 && startYearBest > 0 && currentBest > startYearBest) {
      improvements.push({
        category: duration.label,
        currentValue: currentBest,
        startValue: startYearBest,
        improvement: currentBest - startYearBest,
        improvementPercent: ((currentBest - startYearBest) / startYearBest) * 100,
        unit: 'W',
        color: duration.color
      });
    }
  }

  // W/kg improvement
  if (currentWeight && currentFTP > 0 && startYearFTP > 0) {
    const currentWPerKg = currentFTP / currentWeight;
    const startYearWPerKg = startYearFTP / (currentWeight * 1.02); // Stima peso leggermente maggiore
    
    improvements.push({
      category: 'W/kg FTP',
      currentValue: parseFloat(currentWPerKg.toFixed(2)),
      startValue: parseFloat(startYearWPerKg.toFixed(2)),
      improvement: parseFloat((currentWPerKg - startYearWPerKg).toFixed(2)),
      improvementPercent: ((currentWPerKg - startYearWPerKg) / startYearWPerKg) * 100,
      unit: 'W/kg',
      color: '#8b5cf6'
    });
  }

  // Volume improvement
  const currentStats = calculatePeriodStats(currentActivities);
  const startYearStats = calculatePeriodStats(startYearActivities);
  
  const currentVolumeWeekly = (currentStats.totalDuration / 3600) / 4; // Approssimativamente 4 settimane
  const startYearVolumeWeekly = (startYearStats.totalDuration / 3600) / 4;
  
  if (currentVolumeWeekly > 0 && startYearVolumeWeekly > 0) {
    improvements.push({
      category: 'Volume Settimanale',
      currentValue: parseFloat(currentVolumeWeekly.toFixed(1)),
      startValue: parseFloat(startYearVolumeWeekly.toFixed(1)),
      improvement: parseFloat((currentVolumeWeekly - startYearVolumeWeekly).toFixed(1)),
      improvementPercent: ((currentVolumeWeekly - startYearVolumeWeekly) / startYearVolumeWeekly) * 100,
      unit: 'h',
      color: '#ef4444'
    });
  }

  return improvements;
}

/**
 * Calcola previsioni future basate sui trend
 */
function calculateForecast(seasonalData: SeasonalData[], currentFTP: number | null): ForecastData[] {
  const forecast: ForecastData[] = [];
  
  if (seasonalData.length < 3 || !currentFTP) {
    return forecast; // Non abbastanza dati per previsioni
  }

  // Calcola trend FTP dai dati stagionali
  const recentData = seasonalData.slice(-6); // Ultimi 6 mesi
  const ftpValues = recentData.filter(d => d.ftp > 0).map(d => d.ftp);
  
  if (ftpValues.length < 3) return forecast;

  // Calcola trend lineare semplice
  const avgMonthlyGrowth = calculateLinearTrend(ftpValues);
  
  // Genera previsioni per prossimi 6 mesi
  for (let i = 1; i <= 6; i++) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i);
    
    const predictedFTP = Math.round(currentFTP + (avgMonthlyGrowth * i));
    const confidence = Math.max(5, 20 - (i * 2)); // Fiducia decresce nel tempo
    
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      actualFTP: null,
      predictedFTP,
      confidenceMin: Math.round(predictedFTP - confidence),
      confidenceMax: Math.round(predictedFTP + confidence)
    });
  }

  return forecast;
}

/**
 * Calcola trend lineare semplice
 */
function calculateLinearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n + 1)) / 2; // Somma 1+2+...+n
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, idx) => sum + (val * (idx + 1)), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // Somma 1²+2²+...+n²
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return slope || 0;
} 