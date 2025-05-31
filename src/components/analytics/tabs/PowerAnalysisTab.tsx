'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Zap, Target, TrendingUp, Info } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';
import { PB_DURATIONS_SECONDS } from '@/lib/fitnessCalculations';
import { 
  getAthletePowerData, 
  calculatePowerDistribution,
  PowerCurveData,
  PowerDistributionBand,
  PowerZoneData
} from '@/app/athletes/[id]/performanceActions';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PowerAnalysisTabProps {
  athleteId: string;
  athlete: {
    name: string;
    surname: string;
    current_ftp?: number | null;
    weight_kg?: number | null;
  };
}

export default function PowerAnalysisTab({ athleteId, athlete }: PowerAnalysisTabProps) {
  const [powerCurveData, setPowerCurveData] = useState<PowerCurveData[]>([]);
  const [powerDistribution, setPowerDistribution] = useState<PowerDistributionBand[]>([]);
  const [powerZones, setPowerZones] = useState<PowerZoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // mesi
  const [activeSubTab, setActiveSubTab] = useState<'curves' | 'distribution' | 'zones'>('curves');

  // Nuovi stati per la strategia adattiva
  const [actualPeriodUsed, setActualPeriodUsed] = useState<number | null>(null);
  const [adaptiveMessage, setAdaptiveMessage] = useState<string | null>(null);

  // FTP attuale dall'atleta o valore di default
  const currentFTP = athlete.current_ftp || 250;

  useEffect(() => {
    const loadPowerData = async () => {
      setIsLoading(true);
      setError(null);
      setAdaptiveMessage(null);
      
      try {
        // Recupera dati di potenza reali
        const powerResult = await getAthletePowerData(athleteId, selectedPeriod);
        
        if (powerResult.error) {
          setError(powerResult.error);
          return;
        }

        setPowerCurveData(powerResult.powerCurve);
        
        // Gestisci informazioni adattive
        if (powerResult.actualPeriodUsed !== undefined) {
          setActualPeriodUsed(powerResult.actualPeriodUsed);
        }
        if (powerResult.adaptiveMessage) {
          setAdaptiveMessage(powerResult.adaptiveMessage);
        }

        // Calcola distribuzione potenza dall'ultima attività
        const distributionResult = await calculatePowerDistribution(athleteId, undefined, currentFTP);
        
        if (distributionResult.error) {
          console.warn('Errore calcolo distribuzione:', distributionResult.error);
        } else {
          setPowerDistribution(distributionResult.distribution);
          setPowerZones(distributionResult.zones);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setIsLoading(false);
      }
    };

    loadPowerData();
  }, [athleteId, selectedPeriod, currentFTP]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Forza il ricaricamento
    window.location.reload();
  };

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
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                '#8b5cf6', '#ec4899', '#6b7280', '#1f2937'
              ][index % 8]
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [powerDistribution]);

  const powerZonesChartOptions = useMemo(() => {
    if (powerZones.length === 0) return {};

    return {
      title: {
        text: 'Distribuzione Zone di Potenza',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const zone = powerZones[params[0].dataIndex];
          const minutes = Math.floor(zone.timeSeconds / 60);
          return `${zone.zone} - ${zone.name}<br/>Tempo: ${minutes} min<br/>Percentuale: ${zone.percentage.toFixed(1)}%`;
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
        data: powerZones.map(z => z.zone)
      },
      yAxis: {
        type: 'value',
        name: 'Tempo (min)',
        axisLabel: { formatter: '{value} min' }
      },
      series: [
        {
          type: 'bar',
          data: powerZones.map(zone => ({
            value: Math.floor(zone.timeSeconds / 60),
            itemStyle: { color: zone.color }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [powerZones]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Caricamento analisi potenza...</span>
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
    const isNoDataError = error.includes('potenza trovata') || error.includes('tutto lo storico');
    
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Zap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {isNoDataError ? 'Nessun dato di potenza disponibile' : 'Errore nel caricamento'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isNoDataError 
                ? 'Non sono state trovate attività con dati di potenza. Carica attività con powermeter (misuratore di potenza) per vedere le analisi.'
                : error
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

  if (powerCurveData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Zap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nessun dato di potenza disponibile
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Carica alcune attività con dati di potenza per vedere le analisi.
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

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          <h2 className="text-xl font-semibold">Analisi Potenza</h2>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedPeriod.toString()}
            onValueChange={(value) => setSelectedPeriod(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 mesi</SelectItem>
              <SelectItem value="6">6 mesi</SelectItem>
              <SelectItem value="12">12 mesi</SelectItem>
              <SelectItem value="24">2 anni</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messaggio adattivo se il periodo è stato esteso */}
      {adaptiveMessage && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            {adaptiveMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* FTP Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">FTP Attuale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentFTP} W</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">W/kg</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {athlete.weight_kg ? (currentFTP / athlete.weight_kg).toFixed(1) : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs per diverse analisi */}
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
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Personal Bests Dettagliati
              </CardTitle>
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
                      const wPerKg = data.current && athlete.weight_kg 
                        ? (data.current / athlete.weight_kg).toFixed(1) 
                        : null;
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
          {powerDistribution.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione Potenza</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ultima attività con dati di potenza
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <ReactECharts 
                    option={powerDistributionChartOptions} 
                    style={{ height: '400px', width: '100%' }} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {powerDistribution.map((band, index) => (
                      <div key={index} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm font-medium">{band.range}</p>
                        <p className="text-lg font-bold text-blue-600">
                          {Math.floor(band.timeSeconds / 60)}:{(band.timeSeconds % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-xs text-gray-600">{band.percentage.toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Nessun dato di distribuzione potenza disponibile
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          {powerZones.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Zone di Potenza</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Basato su FTP di {currentFTP}W
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <ReactECharts 
                    option={powerZonesChartOptions} 
                    style={{ height: '300px', width: '100%' }} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {powerZones.map((zone, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: zone.color }}
                          ></div>
                          <div>
                            <span className="font-medium">{zone.zone}</span>
                            <span className="text-gray-600 ml-2">{zone.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {zone.minWatts}-{zone.maxWatts === 999 ? '∞' : zone.maxWatts}W
                          </p>
                          <p className="text-xs text-gray-600">
                            {Math.floor(zone.timeSeconds / 60)}min ({zone.percentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Imposta un FTP per vedere le zone di potenza
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 