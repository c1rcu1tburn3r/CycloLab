'use client';

import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { UniversalTransition } from 'echarts/features';
import type { EChartsOption, SeriesOption, YAXisComponentOption } from 'echarts';
import type { RoutePoint } from '@/lib/types'; // Importa RoutePoint

// Registra i componenti ECharts necessari
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  LineChart,
  BarChart,
  CanvasRenderer,
  UniversalTransition,
]);

// L'interfaccia RoutePoint è stata spostata in @/lib/types

interface ActivityElevationChartProps {
  routePoints: RoutePoint[];
}

// Definisco metricConfig fuori dal componente per accessibilità e per evitare ridefinizioni
const metricConfig: Record<string, { name: string, color: string, unit: string, yAxisIndex?: number }> = {
  elevation: { name: 'Elevazione', color: '#3b82f6', unit: 'm' },
  speed: { name: 'Velocità', color: '#10b981', unit: 'km/h' },
  heart_rate: { name: 'Freq. Cardiaca', color: '#ef4444', unit: 'bpm' },
  cadence: { name: 'Cadenza', color: '#f97316', unit: 'rpm' },
  power: { name: 'Potenza', color: '#8b5cf6', unit: 'W' },
};

const ActivityElevationChart: React.FC<ActivityElevationChartProps> = ({
  routePoints,
}) => {
  const [chartOptions, setChartOptions] = useState<EChartsOption>({});
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['elevation']);

  // Log per debuggare i routePoints in ingresso
  useEffect(() => {
    console.log('[ActivityElevationChart] Received routePoints:', routePoints);
  }, [routePoints]);

  useEffect(() => {
    if (!routePoints || routePoints.length < 2) {
      setChartOptions({
        title: {
          text: 'Dati non sufficienti per il grafico',
          left: 'center',
          top: 'center',
          textStyle: { color: '#4b5563', fontSize: 16 },
        },
      });
      return;
    }

    const distanceKm = routePoints.map(p => parseFloat((p.distance! / 1000).toFixed(2)));
    const seriesData: SeriesOption[] = [];
    const yAxisConfig: YAXisComponentOption[] = [];
    let yAxisIndexCounter = 0;

    selectedMetrics.forEach(metricKey => {
      const currentMetricDef = metricConfig[metricKey];
      if (!currentMetricDef) return;

      // Modifica: Usa .some() invece di .every() per includere la serie se almeno alcuni dati sono validi
      if (routePoints.some(p => typeof (p as any)[metricKey] === 'number')) {
        const metricColor = currentMetricDef.color;
        
        yAxisConfig.push({
          type: 'value',
          name: `${currentMetricDef.name} (${currentMetricDef.unit})`,
          nameTextStyle: { 
            padding: [0, 0, 0, yAxisIndexCounter > 0 ? 0 : 45], // Aumentato padding per nome asse Y a sinistra
            align: yAxisIndexCounter > 0 ? 'right' : 'left' 
          },
          position: yAxisIndexCounter % 2 === 0 ? 'left' : 'right',
          offset: yAxisIndexCounter > 1 ? (Math.floor(yAxisIndexCounter / 2)) * 70 : 0, 
          axisLine: { show: true, lineStyle: { color: metricColor } },
          axisLabel: { 
            formatter: `{value}`
          },
          splitLine: { show: yAxisIndexCounter === 0 },
          min: metricKey === 'elevation' ? (value) => Math.max(0, Math.floor(value.min - Math.max(10, (value.max - value.min) * 0.1))) : undefined,
          max: metricKey === 'elevation' ? (value) => Math.ceil(value.max + Math.max(10, (value.max - value.min) * 0.1)) : undefined,
        });

        seriesData.push({
          name: currentMetricDef.name,
          type: 'line',
          smooth: true,
          showSymbol: false,
          yAxisIndex: yAxisIndexCounter, 
          itemStyle: { color: metricColor },
          lineStyle: { color: metricColor, width: 2 },
          // ECharts gestirà i valori 'undefined' o 'null' nei dati come punti mancanti
          data: routePoints.map(p => (p as any)[metricKey] ?? null), // Usa ?? null per coerenza con ECharts
          tooltip: {
            valueFormatter: (value) => {
              if (value == null) return 'N/D'; // Gestisce valori null nel tooltip
              const numValue = value as number;
              return `${numValue.toFixed(currentMetricDef.unit === 'km/h' ? 1 : 0)} ${currentMetricDef.unit}`;
            }
          }
        });
        yAxisIndexCounter++;
      }
    });

    if (seriesData.length === 0) {
      setChartOptions({
        title: {
          text: selectedMetrics.length > 0 ? 'Dati non disponibili per le metriche selezionate.' : 'Nessuna metrica selezionata.',
          left: 'center',
          top: 'center',
          textStyle: { color: '#4b5563', fontSize: 16 },
        },
      });
      return;
    }

    const options: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false,
          label: { backgroundColor: '#505765' }
        },
      },
      legend: {
        data: seriesData.map(s => String(s.name || '')),
        bottom: 10,
        selectedMode: 'multiple',
      },
      grid: {
        left: Math.max(50, yAxisConfig.filter(ax => ax.position === 'left').length * 75), // Aumentato moltiplicatore per più spazio
        right: Math.max(50, yAxisConfig.filter(ax => ax.position === 'right').length * 75),
        top: '12%',
        bottom: '25%',
        containLabel: false, 
      },
      xAxis: {
        type: 'category',
        data: distanceKm,
        axisLabel: { formatter: '{value} km' },
        boundaryGap: false,
      },
      yAxis: yAxisConfig.length > 0 ? yAxisConfig : { type: 'value' },
      series: seriesData,
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'filter',
          start: 0,
          end: 100,
          bottom: 50,
          height: 20,
          dataBackground: { 
            lineStyle: { color: '#8392A5', width: 0.5 },
            areaStyle: { color: 'rgba(131,146,165,0.3)' }
          },
          selectedDataBackground: {
            lineStyle: { color: '#2962FF', width: 1 },
            areaStyle: { color: 'rgba(41,98,255,0.3)' }
          },
          fillerColor: 'rgba(41,98,255,0.15)',
          borderColor: '#ddd',
          handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          handleSize: '80%',
          handleStyle: { color: '#fff', shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.6)', shadowOffsetX: 2, shadowOffsetY: 2 },
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'filter',
          start: 0,
          end: 100,
        },
      ],
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: 'none', title: { zoom: 'Zoom Area', back: 'Resetta Zoom' } },
          restore: { title: 'Ripristina' },
          saveAsImage: { title: 'Salva Immagine' }
        },
        right: 20,
        top: 5,
      },
      animationDuration: 750,
    };
    setChartOptions(options);

  }, [routePoints, selectedMetrics]);

  const handleChartEvents = {
    /* // Temporaneamente commentato per testare lo zoom nativo
    datazoom: (params: any) => {
      if (onBrush && params.batch && params.batch.length > 0) {
        const dataZoomEvent = params.batch[0];
        let startIndex: number | undefined;
        let endIndex: number | undefined;

        if (dataZoomEvent.startValue !== undefined && dataZoomEvent.endValue !== undefined) {
          startIndex = Math.floor(dataZoomEvent.startValue);
          endIndex = Math.ceil(dataZoomEvent.endValue);
        } else if (dataZoomEvent.start !== undefined && dataZoomEvent.end !== undefined) {
          const totalPoints = routePoints.length;
          startIndex = Math.floor(totalPoints * (dataZoomEvent.start / 100));
          endIndex = Math.ceil(totalPoints * (dataZoomEvent.end / 100)) - 1;
          if (endIndex < startIndex) endIndex = startIndex; 
        }

        if (startIndex !== undefined && endIndex !== undefined && startIndex <= endIndex && endIndex < routePoints.length) {
          onBrush(startIndex, endIndex);
        }
      }
    },
    */
  };

  const availableMetrics = ['elevation', 'speed', 'heart_rate', 'cadence', 'power'];

  const handleMetricChange = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  if (!routePoints || routePoints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] flex items-center justify-center">
        <p className="text-gray-500">Dati non disponibili per il grafico.</p>
      </div>
    );
  }

  const renderContent = () => {
    if (chartOptions.title && 'text' in chartOptions.title && typeof chartOptions.title.text === 'string') {
      const titleText = chartOptions.title.text;
      if (titleText.startsWith('Dati non sufficienti') || 
          titleText.startsWith('Dati non disponibili per le metriche selezionate') || 
          titleText.startsWith('Nessuna metrica selezionata')) {
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <p className="text-gray-600 mb-4 text-center px-4">{titleText}</p>
          </div>
        );
      }
    }

    if (Object.keys(chartOptions).length > 0 && (!chartOptions.title || !('text' in chartOptions.title))) {
      return (
        <ReactECharts
          echarts={echarts}
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
          onEvents={handleChartEvents}
        />
      );
    }
    
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Caricamento grafico...</p>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-slate-700">Profilo Attività</h3>
      
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mb-4 border-b pb-3 border-slate-200">
        {availableMetrics.map((metric) => {
          const currentMetricDef = metricConfig[metric];
          if (!currentMetricDef) return null; 
          const metricHasSomeData = routePoints.some(p => typeof (p as any)[metric] === 'number');

          return (
            <label key={metric}  className={`flex items-center space-x-1.5 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer text-xs sm:text-sm shadow-sm ${!metricHasSomeData && metric !=='elevation' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric)}
                onChange={() => handleMetricChange(metric)}
                disabled={!metricHasSomeData && metric !=='elevation'}
                className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 transition duration-150 ease-in-out rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="text-slate-700">{currentMetricDef.name}</span>
            </label>
          );
        })}
      </div>

      <div className="w-full h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default ActivityElevationChart; 