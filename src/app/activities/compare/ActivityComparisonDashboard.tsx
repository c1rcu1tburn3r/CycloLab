'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VisualSegmentSelector from '../../../components/VisualSegmentSelector';

interface ActivityComparisonDashboardProps {
  activities: Activity[];
}

// Funzioni helper
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return 'N/D';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`;
  } else {
    return `0:${s.toString().padStart(2, '0')}`;
  }
}

const getActivityColor = (type: string | null | undefined) => {
  switch (type) {
    case 'cycling':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', accent: 'from-blue-500 to-purple-600' };
    case 'running':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', accent: 'from-orange-500 to-red-600' };
    case 'swimming':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500 to-blue-600' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', accent: 'from-gray-500 to-gray-700' };
  }
};

const getActivityIcon = (type: string | null | undefined) => {
  switch (type) {
    case 'cycling':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'running':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l6 6m0 0l6-6M11 9v12a2 2 0 104 0V9" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a4.5 4.5 0 00-6.364-6.364L12 10.172l-1.064-1.064a4.5 4.5 0 10-6.364 6.364L12 17.828l7.428-7.428z"/>
        </svg>
      );
  }
};

export default function ActivityComparisonDashboard({ activities }: ActivityComparisonDashboardProps) {
  // Controllo che ci siano esattamente 2 attività
  if (activities.length !== 2) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Comparazione non disponibile
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Seleziona esattamente 2 attività per la comparazione.
          </p>
        </div>
      </div>
    );
  }

  // Analisi di comparabilità
  const comparisonAnalysis = useMemo(() => {
    const types = activities.map(a => a.activity_type);
    const durations = activities.map(a => a.duration_seconds || 0);
    const distances = activities.map(a => a.distance_meters || 0);

    const sameType = types.every(type => type === types[0]);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDurationDiff = Math.max(...durations) - Math.min(...durations);
    const similarDuration = maxDurationDiff < 600; // 10 minuti

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDistanceDiff = Math.max(...distances) - Math.min(...distances);
    const similarDistance = maxDistanceDiff < 5000; // 5km

    return {
      sameType,
      similarDuration,
      similarDistance,
      avgDuration,
      avgDistance: avgDistance / 1000, // Convert to km
      qualityScore: (sameType ? 40 : 0) + (similarDuration ? 30 : 0) + (similarDistance ? 30 : 0)
    };
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-t-3xl" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Comparazione Attività
            </h1>
            <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              2 attività selezionate
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Qualità Comparazione</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  comparisonAnalysis.qualityScore >= 70 ? 'bg-green-500' :
                  comparisonAnalysis.qualityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {comparisonAnalysis.qualityScore}%
                </span>
              </div>
            </div>
            
            <Link href="/activities">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Torna alle Attività
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Analisi di Comparabilità */}
      <Card className="stats-card p-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analisi di Comparabilità
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-3 rounded-lg ${comparisonAnalysis.sameType ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {comparisonAnalysis.sameType ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.863-.833-2.632 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span className={`text-sm font-medium ${comparisonAnalysis.sameType ? 'text-green-700' : 'text-yellow-700'}`}>
                  Tipo di Attività
                </span>
              </div>
              <p className={`text-xs ${comparisonAnalysis.sameType ? 'text-green-600' : 'text-yellow-600'}`}>
                {comparisonAnalysis.sameType ? 'Tutte dello stesso tipo' : 'Tipi diversi - comparazione limitata'}
              </p>
            </div>

            <div className={`p-3 rounded-lg ${comparisonAnalysis.similarDuration ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {comparisonAnalysis.similarDuration ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.863-.833-2.632 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span className={`text-sm font-medium ${comparisonAnalysis.similarDuration ? 'text-green-700' : 'text-yellow-700'}`}>
                  Durata
                </span>
              </div>
              <p className={`text-xs ${comparisonAnalysis.similarDuration ? 'text-green-600' : 'text-yellow-600'}`}>
                {comparisonAnalysis.similarDuration ? 'Durate simili' : 'Durate molto diverse'}
              </p>
            </div>

            <div className={`p-3 rounded-lg ${comparisonAnalysis.similarDistance ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {comparisonAnalysis.similarDistance ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.863-.833-2.632 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span className={`text-sm font-medium ${comparisonAnalysis.similarDistance ? 'text-green-700' : 'text-yellow-700'}`}>
                  Distanza
                </span>
              </div>
              <p className={`text-xs ${comparisonAnalysis.similarDistance ? 'text-green-600' : 'text-yellow-600'}`}>
                {comparisonAnalysis.similarDistance ? 'Distanze simili' : 'Distanze molto diverse'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappa Interattiva per Selezione Segmenti */}
      <Card className="stats-card p-4">
        <CardContent>
          <VisualSegmentSelector activities={activities} />
        </CardContent>
      </Card>

      {/* Cards delle Attività */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activities.map((activity, index) => {
          const { bg, text, accent } = getActivityColor(activity.activity_type);
          // @ts-ignore athletes può essere null o un oggetto
          const athleteName = activity.athletes?.name ? `${activity.athletes.name} ${activity.athletes.surname}` : 'Atleta';

          return (
            <Card key={activity.id} className="stats-card group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent} rounded-t-2xl`} />
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${accent} flex items-center justify-center text-white text-xs font-bold`}>
                      {index + 1}
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
                      {getActivityIcon(activity.activity_type)}
                      <span>{activity.activity_type ? activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1) : 'Generico'}</span>
                    </div>
                  </div>
                </div>
                
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  <Link href={`/activities/${activity.id}`} className="hover:underline">
                    {activity.title || 'Attività Senza Titolo'}
                  </Link>
                </CardTitle>
                
                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <p>Atleta: {athleteName}</p>
                  <p>{format(parseISO(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}</p>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Distanza</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.distance_meters ? `${(activity.distance_meters / 1000).toFixed(2)} km` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Durata</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatDuration(activity.duration_seconds)}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Vel. Media</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.distance_meters && activity.duration_seconds ? 
                        `${((activity.distance_meters / 1000) / (activity.duration_seconds / 3600)).toFixed(1)} km/h` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pot. Media</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.avg_power_watts ? `${activity.avg_power_watts} W` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pot. Max</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.max_power_watts ? `${activity.max_power_watts} W` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">FC Media</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.avg_heart_rate ? `${activity.avg_heart_rate} bpm` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dislivello</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.elevation_gain_meters ? `${activity.elevation_gain_meters} m` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cadenza</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.avg_cadence ? `${activity.avg_cadence} rpm` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">TSS</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.tss ? `${Math.round(activity.tss)}` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pot. Norm.</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.normalized_power_watts ? `${activity.normalized_power_watts} W` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">FC Max</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.max_heart_rate ? `${activity.max_heart_rate} bpm` : 'N/D'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Efficienza</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {activity.avg_power_watts && activity.avg_heart_rate ? 
                        `${(activity.avg_power_watts / activity.avg_heart_rate).toFixed(1)}` : 'N/D'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 