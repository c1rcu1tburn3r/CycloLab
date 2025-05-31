'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Settings, Target, TrendingUp, BarChart3, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { 
  analyzeCadenceEfficiency, 
  CadenceAnalysisData,
  CadenceZoneData,
  EfficiencyMetric,
  CadenceTrend,
  CadenceRecommendation
} from '@/app/athletes/[id]/cadenceActions';

interface CadenceAnalysisTabProps {
  athleteId: string;
  athlete: {
    name: string;
    surname: string;
    current_ftp?: number | null;
    weight_kg?: number | null;
  };
}

// Componente skeleton personalizzato per le analisi
const CadenceAnalysisSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
    </div>
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-80 rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"></div>
      ))}
    </div>
  </div>
);

export default function CadenceAnalysisTab({ athleteId, athlete }: CadenceAnalysisTabProps) {
  const [analysisData, setAnalysisData] = useState<CadenceAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6); // mesi
  const [activeTab, setActiveTab] = useState<'overview' | 'efficiency' | 'trends' | 'recommendations'>('overview');
  
  // Nuovi stati per la strategia adattiva
  const [actualPeriodUsed, setActualPeriodUsed] = useState<number | null>(null);
  const [adaptiveMessage, setAdaptiveMessage] = useState<string | null>(null);

  // FTP attuale dall'atleta o valore di default
  const currentFTP = athlete.current_ftp || 250;

  // Debounced loading per evitare troppe chiamate API
  const [loadingTimeoutId, setLoadingTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const loadCadenceAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAdaptiveMessage(null);
    
    try {
      console.log(`[CadenceAnalysisTab] Caricamento analisi per atleta ${athleteId}, periodo ${selectedPeriod}m, FTP ${currentFTP}W`);
      
      const result = await analyzeCadenceEfficiency(athleteId, selectedPeriod, currentFTP);
      
      if (result.error) {
        setError(result.error);
        console.error('[CadenceAnalysisTab] Errore server:', result.error);
        return;
      }

      // Validazione dati ricevuti
      if (!result.data) {
        setError('Nessun dato ricevuto dal server');
        return;
      }

      const { data } = result;
      
      // Validazione struttura dati
      if (!Array.isArray(data.efficiencyMetrics) || 
          !Array.isArray(data.cadenceByZone) || 
          !Array.isArray(data.cadenceTrends) || 
          !Array.isArray(data.recommendations)) {
        setError('Dati ricevuti non validi');
        console.error('[CadenceAnalysisTab] Struttura dati non valida:', data);
        return;
      }

      setAnalysisData(data);
      
      // Gestisci informazioni adattive
      if (result.actualPeriodUsed !== undefined) {
        setActualPeriodUsed(result.actualPeriodUsed);
      }
      if (result.adaptiveMessage) {
        setAdaptiveMessage(result.adaptiveMessage);
      }
      
      console.log(`[CadenceAnalysisTab] Analisi caricata: ${data.efficiencyMetrics.length} metriche, ${data.cadenceByZone.length} zone`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento';
      setError(errorMessage);
      console.error('[CadenceAnalysisTab] Errore caricamento:', err);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, selectedPeriod, currentFTP]);

  useEffect(() => {
    // Cancella timeout precedente se esiste
    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
    }

    // Debounce di 300ms per evitare troppe chiamate API
    const timeoutId = setTimeout(() => {
      loadCadenceAnalysis();
    }, 300);

    setLoadingTimeoutId(timeoutId);

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadCadenceAnalysis]);

  const handleRefresh = useCallback(() => {
    console.log('[CadenceAnalysisTab] Refresh manuale richiesto');
    loadCadenceAnalysis();
  }, [loadCadenceAnalysis]);

  const handlePeriodChange = useCallback((value: string) => {
    const newPeriod = parseInt(value);
    console.log(`[CadenceAnalysisTab] Cambio periodo: ${selectedPeriod}m -> ${newPeriod}m`);
    setSelectedPeriod(newPeriod);
  }, [selectedPeriod]);

  // Validazione dati per grafici con gestione errori
  const validateChartData = useCallback((data: any[], minLength: number = 1): boolean => {
    return Array.isArray(data) && data.length >= minLength;
  }, []);

  // Grafico efficienza per fasce di cadenza
  const efficiencyChartOptions = useMemo(() => {
    if (!analysisData?.efficiencyMetrics || !validateChartData(analysisData.efficiencyMetrics)) {
      return {};
    }

    const metrics = analysisData.efficiencyMetrics;
    const cadenceRanges = metrics.map(m => m.cadenceRange);
    const efficiencyData = metrics.map(m => parseFloat(m.efficiency.toFixed(2)));
    const sustainabilityData = metrics.map(m => m.sustainabilityIndex);

    return {
      title: {
        text: 'Efficienza Pedalata per Cadenza',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const metric = metrics[params[0].dataIndex];
          if (!metric) return '';

          return `${metric.cadenceRange}<br/>
                  Efficienza: <strong>${metric.efficiency.toFixed(2)} W/rpm</strong><br/>
                  Potenza Media: <strong>${metric.averagePower.toFixed(0)} W</strong><br/>
                  Tempo Totale: <strong>${metric.timeSpent} min</strong><br/>
                  Sostenibilità: <strong>${metric.sustainabilityIndex}%</strong>`;
        }
      },
      legend: {
        data: ['Efficienza (W/rpm)', 'Sostenibilità (%)'],
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
        data: cadenceRanges,
        axisLabel: { interval: 0, rotate: 45 }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Efficienza (W/rpm)',
          position: 'left',
          axisLabel: { formatter: '{value}' }
        },
        {
          type: 'value',
          name: 'Sostenibilità (%)',
          position: 'right',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series: [
        {
          name: 'Efficienza (W/rpm)',
          type: 'bar',
          data: efficiencyData,
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Sostenibilità (%)',
          type: 'line',
          yAxisIndex: 1,
          data: sustainabilityData,
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  }, [analysisData, validateChartData]);

  // Grafico cadenza per zone di potenza
  const zoneChartOptions = useMemo(() => {
    if (!analysisData?.cadenceByZone || !validateChartData(analysisData.cadenceByZone)) {
      return {};
    }

    const zones = analysisData.cadenceByZone.map(z => z.powerZone);
    const actualCadence = analysisData.cadenceByZone.map(z => z.averageCadence);
    const optimalCadence = analysisData.cadenceByZone.map(z => z.optimalCadence);

    return {
      title: {
        text: 'Cadenza per Zone di Potenza',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const zone = analysisData.cadenceByZone[params[0].dataIndex];
          if (!zone) return '';

          return `${zone.powerZone} - ${zone.zoneName}<br/>
                  Cadenza Attuale: <strong>${zone.averageCadence} rpm</strong><br/>
                  Cadenza Ottimale: <strong>${zone.optimalCadence} rpm</strong><br/>
                  Range Potenza: <strong>${zone.minWatts}-${zone.maxWatts} W</strong><br/>
                  Efficienza: <strong>${zone.efficiency.toFixed(2)} W/rpm</strong><br/>
                  Campioni: <strong>${zone.sampleSize}</strong>`;
        }
      },
      legend: {
        data: ['Cadenza Attuale', 'Cadenza Ottimale'],
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
        data: zones
      },
      yAxis: {
        type: 'value',
        name: 'Cadenza (rpm)',
        min: 70,
        max: 110,
        axisLabel: { formatter: '{value} rpm' }
      },
      series: [
        {
          name: 'Cadenza Attuale',
          type: 'bar',
          data: actualCadence,
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Cadenza Ottimale',
          type: 'line',
          data: optimalCadence,
          lineStyle: { width: 3, type: 'dashed' },
          itemStyle: { color: '#ef4444' },
          symbol: 'diamond',
          symbolSize: 8
        }
      ]
    };
  }, [analysisData, validateChartData]);

  // Grafico trend nel tempo
  const trendChartOptions = useMemo(() => {
    if (!analysisData?.cadenceTrends || !validateChartData(analysisData.cadenceTrends)) {
      return {};
    }

    const trends = analysisData.cadenceTrends;
    const dates = trends.map(t => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getFullYear()}`;
    });
    const actualCadence = trends.map(t => t.averageCadence);
    const efficiency = trends.map(t => parseFloat(t.efficiency.toFixed(2)));

    return {
      title: {
        text: 'Trend Cadenza nel Tempo',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const trend = trends[params[0].dataIndex];
          if (!trend) return '';

          return `${dates[params[0].dataIndex]}<br/>
                  Cadenza Media: <strong>${trend.averageCadence} rpm</strong><br/>
                  Efficienza: <strong>${trend.efficiency.toFixed(2)} W/rpm</strong><br/>
                  Potenza Media: <strong>${trend.powerOutput} W</strong>`;
        }
      },
      legend: {
        data: ['Cadenza Media', 'Efficienza'],
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
        data: dates
      },
      yAxis: [
        {
          type: 'value',
          name: 'Cadenza (rpm)',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Efficienza (W/rpm)',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'Cadenza Media',
          type: 'line',
          data: actualCadence,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Efficienza',
          type: 'line',
          yAxisIndex: 1,
          data: efficiency,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  }, [analysisData, validateChartData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analizzando efficienza cadenza...</span>
          </div>
        </div>
        <CadenceAnalysisSkeleton />
      </div>
    );
  }

  if (error) {
    const isNoDataError = error.includes('cadenza trovata') || error.includes('tutto lo storico');
    
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {isNoDataError ? 'Nessun dato disponibile' : 'Errore nell\'analisi'}
            </h3>
            <p className="text-red-600 mb-4 max-w-md mx-auto">
              {isNoDataError 
                ? 'Non sono stati trovati dati di cadenza e potenza. Carica attività con powermeter (misuratore di potenza) per abilitare questa analisi.'
                : error
              }
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Riprova
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Dati non disponibili
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              L'analisi non ha prodotto risultati. Controlla che le attività abbiano dati di cadenza e potenza.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Ricarica
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcolo statistiche summary
  const totalMetrics = analysisData.efficiencyMetrics.length;
  const totalZones = analysisData.cadenceByZone.length;
  const totalRecommendations = analysisData.recommendations.length;
  const hasOptimalCadence = analysisData.optimalCadence !== null;

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Analisi Efficienza Cadenza</h2>
          {totalMetrics > 0 && (
            <Badge variant="outline">{totalMetrics} metriche</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedPeriod.toString()}
            onValueChange={handlePeriodChange}
            disabled={isLoading}
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
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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

      {/* Cadenza ottimale overview con info aggiuntive */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cadenza Ottimale</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {hasOptimalCadence ? analysisData.optimalCadence : '-'} 
                  <span className="text-lg font-normal ml-1">rpm</span>
                </p>
                {hasOptimalCadence && (
                  <p className="text-xs text-gray-500 mt-1">
                    Basata su {totalMetrics} fasce di cadenza
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Zone Analizzate</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {totalZones}/6
              </p>
              <p className="text-xs text-gray-500 mt-1">
                FTP: {currentFTP}W
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner se pochi dati */}
      {(totalMetrics < 3 || totalZones < 3) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Dati limitati per l'analisi
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Per risultati più accurati, carica più attività con dati di cadenza o estendi il periodo di analisi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tabs per analisi dettagliate */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="efficiency">Efficienza</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="recommendations">
            Raccomandazioni
            {totalRecommendations > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalRecommendations}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Zone di potenza */}
          <Card>
            <CardHeader>
              <CardTitle>Cadenza per Zone di Potenza</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ReactECharts 
                option={zoneChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          {/* Tabella dettagli zone */}
          <Card>
            <CardHeader>
              <CardTitle>Dettagli per Zona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Zona</th>
                      <th className="text-right p-2">Range Potenza</th>
                      <th className="text-right p-2">Cadenza Attuale</th>
                      <th className="text-right p-2">Cadenza Ottimale</th>
                      <th className="text-right p-2">Efficienza</th>
                      <th className="text-right p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.cadenceByZone.map((zone, index) => {
                      const isOptimal = Math.abs(zone.averageCadence - zone.optimalCadence) <= 3;
                      
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 font-medium">{zone.powerZone} - {zone.zoneName}</td>
                          <td className="text-right p-2">{zone.minWatts}-{zone.maxWatts}W</td>
                          <td className="text-right p-2">{zone.averageCadence} rpm</td>
                          <td className="text-right p-2">{zone.optimalCadence} rpm</td>
                          <td className="text-right p-2">{zone.efficiency.toFixed(2)} W/rpm</td>
                          <td className="text-right p-2">
                            <Badge variant={isOptimal ? 'default' : 'secondary'}>
                              {isOptimal ? 'Ottimale' : 'Da Migliorare'}
                            </Badge>
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

        <TabsContent value="efficiency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Efficienza per Fasce di Cadenza</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ReactECharts 
                option={efficiencyChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metriche di Efficienza</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisData.efficiencyMetrics.map((metric, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{metric.cadenceRange}</h4>
                      <Badge variant="outline">{metric.timeSpent} min</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Efficienza:</span>
                        <span className="font-medium">{metric.efficiency.toFixed(2)} W/rpm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Potenza Media:</span>
                        <span>{metric.averagePower.toFixed(0)} W</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sostenibilità:</span>
                        <span>{metric.sustainabilityIndex}%</span>
                      </div>
                      {metric.heartRateImpact && (
                        <div className="flex justify-between">
                          <span>FC Media:</span>
                          <span>{metric.heartRateImpact.toFixed(0)} bpm</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evoluzione Cadenza nel Tempo</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ReactECharts 
                option={trendChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid gap-4">
            {analysisData.recommendations.map((rec, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rec.type === 'training' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      rec.type === 'race' ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      {rec.type === 'training' ? (
                        <TrendingUp className={`w-5 h-5 ${
                          rec.type === 'training' ? 'text-blue-600' :
                          rec.type === 'race' ? 'text-red-600' : 'text-green-600'
                        }`} />
                      ) : rec.type === 'race' ? (
                        <Target className="w-5 h-5 text-red-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge variant={
                          rec.type === 'training' ? 'default' :
                          rec.type === 'race' ? 'destructive' : 'outline'
                        }>
                          {rec.type === 'training' ? 'Allenamento' :
                           rec.type === 'race' ? 'Gara' : 'Recupero'}
                        </Badge>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">{rec.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Target:</span>
                          <span className="font-medium ml-2">{rec.targetCadence} rpm</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Durata:</span>
                          <span className="font-medium ml-2">{rec.duration}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                        {rec.rationale}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 