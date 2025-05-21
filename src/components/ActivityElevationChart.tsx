'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import type { RoutePoint } from '@/lib/types';

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

interface ActivityElevationChartProps {
  routePoints: RoutePoint[];
  onChartHover?: (dataIndex: number | null) => void;
  selectedSegment?: { startIndex: number; endIndex: number } | null;
  onSegmentSelect?: (selection: { startIndex: number; endIndex: number } | null) => void;
  isSegmentActive?: boolean;
  originalStartIndex?: number;
}

// Definisco metricConfig fuori dal componente per accessibilità
const metricConfig: Record<string, { name: string, color: string, unit: string }> = {
  elevation: { name: 'Elevazione', color: '#3b82f6', unit: 'm' },
  speed: { name: 'Velocità', color: '#10b981', unit: 'km/h' },
  heart_rate: { name: 'Freq. Cardiaca', color: '#ef4444', unit: 'bpm' },
  cadence: { name: 'Cadenza', color: '#f97316', unit: 'rpm' },
  power: { name: 'Potenza', color: '#8b5cf6', unit: 'W' },
  grade: { name: 'Pendenza', color: '#d946ef', unit: '%' },
};

const ActivityElevationChart: React.FC<ActivityElevationChartProps> = ({
  routePoints,
  onChartHover,
  selectedSegment,
  onSegmentSelect,
  isSegmentActive = false,
  originalStartIndex = 0
}) => {
  const [chartOptions, setChartOptions] = useState<EChartsOption>({});
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['elevation']);
  const chartRef = useRef<ReactECharts>(null);
  const [selectingSecondPoint, setSelectingSecondPoint] = useState<boolean>(false);
  const [firstPointIndex, setFirstPointIndex] = useState<number | null>(null);
  const [chartClickStatus, setChartClickStatus] = useState<string>('Clicca sul grafico per selezionare il punto iniziale');
  const currentZoomRef = useRef<{start: number, end: number}>({start: 0, end: 100});

  // Aggiorna lo zoom del grafico quando cambia il segmento selezionato
  useEffect(() => {
    if (selectedSegment && routePoints.length > 0) {
      const { startIndex, endIndex } = selectedSegment;
      const startPercent = (startIndex / routePoints.length) * 100;
      const endPercent = (endIndex / routePoints.length) * 100;
      
      // Aggiorna lo zoom del grafico
      const echartsInstance = chartRef.current?.getEchartsInstance();
      if (echartsInstance) {
        echartsInstance.dispatchAction({
          type: 'dataZoom',
          start: startPercent,
          end: endPercent,
        });
      }

      // Reset dello stato di selezione
      setSelectingSecondPoint(false);
      setFirstPointIndex(null);
      setChartClickStatus('Segmento selezionato');
    }
  }, [selectedSegment, routePoints.length]);

  // Aggiornare lo stato dello zoom quando cambia
  const handleZoomChange = useCallback((params: any) => {
    if (params.batch && params.batch.length > 0) {
      currentZoomRef.current = {
        start: params.batch[0].start,
        end: params.batch[0].end
      };
    }
  }, []);

  // Handler per il click sul grafico
  const handleChartClick = useCallback((params: any) => {
    if (!onSegmentSelect || !params.dataIndex) return;
    
    // Salva lo stato dello zoom attuale prima di fare qualsiasi modifica
    const chartInstance = chartRef.current?.getEchartsInstance();
    if (chartInstance) {
      try {
        const options = chartInstance.getOption() as any;
        if (options && options.dataZoom && Array.isArray(options.dataZoom) && options.dataZoom.length > 0) {
          currentZoomRef.current = {
            start: options.dataZoom[0].start || 0,
            end: options.dataZoom[0].end || 100
          };
        }
      } catch (error) {
        console.error('Errore nel recuperare lo zoom attuale:', error);
      }
    }
    
    const clickedIndex = params.dataIndex as number;
    
    if (!selectingSecondPoint) {
      // Primo click - seleziona punto iniziale
      setFirstPointIndex(clickedIndex);
      setSelectingSecondPoint(true);
      setChartClickStatus('Seleziona il punto finale sul grafico');
    } else {
      // Secondo click - seleziona punto finale
      let startIdx = firstPointIndex!;
      let endIdx = clickedIndex;
      
      // Assicura che startIdx < endIdx
      if (endIdx < startIdx) {
        [startIdx, endIdx] = [endIdx, startIdx];
      }
      
      // Applica la selezione
      if (isSegmentActive && originalStartIndex !== undefined) {
        const globalStartIndex = originalStartIndex + startIdx;
        const globalEndIndex = originalStartIndex + endIdx;
        onSegmentSelect({ startIndex: globalStartIndex, endIndex: globalEndIndex });
      } else {
        onSegmentSelect({ startIndex: startIdx, endIndex: endIdx });
      }
      
      // Reset dello stato
      setSelectingSecondPoint(false);
      setFirstPointIndex(null);
      setChartClickStatus('Segmento selezionato');
    }
  }, [selectingSecondPoint, firstPointIndex, onSegmentSelect, isSegmentActive, originalStartIndex]);

  // Generazione delle opzioni del grafico
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

      if (routePoints.some(p => typeof (p as any)[metricKey] === 'number')) {
        const metricColor = currentMetricDef.color;
        
        yAxisConfig.push({
          type: 'value',
          name: `${currentMetricDef.name} (${currentMetricDef.unit})`,
          nameTextStyle: { 
            padding: [0, 0, 0, yAxisIndexCounter > 0 ? 0 : 45],
            align: yAxisIndexCounter > 0 ? 'right' : 'left' 
          },
          position: yAxisIndexCounter % 2 === 0 ? 'left' : 'right',
          offset: yAxisIndexCounter > 1 ? (Math.floor(yAxisIndexCounter / 2)) * 70 : 0, 
          axisLine: { show: true, lineStyle: { color: metricColor } },
          axisLabel: { formatter: `{value}` },
          splitLine: { show: yAxisIndexCounter === 0 },
          min: metricKey === 'elevation' ? (value) => Math.max(0, Math.floor(value.min - Math.max(10, (value.max - value.min) * 0.1))) : undefined,
          max: metricKey === 'elevation' ? (value) => Math.ceil(value.max + Math.max(10, (value.max - value.min) * 0.1)) : undefined,
        });

        seriesData.push({
          name: currentMetricDef.name,
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: metricKey === 'elevation' ? {
            opacity: 0.3,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: metricColor },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ])
          } : undefined,
          yAxisIndex: yAxisIndexCounter, 
          itemStyle: { color: metricColor },
          lineStyle: { color: metricColor, width: 2 },
          data: routePoints.map(p => (p as any)[metricKey] ?? null),
          tooltip: {
            valueFormatter: (value) => {
              if (value == null) return 'N/D';
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

    // Visualizza marker per la selezione attuale
    if (selectingSecondPoint && firstPointIndex !== null) {
      // Aggiungi un marker per il primo punto selezionato
      seriesData.push({
        name: 'Punto Iniziale',
        type: 'scatter',
        symbolSize: 10,
        itemStyle: { color: '#FF3A33', borderWidth: 2, borderColor: '#fff' },
        data: [{
          value: [firstPointIndex, routePoints[firstPointIndex].elevation || 0]
        }]
      });
    }

    // Visualizza markers per il segmento selezionato
    if (selectedSegment) {
      // Aggiungi marker per inizio e fine del segmento selezionato
      seriesData.push({
        name: 'Punti Segmento',
        type: 'scatter',
        symbolSize: 10,
        itemStyle: { color: '#FF4500', borderWidth: 2, borderColor: '#fff' },
        data: [
          { value: [selectedSegment.startIndex - originalStartIndex, routePoints[0].elevation || 0] },
          { value: [selectedSegment.endIndex - originalStartIndex, routePoints[selectedSegment.endIndex - selectedSegment.startIndex].elevation || 0] }
        ]
      });
    }

    const options: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false,
          label: { backgroundColor: '#505765' }
        },
        confine: true,
        enterable: false,
        appendToBody: false,
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0 || routePoints.length === 0) {
            return '';
          }

          const pointIndex = params[0].dataIndex;
          if (pointIndex < 0 || pointIndex >= routePoints.length) {
            return '';
          }
          const routePoint = routePoints[pointIndex];
          
          if (!routePoint) {
            return '';
          }

          let tooltipText = `Distanza: ${params[0].axisValueLabel}<br/>`;

          params.forEach((item: any) => {
            const seriesName = item.seriesName;
            const value = item.value; 
            const marker = item.marker;
            const metricDef = Object.values(metricConfig).find(m => m.name === seriesName);
            const unit = metricDef ? metricDef.unit : '';
            
            if (value !== undefined && value !== null && seriesName && !seriesName.includes('Punto')) {
              let displayValue: number | string;
              let precision = (metricDef?.unit === 'km/h' || metricDef?.unit === '%') ? 1 : 0;

              const metricKey = Object.keys(metricConfig).find(key => metricConfig[key].name === seriesName);

              if (metricKey && routePoint.hasOwnProperty(metricKey) && (routePoint as any)[metricKey] !== undefined && (routePoint as any)[metricKey] !== null) {
                displayValue = (routePoint as any)[metricKey];
              } else {
                displayValue = value;
              }
              
              if (typeof displayValue === 'number') {
                tooltipText += `${marker}${seriesName}: ${displayValue.toFixed(precision)} ${unit}<br/>`;
              } else {
                 tooltipText += `${marker}${seriesName}: ${displayValue} ${unit}<br/>`;
              }
            }
          });

          // Aggiungi sempre la pendenza, se disponibile nel RoutePoint e se non è già mostrata come serie attiva
          const isGradeSeriesActive = params.some((item:any) => item.seriesName === metricConfig.grade.name);
          if (!isGradeSeriesActive && routePoint.grade !== undefined && routePoint.grade !== null) {
            const gradeMetricDef = metricConfig.grade;
            const gradeMarkerColor = gradeMetricDef.color;
            const gradeMarker = `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${gradeMarkerColor};"></span>`;
            tooltipText += `${gradeMarker}${gradeMetricDef.name}: ${routePoint.grade.toFixed(1)} ${gradeMetricDef.unit}<br/>`;
          }
          
          return tooltipText;
        }
      },
      legend: {
        data: seriesData.filter(s => !String(s.name || '').includes('Punto')).map(s => String(s.name || '')),
        bottom: 15,
        selectedMode: 'multiple',
        textStyle: {
          fontSize: 10
        },
        padding: [5, 8, 5, 8],
        itemGap: 8
      },
      grid: {
        left: Math.max(50, yAxisConfig.filter(ax => ax.position === 'left').length * 75),
        right: Math.max(50, yAxisConfig.filter(ax => ax.position === 'right').length * 75),
        top: '15%',
        bottom: '85px',
        containLabel: false, 
      },
      xAxis: {
        type: 'category',
        data: distanceKm,
        axisLabel: { 
          formatter: '{value} km',
          margin: 8,
          hideOverlap: true,
          align: 'center',
          fontSize: 10
        },
        boundaryGap: false,
        position: 'bottom',
        offset: 0,
      },
      yAxis: yAxisConfig.length > 0 ? yAxisConfig : { type: 'value' },
      series: seriesData,
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'filter',
          start: currentZoomRef.current.start,
          end: currentZoomRef.current.end,
          bottom: 45,
          height: 15,
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
          zoomLock: false,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
          z: 15
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'filter',
          disabled: false,
        }
      ],
      toolbox: {
        feature: {
          restore: { title: 'Ripristina' },
          saveAsImage: { title: 'Salva Immagine' }
        },
        right: 20,
        top: 5,
      },
      animationDuration: 750,
      backgroundColor: undefined,
    };
    setChartOptions(options);

  }, [routePoints, selectedMetrics, selectingSecondPoint, firstPointIndex, selectedSegment, originalStartIndex]);

  // Gestione eventi del grafico
  const handleChartEvents = {
    'updateAxisPointer': (event: any) => {
      if (onChartHover) {
        const dataIndex = event.axesInfo && event.axesInfo[0] ? event.axesInfo[0].value : null;
        if (typeof dataIndex === 'number' && !isNaN(dataIndex) && dataIndex >= 0 && dataIndex < routePoints.length) {
          onChartHover(Math.floor(dataIndex));
        } else {
          onChartHover(null);
        }
      }
    },
    
    'mouseout': () => {
      if (onChartHover) {
        onChartHover(null);
      }
    },
    
    'click': handleChartClick,
    
    'datazoom': handleZoomChange
  };

  const handleMetricChange = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const resetSelection = () => {
    setSelectingSecondPoint(false);
    setFirstPointIndex(null);
    setChartClickStatus('Selezione resettata');
    if (onSegmentSelect) onSegmentSelect(null);
  };

  const availableMetrics = ['elevation', 'speed', 'heart_rate', 'cadence', 'power', 'grade'];

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
          ref={chartRef}
          echarts={echarts}
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
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
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md relative">
      <h3 className="text-lg font-semibold mb-3 text-slate-700 flex items-center justify-between relative z-20">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-blue-600">
            <path d="M2 22h20"></path>
            <path d="M7 12l3-3 2 2 5-5h4"></path>
            <path d="M22 8v4h-4"></path>
          </svg>
          Profilo Attività
          {selectedSegment && (
            <span className="text-sm font-normal text-blue-600 ml-2">
              (Tratto selezionato)
            </span>
          )}
        </div>
        
        <div className="flex items-center">
          <div className="text-xs text-blue-600">
            {selectingSecondPoint 
              ? "Seleziona il punto finale" 
              : ""}
          </div>
        </div>
      </h3>
      
      {!selectedSegment && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 bg-white bg-opacity-80 px-3 py-1.5 rounded-b-md shadow-md text-sm font-medium text-slate-700 border border-t-0 border-slate-200">
          Clicca due punti sul grafico per analizzare un segmento
        </div>
      )}
      
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mb-4 border-b pb-3 border-slate-200 relative z-20">
        {availableMetrics.map((metric) => {
          const currentMetricDef = metricConfig[metric];
          if (!currentMetricDef) return null; 
          const metricHasSomeData = routePoints.some(p => typeof (p as any)[metric] === 'number');

          return (
            <label key={metric} className={`flex items-center space-x-1.5 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer text-xs sm:text-sm shadow-sm ${!metricHasSomeData && metric !=='elevation' ? 'opacity-50 cursor-not-allowed' : ''}`}>
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

      <div className="w-full h-[200px] sm:h-[240px] md:h-[270px] lg:h-[290px] cursor-pointer relative z-10">
        {renderContent()}
      </div>

      {/* Pulsante reset posizionato SOTTO il grafico, non più sovrapposto */}
      {(selectingSecondPoint || selectedSegment) && (
        <div className="mt-2 ml-3">
          <button
            onClick={resetSelection}
            className="text-xs px-3 py-1.5 bg-red-600/90 text-white rounded hover:bg-red-700 shadow-sm flex items-center gap-1 z-20"
            title="Azzera selezione"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ActivityElevationChart); 