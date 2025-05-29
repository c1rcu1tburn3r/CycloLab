'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PmcChart from '@/components/charts/PmcChart';
import AthletePerformanceChart from '@/components/AthletePerformanceChart';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete, AthleteProfileEntry, Activity } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';

interface OverviewTabProps {
  athleteId: string;
  athlete: Athlete;
}

interface AthleteStats {
  totalActivities: number;
  totalDistance: number; // km
  totalTime: number; // minuti
  avgPower: number | null;
  recentActivities: number; // Ultimi 30 giorni
}

export default function OverviewTab({ athleteId, athlete }: OverviewTabProps) {
  const [profileEntries, setProfileEntries] = useState<AthleteProfileEntry[]>([]);
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const supabase = createClient();
        
        // Carica profili reali dell'atleta
        const { data: profileEntries, error: profileError } = await supabase
          .from('athlete_profile_entries')
          .select('*')
          .eq('athlete_id', athleteId)
          .order('effective_date', { ascending: false });
        
        if (profileError) {
          console.error('Errore caricamento profili:', profileError);
        }
        
        // Carica attività reali dell'atleta
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            id,
            activity_date,
            duration_seconds,
            distance_meters,
            avg_power_watts,
            activity_type
          `)
          .eq('athlete_id', athleteId)
          .order('activity_date', { ascending: false });
        
        if (activitiesError) {
          console.error('Errore caricamento attività:', activitiesError);
        }
        
        // Calcola statistiche reali dalle attività
        const realActivities = activities || [];
        const realStats: AthleteStats = calculateStatsFromActivities(realActivities as any[]);
        
        setProfileEntries(profileEntries || []);
        setStats(realStats);
        
      } catch (error) {
        console.error('Errore generale caricamento dati:', error);
        // Imposta stati vuoti in caso di errore
        setProfileEntries([]);
        setStats({
          totalActivities: 0,
          totalDistance: 0,
          totalTime: 0,
          avgPower: null,
          recentActivities: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [athleteId]);

  // Funzione per calcolare statistiche reali dalle attività
  const calculateStatsFromActivities = (activities: any[]): AthleteStats => {
    if (activities.length === 0) {
      return {
        totalActivities: 0,
        totalDistance: 0,
        totalTime: 0,
        avgPower: null,
        recentActivities: 0,
      };
    }

    const totalActivities = activities.length;
    const totalDistance = activities.reduce((sum, activity) => 
      sum + (activity.distance_meters ? activity.distance_meters / 1000 : 0), 0
    );
    const totalTime = activities.reduce((sum, activity) => 
      sum + (activity.duration_seconds ? Math.round(activity.duration_seconds / 60) : 0), 0
    );
    
    // Calcola potenza media solo per attività che hanno dati di potenza
    const activitiesWithPower = activities.filter(a => a.avg_power_watts && a.avg_power_watts > 0);
    const avgPower = activitiesWithPower.length > 0 
      ? Math.round(activitiesWithPower.reduce((sum, a) => sum + (a.avg_power_watts || 0), 0) / activitiesWithPower.length)
      : null;
    
    // Calcola attività degli ultimi 30 giorni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivities = activities.filter(a => {
      const activityDate = new Date(a.activity_date || '');
      return activityDate >= thirtyDaysAgo;
    }).length;

    return {
      totalActivities,
      totalDistance: Math.round(totalDistance * 10) / 10, // Arrotonda a 1 decimale
      totalTime,
      avgPower,
      recentActivities,
    };
  };

  const getCurrentProfile = () => {
    if (profileEntries.length === 0) return null;
    return profileEntries[profileEntries.length - 1];
  };

  const getProgressData = () => {
    if (profileEntries.length < 2) return null;
    const current = profileEntries[profileEntries.length - 1];
    const previous = profileEntries[profileEntries.length - 2];
    
    return {
      ftpChange: current.ftp_watts && previous.ftp_watts 
        ? current.ftp_watts - previous.ftp_watts 
        : null,
      weightChange: current.weight_kg && previous.weight_kg 
        ? current.weight_kg - previous.weight_kg 
        : null,
      wPerKgChange: current.ftp_watts && current.weight_kg && previous.ftp_watts && previous.weight_kg
        ? (current.ftp_watts / current.weight_kg) - (previous.ftp_watts / previous.weight_kg)
        : null,
    };
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}g ${remainingHours}h`;
    }
    return `${hours}h ${minutes % 60}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  const currentProfile = getCurrentProfile();
  const progress = getProgressData();

  return (
    <div className="space-y-6">
      {/* Statistiche Generali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Attività Totali</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalActivities || 0}
                </p>
                <p className="text-xs text-green-600">
                  {stats?.recentActivities ? `+${stats.recentActivities} ultimi 30gg` : 'Nessuna attività recente'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Distanza Totale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalDistance ? `${stats.totalDistance.toLocaleString()} km` : 'N/D'}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.totalActivities && stats.totalDistance 
                    ? `Media: ${Math.round(stats.totalDistance / stats.totalActivities)} km` 
                    : 'Calcolo non disponibile'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Totale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalTime ? formatTime(stats.totalTime) : 'N/D'}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.totalActivities && stats.totalTime 
                    ? `Media: ${formatTime(Math.round(stats.totalTime / stats.totalActivities))}`
                    : 'Calcolo non disponibile'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Potenza Media</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.avgPower ? `${stats.avgPower} W` : 'N/D'}
                </p>
                <p className="text-xs text-gray-500">
                  FTP: {currentProfile?.ftp_watts ? `${currentProfile.ftp_watts} W` : 'N/D'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progressi Recenti */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Progressi dall&apos;ultimo aggiornamento profilo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {progress.ftpChange !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    progress.ftpChange >= 0 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      progress.ftpChange >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                        progress.ftpChange >= 0 
                          ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                          : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      } />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">FTP</p>
                    <p className="font-semibold">
                      {progress.ftpChange >= 0 ? '+' : ''}{progress.ftpChange} W
                    </p>
                  </div>
                </div>
              )}

              {progress.weightChange !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    progress.weightChange <= 0 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-orange-100 dark:bg-orange-900/30'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      progress.weightChange <= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-orange-600 dark:text-orange-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-1m-3 1l-3-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Peso</p>
                    <p className="font-semibold">
                      {progress.weightChange >= 0 ? '+' : ''}{progress.weightChange.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              )}

              {progress.wPerKgChange !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    progress.wPerKgChange >= 0 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      progress.wPerKgChange >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">W/kg</p>
                    <p className="font-semibold">
                      {progress.wPerKgChange >= 0 ? '+' : ''}{progress.wPerKgChange.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Management Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Performance Management Chart
              </CardTitle>
              <div className="flex gap-2">
                {(['3m', '6m', '1y', 'all'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={selectedTimeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeRange(range)}
                  >
                    {range === 'all' ? 'Tutto' : range}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PmcChart athleteId={athleteId} />
          </CardContent>
        </Card>

        {/* Trend Peso/FTP/W-kg */}
        {profileEntries.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Trend Performance Fisiologica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AthletePerformanceChart profileEntries={profileEntries} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 