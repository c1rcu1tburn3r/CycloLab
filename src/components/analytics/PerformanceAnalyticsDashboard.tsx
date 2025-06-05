'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Athlete } from '@/lib/types';
import { useCycloLabToast } from "@/hooks/use-cyclolab-toast";
import { estimateFTPFromActivities, shouldSuggestFTPUpdate, formatFTPSuggestionMessage, type FTPEstimationResult } from "@/lib/ftpEstimation";
import { createClient } from '@/utils/supabase/client';
import { saveAthleteProfileEntry } from '@/app/athletes/athleteProfileActions';
import { getTabNotifications, markTabAsVisited, type NotificationStatus } from '@/app/athletes/[id]/notificationActions';
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
import { spacing } from '@/lib/design-system';

// Import dei componenti per ogni tab (rimuovo OverviewTab)
import PowerAnalysisTab from './tabs/PowerAnalysisTab';
import TrainingLoadTab from './tabs/TrainingLoadTab';
import PerformanceTrendsTab from './tabs/PerformanceTrendsTab';
import ClimbingAnalysisTab from './tabs/ClimbingAnalysisTab';
import CadenceAnalysisTab from './tabs/CadenceAnalysisTab';

// Rimuovo 'overview' dai tipi
type TabId = 'power' | 'training-load' | 'cadence' | 'trends' | 'climbing';

interface PerformanceAnalyticsDashboardProps {
  athleteId: string;
  athlete: Athlete;
  userId: string;
}

interface TabConfig {
  id: TabId;
  label: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface PowerZone {
  zone: string;
  name: string;
  minWatts: number;
  maxWatts: number;
  color: string;
  percentage: number;
}

// Validazione range FTP realistici per tutti i livelli
const FTP_VALIDATION_RANGES = {
  absolute: { min: 80, max: 600 }, // 80W (principiante) - 600W (professionista elite)
  wPerKg: { 
    min: 1.0,  // Principiante assoluto o in riabilitazione
    max: 8.5   // Elite mondiale (Pogačar, Vingegaard territory)
  }
};

// Rimuovo la tab Overview dalla configurazione
const TABS_CONFIG: TabConfig[] = [
  {
    id: 'power',
    label: 'Analisi Potenza',
    description: 'Curve di potenza, distribuzione e personal bests avanzati',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'training-load',
    label: 'Carico Allenamento',
    description: 'PMC scientifico, fatica e forma fisica',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'cadence',
    label: 'Analisi Cadenza',
    description: 'Efficienza pedalata e cadenza ottimale',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'trends',
    label: 'Trend Performance',
    description: 'Confronti temporali e analisi predittive',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    id: 'climbing',
    label: 'Analisi Salite',
    description: 'Performance su segmenti e climbing analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
];

export default function PerformanceAnalyticsDashboard({
  athleteId,
  athlete,
  userId,
}: PerformanceAnalyticsDashboardProps) {
  // AGGIUNGO GESTIONE IDRATAZIONE SICURA
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Cambiato default da 'overview' a 'power'
  const [activeTab, setActiveTab] = useState<TabId>('power');
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [ftpEstimation, setFtpEstimation] = useState<FTPEstimationResult | null>(null);
  const [showFtpSuggestion, setShowFtpSuggestion] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<{
    ftp: number | null;
    weight: number | null;
    lastMeasurementDate: string | null;
  }>({
    ftp: null,
    weight: null,
    lastMeasurementDate: null
  });

  // Quick Update Panel states
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newFTP, setNewFTP] = useState('');
  const [ftpSource, setFtpSource] = useState<'test' | 'estimate' | 'activity'>('test');
  const [isUpdating, setIsUpdating] = useState(false);

  // Stati per il sistema HR avanzato
  const [hrEstimation, setHrEstimation] = useState<HRZoneEstimationResult | null>(null);
  const [showHrSuggestion, setShowHrSuggestion] = useState(false);
  const [hrZones, setHrZones] = useState<HRZone[]>([]);
  const [powerZones, setPowerZones] = useState<PowerZone[]>([]);

  const { showSuccess, showError } = useCycloLabToast();

  const [notifications, setNotifications] = useState<NotificationStatus | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set());

  // EFFETTO PER IDRATAZIONE SICURA
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Calcola metriche dalle informazioni del profilo corrente
  const currentFTP = currentProfile.ftp;
  const currentWeight = currentProfile.weight;
  const currentWPerKg = currentFTP && currentWeight ? (currentFTP / currentWeight).toFixed(2) : 'N/A';
  const lastMeasurementDate = currentProfile.lastMeasurementDate;

  // Crea oggetto athlete aggiornato con dati corretti
  const athleteWithCorrectData = {
    ...athlete,
    current_ftp: currentFTP,
    weight_kg: currentWeight
  };

  // Carica dati e analizza FTP automaticamente + sistema HR
  useEffect(() => {
    // CONDIZIONO IL CARICAMENTO ALL'IDRATAZIONE
    if (!isHydrated) return;
    
    const loadDataAndAnalyzeFTP = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // Carica il profilo più recente dell'atleta
        const { data: profileEntry, error: profileError } = await supabase
          .from('athlete_profile_entries')
          .select('ftp_watts, weight_kg, effective_date')
          .eq('athlete_id', athleteId)
          .order('effective_date', { ascending: false })
          .limit(1)
          .single();
        
        if (profileEntry && !profileError) {
          setCurrentProfile({
            ftp: profileEntry.ftp_watts || null,
            weight: profileEntry.weight_kg || null,
            lastMeasurementDate: profileEntry.effective_date || null
          });
        }
        
        // Carica attività complete per analisi FTP e HR
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
            normalized_power_watts,
            avg_heart_rate,
            max_heart_rate,
            avg_cadence,
            tss,
            activity_type
          `)
          .eq('athlete_id', athleteId)
          .order('activity_date', { ascending: false });
        
        if (activitiesError) {
          console.error('Errore nel caricamento delle attività:', activitiesError);
          setActivities([]);
        } else {
          setActivities(activities || []);
          
          // Analizza FTP automaticamente (mantiene la logica esistente)
          if (activities && activities.length > 0) {
            try {
              const estimation = await estimateFTPFromActivities(
                activities as any[], 
                profileEntry?.ftp_watts || null, 
                3 // minActivities - il sistema ora sceglie automaticamente il periodo ottimale
              );
              setFtpEstimation(estimation);
              
              const shouldSuggest = estimation ? shouldSuggestFTPUpdate(estimation, profileEntry?.ftp_watts) : false;
              
              if (estimation && shouldSuggest) {
                setShowFtpSuggestion(true);
              }
            } catch (error) {
              console.error('Errore nell\'analisi FTP:', error);
            }
          }
          
          // Analisi automatica HR e calcolo zone
          await analyzeHRAndZones(activities || [], profileEntry);
        }
        
        // Carica notifiche tab
        try {
          const tabNotifications = await getTabNotifications(athleteId);
          if (tabNotifications.data) {
            setNotifications(tabNotifications.data);
          }
        } catch (error) {
          console.error('Errore nel caricamento delle notifiche:', error);
        }
        
      } catch (error) {
        console.error('Errore generale nel caricamento dei dati:', error);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataAndAnalyzeFTP();
  }, [athleteId, isHydrated]); // AGGIUNGO isHydrated ALLE DIPENDENZE

  // Analisi automatica HR e calcolo zone di potenza/frequenza cardiaca
  const analyzeHRAndZones = async (activities: any[], profileEntry: any) => {
    try {
      // Calcola zone di potenza se FTP disponibile
      if (profileEntry?.ftp_watts) {
        const zones: PowerZone[] = [
          { zone: 'Z1', name: 'Recupero', minWatts: 0, maxWatts: Math.round(profileEntry.ftp_watts * 0.55), color: '#6b7280', percentage: 55 },
          { zone: 'Z2', name: 'Resistenza', minWatts: Math.round(profileEntry.ftp_watts * 0.56), maxWatts: Math.round(profileEntry.ftp_watts * 0.75), color: '#10b981', percentage: 75 },
          { zone: 'Z3', name: 'Tempo', minWatts: Math.round(profileEntry.ftp_watts * 0.76), maxWatts: Math.round(profileEntry.ftp_watts * 0.90), color: '#f59e0b', percentage: 90 },
          { zone: 'Z4', name: 'Soglia', minWatts: Math.round(profileEntry.ftp_watts * 0.91), maxWatts: Math.round(profileEntry.ftp_watts * 1.05), color: '#ef4444', percentage: 105 },
          { zone: 'Z5', name: 'VO2max', minWatts: Math.round(profileEntry.ftp_watts * 1.06), maxWatts: Math.round(profileEntry.ftp_watts * 1.20), color: '#8b5cf6', percentage: 120 },
          { zone: 'Z6', name: 'Anaerobico', minWatts: Math.round(profileEntry.ftp_watts * 1.21), maxWatts: Math.round(profileEntry.ftp_watts * 1.50), color: '#dc2626', percentage: 150 },
          { zone: 'Z7', name: 'Neuromuscolare', minWatts: Math.round(profileEntry.ftp_watts * 1.51), maxWatts: 999, color: '#7c2d12', percentage: 200 }
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
          if (shouldSuggestHRUpdate(hrAnalysis)) {
            setShowHrSuggestion(true);
          }
        }
      }
    } catch (error) {
      console.error('Errore analisi HR e zone:', error);
    }
  };

  // Calcola statistiche complete dalle attività
  const calculateStatsFromActivities = (activities: any[]) => {
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
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime,
      avgPower,
      recentActivities,
    };
  };

  // Calcola lo stato della forma fisica
  const getFormStatus = () => {
    const stats = calculateStatsFromActivities(activities);
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}g ${remainingHours}h`;
    }
    return `${hours}h ${minutes % 60}m`;
  };

  // Carica notifiche dinamiche e tab visitati
  useEffect(() => {
    // CONDIZIONO ANCHE QUESTO ALL'IDRATAZIONE
    if (!isHydrated) return;
    
    const loadNotifications = async () => {
      try {
        const result = await getTabNotifications(athleteId);
        if (result.data) {
          setNotifications(result.data);
        }
      } catch (error) {
        console.error('Errore nel caricamento delle notifiche:', error);
      }
    };

    loadNotifications();
  }, [athleteId, isHydrated]); // AGGIUNGO isHydrated ALLE DIPENDENZE

  const isTabNew = (tabId: TabId) => {
    if (!notifications) return false;
    // Semplificato per ora - possiamo estendere dopo aver verificato la struttura di NotificationStatus
    return !visitedTabs.has(tabId);
  };

  const handleTabChange = async (newTab: TabId) => {
    setActiveTab(newTab);
    
    // Marca il tab come visitato
    if (!visitedTabs.has(newTab)) {
      setVisitedTabs(prev => new Set([...prev, newTab]));
      
      try {
        await markTabAsVisited(athleteId, newTab);
      } catch (error) {
        console.error('Errore nel marcare il tab come visitato:', error);
      }
    }
  };

  const handleAcceptFTPSuggestion = async () => {
    if (!ftpEstimation) return;
    
    try {
      setIsUpdating(true);
      
      const ftpValue = Math.round(ftpEstimation.estimatedFTP);
      const today = new Date().toISOString().split('T')[0];
      
      const result = await saveAthleteProfileEntry(athleteId, {
        effectiveDate: today,
        ftp: ftpValue,
        weight: currentWeight
      });
      
      if (result.success) {
        setCurrentProfile(prev => ({
          ...prev,
          ftp: ftpValue,
          lastMeasurementDate: today
        }));
        
        setShowFtpSuggestion(false);
        setFtpEstimation(null);
        
        showSuccess(`FTP aggiornato a ${ftpValue}W con successo!`);
      } else {
        showError(result.error || 'Errore nell\'aggiornamento dell\'FTP');
      }
    } catch (error) {
      console.error('Errore aggiornamento FTP:', error);
      showError('Errore nell\'aggiornamento dell\'FTP');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickUpdate = async () => {
    if (!newFTP && !newWeight) {
      showError('Inserisci almeno un valore da aggiornare');
      return;
    }

    try {
      setIsUpdating(true);
      
      const ftpValue = newFTP ? Math.round(parseFloat(newFTP)) : currentFTP;
      const weightValue = newWeight ? parseFloat(newWeight) : currentWeight;
      const today = new Date().toISOString().split('T')[0];
      
      if (ftpValue && (ftpValue < FTP_VALIDATION_RANGES.absolute.min || ftpValue > FTP_VALIDATION_RANGES.absolute.max)) {
        showError(`FTP deve essere tra ${FTP_VALIDATION_RANGES.absolute.min} e ${FTP_VALIDATION_RANGES.absolute.max} watts`);
        return;
      }
      
      if (weightValue && ftpValue) {
        const wPerKg = ftpValue / weightValue;
        if (wPerKg < FTP_VALIDATION_RANGES.wPerKg.min || wPerKg > FTP_VALIDATION_RANGES.wPerKg.max) {
          showError(`Rapporto W/kg (${wPerKg.toFixed(2)}) non realistico. Verifica i valori inseriti.`);
          return;
        }
      }
      
      const result = await saveAthleteProfileEntry(athleteId, {
        effectiveDate: today,
        ftp: ftpValue,
        weight: weightValue
      });
      
      if (result.success) {
        setCurrentProfile({
          ftp: ftpValue,
          weight: weightValue,
          lastMeasurementDate: today
        });
        
        setShowUpdatePanel(false);
        setNewFTP('');
        setNewWeight('');
        setFtpSource('test');
        
        showSuccess('Dati atleta aggiornati con successo!');
      } else {
        showError(result.error || 'Errore nell\'aggiornamento dei dati');
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      showError('Errore nell\'aggiornamento dei dati');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calcola statistiche per il cruscotto
  const stats = calculateStatsFromActivities(activities);
  const formStatus = getFormStatus();

  // SICUREZZA IDRATAZIONE: Non renderizzare nulla fino all'idratazione completa
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      ) : (
        <>
          {/* HEADER ANALYTICS PROFESSIONALE */}
          <div className="space-y-6">
            
            {/* Header Analytics */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Avanzate</h1>
                <p className="text-gray-600 dark:text-gray-400">Analisi scientifiche approfondite per l'ottimizzazione delle performance</p>
              </div>
              
              {/* Badge Stato */}
              <div className={`flex items-center gap-3 ${spacing.horizontal.sm}`}>
                <div className={`flex items-center gap-2 ${spacing.horizontal.sm} py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {stats.recentActivities} attività recenti
                  </span>
                </div>
                
                {currentFTP && (
                  <div className={`flex items-center gap-2 ${spacing.horizontal.sm} py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full`}>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      FTP: {currentFTP}W ({currentWPerKg})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* NAVIGAZIONE VERSO LE TAB DI ANALISI APPROFONDITA */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className={`text-xl font-bold text-gray-900 dark:text-white ${spacing.bottom.sm}`}>
                Analisi Approfondite
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Esplora strumenti professionali per l'analisi delle performance
              </p>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={(value: string) => handleTabChange(value as TabId)} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                {TABS_CONFIG.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    disabled={tab.disabled}
                    className={`flex items-center gap-2 ${spacing.horizontal.sm} py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-400`}
                  >
                    {tab.icon}
                    <span className="hidden md:block">{tab.label}</span>
                    <span className="md:hidden text-xs">{tab.label.split(' ')[0]}</span>
                    {isTabNew(tab.id) && (
                      <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-600 border-orange-200">
                        Nuovo
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Contents */}
              <div className="mt-6">
                <TabsContent value="power" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {TABS_CONFIG[0].icon}
                        Analisi Potenza Avanzata
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {TABS_CONFIG[0].description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<LoadingSkeleton />}>
                        <PowerAnalysisTab athleteId={athleteId} athlete={athleteWithCorrectData} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="training-load" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {TABS_CONFIG[1].icon}
                        Carico Allenamento Scientifico
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {TABS_CONFIG[1].description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<LoadingSkeleton />}>
                        <TrainingLoadTab athleteId={athleteId} athlete={athleteWithCorrectData} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cadence" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {TABS_CONFIG[2].icon}
                        Analisi Cadenza e Efficienza
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {TABS_CONFIG[2].description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<LoadingSkeleton />}>
                        <CadenceAnalysisTab athleteId={athleteId} athlete={athleteWithCorrectData} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trends" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {TABS_CONFIG[3].icon}
                        Trend Performance e Machine Learning
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {TABS_CONFIG[3].description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<LoadingSkeleton />}>
                        <PerformanceTrendsTab athleteId={athleteId} athlete={athleteWithCorrectData} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="climbing" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {TABS_CONFIG[4].icon}
                        Analisi Salite Professionale
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {TABS_CONFIG[4].description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<LoadingSkeleton />}>
                        <ClimbingAnalysisTab athleteId={athleteId} athlete={athleteWithCorrectData} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
} 