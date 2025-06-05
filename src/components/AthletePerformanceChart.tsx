'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { type EChartsOption } from 'echarts';
import { type AthleteProfileEntry } from '@/lib/types'; // Assicurati che il percorso sia corretto
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Checkbox } from "@/components/ui/checkbox"; // Importa Checkbox
import { Label } from "@/components/ui/label";   // Importa Label
import { spacing } from '@/lib/design-system';
import { CardContent } from "@/components/ui/card";

interface AthletePerformanceChartProps {
  profileEntries: AthleteProfileEntry[];
}

interface SeriesVisibility {
  peso: boolean;
  ftp: boolean;
  wPerKg: boolean;
}

const AthletePerformanceChart: React.FC<AthletePerformanceChartProps> = ({ profileEntries }) => {
  const [seriesVisibility, setSeriesVisibility] = useState<SeriesVisibility>({
    peso: true,
    ftp: true,
    wPerKg: true,
  });

  // Stato per il tema dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Rileva il tema dark mode solo nel browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkDarkMode = () => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      };
      
      // Controlla inizialmente
      checkDarkMode();
      
      // Osserva i cambiamenti del tema
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      return () => observer.disconnect();
    }
  }, []);

  if (!profileEntries || profileEntries.length === 0) {
    return <p className={`text-sm text-slate-500 p-4 text-center ${spacing.bottom.md}`}>Nessun dato disponibile per il grafico.</p>;
  }

  const sortedEntries = [...profileEntries].sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());

  const dates = sortedEntries.map(entry => format(new Date(entry.effective_date), 'dd MMM yy', { locale: it }));
  const weightsData = sortedEntries.map(entry => entry.weight_kg);
  const ftpsData = sortedEntries.map(entry => entry.ftp_watts);
  const wPerKgData = sortedEntries.map(entry => {
    if (entry.ftp_watts && entry.weight_kg && entry.weight_kg > 0) {
      return parseFloat((entry.ftp_watts / entry.weight_kg).toFixed(2));
    }
    return null;
  });

  const handleVisibilityChange = (seriesName: keyof SeriesVisibility) => {
    setSeriesVisibility(prev => ({ ...prev, [seriesName]: !prev[seriesName] }));
  };

  const activeSeries = [];
  const легендаData = []; // Uso 'легендаData' per evitare conflitto con var globale in alcuni env.

  if (seriesVisibility.peso) {
    activeSeries.push({
      name: 'Peso',
      type: 'line' as 'line',
      yAxisIndex: 0, 
      data: weightsData,
      smooth: true,
      itemStyle: { color: '#5470C6' },
      connectNulls: true,
    });
    легендаData.push('Peso');
  }
  if (seriesVisibility.ftp) {
    activeSeries.push({
      name: 'FTP',
      type: 'line' as 'line',
      yAxisIndex: 1, 
      data: ftpsData,
      smooth: true,
      itemStyle: { color: '#EE6666' },
      connectNulls: true,
    });
    легендаData.push('FTP');
  }
  if (seriesVisibility.wPerKg) {
    activeSeries.push({
      name: 'W/kg',
      type: 'line' as 'line',
      yAxisIndex: 2, 
      data: wPerKgData,
      smooth: true,
      itemStyle: { color: '#91CC75' },
      connectNulls: true,
    });
    легендаData.push('W/kg');
  }

  // Usa lo stato invece di accedere direttamente a document
  const textColor = isDarkMode ? '#e2e8f0' : '#374151';
  const backgroundColor = isDarkMode ? 'transparent' : 'transparent';

  const option: EChartsOption = {
    backgroundColor: backgroundColor,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
      formatter: (params: any) => {
        let tooltipText = params.length > 0 ? `${params[0].axisValueLabel}<br/>` : '';
        params.forEach((param: any) => {
          if (param.value !== null && param.value !== undefined) {
            let unit = '';
            if (param.seriesName === 'Peso') unit = 'kg';
            else if (param.seriesName === 'FTP') unit = 'W';
            else if (param.seriesName === 'W/kg') unit = 'W/kg';
            tooltipText += `${param.marker} ${param.seriesName}: <strong>${param.value}</strong> ${unit}<br/>`;
          }
        });
        return tooltipText;
      }
    },
    legend: {
      data: легендаData,
      bottom: 10,
      textStyle: {
        color: textColor
      }
      // Potremmo nasconderla se i toggle sono sufficienti: show: false
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: dates,
        axisPointer: { type: 'shadow' },
        axisLabel: {
          color: textColor
        },
        axisLine: {
          lineStyle: {
            color: textColor
          }
        }
      }
    ],
    yAxis: [
      { // Peso
        type: 'value',
        name: 'Peso (kg)',
        position: 'left',
        offset: 0,
        min: seriesVisibility.peso ? undefined : 0, // Prova a minimizzare l'impatto sulla scala se non visibile
        max: seriesVisibility.peso ? undefined : 1, // Prova a minimizzare l'impatto sulla scala se non visibile
        nameTextStyle: {
          color: textColor
        },
        axisLine: { show: seriesVisibility.peso, lineStyle: { color: '#5470C6' } },
        axisLabel: { formatter: '{value} kg', show: seriesVisibility.peso, color: textColor },
        splitLine: { show: true, }
      },
      { // FTP
        type: 'value',
        name: 'FTP (W)',
        position: 'right',
        offset: 0,
        min: seriesVisibility.ftp ? undefined : 0,
        max: seriesVisibility.ftp ? undefined : 1,
        axisLine: { show: seriesVisibility.ftp, lineStyle: { color: '#EE6666' } },
        axisLabel: { formatter: '{value} W', show: seriesVisibility.ftp },
        splitLine: { show: false, }
      },
      { // W/kg
        type: 'value',
        name: 'W/kg',
        position: 'right',
        offset: seriesVisibility.ftp ? 60 : 0, // Se FTP non c'è, W/kg prende il suo posto (offset 0)
        min: seriesVisibility.wPerKg ? undefined : 0,
        max: seriesVisibility.wPerKg ? undefined : 1,
        axisLine: { show: seriesVisibility.wPerKg, lineStyle: { color: '#91CC75' } },
        axisLabel: { formatter: '{value} W/kg', show: seriesVisibility.wPerKg },
        splitLine: { show: false, }
      }
    ],
    series: activeSeries,
    dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { start: 0, end: 100, bottom: '45px' }
    ],
  };

  return (
    <div className={`${spacing.top.lg} bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow border border-slate-200 dark:border-gray-600 ${spacing.all.md}`}>
      <div className={`text-center ${spacing.all.lg} ${spacing.all.lg}`}>
        <h3 className={`text-lg font-medium text-gray-900 dark:text-white ${spacing.bottom.md}`}>Andamento Peso, FTP & W/kg</h3>
      </div>
      
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${spacing.bottom.md} p-2 bg-slate-50 dark:bg-gray-700 rounded-xl border border-slate-200 dark:border-gray-600`}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="toggle-peso"
            checked={seriesVisibility.peso}
            onCheckedChange={() => handleVisibilityChange('peso')}
            aria-label="Toggle Peso"
          />
          <Label htmlFor="toggle-peso" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
            Peso (kg)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="toggle-ftp"
            checked={seriesVisibility.ftp}
            onCheckedChange={() => handleVisibilityChange('ftp')}
            aria-label="Toggle FTP"
          />
          <Label htmlFor="toggle-ftp" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
            FTP (W)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="toggle-wPerKg"
            checked={seriesVisibility.wPerKg}
            onCheckedChange={() => handleVisibilityChange('wPerKg')}
            aria-label="Toggle W/kg"
          />
          <Label htmlFor="toggle-wPerKg" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
            W/kg
          </Label>
        </div>
      </div>

      <ReactECharts option={option} style={{ height: '400px', width: '100%' }} notMerge={true} key={JSON.stringify(seriesVisibility)} />
    </div>
  );
};

export default AthletePerformanceChart; 