'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { getActivitiesForPmc, PmcActivity } from '@/app/athletes/[id]/pmcActions'; // Azione Server
import { calculatePmcStats, DailyPmcStats } from '@/lib/fitnessCalculations';   // Funzione di calcolo
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Shadcn UI

interface PmcChartProps {
  athleteId: string;
  initialCtl?: number; // Opzionale, per partire da un CTL diverso da 0
  initialAtl?: number; // Opzionale, per partire da un ATL diverso da 0
}

const PmcChart: React.FC<PmcChartProps> = ({ athleteId, initialCtl = 0, initialAtl = 0 }) => {
  const [pmcData, setPmcData] = useState<DailyPmcStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!athleteId) {
        setIsLoading(false);
        setError('Athlete ID is not provided.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const { data: activities, error: fetchError } = await getActivitiesForPmc(athleteId);
        if (fetchError) {
          throw new Error(fetchError);
        }
        if (activities) {
          const stats = calculatePmcStats(activities, initialCtl, initialAtl);
          setPmcData(stats);
        } else {
          setPmcData([]); // Nessuna attività, imposta dati vuoti
        }
      } catch (err: any) {
        console.error('Failed to load or process PMC data:', err);
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [athleteId, initialCtl, initialAtl]);

  const chartOptions = useMemo(() => {
    if (!pmcData || pmcData.length === 0) {
      return {}; // Opzioni vuote se non ci sono dati
    }

    const dates = pmcData.map(d => d.date);
    const ctlSeries = pmcData.map(d => d.ctl);
    const atlSeries = pmcData.map(d => d.atl);
    const tsbSeries = pmcData.map(d => d.tsb);
    const tssSeries = pmcData.map(d => d.tss);

    // Calcolo dinamico del max per l'asse TSS
    const maxTss = tssSeries.length > 0 ? Math.max(...tssSeries) : 100;
    const tssAxisMax = Math.max(100, Math.ceil((maxTss * 1.15) / 10) * 10);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        data: ['CTL', 'ATL', 'TSB', 'TSS']
      },
      grid: {
        left: '3%',
        right: '15%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: dates
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'CTL / ATL',
          position: 'left',
          axisLine: {
            show: true,
            //lineStyle: { color: '#5470C6' } // Colore per CTL/ATL
          },
          axisLabel: {
            formatter: '{value}'
          }
        },
        {
          type: 'value',
          name: 'TSB',
          position: 'right',
          axisLine: {
            show: true,
            //lineStyle: { color: '#91CC75' } // Colore per TSB
          },
          axisLabel: {
            formatter: '{value}'
          },
          splitLine: { show: false } // Nasconde le griglie per questo asse se troppo affollato
        },
        {
          type: 'value',
          name: 'TSS',
          position: 'right',
          min: 0,
          max: tssAxisMax,
          axisLine: {
            show: true,
           // lineStyle: { color: '#FAC858' } // Colore per TSS
          },
          axisLabel: {
            formatter: '{value}'
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'CTL',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          data: ctlSeries,
          itemStyle: { color: '#5470C6' },
          z: 10
        },
        {
          name: 'ATL',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          data: atlSeries,
          itemStyle: { color: '#EE6666' },
          z: 10
        },
        {
          name: 'TSB',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: tsbSeries,
          itemStyle: { color: '#91CC75' },
          z: 10
        },
        {
          name: 'TSS',
          type: 'bar',
          yAxisIndex: 2,
          data: tssSeries,
          itemStyle: { 
            color: 'rgba(250, 200, 88, 0.6)'
          },
          barWidth: '30%',
          z: 1,
          tooltip: {
            valueFormatter: function (value: number) {
                return value + ' TSS';
            }
          }
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          start: 0,
          end: 100,
          xAxisIndex: [0],
          filterMode: 'filter'
        },
        {
          type: 'inside',
          start: 0,
          end: 100,
          xAxisIndex: [0],
          filterMode: 'filter'
        }
      ],
    };
  }, [pmcData]);

  if (isLoading) {
    return <Card><CardContent><p className="text-center p-4">Caricamento Grafico PMC...</p></CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent><p className="text-center text-red-600 p-4">Errore caricamento PMC: {error}</p></CardContent></Card>;
  }

  if (!pmcData || pmcData.length === 0) {
    return <Card><CardContent><p className="text-center p-4">Nessun dato disponibile per il grafico PMC.</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Management Chart (PMC)</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={chartOptions} style={{ height: '500px', width: '100%' }} />
      </CardContent>
    </Card>
  );
};

export default PmcChart; 