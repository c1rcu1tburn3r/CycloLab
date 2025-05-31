'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, BarChart3, Target, AlertCircle, Info } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { 
  analyzePerformanceTrends,
  type ComparisonData,
  type SeasonalData,
  type ImprovementData,
  type ForecastData,
  type TrendsAnalysisData
} from '@/app/athletes/[id]/trendsActions';

interface PerformanceTrendsTabProps {
  athleteId: string;
  athlete: {
    name: string;
    surname: string;
    current_ftp?: number | null;
    weight_kg?: number | null;
  };
}

// Componente skeleton personalizzato
const TrendsAnalysisSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"></div>
      ))}
    </div>
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-80 rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded-lg"></div>
      ))}
    </div>
  </div>
);

export default function PerformanceTrendsTab({ athleteId, athlete }: PerformanceTrendsTabProps) {
  const [analysisData, setAnalysisData] = useState<TrendsAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [activeSubTab, setActiveSubTab] = useState<'comparison' | 'seasonal' | 'improvements' | 'forecast'>('comparison');
  
  // Nuovi stati per la strategia adattiva
  const [adaptiveMessage, setAdaptiveMessage] = useState<string | null>(null);
  const [actualPeriodUsed, setActualPeriodUsed] = useState<string | null>(null);

  // Carica dati reali di trends
  const loadTrendsData = async () => {
    setIsLoading(true);
    setError(null);
    setAdaptiveMessage(null);
    setActualPeriodUsed(null);
    
    try {
      console.log(`[PerformanceTrendsTab] Caricamento analisi trends per atleta ${athleteId}, confronto ${selectedComparison}`);
      
      const result = await analyzePerformanceTrends(athleteId, selectedComparison);
      
      if (result.error) {
        setError(result.error);
        if (result.adaptiveMessage) {
          setAdaptiveMessage(result.adaptiveMessage);
        }
        console.error('[PerformanceTrendsTab] Errore server:', result.error);
        return;
      }

      if (!result.data) {
        setError('Nessun dato ricevuto dal server');
        return;
      }

      setAnalysisData(result.data);
      
      // Gestisci messaggi adattivi
      if (result.adaptiveMessage) {
        setAdaptiveMessage(result.adaptiveMessage);
      }
      if (result.actualPeriodUsed) {
        setActualPeriodUsed(result.actualPeriodUsed);
      }
      
      console.log(`[PerformanceTrendsTab] Analisi caricata: ${result.data.comparison.length} confronti, ${result.data.seasonal.length} mesi`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento';
      setError(errorMessage);
      console.error('[PerformanceTrendsTab] Errore caricamento:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrendsData();
  }, [athleteId, selectedComparison]);

  const handleRefresh = () => {
    console.log('[PerformanceTrendsTab] Refresh manuale richiesto');
    loadTrendsData();
  };

  const handleComparisonChange = (value: string) => {
    const newComparison = value as 'month' | 'quarter' | 'year';
    console.log(`[PerformanceTrendsTab] Cambio confronto: ${selectedComparison} -> ${newComparison}`);
    setSelectedComparison(newComparison);
  };

  // Grafico dati stagionali
  const seasonalChartOptions = useMemo(() => {
    if (!analysisData?.seasonal || analysisData.seasonal.length === 0) return {};

    const months = analysisData.seasonal.map(s => s.month);
    const ftpData = analysisData.seasonal.map(s => s.ftp);
    const volumeData = analysisData.seasonal.map(s => s.volume);
    const intensityData = analysisData.seasonal.map(s => s.intensity);

    return {
      title: {
        text: 'Trend Stagionali (Ultimi 12 Mesi)',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const dataIndex = params[0].dataIndex;
          const data = analysisData.seasonal[dataIndex];
          
          return `${months[dataIndex]}<br/>
                  FTP: <strong>${data.ftp} W</strong><br/>
                  Volume: <strong>${data.volume} h</strong><br/>
                  Intensità: <strong>${data.intensity} W</strong><br/>
                  Picco: <strong>${data.peakPower} W</strong>`;
        }
      },
      legend: {
        data: ['FTP', 'Volume (h)', 'Intensità'],
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
        data: months
      },
      yAxis: [
        {
          type: 'value',
          name: 'Potenza (W)',
          position: 'left',
          min: function(value: any) { return Math.max(0, value.min - 20); },
          max: function(value: any) { return value.max + 20; }
        },
        {
          type: 'value',
          name: 'Volume (h)',
          position: 'right',
          min: 0,
          max: function(value: any) { return Math.max(20, value.max + 5); }
        }
      ],
      series: [
        {
          name: 'FTP',
          type: 'line',
          data: ftpData,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Intensità',
          type: 'line',
          data: intensityData,
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Volume (h)',
          type: 'bar',
          yAxisIndex: 1,
          data: volumeData,
          itemStyle: { color: '#f59e0b', opacity: 0.7 }
        }
      ]
    };
  }, [analysisData?.seasonal]);

  // Grafico previsioni
  const forecastChartOptions = useMemo(() => {
    if (!analysisData?.forecast || analysisData.forecast.length === 0) return {};

    const dates = analysisData.forecast.map(f => new Date(f.date).toLocaleDateString('it-IT', { month: 'short' }));
    const predictedData = analysisData.forecast.map(f => f.predictedFTP);
    const confidenceMin = analysisData.forecast.map(f => f.confidenceMin);
    const confidenceMax = analysisData.forecast.map(f => f.confidenceMax);

    return {
      title: {
        text: 'Previsione FTP (Prossimi 6 Mesi)',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const dataIndex = params[0].dataIndex;
          const data = analysisData.forecast[dataIndex];
          
          return `${dates[dataIndex]}<br/>
                  FTP Previsto: <strong>${data.predictedFTP} W</strong><br/>
                  Range: <strong>${data.confidenceMin}-${data.confidenceMax} W</strong>`;
        }
      },
      legend: {
        data: ['FTP Previsto', 'Range Confidenza'],
        bottom: 10
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        name: 'FTP (W)',
        min: function(value: any) { return Math.max(0, value.min - 10); },
        max: function(value: any) { return value.max + 10; }
      },
      series: [
        {
          name: 'Range Confidenza',
          type: 'line',
          data: confidenceMax,
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: '#3b82f6',
            opacity: 0.2
          },
          stack: 'confidence'
        },
        {
          name: 'Range Confidenza Min',
          type: 'line',
          data: confidenceMin,
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: '#ffffff',
            opacity: 1
          },
          stack: 'confidence'
        },
        {
          name: 'FTP Previsto',
          type: 'line',
          data: predictedData,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    };
  }, [analysisData?.forecast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analizzando trend performance...</span>
          </div>
        </div>
        <TrendsAnalysisSkeleton />
      </div>
    );
  }

  if (error) {
    const isNoDataError = error.includes('Nessuna attività');
    
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
                ? 'Non sono state trovate attività sufficienti nel periodo corrente per l\'analisi dei trend.'
                : error
              }
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Riprova
              </Button>
              {isNoDataError && (
                <Button 
                  onClick={() => setSelectedComparison('year')}
                  variant="secondary"
                >
                  Confronto Annuale
                </Button>
              )}
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
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Dati non disponibili
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              L'analisi non ha prodotto risultati. Controlla che ci siano attività sufficienti.
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
  const totalComparisons = analysisData.comparison.length;
  const totalImprovements = analysisData.improvements.length;
  const improvingMetrics = analysisData.comparison.filter(c => c.trend === 'up').length;

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Analisi Trend Performance</h2>
          {totalComparisons > 0 && (
            <Badge variant="outline">{totalComparisons} metriche</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedComparison}
            onValueChange={handleComparisonChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">vs 1 Mese Fa</SelectItem>
              <SelectItem value="quarter">vs 3 Mesi Fa</SelectItem>
              <SelectItem value="year">vs 1 Anno Fa</SelectItem>
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

      {/* Messaggio Strategia Adattiva */}
      {adaptiveMessage && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Strategia Adattiva Applicata
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {adaptiveMessage}
              {actualPeriodUsed && actualPeriodUsed !== selectedComparison && (
                <span className="ml-2 font-medium">
                  Periodo effettivo: {actualPeriodUsed}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Overview miglioramenti */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Metriche in Miglioramento</p>
              <p className="text-2xl font-bold text-green-600">
                {improvingMetrics}/{totalComparisons}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Miglioramenti dall'Anno</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalImprovements}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Periodo Confronto</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedComparison === 'month' ? '1 Mese' : 
                 selectedComparison === 'quarter' ? '3 Mesi' : '1 Anno'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner se pochi dati */}
      {(totalComparisons < 3 || analysisData.seasonal.length < 6) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Dati limitati per l'analisi
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Per trend più accurati, sono necessarie più attività nel tempo. Considera di estendere il periodo di analisi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tabs per analisi dettagliate */}
      <Tabs value={activeSubTab} onValueChange={(value) => setActiveSubTab(value as 'comparison' | 'seasonal' | 'improvements' | 'forecast')} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">Confronti</TabsTrigger>
          <TabsTrigger value="seasonal">Stagionali</TabsTrigger>
          <TabsTrigger value="improvements">Miglioramenti</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confronto Metriche Periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisData.comparison.map((metric, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">{metric.metric}</h4>
                      <div className={`flex items-center gap-1 text-sm ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                            metric.trend === 'up' ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" :
                            metric.trend === 'down' ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" :
                            "M5 12h14"
                          } />
                        </svg>
                        {metric.trend === 'up' ? 'In Crescita' : 
                         metric.trend === 'down' ? 'In Calo' : 'Stabile'}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Attuale:</span>
                        <span className="font-medium">{metric.current} {metric.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Precedente:</span>
                        <span>{metric.previous} {metric.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Variazione:</span>
                        <span className={`font-medium ${
                          metric.change > 0 ? 'text-green-600' : 
                          metric.change < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)} {metric.unit}
                          ({metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trend Stagionali</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ReactECharts 
                option={seasonalChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Miglioramenti dall'Inizio Anno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisData.improvements.map((improvement, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: improvement.color }}
                      />
                      <h4 className="font-semibold">{improvement.category}</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Attuale:</span>
                        <span className="font-medium">{improvement.currentValue} {improvement.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inizio Anno:</span>
                        <span>{improvement.startValue} {improvement.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Miglioramento:</span>
                        <span className="font-medium text-green-600">
                          +{improvement.improvement} {improvement.unit}
                          (+{improvement.improvementPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            backgroundColor: improvement.color,
                            width: `${Math.min(100, Math.max(10, improvement.improvementPercent * 2))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {analysisData.improvements.length === 0 && (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nessun miglioramento significativo rilevato dall'inizio anno</p>
                  <p className="text-xs text-gray-400 mt-2">Continua ad allenarti per vedere i progressi!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Previsioni Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {analysisData.forecast.length > 0 ? (
                <ReactECharts 
                  option={forecastChartOptions} 
                  style={{ height: '400px', width: '100%' }} 
                />
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Dati insufficienti per generare previsioni</p>
                  <p className="text-xs text-gray-400 mt-2">Sono necessari almeno 3 mesi di dati per le previsioni</p>
                </div>
              )}
            </CardContent>
          </Card>

          {analysisData.forecast.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Raccomandazioni Basate sui Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">📈 Trend Positivi</h4>
                    <ul className="text-blue-700 dark:text-blue-400 space-y-1">
                      <li>• I tuoi miglioramenti sono in linea con le aspettative</li>
                      <li>• Mantieni la consistenza nell'allenamento</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">🎯 Obiettivi Suggeriti</h4>
                    <ul className="text-green-700 dark:text-green-400 space-y-1">
                      <li>• Focus su volume e intensità bilanciati</li>
                      <li>• Periodizza gli allenamenti per evitare plateau</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 