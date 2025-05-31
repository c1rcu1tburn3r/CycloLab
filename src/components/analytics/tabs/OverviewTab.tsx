'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete, AthleteProfileEntry, Activity } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { 
  analyzeHRFromActivities, 
  calculateHRZonesFromMax, 
  calculateHRZonesFromLTHR,
  calculateHRStats,
  shouldSuggestHRUpdate,
  type HRZoneEstimationResult,
  type HRZone 
} from '@/lib/hrZoneCalculations';
import { 
  Activity as ActivityIcon, 
  Heart, 
  Zap, 
  TrendingUp, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

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

interface PowerZone {
  zone: string;
  name: string;
  minWatts: number;
  maxWatts: number;
  color: string;
  percentage: number;
}

export default function OverviewTab({ athleteId, athlete }: OverviewTabProps) {
  const [profileEntries, setProfileEntries] = useState<AthleteProfileEntry[]>([]);
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [hrEstimation, setHrEstimation] = useState<HRZoneEstimationResult | null>(null);
  const [showHrSuggestion, setShowHrSuggestion] = useState(false);
  const [hrZones, setHrZones] = useState<HRZone[]>([]);
  const [powerZones, setPowerZones] = useState<PowerZone[]>([]);

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
        
        // Carica attività complete per analisi HR e statistiche avanzate
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            id,
            activity_date,
            title,
            duration_seconds,
            distance_meters,
            avg_power_watts,
            max_power_watts,
            avg_heart_rate_bpm,
            max_heart_rate_bpm,
            avg_cadence_rpm,
            tss,
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
        setActivities(realActivities);
        setStats(realStats);
        
        // Analisi automatica HR e calcolo zone
        await analyzeHRAndZones(realActivities, profileEntries || []);
        
      } catch (error) {
        console.error('Errore generale caricamento dati:', error);
        // Imposta stati vuoti in caso di errore
        setProfileEntries([]);
        setActivities([]);
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

  // Analisi automatica HR e calcolo zone di potenza/frequenza cardiaca
  const analyzeHRAndZones = async (activities: any[], profiles: AthleteProfileEntry[]) => {
    try {
      // Ottieni profilo più recente
      const currentProfile = profiles.length > 0 ? profiles[0] : null;
      const currentFTP = currentProfile?.ftp_watts || null;

      // Calcola zone di potenza se FTP disponibile
      if (currentFTP) {
        const zones: PowerZone[] = [
          { zone: 'Z1', name: 'Recupero', minWatts: 0, maxWatts: Math.round(currentFTP * 0.55), color: '#6b7280', percentage: 55 },
          { zone: 'Z2', name: 'Resistenza', minWatts: Math.round(currentFTP * 0.56), maxWatts: Math.round(currentFTP * 0.75), color: '#10b981', percentage: 75 },
          { zone: 'Z3', name: 'Tempo', minWatts: Math.round(currentFTP * 0.76), maxWatts: Math.round(currentFTP * 0.90), color: '#f59e0b', percentage: 90 },
          { zone: 'Z4', name: 'Soglia', minWatts: Math.round(currentFTP * 0.91), maxWatts: Math.round(currentFTP * 1.05), color: '#ef4444', percentage: 105 },
          { zone: 'Z5', name: 'VO2max', minWatts: Math.round(currentFTP * 1.06), maxWatts: Math.round(currentFTP * 1.20), color: '#8b5cf6', percentage: 120 },
          { zone: 'Z6', name: 'Anaerobico', minWatts: Math.round(currentFTP * 1.21), maxWatts: Math.round(currentFTP * 1.50), color: '#dc2626', percentage: 150 },
          { zone: 'Z7', name: 'Neuromuscolare', minWatts: Math.round(currentFTP * 1.51), maxWatts: 999, color: '#7c2d12', percentage: 200 }
        ];
        setPowerZones(zones);
      }

      // Analisi automatica HR se ci sono dati
      if (activities.length > 0) {
        const hrAnalysis = analyzeHRFromActivities(activities);
        
        if (hrAnalysis) {
          setHrEstimation(hrAnalysis);
          
          // Calcola zone HR
          let calculatedZones: HRZone[] = [];
          if (hrAnalysis.estimatedLTHR) {
            calculatedZones = calculateHRZonesFromLTHR(hrAnalysis.estimatedLTHR);
          } else {
            calculatedZones = calculateHRZonesFromMax(hrAnalysis.estimatedHRMax);
          }
          setHrZones(calculatedZones);
          
          // Verifica se suggerire aggiornamento
          // TODO: Qui dovremmo controllare le zone HR esistenti dal profilo
          if (shouldSuggestHRUpdate(hrAnalysis)) {
            setShowHrSuggestion(true);
          }
        }
      }
    } catch (error) {
      console.error('Errore analisi HR e zone:', error);
    }
  };

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
    return profileEntries[0]; // Più recente
  };

  const getProgressData = () => {
    if (profileEntries.length < 2) return null;
    const current = profileEntries[0]; // Più recente
    const previous = profileEntries[1]; // Precedente
    
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

  // Calcola lo stato della forma fisica
  const getFormStatus = () => {
    if (!stats || stats.recentActivities === 0) {
      return { status: 'unknown', color: 'gray', text: 'Sconosciuto' };
    }
    
    if (stats.recentActivities >= 15) {
      return { status: 'excellent', color: 'green', text: 'In Forma' };
    } else if (stats.recentActivities >= 8) {
      return { status: 'good', color: 'blue', text: 'Buona' };
    } else if (stats.recentActivities >= 3) {
      return { status: 'moderate', color: 'yellow', text: 'Moderata' };
    } else {
      return { status: 'low', color: 'red', text: 'Bassa' };
    }
  };

  // Calcola statistiche HR recenti
  const hrStats = calculateHRStats(activities, 30);

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
  const formStatus = getFormStatus();

  return (
    <div className="space-y-6">
      {/* HEADER: Alert/Notifiche Intelligenti */}
      {showHrSuggestion && hrEstimation && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <Heart className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Zone HR rilevate automaticamente!</strong> 
                <span className="ml-2">{hrEstimation.reasoning}</span>
                <span className="text-xs text-green-600 ml-2">
                  (Confidenza: {Math.round(hrEstimation.confidence * 100)}%)
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowHrSuggestion(false)}>
                  Ignora
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  Salva Zone
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ROW 1: Metriche Chiave - Cruscotto Principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* FTP Attuale */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">FTP Attuale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentProfile?.ftp_watts ? `${currentProfile.ftp_watts} W` : 'N/D'}
                </p>
                {progress?.ftpChange && (
                  <p className={`text-xs ${progress.ftpChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {progress.ftpChange > 0 ? '+' : ''}{progress.ftpChange}W vs precedente
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* W/kg */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">W/kg</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentProfile?.ftp_watts && currentProfile?.weight_kg 
                    ? (currentProfile.ftp_watts / currentProfile.weight_kg).toFixed(2)
                    : 'N/D'
                  }
                </p>
                {progress?.wPerKgChange && (
                  <p className={`text-xs ${progress.wPerKgChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {progress.wPerKgChange > 0 ? '+' : ''}{progress.wPerKgChange.toFixed(2)} vs precedente
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forma Fisica */}
        <Card className={`border-l-4 border-l-${formStatus.color}-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Forma Attuale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formStatus.text}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.recentActivities || 0} attività (30gg)
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-${formStatus.color}-100 dark:bg-${formStatus.color}-900/30 flex items-center justify-center`}>
                <ActivityIcon className={`w-6 h-6 text-${formStatus.color}-600 dark:text-${formStatus.color}-400`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HR Media Recente */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">HR Media</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hrStats?.avgHR ? `${hrStats.avgHR} bpm` : 'N/D'}
                </p>
                {hrStats && (
                  <p className="text-xs text-gray-500">
                    Max: {hrStats.maxHR} bpm • {hrStats.activitiesWithHR} attività
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Zone di Potenza e HR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Zone di Potenza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Zone di Potenza
              {currentProfile?.ftp_watts && (
                <Badge variant="outline">FTP: {currentProfile.ftp_watts}W</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {powerZones.length > 0 ? (
              <div className="space-y-3">
                {powerZones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <span className="font-semibold">{zone.zone}</span>
                        <span className="ml-2 text-sm text-gray-600">{zone.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {zone.maxWatts === 999 ? `${zone.minWatts}+ W` : `${zone.minWatts}-${zone.maxWatts} W`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {zone.percentage}% FTP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Zone di potenza non disponibili</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Aggiungi un FTP per visualizzare le zone
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zone Frequenza Cardiaca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Zone Frequenza Cardiaca
              {hrEstimation && (
                <Badge variant="outline">
                  {hrEstimation.estimatedLTHR ? `LTHR: ${hrEstimation.estimatedLTHR}` : `HRmax: ${hrEstimation.estimatedHRMax}`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hrZones.length > 0 ? (
              <div className="space-y-3">
                {hrZones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <span className="font-semibold">{zone.zone}</span>
                        <span className="ml-2 text-sm text-gray-600">{zone.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {zone.minBPM}-{zone.maxBPM} bpm
                      </div>
                      <div className="text-xs text-gray-500">
                        {zone.minPercent}-{zone.maxPercent}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Zone HR non disponibili</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Carica attività con dati HR per rilevamento automatico
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Statistiche Rapide (Ultimi 30 giorni) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Statistiche Rapide (Ultimo Mese)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalActivities || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Attività Totali</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalDistance || 0}km
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Distanza Totale</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats ? formatTime(stats.totalTime) : '0h'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Totale</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.avgPower ? `${stats.avgPower}W` : 'N/D'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Potenza Media</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROW 4: Status e Raccomandazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Misurazioni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Status Misurazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* FTP Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="font-medium">FTP</span>
              </div>
              <div className="flex items-center gap-2">
                {currentProfile?.ftp_watts ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Aggiornato</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Da inserire</span>
                  </>
                )}
              </div>
            </div>

            {/* Peso Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">Peso</span>
              </div>
              <div className="flex items-center gap-2">
                {currentProfile?.weight_kg ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">{currentProfile.weight_kg}kg</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Da inserire</span>
                  </>
                )}
              </div>
            </div>

            {/* Zone HR Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-red-600" />
                <span className="font-medium">Zone HR</span>
              </div>
              <div className="flex items-center gap-2">
                {hrZones.length > 0 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Rilevate</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Auto-rilevamento</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raccomandazioni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              Raccomandazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            
            {/* Raccomandazione FTP */}
            {!currentProfile?.ftp_watts && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-1">
                  🎯 Aggiungi FTP
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Inserisci il tuo FTP per sbloccare analisi di potenza avanzate e zone personalizzate
                </p>
              </div>
            )}

            {/* Raccomandazione Attività */}
            {(stats?.recentActivities || 0) < 8 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm mb-1">
                  🚴 Aumenta Frequenza
                </h4>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Solo {stats?.recentActivities || 0} attività questo mese. Obiettivo: 12+ per progressi costanti
                </p>
              </div>
            )}

            {/* Raccomandazione Test */}
            {currentProfile?.ftp_watts && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 dark:text-green-300 text-sm mb-1">
                  📈 Test FTP
                </h4>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Ripeti il test FTP ogni 6-8 settimane per monitorare i progressi
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 