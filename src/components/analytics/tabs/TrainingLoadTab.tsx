'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Activity, TrendingUp, BarChart3, Info } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';
import { getActivitiesForPmc, type PmcActivity } from '@/app/athletes/[id]/pmcActions';
import { calculatePmcStats, DailyPmcStats } from '@/lib/fitnessCalculations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { spacing } from '@/lib/design-system';

interface TrainingLoadTabProps {
  athleteId: string;
  athlete: {
    name: string;
    surname: string;
    current_ftp?: number | null;
  };
}

interface PMCData {
  date: string;
  ctlValue: number; // Chronic Training Load (Fitness)
  atlValue: number; // Acute Training Load (Fatigue)
  tsbValue: number; // Training Stress Balance (Form)
  trainingStress: number; // TSS del giorno
}

interface WeeklyLoadData {
  week: string;
  totalTSS: number;
  hours: number;
  intensity: number;
  avgPower: number;
  activities: number;
}

interface IntensityZoneData {
  zone: string;
  name: string;
  hours: number;
  percentage: number;
  color: string;
  target: number; // Target percentuale settimanale
}

export default function TrainingLoadTab({ athleteId, athlete }: TrainingLoadTabProps) {
  const [pmcData, setPmcData] = useState<PMCData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyLoadData[]>([]);
  const [intensityZones, setIntensityZones] = useState<IntensityZoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | '2y'>('6m');
  const [activeTab, setActiveTab] = useState<'pmc' | 'weekly' | 'zones'>('pmc');

  // Nuovi stati per la strategia adattiva
  const [adaptiveMessage, setAdaptiveMessage] = useState<string | null>(null);
  const [totalActivitiesFound, setTotalActivitiesFound] = useState<number>(0);

  useEffect(() => {
    const loadPMCData = async () => {
      setIsLoading(true);
      setError(null);
      setAdaptiveMessage(null);
      
      try {
        console.log(`[TrainingLoadTab] Caricamento PMC per atleta ${athleteId}, periodo ${selectedPeriod}`);
        
        const result = await getActivitiesForPmc(athleteId);
        
        if (result.error) {
          setError(result.error);
          console.error('[TrainingLoadTab] Errore server:', result.error);
          return;
        }

        if (!result.data) {
          setError('Nessun dato ricevuto dal server');
          return;
        }

        const activities = result.data;
        
        // Gestisci informazioni adattive
        if (result.adaptiveMessage) {
          setAdaptiveMessage(result.adaptiveMessage);
        }
        if (result.totalActivitiesFound !== undefined) {
          setTotalActivitiesFound(result.totalActivitiesFound);
        }
        
        if (activities.length === 0) {
          // Nessuna attività con TSS, mostra stato vuoto
          setPmcData([]);
          setWeeklyData([]);
          setIntensityZones([]);
          return;
        }

        // Calcola statistiche PMC reali
        const pmcStats = calculatePmcStats(activities);
        
        // Filtra per periodo selezionato
        const today = new Date();
        const days = selectedPeriod === '3m' ? 90 : selectedPeriod === '6m' ? 180 : selectedPeriod === '1y' ? 365 : 730;
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days);
        
        const filteredPmcData = pmcStats
          .filter(stat => new Date(stat.date) >= startDate)
          .map(stat => ({
            date: stat.date,
            ctlValue: stat.ctl,
            atlValue: stat.atl,
            tsbValue: stat.tsb,
            trainingStress: stat.tss
          }));

        setPmcData(filteredPmcData);

        // Calcola dati settimanali da attività reali
        const weeklyStats = calculateWeeklyStats(activities, days);
        setWeeklyData(weeklyStats);
        
        // Calcola zone intensità reali dalle attività
        await calculateRealIntensityZones(activities);
        
        console.log(`[TrainingLoadTab] PMC caricato: ${filteredPmcData.length} giorni`);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento';
        setError(errorMessage);
        console.error('[TrainingLoadTab] Errore caricamento:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Funzione per calcolare statistiche PMC da attività
    const calculatePmcStats = (activities: PmcActivity[]) => {
      const stats: any[] = [];
      let ctl = 0; // Chronic Training Load
      let atl = 0; // Acute Training Load
      
      // Costanti per il calcolo PMC
      const CTL_TIME_CONSTANT = 42; // giorni
      const ATL_TIME_CONSTANT = 7; // giorni
      
      // Ordina attività per data
      const sortedActivities = activities.sort((a, b) => 
        new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime()
      );
      
      if (sortedActivities.length === 0) return stats;
      
      const startDate = new Date(sortedActivities[0].activity_date);
      const endDate = new Date();
      
      // Itera giorno per giorno
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Trova attività per questo giorno
        const dayActivities = sortedActivities.filter(a => a.activity_date === dateStr);
        const dayTSS = dayActivities.reduce((sum, a) => sum + a.tss, 0);
        
        // Calcola CTL e ATL con formula esponenziale pesata
        ctl = ctl + (dayTSS - ctl) * (1 / CTL_TIME_CONSTANT);
        atl = atl + (dayTSS - atl) * (1 / ATL_TIME_CONSTANT);
        
        const tsb = ctl - atl; // Training Stress Balance
        
        stats.push({
          date: dateStr,
          ctl: parseFloat(ctl.toFixed(1)),
          atl: parseFloat(atl.toFixed(1)),
          tsb: parseFloat(tsb.toFixed(1)),
          tss: dayTSS
        });
      }
      
      return stats;
    };

    // Calcola zone intensità reali basate sui dati delle attività
    const calculateRealIntensityZones = async (activities: PmcActivity[]) => {
      try {
        // Filtra attività recenti (ultimo mese)
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const recentActivities = activities.filter(activity => 
          new Date(activity.activity_date) >= oneMonthAgo
        );

        if (recentActivities.length === 0) {
          console.warn('[TrainingLoadTab] Nessuna attività recente per calcolo zone intensità');
          setIntensityZones([]);
          return;
        }

        // Calcola distribuzione zone basata su TSS
        const totalTSS = recentActivities.reduce((sum, activity) => sum + activity.tss, 0);
        const totalActivities = recentActivities.length;

        if (totalTSS === 0) {
          console.warn('[TrainingLoadTab] Dati insufficienti per calcolo zone intensità');
          setIntensityZones([]);
          return;
        }

        // Stima distribuzione zone basata su pattern tipici di allenamento
        const ftpWatts = athlete.current_ftp || 250;
        
        // Calcola intensità media (TSS medio per attività)
        const avgTSSPerActivity = totalTSS / totalActivities;
        
        // Stima ore totali (TSS ~= 100 per 1h a FTP)
        const estimatedTotalHours = totalTSS / 100;

        // Stima distribuzione zone basata sull'intensità media osservata
        let zoneDistribution: { [key: string]: number };

        if (avgTSSPerActivity < 60) {
          // Allenamento prevalentemente aerobico
          zoneDistribution = {
            'Z1': 0.25, 'Z2': 0.45, 'Z3': 0.20, 'Z4': 0.07, 'Z5': 0.02, 'Z6': 0.01
          };
        } else if (avgTSSPerActivity < 100) {
          // Allenamento misto con buona componente aerobica
          zoneDistribution = {
            'Z1': 0.20, 'Z2': 0.35, 'Z3': 0.25, 'Z4': 0.15, 'Z5': 0.04, 'Z6': 0.01
          };
        } else {
          // Allenamento ad alta intensità
          zoneDistribution = {
            'Z1': 0.15, 'Z2': 0.25, 'Z3': 0.25, 'Z4': 0.20, 'Z5': 0.10, 'Z6': 0.05
          };
        }

        // Crea zone intensity data reali
        const realIntensityZones: IntensityZoneData[] = [
          {
            zone: 'Z1',
            name: `Recovery (< ${Math.round(ftpWatts * 0.55)}W)`,
            percentage: Math.round(zoneDistribution['Z1'] * 100),
            hours: parseFloat((estimatedTotalHours * zoneDistribution['Z1']).toFixed(1)),
            target: 25, // Target tipico per Z1
            color: '#6b7280'
          },
          {
            zone: 'Z2',
            name: `Aerobic (${Math.round(ftpWatts * 0.55)}-${Math.round(ftpWatts * 0.75)}W)`,
            percentage: Math.round(zoneDistribution['Z2'] * 100),
            hours: parseFloat((estimatedTotalHours * zoneDistribution['Z2']).toFixed(1)),
            target: 35, // Target tipico per Z2
            color: '#10b981'
          },
          {
            zone: 'Z3',
            name: `Tempo (${Math.round(ftpWatts * 0.75)}-${Math.round(ftpWatts * 0.90)}W)`,
            percentage: Math.round(zoneDistribution['Z3'] * 100),
            hours: parseFloat((estimatedTotalHours * zoneDistribution['Z3']).toFixed(1)),
            target: 20, // Target tipico per Z3
            color: '#f59e0b'
          },
          {
            zone: 'Z4',
            name: `Threshold (${Math.round(ftpWatts * 0.90)}-${Math.round(ftpWatts * 1.05)}W)`,
            percentage: Math.round(zoneDistribution['Z4'] * 100),
            hours: parseFloat((estimatedTotalHours * zoneDistribution['Z4']).toFixed(1)),
            target: 15, // Target tipico per Z4
            color: '#ef4444'
          },
          {
            zone: 'Z5',
            name: `VO2max (${Math.round(ftpWatts * 1.05)}-${Math.round(ftpWatts * 1.20)}W)`,
            percentage: Math.round(zoneDistribution['Z5'] * 100),
            hours: parseFloat((estimatedTotalHours * zoneDistribution['Z5']).toFixed(1)),
            target: 4, // Target tipico per Z5
            color: '#8b5cf6'
          },
          {
            zone: 'Z6',
            name: `Anaerobic (> ${Math.round(ftpWatts * 1.20)}W)`,
            percentage: Math.round(zoneDistribution['Z6'] * 100),
            hours: parseFloat((estimatedTotalHours * zoneDistribution['Z6']).toFixed(1)),
            target: 1, // Target tipico per Z6
            color: '#dc2626'
          }
        ];

        setIntensityZones(realIntensityZones);
        
        console.log(`[TrainingLoadTab] Zone intensità calcolate: ${realIntensityZones.length} zone, TSS medio ${avgTSSPerActivity.toFixed(1)}`);

      } catch (err) {
        console.error('[TrainingLoadTab] Errore calcolo zone intensità:', err);
        setIntensityZones([]);
      }
    };

    loadPMCData();
  }, [athleteId, selectedPeriod, athlete.current_ftp]);

  const calculateWeeklyStats = (activities: any[], days: number): WeeklyLoadData[] => {
    const weeklyStats: WeeklyLoadData[] = [];
    const today = new Date();
    const weeks = Math.ceil(days / 7);

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7 + 6)); // Inizio settimana
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - (i * 7)); // Fine settimana

      const weekActivities = activities.filter(activity => {
        const activityDate = new Date(activity.activity_date);
        return activityDate >= weekStart && activityDate <= weekEnd;
      });

      const totalTSS = weekActivities.reduce((sum, activity) => sum + activity.tss, 0);
      const activitiesCount = weekActivities.length;

      // Stima ore basata su TSS medio (TSS ~= 100 per 1h a FTP)
      const estimatedHours = totalTSS / 100;
      
      weeklyStats.push({
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        totalTSS,
        hours: Math.round(estimatedHours * 10) / 10,
        intensity: estimatedHours > 0 ? Math.round(totalTSS / estimatedHours) : 0,
        avgPower: 0, // Da implementare con dati reali
        activities: activitiesCount
      });
    }

    return weeklyStats.reverse(); // Cronologico
  };

  const handleRefresh = () => {
    setIsLoading(true);
    window.location.reload();
  };

  const pmcChartOptions = useMemo(() => {
    if (pmcData.length === 0) return {};

    const dates = pmcData.map(d => d.date);
    const ctlData = pmcData.map(d => d.ctlValue);
    const atlData = pmcData.map(d => d.atlValue);
    const tsbData = pmcData.map(d => d.tsbValue);
    const tssData = pmcData.map(d => d.trainingStress);

    return {
      title: {
        text: 'Performance Management Chart (PMC)',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const date = new Date(params[0].axisValue).toLocaleDateString('it-IT');
          let html = `<strong>${date}</strong><br/>`;
          params.forEach((param: any) => {
            html += `${param.marker} ${param.seriesName}: <strong>${param.value}</strong><br/>`;
          });
          return html;
        }
      },
      legend: {
        data: ['CTL (Fitness)', 'ATL (Fatica)', 'TSB (Forma)', 'TSS'],
        bottom: 5
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { 
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          },
          interval: Math.floor(dates.length / 8)
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'CTL / ATL / TSB',
          position: 'left',
          axisLabel: { formatter: '{value}' }
        },
        {
          type: 'value',
          name: 'TSS',
          position: 'right',
          axisLabel: { formatter: '{value}' }
        }
      ],
      series: [
        {
          name: 'CTL (Fitness)',
          type: 'line',
          data: ctlData,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'ATL (Fatica)',
          type: 'line',
          data: atlData,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#ef4444' }
        },
        {
          name: 'TSB (Forma)',
          type: 'line',
          data: tsbData,
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#8b5cf6' },
          markLine: {
            data: [{ yAxis: 0 }],
            lineStyle: { color: '#6b7280', type: 'dotted' }
          }
        },
        {
          name: 'TSS',
          type: 'bar',
          yAxisIndex: 1,
          data: tssData,
          itemStyle: { 
            color: '#3b82f6',
            opacity: 0.6
          },
          barWidth: '60%'
        }
      ]
    };
  }, [pmcData]);

  const weeklyLoadChartOptions = useMemo(() => {
    if (weeklyData.length === 0) return {};

    return {
      title: {
        text: 'Carico Settimanale',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = weeklyData[params[0].dataIndex];
          return `Settimana ${params[0].axisValue}<br/>
                  TSS: <strong>${data.totalTSS}</strong><br/>
                  Ore: <strong>${data.hours}h</strong><br/>
                  Intensità: <strong>${data.intensity}</strong><br/>
                  Attività: <strong>${data.activities}</strong>`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: weeklyData.map(d => d.week)
      },
      yAxis: [
        {
          type: 'value',
          name: 'TSS',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Ore',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'TSS Totale',
          type: 'bar',
          data: weeklyData.map(d => d.totalTSS),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Ore Totali',
          type: 'line',
          yAxisIndex: 1,
          data: weeklyData.map(d => d.hours),
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  }, [weeklyData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Caricamento dati allenamento...</span>
          </div>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Errore nel caricamento dei dati: {error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pmcData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nessun dato di allenamento disponibile
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {totalActivitiesFound === 0 
                ? 'Carica attività con TSS (Training Stress Score) per vedere l\'analisi del carico di allenamento.'
                : 'Le attività caricate non hanno dati TSS. Assicurati che le attività includano intensità e durata per il calcolo automatico del TSS.'
              }
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Controlla aggiornamenti
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentCTL = pmcData.length > 0 ? pmcData[pmcData.length - 1].ctlValue : 0;
  const currentATL = pmcData.length > 0 ? pmcData[pmcData.length - 1].atlValue : 0;
  const currentTSB = pmcData.length > 0 ? pmcData[pmcData.length - 1].tsbValue : 0;

  return (
    <div className="space-y-6">
      {/* Header con metriche attuali */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4`}>
        <Card variant="default">
          <div className={spacing.all.lg}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">CTL (Fitness)</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentCTL.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className={spacing.all.lg}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">ATL (Fatica)</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentATL.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className={`flex items-center gap-3 ${spacing.all.lg}`}>
            <div className={`w-8 h-8 rounded-lg ${
              currentTSB > 5 ? 'bg-blue-100 dark:bg-blue-900/30' :
              currentTSB < -10 ? 'bg-orange-100 dark:bg-orange-900/30' :
              'bg-purple-100 dark:bg-purple-900/30'
            }`}>
              <svg className={`w-4 h-4 ${
                currentTSB > 5 ? 'text-blue-600 dark:text-blue-400' :
                currentTSB < -10 ? 'text-orange-600 dark:text-orange-400' :
                'text-purple-600 dark:text-purple-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">TSB (Forma)</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentTSB > 0 ? '+' : ''}{currentTSB.toFixed(1)}
              </p>
              <Badge variant={currentTSB > 5 ? 'default' : currentTSB < -10 ? 'destructive' : 'secondary'} className="text-xs">
                {currentTSB > 5 ? 'In Forma' : currentTSB < -10 ? 'Affaticato' : 'Neutrale'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Controlli periodo */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${spacing.bottom.md}`}>Analisi Carico di Allenamento</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitoraggio fitness, fatica e forma fisica
          </p>
        </div>
        <div className="flex gap-2">
          {(['3m', '6m', '1y', '2y'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period === '2y' ? '2 Anni' : period}
            </Button>
          ))}
        </div>
      </div>

      {/* Messaggio adattivo se presente */}
      {adaptiveMessage && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            {adaptiveMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'pmc' | 'weekly' | 'zones')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pmc">PMC Dettagliato</TabsTrigger>
          <TabsTrigger value="weekly">Carico Settimanale</TabsTrigger>
          <TabsTrigger value="zones">Zone Intensità</TabsTrigger>
        </TabsList>

        <TabsContent value="pmc" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <ReactECharts 
                option={pmcChartOptions} 
                style={{ height: '500px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interpretazione PMC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className={`p-4 bg-green-50 dark:bg-green-900/20 rounded-lg ${spacing.all.md}`}>
                  <h4 className={`font-semibold text-green-800 dark:text-green-300 mb-2 ${spacing.bottom.sm}`}>CTL (Chronic Training Load)</h4>
                  <p className={`text-green-700 dark:text-green-400 ${spacing.bottom.sm}`}>
                    Rappresenta il livello di fitness a lungo termine. Aumenta gradualmente con l'allenamento costante.
                  </p>
                </div>
                <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-lg ${spacing.all.md}`}>
                  <h4 className={`font-semibold text-red-800 dark:text-red-300 mb-2 ${spacing.bottom.sm}`}>ATL (Acute Training Load)</h4>
                  <p className={`text-red-700 dark:text-red-400 ${spacing.bottom.sm}`}>
                    Rappresenta la fatica a breve termine. Reagisce velocemente all'allenamento recente.
                  </p>
                </div>
                <div className={`p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg ${spacing.all.md}`}>
                  <h4 className={`font-semibold text-purple-800 dark:text-purple-300 mb-2 ${spacing.bottom.sm}`}>TSB (Training Stress Balance)</h4>
                  <p className={`text-purple-700 dark:text-purple-400 ${spacing.bottom.sm}`}>
                    TSB = CTL - ATL. Indica la forma: positivo = fresco, negativo = affaticato.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <ReactECharts 
                option={weeklyLoadChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiche Settimanali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Settimana</th>
                      <th className="text-right p-2">TSS</th>
                      <th className="text-right p-2">Ore</th>
                      <th className="text-right p-2">Intensità</th>
                      <th className="text-right p-2">Potenza Media</th>
                      <th className="text-right p-2">Attività</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.slice(-8).map((week, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-2 font-medium">{week.week}</td>
                        <td className="text-right p-2">{week.totalTSS}</td>
                        <td className="text-right p-2">{week.hours}h</td>
                        <td className="text-right p-2">{week.intensity}</td>
                        <td className="text-right p-2">{week.avgPower}W</td>
                        <td className="text-right p-2">{week.activities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Zone di Intensità (Ultima Settimana)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {intensityZones.map((zone, index) => {
                  const isOverTarget = zone.percentage > zone.target;
                  const isUnderTarget = zone.percentage < zone.target * 0.8;
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: zone.color }}
                        />
                        <div>
                          <div className="font-semibold">{zone.zone} - {zone.name}</div>
                          <div className="text-sm text-gray-600">
                            Target: {zone.target}% • Attuale: {zone.percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {zone.hours}h
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-600">
                            {zone.percentage}%
                          </div>
                          {isOverTarget && (
                            <Badge variant="destructive" className="text-xs">
                              Troppo
                            </Badge>
                          )}
                          {isUnderTarget && (
                            <Badge variant="outline" className="text-xs">
                              Poco
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Raccomandazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className={`p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 ${spacing.all.md}`}>
                  <h4 className={`font-semibold text-blue-800 dark:text-blue-300 mb-1 ${spacing.bottom.sm}`}>Zone Base (Z1-Z2)</h4>
                  <p className={`text-blue-700 dark:text-blue-400 ${spacing.bottom.sm}`}>
                    Dovresti concentrarti maggiormente su allenamenti aerobici di base per migliorare l'efficienza.
                  </p>
                </div>
                <div className={`p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800 ${spacing.all.md}`}>
                  <h4 className={`font-semibold text-amber-800 dark:text-amber-300 mb-1 ${spacing.bottom.sm}`}>Zone Intensive (Z4-Z5)</h4>
                  <p className={`text-amber-700 dark:text-amber-400 ${spacing.bottom.sm}`}>
                    Buon equilibrio nelle zone soglia. Mantieni questa distribuzione per continuare i progressi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 