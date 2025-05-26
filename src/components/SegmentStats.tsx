'use client';

import React from 'react';
import type { SegmentMetrics } from '@/lib/types';

interface SegmentStatsProps {
  metrics: SegmentMetrics | null;
  isLoading: boolean;
  error?: string | null;
  warning?: string | null;
}

const SegmentStats: React.FC<SegmentStatsProps> = ({ metrics, isLoading, error, warning }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mt-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-slate-200 dark:bg-gray-600 rounded col-span-1"></div>
              <div className="h-4 bg-slate-200 dark:bg-gray-600 rounded col-span-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mt-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Statistiche Segmento</h3>
        <p className="text-red-600 dark:text-red-400">Errore nel caricamento delle statistiche: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mt-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Statistiche Segmento</h3>
        <p className="text-slate-500 dark:text-slate-400">Nessun segmento selezionato o dati insufficienti per l'analisi.</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Clicca su due punti della traccia sulla mappa per selezionare un segmento.</p>
      </div>
    );
  }

  // Funzione helper per formattare la durata
  const formatDuration = (totalSeconds: number | null): string => {
    if (totalSeconds === null || totalSeconds < 0) return 'N/D';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    let str = '';
    if (hours > 0) str += `${hours}h `;
    if (minutes > 0 || hours > 0) str += `${minutes}m `; // Mostra minuti se ci sono ore
    str += `${seconds}s`;
    return str.trim() || '0s';
  };

  // Funzione helper per il rendering di una metrica
  const renderMetric = (label: string, value: string | number | null | undefined, unit: string = '') => {
    const displayValue = (value === null || value === undefined) ? 'N/D' : `${value}${unit}`;
    return (
      <div className="flex justify-between items-center py-2.5 border-b border-slate-200/80 dark:border-gray-600/80 last:border-b-0">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}:</span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-tight">{displayValue}</span>
      </div>
    );
  };

  // Definisco qui le icone per poterle usare nei titoli
  const sectionIcons: Record<string, JSX.Element> = {
    Generali: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
    Pendenza: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
    Velocità: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>, // Example icon, update if needed
    Potenza: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    'Freq. Cardiaca': <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
    Cadenza: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>,
    Intensità: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 opacity-70"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>,
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 md:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 tracking-tight">Statistiche del Segmento</h3>
      
      {warning && (
        <div className="mb-6 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-600 rounded-lg">
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">{warning}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
        
        {/* Generali */}
        <div className="md:col-span-1 space-y-1">
          <h4 className="text-md font-semibold text-blue-700 mb-3 flex items-center">
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
          <h4 className="text-md font-semibold text-purple-700 mb-3 flex items-center">
            {sectionIcons['Pendenza']}
            Pendenza
          </h4>
          {renderMetric('Media', metrics.averageGrade, '%')}
          {renderMetric('Massima', metrics.maxGrade, '%')}
          {renderMetric('VAM (Vel. Asc. Media)', metrics.vam, ' m/h')}
        </div>

        {/* Velocità */}
        <div className="md:col-span-1 space-y-1">
          <h4 className="text-md font-semibold text-green-700 mb-3 flex items-center">
            {sectionIcons['Velocità']}
            Velocità
          </h4>
          {renderMetric('Media', metrics.averageSpeedKph, ' km/h')}
          {renderMetric('Massima', metrics.maxSpeedKph, ' km/h')}
        </div>
        
        {/* Potenza */}
        <div className="md:col-span-1 space-y-1">
          <h4 className="text-md font-semibold text-orange-600 mb-3 flex items-center">
            {sectionIcons['Potenza']}
            Potenza
          </h4>
          {renderMetric('Media', metrics.averagePower, ' W')}
          {renderMetric('Massima', metrics.maxPower, ' W')}
          {renderMetric('Lavoro Totale', metrics.workKiloJoules, ' kJ')}
          {metrics.normalizedPower !== null && renderMetric('Normalizzata (NP)', metrics.normalizedPower, ' W')}
          {metrics.variabilityIndex !== null && renderMetric('Variability Index (VI)', metrics.variabilityIndex?.toFixed(2))}
        </div>

        {/* Freq. Cardiaca */}
        <div className="md:col-span-1 space-y-1">
          <h4 className="text-md font-semibold text-red-600 mb-3 flex items-center">
            {sectionIcons['Freq. Cardiaca']}
            Freq. Cardiaca
          </h4>
          {renderMetric('Media', metrics.averageHeartRate, ' bpm')}
          {renderMetric('Massima', metrics.maxHeartRate, ' bpm')}
        </div>

        {/* Cadenza */}
        <div className="md:col-span-1 space-y-1">
          <h4 className="text-md font-semibold text-teal-600 mb-3 flex items-center">
            {sectionIcons['Cadenza']}
            Cadenza
          </h4>
          {renderMetric('Media', metrics.averageCadence, ' rpm')}
          {renderMetric('Massima', metrics.maxCadence, ' rpm')}
        </div>

        {/* Intensità */}
        {(metrics.wattsPerKg !== null || metrics.intensityFactor !== null || metrics.tss !== null) && (
          <div className="md:col-span-1 space-y-1">
            <h4 className="text-md font-semibold text-indigo-600 mb-3 flex items-center">
              {sectionIcons['Intensità']}
              Intensità (Stima)
            </h4>
            {metrics.wattsPerKg !== null && metrics.wattsPerKg !== undefined && renderMetric('Potenza Media', metrics.wattsPerKg.toFixed(2), ' W/kg')}
            {metrics.intensityFactor !== null && metrics.intensityFactor !== undefined && renderMetric('Intensity Factor (IF)', metrics.intensityFactor.toFixed(2))}
            {metrics.tss !== null && metrics.tss !== undefined && renderMetric('Training Stress Score (TSS)', metrics.tss.toFixed(0))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentStats; 