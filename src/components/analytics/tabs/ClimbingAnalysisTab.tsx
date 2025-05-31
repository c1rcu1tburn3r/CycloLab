'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Mountain, Target, TrendingUp, AlertCircle } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { 
  analyzeClimbingPerformance,
  type ClimbingPerformance,
  type VAMAnalysis,
  type ClimbingTrends,
  type SegmentComparison,
  type ClimbingAnalysisData
} from '@/app/athletes/[id]/climbingActions';

interface ClimbingAnalysisTabProps {
  athleteId: string;
  athlete: {
  name: string;
    surname: string;
    current_ftp?: number | null;
    weight_kg?: number | null;
  };
}

// Componente skeleton personalizzato
const ClimbingAnalysisSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
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

export default function ClimbingAnalysisTab({ athleteId, athlete }: ClimbingAnalysisTabProps) {
  const [analysisData, setAnalysisData] = useState<ClimbingAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // mesi

  // Carica dati reali di climbing
    const loadClimbingData = async () => {
      setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[ClimbingAnalysisTab] Caricamento analisi climbing per atleta ${athleteId}, periodo ${selectedPeriod}m`);
      
      const result = await analyzeClimbingPerformance(athleteId, selectedPeriod);
      
      if (result.error) {
        setError(result.error);
        console.error('[ClimbingAnalysisTab] Errore server:', result.error);
        return;
      }

      if (!result.data) {
        setError('Nessun dato ricevuto dal server');
        return;
      }

      setAnalysisData(result.data);
      console.log(`[ClimbingAnalysisTab] Analisi caricata: ${result.data.performances.length} salite, ${result.data.vamAnalysis.length} categorie`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento';
      setError(errorMessage);
      console.error('[ClimbingAnalysisTab] Errore caricamento:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClimbingData();
  }, [athleteId, selectedPeriod]);

  const handleRefresh = () => {
    console.log('[ClimbingAnalysisTab] Refresh manuale richiesto');
    loadClimbingData();
  };

  const handlePeriodChange = (value: string) => {
    const newPeriod = parseInt(value);
    console.log(`[ClimbingAnalysisTab] Cambio periodo: ${selectedPeriod}m -> ${newPeriod}m`);
    setSelectedPeriod(newPeriod);
  };

  // Filtra performance per categoria selezionata
  const filteredPerformances = useMemo(() => {
    if (!analysisData?.performances) return [];
    if (selectedCategory === 'all') return analysisData.performances;
    return analysisData.performances.filter(p => p.category.toString() === selectedCategory);
  }, [analysisData?.performances, selectedCategory]);

  const vamChartOptions = useMemo(() => {
    if (!analysisData?.vamAnalysis || analysisData.vamAnalysis.length === 0) return {};

    const categories = analysisData.vamAnalysis.filter(v => v.attempts > 0);
    
    return {
      title: {
        text: 'VAM per Categoria',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const category = categories[params[0].dataIndex];
          if (!category) return '';

          return `${category.category}<br/>
                  VAM Media: <strong>${category.averageVAM} m/h</strong><br/>
                  VAM Migliore: <strong>${category.bestVAM} m/h</strong><br/>
                  Tentativi: <strong>${category.attempts}</strong><br/>
                  Benchmark: <strong>${category.benchmark} m/h</strong>`;
        }
      },
      legend: {
        data: ['VAM Media', 'VAM Migliore', 'Benchmark'],
        bottom: 10
      },
      xAxis: {
        type: 'category',
        data: categories.map(c => c.category)
      },
      yAxis: {
        type: 'value',
        name: 'VAM (m/h)',
        min: 500,
        max: 2000
      },
      series: [
        {
          name: 'VAM Media',
          type: 'bar',
          data: categories.map(c => c.averageVAM),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'VAM Migliore',
          type: 'bar',
          data: categories.map(c => c.bestVAM),
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Benchmark',
          type: 'line',
          data: categories.map(c => c.benchmark),
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#ef4444' },
          symbol: 'diamond',
          symbolSize: 8
        }
      ]
    };
  }, [analysisData?.vamAnalysis]);

  const trendsChartOptions = useMemo(() => {
    if (!analysisData?.trends || analysisData.trends.length === 0) return {};

    return {
      title: {
        text: 'Trend Climbing nel Tempo',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          const data = analysisData.trends[params[0].dataIndex];
          if (!data) return '';

          return `${params[0].axisValue}<br/>
                  VAM Media: <strong>${Math.round(data.avgVAM)} m/h</strong><br/>
                  VAM Max: <strong>${Math.round(data.maxVAM)} m/h</strong><br/>
                  Salite: <strong>${data.climbs}</strong><br/>
                  Dislivello: <strong>${Math.round(data.totalElevation)}m</strong>`;
        }
      },
      legend: {
        data: ['VAM Media', 'VAM Max', 'Salite', 'Dislivello (x100)'],
        bottom: 10
      },
      xAxis: {
        type: 'category',
        data: analysisData.trends.map(t => t.month)
      },
      yAxis: [
        {
          type: 'value',
          name: 'VAM (m/h)',
          position: 'left',
          min: 800,
          max: 1800
        },
        {
          type: 'value',
          name: 'Salite / Dislivello',
          position: 'right',
          min: 0,
          max: 80
        }
      ],
      series: [
        {
          name: 'VAM Media',
          type: 'line',
          data: analysisData.trends.map(t => Math.round(t.avgVAM)),
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'VAM Max',
          type: 'line',
          data: analysisData.trends.map(t => Math.round(t.maxVAM)),
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Salite',
          type: 'bar',
          yAxisIndex: 1,
          data: analysisData.trends.map(t => t.climbs),
          itemStyle: { color: '#f59e0b', opacity: 0.7 }
        },
        {
          name: 'Dislivello (x100)',
          type: 'line',
          yAxisIndex: 1,
          data: analysisData.trends.map(t => t.totalElevation / 100), // Scala per visualizzazione
          lineStyle: { width: 2, type: 'dotted' },
          itemStyle: { color: '#8b5cf6' }
        }
      ]
    };
  }, [analysisData?.trends]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analizzando performance salite...</span>
          </div>
        </div>
        <ClimbingAnalysisSkeleton />
      </div>
    );
  }

  if (error) {
    const isNoDataError = error.includes('Nessuna attività') || error.includes('GPS');
    
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
                ? 'Non sono stati trovati dati GPS per salite nel periodo selezionato. Prova ad estendere il periodo o caricare attività con traccia GPS.'
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
                  onClick={() => setSelectedPeriod(24)}
                  variant="secondary"
                >
                  Estendi a 2 anni
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
            <Mountain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Dati non disponibili
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              L'analisi non ha prodotto risultati. Controlla che le attività abbiano tracce GPS con dati di elevazione.
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
  const totalClimbs = analysisData.trends.reduce((sum, t) => sum + t.climbs, 0);
  const avgVAM = analysisData.trends.length > 0 
    ? Math.round(analysisData.trends.reduce((sum, t) => sum + t.avgVAM, 0) / analysisData.trends.length)
    : 0;
  const bestVAM = analysisData.trends.length > 0 
    ? Math.round(Math.max(...analysisData.trends.map(t => t.maxVAM)))
    : 0;
  const totalElevation = Math.round(analysisData.trends.reduce((sum, t) => sum + t.totalElevation, 0) / 1000);

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Analisi Performance Salite</h2>
          {analysisData.performances.length > 0 && (
            <Badge variant="outline">{analysisData.performances.length} salite</Badge>
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
              <SelectItem value="6">6 mesi</SelectItem>
              <SelectItem value="12">12 mesi</SelectItem>
              <SelectItem value="18">18 mesi</SelectItem>
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

      {/* Overview statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Salite Totali</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalClimbs}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">VAM Media</p>
              <p className="text-2xl font-bold text-green-600">
                {avgVAM} m/h
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">VAM Migliore</p>
              <p className="text-2xl font-bold text-purple-600">
                {bestVAM} m/h
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Dislivello Totale</p>
              <p className="text-2xl font-bold text-orange-600">
                {totalElevation}k m
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="vam">Analisi VAM</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="segments">Segmenti</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Filtro per categoria */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Categoria:</span>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="HC">Hors Catégorie</SelectItem>
                <SelectItem value="1">Categoria 1</SelectItem>
                <SelectItem value="2">Categoria 2</SelectItem>
                <SelectItem value="3">Categoria 3</SelectItem>
                <SelectItem value="4">Categoria 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista performance salite */}
          <div className="grid gap-4">
            {filteredPerformances.map((climb) => (
              <Card key={climb.climbId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div>
                        <h4 className="text-lg font-semibold">{climb.name}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={`text-xs border ${getCategoryColor(climb.category)}`}>
                            {climb.category === 'HC' ? 'Hors Catégorie' : `Categoria ${climb.category}`}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {climb.distance}km • {climb.elevation}m • {climb.avgGradient}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${
                      climb.trend === 'improving' ? 'text-green-600' : 
                      climb.trend === 'declining' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          climb.trend === 'improving' ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" :
                          climb.trend === 'declining' ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" :
                          "M5 12h14"
                        } />
                      </svg>
                      {climb.trend === 'improving' ? 'Migliorando' : 
                       climb.trend === 'declining' ? 'In calo' : 'Stabile'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tempo Migliore</p>
                      <p className="font-semibold">{formatTime(climb.bestTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">VAM</p>
                      <p className="font-semibold text-blue-600">{climb.bestVAM} m/h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Potenza</p>
                      <p className="font-semibold text-green-600">{climb.bestWatts || 'N/D'} W</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">W/kg</p>
                      <p className="font-semibold text-purple-600">{climb.bestWPerKg || 'N/D'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tentativi</p>
                      <p className="font-semibold">{climb.attempts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ultimo</p>
                      <p className="font-semibold">{new Date(climb.lastAttempt).toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vam" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VAM per Categoria</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ReactECharts 
                option={vamChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analisi VAM Dettagliata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisData.vamAnalysis.filter(v => v.attempts > 0).map((analysis, index) => {
                  const isAboveBenchmark = analysis.averageVAM > analysis.benchmark;
                  const percentVsBenchmark = ((analysis.averageVAM - analysis.benchmark) / analysis.benchmark) * 100;
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: analysis.color }}
                        />
                        <div>
                          <h4 className="font-semibold">{analysis.category}</h4>
                          <p className="text-sm text-gray-600">
                            {analysis.attempts} salite completate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {analysis.averageVAM} m/h
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Best: {analysis.bestVAM} m/h</span>
                        </div>
                        <Badge variant={isAboveBenchmark ? 'default' : 'secondary'} className="text-xs mt-1">
                          {isAboveBenchmark ? '+' : ''}{percentVsBenchmark.toFixed(1)}% vs benchmark
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trend Performance Salite</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ReactECharts 
                option={trendsChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confronto Segmenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisData.segments.map((segment, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{segment.segmentName}</h4>
                        <p className="text-sm text-gray-600">
                          Rank: #{segment.rank || 'N/D'} di {segment.totalAttempts.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={
                        segment.percentageOff && segment.percentageOff < 20 ? 'default' : 
                        segment.percentageOff && segment.percentageOff < 30 ? 'secondary' : 'outline'
                      }>
                        {segment.percentageOff ? `-${segment.percentageOff.toFixed(1)}% dal KOM` : 'N/D'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Tempo Personale</p>
                        <p className="font-semibold">{formatTime(segment.personalTime)}</p>
                        <p className="text-xs text-gray-500">{segment.personalVAM} m/h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Tempo KOM</p>
                        <p className="font-semibold text-green-600">
                          {segment.komTime ? formatTime(segment.komTime) : 'N/D'}
                        </p>
                        <p className="text-xs text-gray-500">{segment.komVAM || 'N/D'} m/h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Differenza</p>
                        <p className="font-semibold text-red-600">
                          {segment.komTime ? `+${formatTime(segment.personalTime - segment.komTime)}` : 'N/D'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {segment.komVAM ? `-${segment.komVAM - segment.personalVAM} m/h` : 'N/D'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Potenza</p>
                        <p className="font-semibold text-blue-600">{segment.personalWatts || 'N/D'} W</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Obiettivi Segmenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">🎯 Obiettivi Raggiungibili</h4>
                  <ul className="text-green-700 dark:text-green-400 space-y-1">
                    <li>• Focalizzati su salite con pochi tentativi (&lt; 5)</li>
                    <li>• Migliora la cadenza su pendenze &gt; 8%</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">🔥 Obiettivi Sfida</h4>
                  <ul className="text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Migliora VAM su categorie HC e Cat 1</li>
                    <li>• Target: +5% VAM su salite abituali</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getCategoryColor(category: string | number): string {
  switch (category.toString()) {
    case 'HC': return 'border-red-600 text-red-600 bg-red-50';
    case '1': return 'border-orange-600 text-orange-600 bg-orange-50';
    case '2': return 'border-yellow-600 text-yellow-600 bg-yellow-50';
    case '3': return 'border-green-600 text-green-600 bg-green-50';
    case '4': return 'border-blue-600 text-blue-600 bg-blue-50';
    default: return 'border-gray-600 text-gray-600 bg-gray-50';
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
} 