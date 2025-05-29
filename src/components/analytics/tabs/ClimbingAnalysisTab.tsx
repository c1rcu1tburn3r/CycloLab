'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';

interface ClimbingAnalysisTabProps {
  athleteId: string;
  athlete: Athlete;
}

interface ClimbingPerformance {
  climbId: string;
  name: string;
  category: 1 | 2 | 3 | 4 | 'HC';
  distance: number; // km
  elevation: number; // m
  avgGradient: number; // %
  bestTime: number; // secondi
  bestVAM: number; // m/h - Velocità Ascensionale Media
  bestWatts: number;
  bestWPerKg: number;
  attempts: number;
  lastAttempt: string; // ISO date
  trend: 'improving' | 'stable' | 'declining';
}

interface VAMAnalysis {
  category: string;
  averageVAM: number;
  bestVAM: number;
  attempts: number;
  color: string;
  benchmark: number; // VAM di riferimento per categoria
}

interface ClimbingTrends {
  month: string;
  avgVAM: number;
  maxVAM: number;
  climbs: number;
  totalElevation: number;
}

interface SegmentComparison {
  segmentName: string;
  personalTime: number;
  personalVAM: number;
  personalWatts: number;
  komTime: number;
  komVAM: number;
  percentageOff: number;
  rank: number;
  totalAttempts: number;
}

export default function ClimbingAnalysisTab({ athleteId, athlete }: ClimbingAnalysisTabProps) {
  const [climbingPerformances, setClimbingPerformances] = useState<ClimbingPerformance[]>([]);
  const [vamAnalysis, setVamAnalysis] = useState<VAMAnalysis[]>([]);
  const [climbingTrends, setClimbingTrends] = useState<ClimbingTrends[]>([]);
  const [segmentComparisons, setSegmentComparisons] = useState<SegmentComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | '1' | '2' | '3' | '4' | 'HC'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'performance' | 'vam' | 'trends' | 'segments'>('performance');

  useEffect(() => {
    const loadClimbingData = async () => {
      setIsLoading(true);
      
      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Genera dati performance salite mock
      const mockPerformances: ClimbingPerformance[] = [
        {
          climbId: '1',
          name: 'Mortirolo da Mazzo',
          category: 'HC',
          distance: 12.5,
          elevation: 1200,
          avgGradient: 9.6,
          bestTime: 3240, // 54 minuti
          bestVAM: 1333,
          bestWatts: 285,
          bestWPerKg: 4.1,
          attempts: 8,
          lastAttempt: '2024-09-15',
          trend: 'improving'
        },
        {
          climbId: '2',
          name: 'Passo Gavia',
          category: 'HC',
          distance: 17.8,
          elevation: 1240,
          avgGradient: 7.0,
          bestTime: 4680, // 78 minuti
          bestVAM: 952,
          bestWatts: 270,
          bestWPerKg: 3.9,
          attempts: 5,
          lastAttempt: '2024-08-22',
          trend: 'stable'
        },
        {
          climbId: '3',
          name: 'Alpe di Siusi',
          category: 1,
          distance: 11.2,
          elevation: 980,
          avgGradient: 8.8,
          bestTime: 2520, // 42 minuti
          bestVAM: 1400,
          bestWatts: 295,
          bestWPerKg: 4.2,
          attempts: 12,
          lastAttempt: '2024-10-05',
          trend: 'improving'
        },
        {
          climbId: '4',
          name: 'Monte Grappa',
          category: 1,
          distance: 18.5,
          elevation: 1240,
          avgGradient: 6.7,
          bestTime: 3900, // 65 minuti
          bestVAM: 1138,
          bestWatts: 278,
          bestWPerKg: 4.0,
          attempts: 7,
          lastAttempt: '2024-09-30',
          trend: 'improving'
        },
        {
          climbId: '5',
          name: 'Passo Rolle',
          category: 2,
          distance: 19.7,
          elevation: 1080,
          avgGradient: 5.5,
          bestTime: 3420, // 57 minuti
          bestVAM: 1137,
          bestWatts: 265,
          bestWPerKg: 3.8,
          attempts: 6,
          lastAttempt: '2024-07-18',
          trend: 'stable'
        },
        {
          climbId: '6',
          name: 'Muro di Sormano',
          category: 3,
          distance: 2.1,
          elevation: 190,
          avgGradient: 9.1,
          bestTime: 420, // 7 minuti
          bestVAM: 1623,
          bestWatts: 350,
          bestWPerKg: 5.0,
          attempts: 15,
          lastAttempt: '2024-10-12',
          trend: 'improving'
        }
      ];

      // Genera analisi VAM per categoria
      const mockVAMAnalysis: VAMAnalysis[] = [
        { category: 'HC', averageVAM: 1142, bestVAM: 1400, attempts: 13, color: '#dc2626', benchmark: 1200 },
        { category: 'Cat 1', averageVAM: 1269, bestVAM: 1400, attempts: 19, color: '#ea580c', benchmark: 1300 },
        { category: 'Cat 2', averageVAM: 1137, bestVAM: 1137, attempts: 6, color: '#d97706', benchmark: 1100 },
        { category: 'Cat 3', averageVAM: 1623, bestVAM: 1623, attempts: 15, color: '#65a30d', benchmark: 1400 },
        { category: 'Cat 4', averageVAM: 0, bestVAM: 0, attempts: 0, color: '#16a34a', benchmark: 1000 }
      ];

      // Genera trend temporali
      const mockTrends: ClimbingTrends[] = [];
      const monthNames = ['Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov'];
      for (let i = 0; i < 8; i++) {
        mockTrends.push({
          month: monthNames[i],
          avgVAM: 1100 + Math.random() * 200 + i * 20,
          maxVAM: 1300 + Math.random() * 300 + i * 25,
          climbs: Math.round(2 + Math.random() * 4),
          totalElevation: Math.round(2000 + Math.random() * 3000)
        });
      }

      // Genera confronti segmenti mock
      const mockSegments: SegmentComparison[] = [
        {
          segmentName: 'Mortirolo - Last 3km',
          personalTime: 780, // 13 minuti
          personalVAM: 1385,
          personalWatts: 295,
          komTime: 615, // 10:15
          komVAM: 1756,
          percentageOff: 26.8,
          rank: 342,
          totalAttempts: 3200
        },
        {
          segmentName: 'Gavia - Ponte di Legno',
          personalTime: 1680, // 28 minuti
          personalVAM: 971,
          personalWatts: 275,
          komTime: 1380, // 23 minuti
          komVAM: 1183,
          percentageOff: 21.7,
          rank: 158,
          totalAttempts: 1850
        },
        {
          segmentName: 'Alpe Siusi - Final Wall',
          personalTime: 420, // 7 minuti
          personalVAM: 1571,
          personalWatts: 310,
          komTime: 325, // 5:25
          komVAM: 2031,
          percentageOff: 29.2,
          rank: 89,
          totalAttempts: 950
        },
        {
          segmentName: 'Grappa - Via Cadorna',
          personalTime: 2160, // 36 minuti
          personalVAM: 1167,
          personalWatts: 280,
          komTime: 1800, // 30 minuti
          komVAM: 1400,
          percentageOff: 20.0,
          rank: 234,
          totalAttempts: 2100
        }
      ];

      setClimbingPerformances(mockPerformances);
      setVamAnalysis(mockVAMAnalysis);
      setClimbingTrends(mockTrends);
      setSegmentComparisons(mockSegments);
      setIsLoading(false);
    };

    loadClimbingData();
  }, [athleteId]);

  const filteredPerformances = useMemo(() => {
    if (selectedCategory === 'all') return climbingPerformances;
    return climbingPerformances.filter(p => p.category.toString() === selectedCategory);
  }, [climbingPerformances, selectedCategory]);

  const vamChartOptions = useMemo(() => {
    if (vamAnalysis.length === 0) return {};

    const categories = vamAnalysis.filter(v => v.attempts > 0);
    
    return {
      title: {
        text: 'VAM per Categoria Salita',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = categories[params[0].dataIndex];
          return `${data.category}<br/>
                  VAM Media: <strong>${data.averageVAM} m/h</strong><br/>
                  VAM Migliore: <strong>${data.bestVAM} m/h</strong><br/>
                  Benchmark: <strong>${data.benchmark} m/h</strong><br/>
                  Tentativi: <strong>${data.attempts}</strong>`;
        }
      },
      legend: {
        data: ['VAM Media', 'VAM Migliore', 'Benchmark'],
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
        data: categories.map(c => c.category)
      },
      yAxis: {
        type: 'value',
        name: 'VAM (m/h)',
        axisLabel: { formatter: '{value}' }
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
          symbol: 'diamond'
        }
      ]
    };
  }, [vamAnalysis]);

  const trendsChartOptions = useMemo(() => {
    if (climbingTrends.length === 0) return {};

    return {
      title: {
        text: 'Trend Stagionale Climbing',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = climbingTrends[params[0].dataIndex];
          return `${params[0].axisValue}<br/>
                  VAM Media: <strong>${Math.round(data.avgVAM)} m/h</strong><br/>
                  VAM Max: <strong>${Math.round(data.maxVAM)} m/h</strong><br/>
                  Salite: <strong>${data.climbs}</strong><br/>
                  Dislivello: <strong>${data.totalElevation.toLocaleString()} m</strong>`;
        }
      },
      legend: {
        data: ['VAM Media', 'VAM Max', 'Salite', 'Dislivello'],
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
        data: climbingTrends.map(t => t.month)
      },
      yAxis: [
        {
          type: 'value',
          name: 'VAM (m/h)',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Salite / Dislivello',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'VAM Media',
          type: 'line',
          data: climbingTrends.map(t => Math.round(t.avgVAM)),
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'VAM Max',
          type: 'line',
          data: climbingTrends.map(t => Math.round(t.maxVAM)),
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Salite',
          type: 'bar',
          yAxisIndex: 1,
          data: climbingTrends.map(t => t.climbs),
          itemStyle: { color: '#f59e0b', opacity: 0.7 }
        },
        {
          name: 'Dislivello',
          type: 'line',
          yAxisIndex: 1,
          data: climbingTrends.map(t => t.totalElevation / 100), // Scala per visualizzazione
          lineStyle: { width: 2, type: 'dotted' },
          itemStyle: { color: '#8b5cf6' }
        }
      ]
    };
  }, [climbingTrends]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category: ClimbingPerformance['category']) => {
    switch (category) {
      case 'HC': return 'bg-red-100 text-red-800 border-red-200';
      case 1: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 2: return 'bg-amber-100 text-amber-800 border-amber-200';
      case 3: return 'bg-green-100 text-green-800 border-green-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analisi Climbing Performance</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            VAM, categorie salite e confronti segmenti
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(value: string) => setActiveSubTab(value as 'performance' | 'vam' | 'trends' | 'segments')} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="vam">Analisi VAM</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="segments">Segmenti</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Filtri categoria */}
          <div className="flex gap-2">
            {(['all', 'HC', '1', '2', '3', '4'] as const).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'Tutte' : category === 'HC' ? 'Hors Catégorie' : `Cat. ${category}`}
              </Button>
            ))}
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Miglior Tempo</p>
                      <p className="text-lg font-bold text-blue-600">{formatTime(climb.bestTime)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">VAM</p>
                      <p className="text-lg font-bold text-green-600">{climb.bestVAM} m/h</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Potenza</p>
                      <p className="text-lg font-bold text-purple-600">{climb.bestWatts}W</p>
                      <p className="text-xs text-gray-500">{climb.bestWPerKg} W/kg</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tentativi</p>
                      <p className="text-lg font-bold text-orange-600">{climb.attempts}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(climb.lastAttempt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPerformances.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Nessuna salita per questa categoria</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="vam" className="space-y-6">
          <Card>
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
                {vamAnalysis.filter(v => v.attempts > 0).map((analysis, index) => {
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

          <Card>
            <CardHeader>
              <CardTitle>Livelli VAM Interpretativi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-3">VAM per Categoria</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span>Cat 4 (Buono):</span>
                      <span>1000-1200 m/h</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Cat 3 (Molto Buono):</span>
                      <span>1200-1400 m/h</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Cat 2 (Eccellente):</span>
                      <span>1100-1300 m/h</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Cat 1 (Pro Level):</span>
                      <span>1300-1500 m/h</span>
                    </li>
                    <li className="flex justify-between">
                      <span>HC (Elite):</span>
                      <span>1200-1400 m/h</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Note VAM</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• VAM = Velocità Ascensionale Media (m/h)</li>
                    <li>• Dipende da pendenza e durata</li>
                    <li>• Salite brevi: VAM più elevato</li>
                    <li>• Salite lunghe: VAM più sostenuto</li>
                    <li>• Condizioni influenzano il risultato</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <ReactECharts 
                option={trendsChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiche Stagionali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Salite Totali</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {climbingTrends.reduce((sum, t) => sum + t.climbs, 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">VAM Media</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(climbingTrends.reduce((sum, t) => sum + t.avgVAM, 0) / climbingTrends.length)} m/h
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">VAM Migliore</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(Math.max(...climbingTrends.map(t => t.maxVAM)))} m/h
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Dislivello Totale</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.round(climbingTrends.reduce((sum, t) => sum + t.totalElevation, 0) / 1000)}k m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confronti Segmenti Strava</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {segmentComparisons.map((segment, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{segment.segmentName}</h4>
                        <p className="text-sm text-gray-600">
                          Rank: #{segment.rank} di {segment.totalAttempts.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={segment.percentageOff < 20 ? 'default' : segment.percentageOff < 30 ? 'secondary' : 'outline'}>
                        -{segment.percentageOff.toFixed(1)}% dal KOM
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
                        <p className="font-semibold text-green-600">{formatTime(segment.komTime)}</p>
                        <p className="text-xs text-gray-500">{segment.komVAM} m/h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Differenza</p>
                        <p className="font-semibold text-red-600">+{formatTime(segment.personalTime - segment.komTime)}</p>
                        <p className="text-xs text-gray-500">-{segment.komVAM - segment.personalVAM} m/h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Potenza</p>
                        <p className="font-semibold">{segment.personalWatts}W</p>
                        <p className="text-xs text-gray-500">Personal</p>
                      </div>
                    </div>

                    {/* Progress bar per percentuale dal KOM */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso verso KOM</span>
                        <span>{(100 - segment.percentageOff).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${100 - segment.percentageOff}%` }}
                        />
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
                    <li>• Mortirolo Last 3km: Top 300 (mancano 42 posizioni)</li>
                    <li>• Grappa Via Cadorna: Top 200 (mancano 34 posizioni)</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">🔥 Obiettivi Sfida</h4>
                  <ul className="text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Alpe Siusi Final Wall: Top 50 (39 posizioni)</li>
                    <li>• Gavia Ponte di Legno: Top 100 (58 posizioni)</li>
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