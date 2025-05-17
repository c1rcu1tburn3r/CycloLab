'use client';

import React from 'react';
import type { SegmentMetrics } from '@/lib/types';

interface SegmentStatsProps {
  metrics: SegmentMetrics | null;
  isLoading: boolean;
  error?: string | null;
}

const SegmentStats: React.FC<SegmentStatsProps> = ({ metrics, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mt-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-slate-200 rounded col-span-1"></div>
              <div className="h-4 bg-slate-200 rounded col-span-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Statistiche Segmento</h3>
        <p className="text-red-600">Errore nel caricamento delle statistiche: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Statistiche Segmento</h3>
        <p className="text-slate-500">Nessun segmento selezionato o dati insufficienti per l'analisi.</p>
        <p className="text-sm text-slate-400 mt-2">Clicca su due punti della traccia sulla mappa per selezionare un segmento.</p>
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
      <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-b-0">
        <span className="text-sm text-slate-600">{label}:</span>
        <span className="text-sm font-medium text-slate-800">{displayValue}</span>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mt-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Statistiche del Segmento Selezionato</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <div>
          <h4 className="text-md font-semibold text-blue-600 mb-2 mt-3">Generali</h4>
          {renderMetric('Durata', formatDuration(metrics.durationSeconds))}
          {renderMetric('Distanza', metrics.distanceMeters !== null ? (metrics.distanceMeters / 1000).toFixed(2) : null, ' km')}
          {renderMetric('Dislivello Positivo', metrics.totalElevationGain, ' m')}
          {renderMetric('Dislivello Negativo', metrics.totalElevationLoss, ' m')}
        </div>

        <div>
          <h4 className="text-md font-semibold text-purple-600 mb-2 mt-3">Pendenza</h4>
          {renderMetric('Pendenza Media', metrics.averageGrade, '%')}
          {renderMetric('Pendenza Massima', metrics.maxGrade, '%')}
          {renderMetric('VAM', metrics.vam, ' m/h')}
        </div>

        <div>
          <h4 className="text-md font-semibold text-green-600 mb-2 mt-3">Velocità</h4>
          {renderMetric('Velocità Media', metrics.averageSpeedKph, ' km/h')}
          {renderMetric('Velocità Massima', metrics.maxSpeedKph, ' km/h')}
        </div>
        
        <div>
          <h4 className="text-md font-semibold text-orange-600 mb-2 mt-3">Potenza</h4>
          {renderMetric('Potenza Media', metrics.averagePower, ' W')}
          {renderMetric('Potenza Massima', metrics.maxPower, ' W')}
          {renderMetric('Lavoro', metrics.workKiloJoules, ' kJ')}
          {/* Placeholder per NP, W/kg etc. */}
          {metrics.normalizedPower !== null && renderMetric('Potenza Normalizzata', metrics.normalizedPower, ' W')}
          {metrics.variabilityIndex !== null && renderMetric('Variability Index (VI)', metrics.variabilityIndex)}
        </div>

        <div>
          <h4 className="text-md font-semibold text-red-600 mb-2 mt-3">Frequenza Cardiaca</h4>
          {renderMetric('FC Media', metrics.averageHeartRate, ' bpm')}
          {renderMetric('FC Massima', metrics.maxHeartRate, ' bpm')}
        </div>

        <div>
          <h4 className="text-md font-semibold text-teal-600 mb-2 mt-3">Cadenza</h4>
          {renderMetric('Cadenza Media', metrics.averageCadence, ' rpm')}
          {renderMetric('Cadenza Massima', metrics.maxCadence, ' rpm')}
        </div>

        {/* Sezione Intensità (richiede dati atleta) */}
        {(metrics.wattsPerKg !== null || metrics.intensityFactor !== null || metrics.tss !== null) && (
          <div>
            <h4 className="text-md font-semibold text-indigo-600 mb-2 mt-3">Intensità (Stima Profilo)</h4>
            {metrics.wattsPerKg !== null && renderMetric('Potenza Media', metrics.wattsPerKg, ' W/kg')}
            {/* Aggiungeremo NP W/kg se necessario in futuro */}
            {metrics.intensityFactor !== null && metrics.intensityFactor !== undefined && renderMetric('Intensity Factor (IF)', metrics.intensityFactor.toFixed(2))}
            {metrics.tss !== null && metrics.tss !== undefined && renderMetric('Training Stress Score (TSS)', metrics.tss.toFixed(0))}
          </div>
        )}
      </div>
      
      {/* Qui aggiungeremo sezioni per metriche più complesse come IF, TSS, Zone, etc. */}
      {/* Ad esempio:
      {(metrics.intensityFactor || metrics.tss) && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-indigo-600 mb-2">Intensità (Stima)</h4>
          {renderMetric('Intensity Factor (IF)', metrics.intensityFactor?.toFixed(2))}
          {renderMetric('Training Stress Score (TSS)', metrics.tss?.toFixed(0))}
        </div>
      )}
      */}
    </div>
  );
};

export default SegmentStats; 