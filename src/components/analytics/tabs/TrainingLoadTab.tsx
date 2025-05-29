'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';

interface TrainingLoadTabProps {
  athleteId: string;
  athlete: Athlete;
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
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [activeSubTab, setActiveSubTab] = useState<'pmc' | 'weekly' | 'intensity'>('pmc');

  useEffect(() => {
    const loadTrainingLoadData = async () => {
      setIsLoading(true);
      
      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Genera dati PMC mock realistici
      const today = new Date();
      const days = selectedPeriod === '3m' ? 90 : selectedPeriod === '6m' ? 180 : selectedPeriod === '1y' ? 365 : 730;
      
      const mockPMC: PMCData[] = [];
      let ctl = 50; // Fitness iniziale
      let atl = 40; // Fatica iniziale
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Simula TSS giornaliero con pattern realistici
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isRestDay = Math.random() < 0.3; // 30% giorni di riposo
        
        let trainingStress = 0;
        if (!isRestDay) {
          if (isWeekend) {
            trainingStress = Math.round(80 + Math.random() * 100); // Weekend: 80-180 TSS
          } else {
            trainingStress = Math.round(40 + Math.random() * 80); // Infrasettimanale: 40-120 TSS
          }
        }
        
        // Calcola CTL (exponential moving average, tau=42)
        ctl = ctl + (trainingStress - ctl) / 42;
        
        // Calcola ATL (exponential moving average, tau=7)  
        atl = atl + (trainingStress - atl) / 7;
        
        // TSB = CTL - ATL
        const tsb = ctl - atl;
        
        mockPMC.push({
          date: date.toISOString().split('T')[0],
          ctlValue: Math.round(ctl * 10) / 10,
          atlValue: Math.round(atl * 10) / 10,
          tsbValue: Math.round(tsb * 10) / 10,
          trainingStress
        });
      }
      
      // Genera dati settimanali mock
      const mockWeekly: WeeklyLoadData[] = [];
      for (let i = 12; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekStr = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
        
        const totalTSS = Math.round(300 + Math.random() * 400); // 300-700 TSS/settimana
        const hours = Math.round((8 + Math.random() * 8) * 10) / 10; // 8-16 ore/settimana
        const activities = Math.round(4 + Math.random() * 3); // 4-7 attività/settimana
        
        mockWeekly.push({
          week: weekStr,
          totalTSS,
          hours,
          intensity: Math.round(totalTSS / hours),
          avgPower: Math.round(180 + Math.random() * 60), // 180-240W media
          activities
        });
      }
      
      // Genera dati zone intensità mock
      const mockIntensityZones: IntensityZoneData[] = [
        { zone: 'Z1', name: 'Recovery', hours: 2.5, percentage: 15, color: '#9ca3af', target: 20 },
        { zone: 'Z2', name: 'Endurance', hours: 8.2, percentage: 50, color: '#3b82f6', target: 45 },
        { zone: 'Z3', name: 'Tempo', hours: 3.1, percentage: 19, color: '#10b981', target: 20 },
        { zone: 'Z4', name: 'Threshold', hours: 1.8, percentage: 11, color: '#f59e0b', target: 10 },
        { zone: 'Z5', name: 'VO2max', hours: 0.6, percentage: 4, color: '#ef4444', target: 4 },
        { zone: 'Z6', name: 'Anaerobic', hours: 0.2, percentage: 1, color: '#8b5cf6', target: 1 },
      ];
      
      setPmcData(mockPMC);
      setWeeklyData(mockWeekly);
      setIntensityZones(mockIntensityZones);
      setIsLoading(false);
    };

    loadTrainingLoadData();
  }, [athleteId, selectedPeriod]);

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
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  const currentCTL = pmcData.length > 0 ? pmcData[pmcData.length - 1].ctlValue : 0;
  const currentATL = pmcData.length > 0 ? pmcData[pmcData.length - 1].atlValue : 0;
  const currentTSB = pmcData.length > 0 ? pmcData[pmcData.length - 1].tsbValue : 0;

  return (
    <div className="space-y-6">
      {/* Header con metriche attuali */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
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
          </CardContent>
        </Card>
      </div>

      {/* Controlli periodo */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analisi Carico di Allenamento</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitoraggio fitness, fatica e forma fisica
          </p>
        </div>
        <div className="flex gap-2">
          {(['3m', '6m', '1y', 'all'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period === 'all' ? 'Tutto' : period}
            </Button>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(value: string) => setActiveSubTab(value as 'pmc' | 'weekly' | 'intensity')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pmc">PMC Dettagliato</TabsTrigger>
          <TabsTrigger value="weekly">Carico Settimanale</TabsTrigger>
          <TabsTrigger value="intensity">Zone Intensità</TabsTrigger>
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
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">CTL (Chronic Training Load)</h4>
                  <p className="text-green-700 dark:text-green-400">
                    Rappresenta il livello di fitness a lungo termine. Aumenta gradualmente con l'allenamento costante.
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">ATL (Acute Training Load)</h4>
                  <p className="text-red-700 dark:text-red-400">
                    Rappresenta la fatica a breve termine. Reagisce velocemente all'allenamento recente.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">TSB (Training Stress Balance)</h4>
                  <p className="text-purple-700 dark:text-purple-400">
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

        <TabsContent value="intensity" className="space-y-6">
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
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Zone Base (Z1-Z2)</h4>
                  <p className="text-blue-700 dark:text-blue-400">
                    Dovresti concentrarti maggiormente su allenamenti aerobici di base per migliorare l'efficienza.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Zone Intensive (Z4-Z5)</h4>
                  <p className="text-amber-700 dark:text-amber-400">
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