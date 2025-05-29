'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';

interface PerformanceTrendsTabProps {
  athleteId: string;
  athlete: Athlete;
}

interface ComparisonData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

interface SeasonalData {
  month: string;
  ftp: number;
  volume: number; // ore
  intensity: number;
  peakPower: number;
}

interface ImprovementData {
  category: string;
  currentValue: number;
  startValue: number;
  improvement: number;
  improvementPercent: number;
  unit: string;
  color: string;
}

interface ForecastData {
  date: string;
  actualFTP: number | null;
  predictedFTP: number;
  confidenceMin: number;
  confidenceMax: number;
}

export default function PerformanceTrendsTab({ athleteId, athlete }: PerformanceTrendsTabProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [seasonalData, setSeasonalData] = useState<SeasonalData[]>([]);
  const [improvementData, setImprovementData] = useState<ImprovementData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComparison, setSelectedComparison] = useState<'month' | 'quarter' | 'year'>('month');
  const [activeSubTab, setActiveSubTab] = useState<'comparison' | 'seasonal' | 'improvements' | 'forecast'>('comparison');

  useEffect(() => {
    const loadTrendsData = async () => {
      setIsLoading(true);
      
      // Simula delay API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Genera dati di confronto mock
      const mockComparison: ComparisonData[] = [
        { 
          metric: 'FTP', 
          current: 265, 
          previous: selectedComparison === 'month' ? 258 : selectedComparison === 'quarter' ? 245 : 235,
          change: 0, changePercent: 0, trend: 'up', unit: 'W' 
        },
        { 
          metric: 'Peso', 
          current: 69.5, 
          previous: selectedComparison === 'month' ? 70.2 : selectedComparison === 'quarter' ? 71.0 : 72.5,
          change: 0, changePercent: 0, trend: 'down', unit: 'kg' 
        },
        { 
          metric: 'W/kg', 
          current: 3.81, 
          previous: selectedComparison === 'month' ? 3.68 : selectedComparison === 'quarter' ? 3.45 : 3.24,
          change: 0, changePercent: 0, trend: 'up', unit: '' 
        },
        { 
          metric: 'Ore/Settimana', 
          current: 12.5, 
          previous: selectedComparison === 'month' ? 11.8 : selectedComparison === 'quarter' ? 10.2 : 9.5,
          change: 0, changePercent: 0, trend: 'up', unit: 'h' 
        },
        { 
          metric: 'TSS/Settimana', 
          current: 550, 
          previous: selectedComparison === 'month' ? 485 : selectedComparison === 'quarter' ? 420 : 380,
          change: 0, changePercent: 0, trend: 'up', unit: '' 
        },
        { 
          metric: 'Intensità Media', 
          current: 195, 
          previous: selectedComparison === 'month' ? 188 : selectedComparison === 'quarter' ? 175 : 165,
          change: 0, changePercent: 0, trend: 'up', unit: 'W' 
        }
      ];

      // Calcola change e changePercent
      mockComparison.forEach(item => {
        item.change = item.current - item.previous;
        item.changePercent = ((item.current - item.previous) / item.previous) * 100;
        item.trend = item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'stable';
      });

      // Genera dati stagionali mock (ultimi 12 mesi)
      const mockSeasonal: SeasonalData[] = [];
      const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      const currentMonth = new Date().getMonth();
      
      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth - 11 + i + 12) % 12;
        const baseFTP = 235 + (i * 3) + (Math.sin(i * 0.5) * 10); // Trend crescente con variazione stagionale
        const baseVolume = 8 + (i * 0.4) + (Math.cos(i * 0.4) * 2); // Volume crescente
        
        mockSeasonal.push({
          month: monthNames[monthIndex],
          ftp: Math.round(baseFTP),
          volume: Math.round(baseVolume * 10) / 10,
          intensity: Math.round(baseFTP * 0.7),
          peakPower: Math.round(baseFTP * 2.2)
        });
      }

      // Genera dati miglioramenti mock
      const mockImprovements: ImprovementData[] = [
        { 
          category: 'FTP', 
          currentValue: 265, 
          startValue: 220, 
          improvement: 45, 
          improvementPercent: 20.5,
          unit: 'W',
          color: '#10b981'
        },
        { 
          category: 'Potenza 5min', 
          currentValue: 320, 
          startValue: 285, 
          improvement: 35, 
          improvementPercent: 12.3,
          unit: 'W',
          color: '#3b82f6'
        },
        { 
          category: 'Potenza 1min', 
          currentValue: 425, 
          startValue: 380, 
          improvement: 45, 
          improvementPercent: 11.8,
          unit: 'W',
          color: '#f59e0b'
        },
        { 
          category: 'W/kg FTP', 
          currentValue: 3.81, 
          startValue: 3.14, 
          improvement: 0.67, 
          improvementPercent: 21.3,
          unit: 'W/kg',
          color: '#8b5cf6'
        },
        { 
          category: 'Volume Settimanale', 
          currentValue: 12.5, 
          startValue: 8.2, 
          improvement: 4.3, 
          improvementPercent: 52.4,
          unit: 'h',
          color: '#ef4444'
        }
      ];

      // Genera dati predittivi mock (prossimi 6 mesi)
      const mockForecast: ForecastData[] = [];
      const currentFTP = 265;
      const today = new Date();
      
      for (let i = 0; i <= 180; i += 15) { // Ogni 15 giorni per 6 mesi
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        const monthsAhead = i / 30;
        const growthRate = 0.015; // 1.5% crescita mensile, decrescente nel tempo
        const diminishingReturns = Math.exp(-monthsAhead * 0.2);
        const predictedFTP = currentFTP * (1 + (growthRate * monthsAhead * diminishingReturns));
        
        const confidence = 15 - (monthsAhead * 2); // Confidenza decresce nel tempo
        
        mockForecast.push({
          date: date.toISOString().split('T')[0],
          actualFTP: i === 0 ? currentFTP : null, // Solo valore corrente è "actual"
          predictedFTP: Math.round(predictedFTP),
          confidenceMin: Math.round(predictedFTP - confidence),
          confidenceMax: Math.round(predictedFTP + confidence)
        });
      }

      setComparisonData(mockComparison);
      setSeasonalData(mockSeasonal);
      setImprovementData(mockImprovements);
      setForecastData(mockForecast);
      setIsLoading(false);
    };

    loadTrendsData();
  }, [athleteId, selectedComparison]);

  const seasonalChartOptions = useMemo(() => {
    if (seasonalData.length === 0) return {};

    return {
      title: {
        text: 'Trend Stagionale Performance',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = seasonalData[params[0].dataIndex];
          return `${params[0].axisValue}<br/>
                  FTP: <strong>${data.ftp}W</strong><br/>
                  Volume: <strong>${data.volume}h</strong><br/>
                  Intensità: <strong>${data.intensity}W</strong>`;
        }
      },
      legend: {
        data: ['FTP', 'Volume (h)', 'Intensità Media'],
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
        data: seasonalData.map(d => d.month)
      },
      yAxis: [
        {
          type: 'value',
          name: 'Potenza (W)',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Volume (h)',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'FTP',
          type: 'line',
          data: seasonalData.map(d => d.ftp),
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Volume (h)',
          type: 'line',
          yAxisIndex: 1,
          data: seasonalData.map(d => d.volume),
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: 'Intensità Media',
          type: 'line',
          data: seasonalData.map(d => d.intensity),
          smooth: true,
          lineStyle: { width: 2, type: 'dotted' },
          itemStyle: { color: '#f59e0b' }
        }
      ]
    };
  }, [seasonalData]);

  const forecastChartOptions = useMemo(() => {
    if (forecastData.length === 0) return {};

    const dates = forecastData.map(d => d.date);
    const actualData = forecastData.map(d => d.actualFTP);
    const predictedData = forecastData.map(d => d.predictedFTP);
    const confidenceArea = forecastData.map((d, i) => [i, d.confidenceMin, d.confidenceMax]);

    return {
      title: {
        text: 'Previsione Performance FTP',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = forecastData[params[0].dataIndex];
          const date = new Date(data.date).toLocaleDateString('it-IT');
          let html = `<strong>${date}</strong><br/>`;
          if (data.actualFTP) {
            html += `FTP Attuale: <strong>${data.actualFTP}W</strong><br/>`;
          }
          html += `FTP Previsto: <strong>${data.predictedFTP}W</strong><br/>`;
          html += `Range: ${data.confidenceMin}W - ${data.confidenceMax}W`;
          return html;
        }
      },
      legend: {
        data: ['FTP Attuale', 'FTP Previsto', 'Range Confidenza'],
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
          interval: Math.floor(dates.length / 6)
        }
      },
      yAxis: {
        type: 'value',
        name: 'FTP (W)',
        axisLabel: { formatter: '{value}W' }
      },
      series: [
        {
          name: 'Range Confidenza',
          type: 'line',
          data: predictedData,
          areaStyle: {
            color: 'rgba(59, 130, 246, 0.1)'
          },
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          symbol: 'none'
        },
        {
          name: 'FTP Attuale',
          type: 'scatter',
          data: actualData,
          symbolSize: 8,
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'FTP Previsto',
          type: 'line',
          data: predictedData,
          smooth: true,
          lineStyle: { width: 3, type: 'dashed' },
          itemStyle: { color: '#3b82f6' }
        }
      ]
    };
  }, [forecastData]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analisi Trend Performance</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Confronti temporali e previsioni di sviluppo
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(value: string) => setActiveSubTab(value as 'comparison' | 'seasonal' | 'improvements' | 'forecast')} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">Confronti</TabsTrigger>
          <TabsTrigger value="seasonal">Stagionale</TabsTrigger>
          <TabsTrigger value="improvements">Miglioramenti</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          {/* Controlli periodo */}
          <div className="flex gap-2">
            {(['month', 'quarter', 'year'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedComparison === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedComparison(period)}
              >
                {period === 'month' ? '1 Mese' : period === 'quarter' ? '3 Mesi' : '1 Anno'}
              </Button>
            ))}
          </div>

          {/* Griglia confronti */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonData.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {item.metric}
                    </h4>
                    <div className={`flex items-center gap-1 text-xs ${
                      item.trend === 'up' ? 'text-green-600' : 
                      item.trend === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          item.trend === 'up' ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" :
                          item.trend === 'down' ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" :
                          "M5 12h14"
                        } />
                      </svg>
                      {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {item.current}
                      </span>
                      <span className="text-sm text-gray-500">{item.unit}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Era: {item.previous} {item.unit}
                      </span>
                      <Badge variant={item.trend === 'up' ? 'default' : item.trend === 'down' ? 'destructive' : 'secondary'} className="text-xs">
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(item.unit === 'kg' || item.unit === '' ? 2 : 0)} {item.unit}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights del Periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">Progresso Eccellente</h4>
                  <p className="text-green-700 dark:text-green-400">
                    FTP e W/kg mostrano miglioramenti significativi. Il trend di crescita è sostenibile.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Volume in Crescita</h4>
                  <p className="text-blue-700 dark:text-blue-400">
                    L'aumento del volume di allenamento è ben bilanciato con l'intensità crescente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <ReactECharts 
                option={seasonalChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analisi Stagionale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Trend Principali</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>FTP in crescita costante (+12% YoY)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Volume stagionale stabile</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span>Intensità media incrementale</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Pattern Stagionali</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Inverno:</strong> Focus volume, intensità moderata</li>
                    <li><strong>Primavera:</strong> Build-up progressivo</li>
                    <li><strong>Estate:</strong> Picco intensità e performance</li>
                    <li><strong>Autunno:</strong> Mantenimento e transizione</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Miglioramenti dall&apos;Inizio Stagione</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {improvementData.map((improvement, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-3 h-12 rounded-full" 
                        style={{ backgroundColor: improvement.color }}
                      />
                      <div>
                        <h4 className="font-semibold">{improvement.category}</h4>
                        <p className="text-sm text-gray-600">
                          Da {improvement.startValue} a {improvement.currentValue} {improvement.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        +{improvement.improvementPercent.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">
                        +{improvement.improvement.toFixed(improvement.unit === 'W/kg' ? 2 : 0)} {improvement.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analisi Progressi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">🎯 Obiettivi Raggiunti</h4>
                  <ul className="space-y-1 text-emerald-700 dark:text-emerald-400">
                    <li>• FTP &gt;260W ✓</li>
                    <li>• W/kg &gt;3.8 ✓</li>
                    <li>• Volume &gt;10h/settimana ✓</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📈 Prossimi Target</h4>
                  <ul className="space-y-1 text-blue-700 dark:text-blue-400">
                    <li>• FTP 280W (75% progresso)</li>
                    <li>• W/kg 4.0 (80% progresso)</li>
                    <li>• Potenza 1min &gt;450W</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <ReactECharts 
                option={forecastChartOptions} 
                style={{ height: '400px', width: '100%' }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modello Predittivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Prossimo Mese</h4>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">269W</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">+1.5% previsto</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Prossimi 3 Mesi</h4>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">276W</p>
                  <p className="text-sm text-green-700 dark:text-green-400">+4.2% previsto</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Prossimi 6 Mesi</h4>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">285W</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">+7.5% previsto</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📝 Note sul Modello</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Basato su trend storico e tasso di crescita attuale</li>
                  <li>• Considera rendimenti decrescenti nel tempo</li>
                  <li>• Affidabilità elevata per 1-2 mesi, moderata oltre</li>
                  <li>• Aggiornato automaticamente con nuovi dati</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 