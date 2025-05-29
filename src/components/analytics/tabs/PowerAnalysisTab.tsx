'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';
import { PB_DURATIONS_SECONDS } from '@/lib/fitnessCalculations';

interface PowerAnalysisTabProps {
  athleteId: string;
  athlete: Athlete;
}

interface PowerCurveData {
  duration: number; // secondi
  durationLabel: string;
  current: number | null; // watt attuali
  best: number | null; // PB
  target?: number | null; // obiettivo
  previous?: number | null; // periodo precedente per confronto
}

interface PowerDistributionBand {
  range: string; // "0-100W", "100-200W", etc.
  minWatts: number;
  maxWatts: number;
  timeSeconds: number;
  percentage: number;
  isTargetZone?: boolean; // se è una zona target (es. Z2, Z3)
}

interface PowerZoneData {
  zone: string;
  name: string;
  minWatts: number;
  maxWatts: number;
  minPercent: number;
  maxPercent: number;
  timeSeconds: number;
  percentage: number;
  color: string;
}

export default function PowerAnalysisTab({ athleteId, athlete }: PowerAnalysisTabProps) {
  const [powerCurveData, setPowerCurveData] = useState<PowerCurveData[]>([]);
  const [powerDistribution, setPowerDistribution] = useState<PowerDistributionBand[]>([]);
  const [powerZones, setPowerZones] = useState<PowerZoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | '30d' | '90d' | '1y'>('current');
  const [activeSubTab, setActiveSubTab] = useState<'curves' | 'distribution' | 'zones'>('curves');

  // Mock FTP per i calcoli - in futuro verrà dal profilo reale
  const currentFTP = 265;

  useEffect(() => {
    const loadPowerData = async () => {
      setIsLoading(true);
      
      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Genera dati mock realistici per le curve di potenza
      const mockPowerCurve: PowerCurveData[] = PB_DURATIONS_SECONDS.map(duration => {
        const durationLabels: Record<number, string> = {
          5: '5s',
          15: '15s', 
          30: '30s',
          60: '1min',
          300: '5min',
          600: '10min',
          1200: '20min',
          1800: '30min',
          3600: '1h',
          5400: '90min'
        };

        // Calcola potenze realistiche basate su curve tipiche
        const ftpPercentages: Record<number, number> = {
          5: 2.5,    // 250% FTP per 5s
          15: 2.2,   // 220% FTP per 15s
          30: 1.9,   // 190% FTP per 30s
          60: 1.6,   // 160% FTP per 1min
          300: 1.2,  // 120% FTP per 5min
          600: 1.1,  // 110% FTP per 10min
          1200: 1.0, // 100% FTP per 20min
          1800: 0.95, // 95% FTP per 30min
          3600: 0.85, // 85% FTP per 1h
          5400: 0.75  // 75% FTP per 90min
        };

        const currentPower = Math.round(currentFTP * ftpPercentages[duration]);
        const bestPower = Math.round(currentPower * (1 + Math.random() * 0.15)); // +0-15% rispetto al corrente
        const previousPower = Math.round(currentPower * (0.9 + Math.random() * 0.1)); // -10% a 0% rispetto al corrente

        return {
          duration,
          durationLabel: durationLabels[duration],
          current: currentPower,
          best: bestPower,
          previous: previousPower,
          target: duration === 1200 ? currentFTP + 10 : null // Target solo per FTP
        };
      });

      // Genera distribuzione di potenza mock
      const mockDistribution: PowerDistributionBand[] = [];
      const totalTime = 3600; // 1 ora di attività
      const bands = [
        { range: '0-100W', min: 0, max: 100, time: 180 },
        { range: '100-150W', min: 100, max: 150, time: 300 },
        { range: '150-200W', min: 150, max: 200, time: 900 },
        { range: '200-250W', min: 200, max: 250, time: 1200 },
        { range: '250-300W', min: 250, max: 300, time: 720 },
        { range: '300-350W', min: 300, max: 350, time: 240 },
        { range: '350W+', min: 350, max: 999, time: 60 }
      ];

      bands.forEach(band => {
        mockDistribution.push({
          range: band.range,
          minWatts: band.min,
          maxWatts: band.max,
          timeSeconds: band.time,
          percentage: (band.time / totalTime) * 100
        });
      });

      // Genera zone di potenza mock basate su FTP
      const mockZones: PowerZoneData[] = [
        { zone: 'Z1', name: 'Recovery', minWatts: 0, maxWatts: Math.round(currentFTP * 0.55), minPercent: 0, maxPercent: 55, timeSeconds: 480, percentage: 13.3, color: '#9ca3af' },
        { zone: 'Z2', name: 'Endurance', minWatts: Math.round(currentFTP * 0.55), maxWatts: Math.round(currentFTP * 0.75), minPercent: 55, maxPercent: 75, timeSeconds: 1800, percentage: 50.0, color: '#3b82f6' },
        { zone: 'Z3', name: 'Tempo', minWatts: Math.round(currentFTP * 0.75), maxWatts: Math.round(currentFTP * 0.90), minPercent: 75, maxPercent: 90, timeSeconds: 900, percentage: 25.0, color: '#10b981' },
        { zone: 'Z4', name: 'Threshold', minWatts: Math.round(currentFTP * 0.90), maxWatts: Math.round(currentFTP * 1.05), minPercent: 90, maxPercent: 105, timeSeconds: 360, percentage: 10.0, color: '#f59e0b' },
        { zone: 'Z5', name: 'VO2max', minWatts: Math.round(currentFTP * 1.05), maxWatts: Math.round(currentFTP * 1.20), minPercent: 105, maxPercent: 120, timeSeconds: 60, percentage: 1.7, color: '#ef4444' },
        { zone: 'Z6', name: 'Anaerobic', minWatts: Math.round(currentFTP * 1.20), maxWatts: Math.round(currentFTP * 1.50), minPercent: 120, maxPercent: 150, timeSeconds: 0, percentage: 0, color: '#8b5cf6' },
        { zone: 'Z7', name: 'Neuromuscular', minWatts: Math.round(currentFTP * 1.50), maxWatts: 999, minPercent: 150, maxPercent: 999, timeSeconds: 0, percentage: 0, color: '#ec4899' }
      ];

      setPowerCurveData(mockPowerCurve);
      setPowerDistribution(mockDistribution);
      setPowerZones(mockZones);
      setIsLoading(false);
    };

    loadPowerData();
  }, [athleteId, selectedPeriod, currentFTP]);

  const powerCurveChartOptions = useMemo(() => {
    if (powerCurveData.length === 0) return {};

    const xAxisData = powerCurveData.map(d => d.durationLabel);
    const currentSeries = powerCurveData.map(d => d.current);
    const bestSeries = powerCurveData.map(d => d.best);
    const previousSeries = powerCurveData.map(d => d.previous);

    return {
      title: {
        text: 'Curve di Potenza',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let html = `<strong>${params[0].name}</strong><br/>`;
          params.forEach((param: any) => {
            if (param.value !== null) {
              html += `${param.marker} ${param.seriesName}: <strong>${param.value} W</strong><br/>`;
            }
          });
          return html;
        }
      },
      legend: {
        data: ['Attuale', 'PB All-Time', 'Periodo Precedente'],
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: { interval: 0, rotate: 45 }
      },
      yAxis: {
        type: 'value',
        name: 'Potenza (W)',
        axisLabel: { formatter: '{value} W' }
      },
      series: [
        {
          name: 'Attuale',
          type: 'line',
          data: currentSeries,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3 },
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'PB All-Time',
          type: 'line',
          data: bestSeries,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Periodo Precedente',
          type: 'line',
          data: previousSeries,
          smooth: true,
          symbol: 'triangle',
          symbolSize: 6,
          lineStyle: { width: 2, type: 'dotted' },
          itemStyle: { color: '#f59e0b' }
        }
      ]
    };
  }, [powerCurveData]);

  const powerDistributionChartOptions = useMemo(() => {
    if (powerDistribution.length === 0) return {};

    return {
      title: {
        text: 'Distribuzione Potenza',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = powerDistribution[params.dataIndex];
          const minutes = Math.floor(data.timeSeconds / 60);
          const seconds = data.timeSeconds % 60;
          return `${data.range}<br/>Tempo: ${minutes}:${seconds.toString().padStart(2, '0')}<br/>Percentuale: ${data.percentage.toFixed(1)}%`;
        }
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: powerDistribution.map((band, index) => ({
            value: band.timeSeconds,
            name: band.range,
            itemStyle: {
              color: [
                '#9ca3af', '#6b7280', '#3b82f6', '#1d4ed8',
                '#10b981', '#f59e0b', '#ef4444'
              ][index] || '#9ca3af'
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            formatter: '{b}\n{d}%'
          }
        }
      ]
    };
  }, [powerDistribution]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controlli periodo */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analisi Potenza</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            FTP attuale: <span className="font-semibold">{currentFTP} W</span>
          </p>
        </div>
        <div className="flex gap-2">
          {(['current', '30d', '90d', '1y'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period === 'current' ? 'Attuale' : period}
            </Button>
          ))}
        </div>
      </div>

      {/* Sub-tabs per diverse visualizzazioni */}
      <Tabs value={activeSubTab} onValueChange={(value: string) => setActiveSubTab(value as 'curves' | 'distribution' | 'zones')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="curves">Curve di Potenza</TabsTrigger>
          <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
          <TabsTrigger value="zones">Zone Training</TabsTrigger>
        </TabsList>

        <TabsContent value="curves" className="space-y-6">
          {/* Power Curve Chart */}
          <Card>
            <CardContent className="p-6">
              <ReactECharts 
                option={powerCurveChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          {/* Tabella Personal Bests dettagliata */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Bests Dettagliati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Durata</th>
                      <th className="text-right p-2">Attuale</th>
                      <th className="text-right p-2">PB All-Time</th>
                      <th className="text-right p-2">Progresso</th>
                      <th className="text-right p-2">W/kg</th>
                      <th className="text-right p-2">% FTP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {powerCurveData.map((data, index) => {
                      const progress = data.current && data.previous 
                        ? ((data.current - data.previous) / data.previous * 100)
                        : null;
                      const wPerKg = data.current ? (data.current / 70).toFixed(1) : null;
                      const ftpPercent = data.current ? Math.round((data.current / currentFTP) * 100) : null;

                      return (
                        <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 font-medium">{data.durationLabel}</td>
                          <td className="text-right p-2">
                            {data.current ? `${data.current} W` : '-'}
                          </td>
                          <td className="text-right p-2">
                            <div className="flex items-center justify-end gap-1">
                              {data.best ? `${data.best} W` : '-'}
                              {data.best && data.current && data.best > data.current && (
                                <Badge variant="outline" className="text-xs">
                                  PB
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-right p-2">
                            {progress !== null && (
                              <span className={`text-xs ${progress >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {progress >= 0 ? '+' : ''}{progress.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="text-right p-2 text-gray-600">
                            {wPerKg ? `${wPerKg} W/kg` : '-'}
                          </td>
                          <td className="text-right p-2 text-gray-600">
                            {ftpPercent ? `${ftpPercent}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardContent className="p-6">
                <ReactECharts 
                  option={powerDistributionChartOptions} 
                  style={{ height: '400px', width: '100%' }} 
                />
              </CardContent>
            </Card>

            {/* Tabella distribuzione */}
            <Card>
              <CardHeader>
                <CardTitle>Tempo per Banda di Potenza</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {powerDistribution.map((band, index) => {
                    const minutes = Math.floor(band.timeSeconds / 60);
                    const seconds = band.timeSeconds % 60;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded border">
                        <span className="font-medium">{band.range}</span>
                        <div className="text-right">
                          <div className="font-semibold">
                            {minutes}:{seconds.toString().padStart(2, '0')}
                          </div>
                          <div className="text-xs text-gray-600">
                            {band.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zone di Allenamento (basate su FTP: {currentFTP}W)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {powerZones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <div className="font-semibold">{zone.zone} - {zone.name}</div>
                        <div className="text-sm text-gray-600">
                          {zone.minWatts} - {zone.maxWatts > 900 ? `${zone.minWatts}+` : zone.maxWatts} W 
                          ({zone.minPercent} - {zone.maxPercent > 900 ? `${zone.minPercent}+` : zone.maxPercent}% FTP)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {Math.floor(zone.timeSeconds / 60)}:{(zone.timeSeconds % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {zone.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 