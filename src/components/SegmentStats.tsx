'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system';
import { spacing } from '@/lib/design-system';
import type { SegmentMetrics } from '@/lib/types';

interface SegmentStatsProps {
  metrics: SegmentMetrics | null;
  isLoading: boolean;
  error: string | null;
  warning?: string | null;
}

const SegmentStats: React.FC<SegmentStatsProps> = ({ metrics, isLoading, error, warning }) => {
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return 'N/D';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
  };

  const renderMetric = (label: string, value: number | null | string | undefined, unit: string = '') => {
    if (value === null || value === undefined) return null;
    
    const displayValue = typeof value === 'string' ? value : 
                        typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value;
    
    return (
      <div className={`flex justify-between items-center ${spacing.bottom.sm} border-b border-gray-100 dark:border-gray-700/50 pb-2`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {displayValue}{unit}
        </span>
      </div>
    );
  };

  const sectionIcons = {
    'Generali': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    'Pendenza': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    'Velocità': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    'Potenza': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    'Freq. Cardiaca': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    'Cadenza': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Intensità': <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  };

  if (isLoading) {
    return (
      <Card className={spacing.top.lg}>
        <CardContent className="text-center py-8">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto ${spacing.bottom.md}`}></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento statistiche...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={spacing.top.lg}>
        <CardContent className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card className={spacing.top.lg}>
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">Statistiche del Segmento</CardTitle>
      </CardHeader>
      
      <CardContent>
        {warning && (
          <div className={`${spacing.bottom.lg} p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-600 rounded-xl`}>
            <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">{warning}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          
          {/* Generali */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-blue-700 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Generali']}
              Generali
            </h4>
            {renderMetric('Durata', formatDuration(metrics.durationSeconds))}
            {renderMetric('Distanza', metrics.distanceMeters !== null ? (metrics.distanceMeters / 1000).toFixed(2) : null, ' km')}
            {renderMetric('Dislivello Positivo', metrics.totalElevationGain, ' m')}
            {renderMetric('Dislivello Negativo', metrics.totalElevationLoss, ' m')}
          </div>

          {/* Pendenza */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-purple-700 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Pendenza']}
              Pendenza
            </h4>
            {renderMetric('Media', metrics.averageGrade, '%')}
            {renderMetric('Massima', metrics.maxGrade, '%')}
            {renderMetric('VAM (Vel. Asc. Media)', metrics.vam, ' m/h')}
          </div>

          {/* Velocità */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-green-700 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Velocità']}
              Velocità
            </h4>
            {renderMetric('Media', metrics.averageSpeedKph, ' km/h')}
            {renderMetric('Massima', metrics.maxSpeedKph, ' km/h')}
          </div>
          
          {/* Potenza */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-orange-600 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Potenza']}
              Potenza
            </h4>
            {renderMetric('Media', metrics.averagePower, ' W')}
            {renderMetric('Massima', metrics.maxPower, ' W')}
            {renderMetric('Lavoro Totale', metrics.workKiloJoules, ' kJ')}
            {metrics.normalizedPower && renderMetric('Normalizzata (NP)', metrics.normalizedPower, ' W')}
            {metrics.variabilityIndex && renderMetric('Variability Index (VI)', metrics.variabilityIndex.toFixed(2))}
          </div>

          {/* Freq. Cardiaca */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-red-600 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Freq. Cardiaca']}
              Freq. Cardiaca
            </h4>
            {renderMetric('Media', metrics.averageHeartRate, ' bpm')}
            {renderMetric('Massima', metrics.maxHeartRate, ' bpm')}
          </div>

          {/* Cadenza */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-teal-600 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Cadenza']}
              Cadenza
            </h4>
            {renderMetric('Media', metrics.averageCadence, ' rpm')}
            {renderMetric('Massima', metrics.maxCadence, ' rpm')}
          </div>

          {/* Intensità */}
          <div className="md:col-span-1 space-y-1">
            <h4 className={`text-md font-semibold text-indigo-600 ${spacing.bottom.sm} flex items-center`}>
              {sectionIcons['Intensità']}
              Intensità
            </h4>
            {metrics.intensityFactor && renderMetric('Intensity Factor (IF)', metrics.intensityFactor.toFixed(2))}
            {metrics.tss && renderMetric('Training Stress Score (TSS)', metrics.tss.toFixed(0))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentStats; 