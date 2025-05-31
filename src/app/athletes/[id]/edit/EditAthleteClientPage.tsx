'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Athlete, AthleteProfileEntry, Activity } from '@/lib/types';
import { getAthleteDataForClient, getAthleteProfileEntriesDataForClient, type SaveAthleteProfileEntryResult, deleteAthleteProfileEntry, saveAthleteProfileEntry } from '../../athleteProfileActions'; // Percorso corretto
import Image from 'next/image';
import Link from 'next/link';

import AthleteForm from '@/components/AthleteForm';
import AthleteProfileEntryForm from '@/components/AthleteProfileEntryForm';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Importa i componenti Tabs di Shadcn/ui
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importa i componenti Card di Shadcn/ui
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Importa Button di Shadcn/ui
import { Button } from "@/components/ui/button";

// Importa i nuovi componenti
import AthleteSummaryCard from '@/components/AthleteSummaryCard';
import PowerZonesDisplay from '@/components/PowerZonesDisplay';
import VO2maxDisplay from '@/components/VO2maxDisplay';
// import { calculateVO2max, type VO2maxInput } from '@/lib/vo2maxCalculations'; // RIMOSSO - usa server actions
import { updateVO2maxIfNeeded } from './vo2maxActions';

import AthleteActivitiesTab from '@/components/AthleteActivitiesTab';

// Importa il componente per eliminare l'atleta
import DeleteAthleteButton from '@/components/DeleteAthleteButton';

// Importa le funzioni per calcoli professionali
import { estimateFTPFromActivities, shouldSuggestFTPUpdate, type FTPEstimationResult } from '@/lib/ftpEstimation';
import { analyzeHRFromActivities, type HRZoneEstimationResult } from '@/lib/hrZoneCalculations';

// Importa il dashboard analytics
import PerformanceAnalyticsDashboard from '@/components/analytics/PerformanceAnalyticsDashboard';

interface EditAthleteClientPageProps {
  initialAthlete: Athlete;
  initialProfileEntries: AthleteProfileEntry[];
  initialActivities: Activity[];
  athleteId: string;
}

export default function EditAthleteClientPage({
  initialAthlete,
  initialProfileEntries,
  initialActivities,
  athleteId,
}: EditAthleteClientPageProps) {
  const router = useRouter();
  const [isPendingGlobal, startTransitionGlobal] = useTransition(); // Per operazioni globali come il refresh dati

  // AGGIUNGO GESTIONE IDRATAZIONE SICURA
  const [isHydrated, setIsHydrated] = useState(false);

  const [athleteData, setAthleteData] = useState<Athlete>(initialAthlete);
  const [profileEntriesData, setProfileEntriesData] = useState<AthleteProfileEntry[]>(initialProfileEntries);
  const [activitiesData, setActivitiesData] = useState<Activity[]>(initialActivities);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Stato per controllare i tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Stato per il form nuova misurazione
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);

  // EFFETTO PER IDRATAZIONE SICURA
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Estrai i dati più recenti per il cruscotto
  const latestEntry = profileEntriesData.length > 0 ? profileEntriesData[0] : null;
  let currentWeight: number | null = null;
  let currentFtp: number | null = null;
  let currentWPerKg: number | null = null;

  if (latestEntry) {
    currentWeight = latestEntry.weight_kg ?? null; // Esplicito fallback a null se undefined
    currentFtp = latestEntry.ftp_watts ?? null;    // Esplicito fallback a null se undefined
    if (currentFtp && currentWeight && currentWeight > 0) {
      currentWPerKg = parseFloat((currentFtp / currentWeight).toFixed(2));
    }
  }

  // STATI PER CALCOLI PROFESSIONALI
  const [ftpEstimation, setFtpEstimation] = useState<FTPEstimationResult | null>(null);
  const [hrAnalysis, setHrAnalysis] = useState<HRZoneEstimationResult | null>(null);
  const [professionalMetrics, setProfessionalMetrics] = useState<{
    tssWeekly: number;
    ifAverage: number;
    ctl: number;
    atl: number;
    tsb: number;
    vo2max: number | null;
    totalHours: number;
    totalDistance: number;
    totalElevation: number;
    personalBests: {
      power1s: number | null;
      power5s: number | null;
      power1min: number | null;
      power5min: number | null;
      power20min: number | null;
      power60min: number | null;
    };
  }>({
    tssWeekly: 0,
    ifAverage: 0,
    ctl: 0,
    atl: 0,
    tsb: 0,
    vo2max: null,
    totalHours: 0,
    totalDistance: 0,
    totalElevation: 0,
    personalBests: {
      power1s: null,
      power5s: null,
      power1min: null,
      power5min: null,
      power20min: null,
      power60min: null,
    }
  });

  // Funzione per calcolare metriche dalle attività
  const calculateProfessionalMetrics = (activities: Activity[]) => {
    // Filtro attività con dati validi
    const validActivities = activities.filter(a => 
      a.activity_date && 
      a.duration_seconds && 
      a.duration_seconds > 300 // Almeno 5 minuti
    );

    // Calcola TSS settimanale (ultimi 7 giorni)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyActivities = validActivities.filter(a => 
      new Date(a.activity_date!) >= oneWeekAgo && a.tss
    );
    
    const tssWeekly = weeklyActivities.reduce((sum, a) => sum + (a.tss || 0), 0);

    // Calcola IF medio (ultimi 30 giorni)
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    const monthlyActivities = validActivities.filter(a => 
      new Date(a.activity_date!) >= oneMonthAgo && a.intensity_factor
    );
    
    const ifAverage = monthlyActivities.length > 0 
      ? monthlyActivities.reduce((sum, a) => sum + (a.intensity_factor || 0), 0) / monthlyActivities.length
      : 0;

    // Calcola totali
    const totalHours = validActivities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / 3600;
    const totalDistance = validActivities.reduce((sum, a) => sum + (a.distance_meters || 0), 0) / 1000; // km
    const totalElevation = validActivities.reduce((sum, a) => sum + (a.elevation_gain_meters || 0), 0);

    // Trova Personal Bests (valori massimi tra tutte le attività)
    const personalBests = validActivities.length > 0 ? {
      power1s: Math.max(...validActivities.map(a => a.max_power_watts || 0)) || null,
      power5s: Math.max(...validActivities.map(a => a.pb_power_5s_watts || 0)) || null,
      power1min: Math.max(...validActivities.map(a => a.pb_power_60s_watts || 0)) || null,
      power5min: Math.max(...validActivities.map(a => a.pb_power_300s_watts || 0)) || null,
      power20min: Math.max(...validActivities.map(a => a.pb_power_1200s_watts || 0)) || null,
      power60min: Math.max(...validActivities.map(a => a.pb_power_3600s_watts || 0)) || null,
    } : {
      power1s: null,
      power5s: null,
      power1min: null,
      power5min: null,
      power20min: null,
      power60min: null,
    };

    // Semplice calcolo CTL/ATL (qui dovresti implementare la formula PMC completa)
    const recentTSS = validActivities
      .filter(a => new Date(a.activity_date!) >= oneMonthAgo && a.tss)
      .map(a => a.tss || 0);
    
    const ctl = recentTSS.length > 0 ? recentTSS.reduce((a, b) => a + b, 0) / recentTSS.length : 0;
    const atl = weeklyActivities.reduce((sum, a) => sum + (a.tss || 0), 0) / 7;
    const tsb = ctl - atl;

    return {
      tssWeekly: Math.round(tssWeekly),
      ifAverage: Number(ifAverage.toFixed(2)),
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(tsb),
      vo2max: null, // Calcolato dopo con FTP e peso
      totalHours: Math.round(totalHours),
      totalDistance: Math.round(totalDistance),
      totalElevation: Math.round(totalElevation),
      personalBests
    };
  };

  // useEffect per analizzare le attività al caricamento
  useEffect(() => {
    // CONDIZIONO L'ANALISI ALL'IDRATAZIONE
    if (!isHydrated) return;
    
    const analyzeActivitiesData = async () => {
      try {
        // Calcola metriche di base
        const metrics = calculateProfessionalMetrics(activitiesData);
        
        // Stima FTP automaticamente
        const ftpResult = estimateFTPFromActivities(
          activitiesData, 
          latestEntry?.ftp_watts || undefined,
          3, // minActivities
          90 // daysLookback
        );
        
        // Analizza dati HR
        const hrResult = analyzeHRFromActivities(
          activitiesData,
          2, // minActivities ridotto da 5 a 2
          365 * 3 // daysLookback esteso a 3 anni invece di 90 giorni
        );

        // Calcola VO2max usando il nuovo sistema scientifico
        let vo2max = null;
        
        // Prima legge dal database (profilo più recente)
        if (latestEntry?.vo2max_ml_kg_min) {
          vo2max = latestEntry.vo2max_ml_kg_min;
        }
        
        // Poi verifica se serve aggiornare
        try {
          const vo2maxUpdate = await updateVO2maxIfNeeded(
            initialAthlete, 
            activitiesData, 
            latestEntry
          );
          
          if (vo2maxUpdate.updated && vo2maxUpdate.vo2max) {
            vo2max = vo2maxUpdate.vo2max;
            console.log(`VO2max aggiornato: ${vo2max} (metodo: ${vo2maxUpdate.method})`);
          } else if (!vo2maxUpdate.updated && vo2maxUpdate.vo2max) {
            // Usa il valore dal database se non è stato aggiornato
            vo2max = vo2maxUpdate.vo2max;
          }
        } catch (error) {
          console.error('Errore aggiornamento VO2max:', error);
          // Fallback: se non riesce ad aggiornare, usa il valore dal database
        }

        setProfessionalMetrics({
          ...metrics,
          vo2max
        });
        
        setFtpEstimation(ftpResult);
        setHrAnalysis(hrResult);
        
      } catch (error) {
        console.error('Errore nell\'analisi delle attività:', error);
      }
    };

    analyzeActivitiesData();
  }, [activitiesData, latestEntry, isHydrated, initialAthlete.birth_date, initialAthlete.sex, initialActivities]); // AGGIUNGO isHydrated ALLE DIPENDENZE

  const handleProfileEntrySaved = async (result: SaveAthleteProfileEntryResult) => {
    setFeedbackMessage(null); // Resetta messaggi precedenti del form specifico
    if (result.success) {
      // Messaggio di successo già mostrato da AthleteProfileEntryForm.
      // Ora aggiorniamo i dati globali della pagina.
      startTransitionGlobal(async () => {
        // router.refresh(); // Già chiamato da AthleteProfileEntryForm, ma non fa male ripeterlo o coordinare
        // Per assicurare che i dati siano freschissimi dopo l'upsert e l'eventuale update di athletes:
        const refreshedAthlete = await getAthleteDataForClient(athleteId);
        const refreshedEntries = await getAthleteProfileEntriesDataForClient(athleteId);

        if (refreshedAthlete) {
          setAthleteData(refreshedAthlete);
        }
        setProfileEntriesData(refreshedEntries);
        // Non mostriamo un altro messaggio di successo qui, quello del form basta.
      });
    } else {
      // L'errore è già mostrato da AthleteProfileEntryForm.
      // Potremmo loggare o gestire ulteriormente se necessario.
      console.error("Errore salvataggio voce profilo riportato al client wrapper:", result.error);
    }
  };

  // Aggiungo la funzione per gestire l'eliminazione della voce profilo
  const handleDeleteProfileEntry = async (entryId: string, effectiveDate: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la voce del ${format(new Date(effectiveDate), 'dd/MM/yyyy')}?`)) {
      return; // Utente ha annullato
    }

    setFeedbackMessage(null); // Resetta messaggi precedenti
    startTransitionGlobal(async () => {
      const result = await deleteAthleteProfileEntry(athleteId, entryId);
      
      if (result.success) {
        // Aggiorniamo i dati locali senza fare un'altra richiesta
        setProfileEntriesData(prev => prev.filter(entry => entry.id !== entryId));
        
        // Aggiorniamo comunque i dati completi per assicurarci che tutto sia sincronizzato
        const refreshedAthlete = await getAthleteDataForClient(athleteId);
        const refreshedEntries = await getAthleteProfileEntriesDataForClient(athleteId);

        if (refreshedAthlete) {
          setAthleteData(refreshedAthlete);
        }
        setProfileEntriesData(refreshedEntries);
        setFeedbackMessage({ 
          type: 'success', 
          text: 'Voce eliminata con successo' 
        });

        // Nascondi il messaggio dopo 3 secondi
        setTimeout(() => {
          setFeedbackMessage(null);
        }, 3000);
      } else {
        setFeedbackMessage({ 
          type: 'error', 
          text: result.error || 'Errore durante l\'eliminazione' 
        });
      }
    });
  };

  // Calcola Zone di Frequenza Cardiaca automatiche
  const calculateHRZones = () => {
    // Prima priorità: usa i dati dell'analisi delle attività
    if (hrAnalysis && hrAnalysis.estimatedHRMax > 0) {
      const hrMax = hrAnalysis.estimatedHRMax;
      const lthr = hrAnalysis.estimatedLTHR;
      
      // Se abbiamo LTHR, usiamo zone più precise
      if (lthr && lthr > 0) {
        return {
          maxHR: hrMax,
          lthr: lthr,
          source: 'activities',
          confidence: hrAnalysis.confidence,
          reasoning: hrAnalysis.reasoning,
          zones: [
            { name: 'Z1 - Recupero Attivo', min: Math.round(lthr * 0.68), max: Math.round(lthr * 0.83), color: 'bg-gray-500' },
            { name: 'Z2 - Aerobico Base', min: Math.round(lthr * 0.83), max: Math.round(lthr * 0.94), color: 'bg-blue-500' },
            { name: 'Z3 - Aerobico', min: Math.round(lthr * 0.94), max: Math.round(lthr * 1.05), color: 'bg-green-500' },
            { name: 'Z4 - Soglia', min: Math.round(lthr * 1.05), max: Math.round(lthr * 1.15), color: 'bg-yellow-500' },
            { name: 'Z5 - VO2max', min: Math.round(lthr * 1.15), max: Math.round(hrMax), color: 'bg-red-500' }
          ]
        };
      }
      
      // Altrimenti usiamo zone basate su FC Max
      return {
        maxHR: hrMax,
        lthr: null,
        source: 'activities',
        confidence: hrAnalysis.confidence,
        reasoning: hrAnalysis.reasoning,
        zones: [
          { name: 'Z1 - Recupero Attivo', min: Math.round(hrMax * 0.50), max: Math.round(hrMax * 0.60), color: 'bg-gray-500' },
          { name: 'Z2 - Aerobico Base', min: Math.round(hrMax * 0.60), max: Math.round(hrMax * 0.70), color: 'bg-blue-500' },
          { name: 'Z3 - Aerobico', min: Math.round(hrMax * 0.70), max: Math.round(hrMax * 0.80), color: 'bg-green-500' },
          { name: 'Z4 - Soglia', min: Math.round(hrMax * 0.80), max: Math.round(hrMax * 0.90), color: 'bg-yellow-500' },
          { name: 'Z5 - VO2max', min: Math.round(hrMax * 0.90), max: Math.round(hrMax), color: 'bg-red-500' }
        ]
      };
    }
    
    // Seconda priorità: usa zone HR salvate manualmente nel profilo
    if (latestEntry?.max_hr_bpm && latestEntry.max_hr_bpm > 0) {
      const hrMax = latestEntry.max_hr_bpm;
      
      return {
        maxHR: hrMax,
        lthr: null,
        source: 'manual',
        confidence: 0.9,
        reasoning: 'Frequenza cardiaca massima inserita manualmente',
        zones: [
          { name: 'Z1 - Recupero Attivo', min: Math.round(hrMax * 0.50), max: Math.round(hrMax * 0.60), color: 'bg-gray-500' },
          { name: 'Z2 - Aerobico Base', min: Math.round(hrMax * 0.60), max: Math.round(hrMax * 0.70), color: 'bg-blue-500' },
          { name: 'Z3 - Aerobico', min: Math.round(hrMax * 0.70), max: Math.round(hrMax * 0.80), color: 'bg-green-500' },
          { name: 'Z4 - Soglia', min: Math.round(hrMax * 0.80), max: Math.round(hrMax * 0.90), color: 'bg-yellow-500' },
          { name: 'Z5 - VO2max', min: Math.round(hrMax * 0.90), max: Math.round(hrMax), color: 'bg-red-500' }
        ]
      };
    }
    
    // Terza priorità: stima approssimativa dall'età (se disponibile)
    if (initialAthlete.birth_date) {
      const age = new Date().getFullYear() - new Date(initialAthlete.birth_date).getFullYear();
      if (age > 10 && age < 100) { // Controllo ragionevolezza
        const estimatedHRMax = 220 - age;
        
        return {
          maxHR: estimatedHRMax,
          lthr: Math.round(estimatedHRMax * 0.85),
          source: 'age_formula',
          confidence: 0.6,
          reasoning: `Stima approssimativa dall'età (${age} anni). I dati miglioreranno con più attività.`,
          zones: [
            { name: 'Z1 - Recupero Attivo', min: Math.round(estimatedHRMax * 0.50), max: Math.round(estimatedHRMax * 0.60), color: 'bg-gray-500' },
            { name: 'Z2 - Aerobico Base', min: Math.round(estimatedHRMax * 0.60), max: Math.round(estimatedHRMax * 0.70), color: 'bg-blue-500' },
            { name: 'Z3 - Aerobico', min: Math.round(estimatedHRMax * 0.70), max: Math.round(estimatedHRMax * 0.80), color: 'bg-green-500' },
            { name: 'Z4 - Soglia', min: Math.round(estimatedHRMax * 0.80), max: Math.round(estimatedHRMax * 0.90), color: 'bg-yellow-500' },
            { name: 'Z5 - VO2max', min: Math.round(estimatedHRMax * 0.90), max: Math.round(estimatedHRMax), color: 'bg-red-500' }
          ]
        };
      }
    }
    
    // Nessun dato disponibile
    return null;
  };

  const hrZones = calculateHRZones();

  // Alert System - Verifica se servono aggiornamenti
  const needsFTPUpdate = !currentFtp || (latestEntry && 
    new Date().getTime() - new Date(latestEntry.effective_date).getTime() > 90 * 24 * 60 * 60 * 1000 // 90 giorni
  );
  
  const needsWeightUpdate = !currentWeight || (latestEntry && 
    new Date().getTime() - new Date(latestEntry.effective_date).getTime() > 30 * 24 * 60 * 60 * 1000 // 30 giorni
  );
  
  // Alert per zone HR rilevate ma non ancora applicate - logica migliorata
  const needsHRUpdate = hrAnalysis && hrAnalysis.isReliable && 
    (!latestEntry?.max_hr_bpm || 
     Math.abs(hrAnalysis.estimatedHRMax - latestEntry.max_hr_bpm) > hrAnalysis.estimatedHRMax * 0.05);

  // Funzione per ottenere il profilo più recente
  const getCurrentProfile = () => {
    if (profileEntriesData.length === 0) return null;
    return profileEntriesData.sort((a, b) => 
      new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
    )[0];
  };

  // Callback per refresh dei dati atleta
  const refreshAthleteDataCallback = async () => {
    startTransitionGlobal(async () => {
      const refreshedAthlete = await getAthleteDataForClient(athleteId);
      const refreshedEntries = await getAthleteProfileEntriesDataForClient(athleteId);

      if (refreshedAthlete) {
        setAthleteData(refreshedAthlete);
      }
      setProfileEntriesData(refreshedEntries);
    });
  };

  // Handler per il successo del form nuova misurazione
  const handleNewEntrySuccess = async (result: SaveAthleteProfileEntryResult) => {
    if (result.success) {
      setShowNewEntryForm(false);
      await refreshAthleteDataCallback();
      setFeedbackMessage({ 
        type: 'success', 
        text: 'Misurazione salvata con successo' 
      });

      // Nascondi il messaggio dopo 3 secondi
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);
    } else {
      setFeedbackMessage({ 
        type: 'error', 
        text: result.error || 'Errore durante il salvataggio' 
      });
    }
  };

  // SICUREZZA IDRATAZIONE: Non renderizzare nulla fino all'idratazione completa
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
        <div className="absolute inset-0 grid-dots pointer-events-none" />
        <div className="relative">
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-8 animate-pulse">
              {/* Header skeleton */}
              <div className="h-32 bg-white/70 dark:bg-gray-800/70 rounded-3xl" />
              {/* Tabs skeleton */}
              <div className="h-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl max-w-2xl mx-auto" />
              {/* Content skeleton */}
              <div className="space-y-6">
                <div className="h-64 bg-white dark:bg-gray-800 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          {/* Ultra-Modern Header */}
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
              {/* Gradient Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-t-3xl" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Avatar Moderno */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {initialAthlete.name.charAt(0)}{initialAthlete.surname.charAt(0)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-800" />
                  </div>
                  
                  {/* Info Atleta */}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {initialAthlete.name} {initialAthlete.surname}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Dashboard Atleta
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-4">
                  {latestEntry && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Ultima modifica</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {format(new Date(latestEntry.effective_date), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                    Attivo
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Ultra Pulita */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-8">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-1 rounded-2xl shadow-lg">
                <TabsTrigger 
                  value="dashboard" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-medium"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="profilo"
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-medium"
                >
                  Profilo
                </TabsTrigger>
                <TabsTrigger 
                  value="attivita"
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-medium"
                >
                  Attività
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="space-y-8">
              {/* CRUSCOTTO PROFESSIONALE - DASHBOARD PRINCIPALE */}
              
              {/* Header Cruscotto */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cruscotto Performance</h1>
                  <p className="text-gray-600 dark:text-gray-400">Panoramica completa delle metriche chiave di {initialAthlete.name}</p>
                </div>
              </div>

              {/* Feedback Message */}
              {feedbackMessage && (
                <div className={`mb-6 p-4 rounded-xl ${
                  feedbackMessage.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}>
                  <p className="text-sm font-medium">{feedbackMessage.text}</p>
                </div>
              )}

              {/* ALERT SYSTEM PROFESSIONALI */}
              {(needsFTPUpdate || needsWeightUpdate || needsHRUpdate || (ftpEstimation && ftpEstimation.isReliable && shouldSuggestFTPUpdate(ftpEstimation, currentFtp))) && (
                <div className="mb-6 space-y-3">
                  
                  {/* Alert Zone HR Rilevate */}
                  {needsHRUpdate && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Zone HR rilevate: FC Max {hrAnalysis?.estimatedHRMax} bpm
                          {hrAnalysis?.estimatedLTHR && `, LTHR ${hrAnalysis.estimatedLTHR} bpm`}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {hrAnalysis?.reasoning}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setHrAnalysis(null)}
                          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Ignora
                        </button>
                        <button
                          onClick={async () => {
                            if (!hrAnalysis) return;
                            
                            try {
                              const today = new Date().toISOString().split('T')[0];
                              const profileData = {
                                effectiveDate: today,
                                ftp: currentFtp,
                                weight: currentWeight,
                                hrMax: Math.round(hrAnalysis.estimatedHRMax),
                                hrLthr: hrAnalysis.estimatedLTHR ? Math.round(hrAnalysis.estimatedLTHR) : null
                              };
                              
                              const result = await saveAthleteProfileEntry(athleteId, profileData);
                              
                              if (result.success) {
                                const refreshedEntries = await getAthleteProfileEntriesDataForClient(athleteId);
                                setProfileEntriesData(refreshedEntries);
                                setHrAnalysis(null);
                                setFeedbackMessage({ 
                                  type: 'success', 
                                  text: `Zone HR aggiornate: FC Max ${Math.round(hrAnalysis.estimatedHRMax)} bpm` 
                                });
                                setTimeout(() => setFeedbackMessage(null), 3000);
                              } else {
                                setFeedbackMessage({ 
                                  type: 'error', 
                                  text: result.error || 'Errore durante l\'aggiornamento delle zone HR' 
                                });
                              }
                            } catch (error) {
                              console.error('Errore aggiornamento zone HR:', error);
                              setFeedbackMessage({ 
                                type: 'error', 
                                text: 'Errore durante l\'aggiornamento delle zone HR' 
                              });
                            }
                          }}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Accetta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Alert FTP Rilevato */}
                  {ftpEstimation && ftpEstimation.isReliable && shouldSuggestFTPUpdate(ftpEstimation, currentFtp) && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          FTP rilevato: {ftpEstimation.estimatedFTP}W
                          {currentFtp && ` (attuale: ${currentFtp}W)`}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Metodo: {ftpEstimation.method === 'TWENTY_MINUTE_TEST' ? 'Test 20min' : 
                            ftpEstimation.method === 'CRITICAL_POWER' ? 'Analisi curve potenza' : 
                            'Analisi attività'} • Confidenza: {Math.round(ftpEstimation.confidence * 100)}%
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setFtpEstimation(null)}
                          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Ignora
                        </button>
                        <button
                          onClick={async () => {
                            if (!ftpEstimation) return;
                            
                            try {
                              const today = new Date().toISOString().split('T')[0];
                              const result = await saveAthleteProfileEntry(athleteId, {
                                effectiveDate: today,
                                ftp: Math.round(ftpEstimation.estimatedFTP),
                                weight: currentWeight
                              });
                              
                              if (result.success) {
                                // Refresh completo di tutti i dati
                                const [refreshedEntries, refreshedActivities] = await Promise.all([
                                  getAthleteProfileEntriesDataForClient(athleteId),
                                  // Re-fetch delle attività per ricalcolare le zone HR
                                  fetch(`/api/athletes/${athleteId}/activities`).then(res => res.json())
                                ]);
                                
                                setProfileEntriesData(refreshedEntries);
                                if (refreshedActivities.success) {
                                  setActivitiesData(refreshedActivities.data);
                                  // Forza il ricalcolo delle metriche
                                  const newMetrics = calculateProfessionalMetrics(refreshedActivities.data);
                                  setProfessionalMetrics(newMetrics);
                                }
                                
                                setFtpEstimation(null);
                                setFeedbackMessage({ 
                                  type: 'success', 
                                  text: `FTP aggiornato a ${Math.round(ftpEstimation.estimatedFTP)}W - Zone e metriche ricalcolate` 
                                });
                                setTimeout(() => setFeedbackMessage(null), 4000);
                              } else {
                                setFeedbackMessage({ 
                                  type: 'error', 
                                  text: result.error || 'Errore durante l\'aggiornamento dell\'FTP' 
                                });
                              }
                            } catch (error) {
                              console.error('Errore aggiornamento FTP:', error);
                              setFeedbackMessage({ 
                                type: 'error', 
                                text: 'Errore durante l\'aggiornamento dell\'FTP' 
                              });
                            }
                          }}
                          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Accetta FTP
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Alert Dati Mancanti */}
                  {(needsFTPUpdate || needsWeightUpdate) && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Dati incompleti</p>
                        <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                          {needsFTPUpdate && (
                            <div>• FTP: {currentFtp ? 'Aggiorna (>90 giorni)' : 'Non impostato'}</div>
                          )}
                          {needsWeightUpdate && (
                            <div>• Peso: {currentWeight ? 'Aggiorna (>30 giorni)' : 'Non inserito'}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => setActiveTab('profilo')}
                          className="text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                        >
                          Inserisci Manualmente
                        </button>
                        <Link 
                          href="/activities/upload"
                          className="text-xs px-3 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                        >
                          Carica Attività
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* KPI PRINCIPALI - 4 Metriche Chiave con Design Moderno */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                
                {/* FTP Attuale - Redesign Professionale */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-blue-200/50 dark:border-blue-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">FTP</div>
                        <div className="text-xs text-gray-500">Threshold Power</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {currentFtp ? `${currentFtp}` : '---'}
                        <span className="text-lg text-blue-500 ml-1">W</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {latestEntry ? `Aggiornato il ${format(new Date(latestEntry.effective_date), 'dd/MM')}` : 'Non impostato'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rapporto W/kg - Redesign Professionale */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-emerald-200/50 dark:border-emerald-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">W/kg</div>
                        <div className="text-xs text-gray-500">Power/Weight</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {currentWPerKg ? `${currentWPerKg}` : '---'}
                        <span className="text-lg text-emerald-500 ml-1">W/kg</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentWeight ? `Peso: ${currentWeight}kg` : 'Peso non inserito'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Peso Attuale - Redesign Professionale */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-200/50 dark:border-purple-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">PESO</div>
                        <div className="text-xs text-gray-500">Body Weight</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {currentWeight ? `${currentWeight}` : '---'}
                        <span className="text-lg text-purple-500 ml-1">kg</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {latestEntry ? 'Misurazione registrata' : 'Non misurato'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Livello Atleta - Nuovo KPI */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-orange-200/50 dark:border-orange-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">LIVELLO</div>
                        <div className="text-xs text-gray-500">Category</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentWPerKg ? (
                          currentWPerKg >= 5.0 ? 'Elite' :
                          currentWPerKg >= 4.0 ? 'Avanzato' :
                          currentWPerKg >= 3.0 ? 'Intermedio' :
                          currentWPerKg >= 2.0 ? 'Principiante' : 'Base'
                        ) : 'N/D'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentWPerKg ? 'Basato su W/kg' : 'Servono dati FTP/Peso'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ZONE COMPLETE E STATUS - Layout 3 Colonne */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* Zone di Potenza */}
                {currentFtp && currentFtp > 0 ? (
                  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zone di Potenza</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">FTP: {currentFtp}W</p>
                      </div>
                    </div>
                    <PowerZonesDisplay currentFtp={currentFtp} />
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-500"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-400 flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zone di Potenza</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">FTP non impostato</p>
                      </div>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">Zone non disponibili</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Imposta FTP per calcolare le zone</p>
                    </div>
                  </div>
                )}

                {/* Zone di Frequenza Cardiaca */}
                {hrZones ? (
                  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                    {/* Gradient diverso basato sulla qualità dei dati */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                      hrZones.confidence >= 0.85 ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500' :
                      hrZones.confidence >= 0.75 ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500' :
                      'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600'
                    }`}></div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                        hrZones.confidence >= 0.85 ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                        hrZones.confidence >= 0.75 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                        'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zone Frequenza Cardiaca</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            FC Max: {hrZones.maxHR} bpm
                            {hrZones.lthr && ` • LTHR: ${hrZones.lthr} bpm`}
                          </p>
                          {/* Badge qualità dati */}
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            hrZones.confidence >= 0.85 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            hrZones.confidence >= 0.75 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {hrZones.source === 'activities' ? 'Da Attività' :
                             hrZones.source === 'manual' ? 'Manuale' :
                             hrZones.source === 'age_formula' ? 'Stima Età' : 'Calcolate'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Messaggio di confidenza e reasoning */}
                    {hrZones.reasoning && (
                      <div className={`mb-4 p-3 rounded-lg text-sm ${
                        hrZones.confidence >= 0.85 ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/10 dark:border-green-800 dark:text-green-400' :
                        hrZones.confidence >= 0.75 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-400' :
                        'bg-gray-50 border border-gray-200 text-gray-800 dark:bg-gray-900/10 dark:border-gray-800 dark:text-gray-400'
                      }`}>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{hrZones.reasoning}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {hrZones.zones.map((zone: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <div className={`w-4 h-4 rounded-full ${zone.color}`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{zone.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{zone.min}-{zone.max} bpm</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-500"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-400 flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zone Frequenza Cardiaca</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dati insufficienti</p>
                      </div>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">Zone non disponibili</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Carica attività con dati HR o aggiungi la data di nascita per ottenere zone stimate
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Atleta */}
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Status Atleta</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Panoramica stato</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Profilo Fisico */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {initialAthlete.birth_date ? 
                            new Date().getFullYear() - new Date(initialAthlete.birth_date).getFullYear() : 
                            'N/A'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Anni</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{initialAthlete.height_cm || 'N/A'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">cm</p>
                      </div>
                    </div>

                    {/* Status Misurazioni */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">FTP Aggiornato</span>
                        <div className="flex items-center gap-2">
                          {!needsFTPUpdate ? (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {!needsFTPUpdate ? 'Sì' : 'No'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Peso Aggiornato</span>
                        <div className="flex items-center gap-2">
                          {!needsWeightUpdate ? (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {!needsWeightUpdate ? 'Sì' : 'No'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Zone Disponibili</span>
                        <div className="flex items-center gap-2">
                          {currentFtp && hrZones ? (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {currentFtp && hrZones ? 'Complete' : 'Parziali'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Level */}
                    {currentWPerKg && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            {currentWPerKg >= 5.0 ? 'Elite' :
                             currentWPerKg >= 4.0 ? 'Avanzato' :
                             currentWPerKg >= 3.0 ? 'Intermedio' :
                             currentWPerKg >= 2.0 ? 'Principiante' : 'Base'}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Livello prestazione</p>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions - RIMUOVO IL PULSANTE "VAI AD ANALYTICS" */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Dashboard Professionale Attiva
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Dati sincronizzati con le attività
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DASHBOARD PROFESSIONALE - METRICHE AVANZATE */}
              {/* Row 1: Metriche Professionali Calcolate */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                
                {/* VO2max Calcolato */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/20 dark:to-purple-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-indigo-200/50 dark:border-indigo-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">VO2MAX</div>
                        <div className="text-xs text-gray-500">ml/kg/min</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {professionalMetrics.vo2max ? professionalMetrics.vo2max : '---'}
                        <span className="text-lg text-indigo-500 ml-1">ml/kg/min</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {professionalMetrics.vo2max ? 
                          (latestEntry?.vo2max_method ? 
                            `${latestEntry.vo2max_method === 'SCIENTIFIC' ? 'Sistema scientifico' : 
                              latestEntry.vo2max_method === 'FTP_BASED' ? 'Basato su FTP' : 
                              'Calcolato dal sistema'}` : 
                            'Calcolato automaticamente') : 
                          'Dati insufficienti'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* TSS Settimanale */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-amber-200/50 dark:border-amber-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">TSS 7g</div>
                        <div className="text-xs text-gray-500">Training Load</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {professionalMetrics.tssWeekly || 0}
                        <span className="text-lg text-amber-500 ml-1">TSS</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Carico settimanale
                      </p>
                    </div>
                  </div>
                </div>

                {/* Intensity Factor Medio */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200/50 dark:border-cyan-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">IF MEDIO</div>
                        <div className="text-xs text-gray-500">Intensity</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {professionalMetrics.ifAverage || '0.00'}
                        <span className="text-lg text-cyan-500 ml-1">IF</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Media ultimi 30 giorni
                      </p>
                    </div>
                  </div>
                </div>

                {/* Condizione Forma (CTL/ATL) */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-800/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-rose-200/50 dark:border-rose-700/50">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">FORMA</div>
                        <div className="text-xs text-gray-500">CTL/ATL</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {professionalMetrics.tsb > 0 ? 'Buona' : professionalMetrics.tsb < -10 ? 'Affaticato' : 'Normale'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        CTL: {professionalMetrics.ctl} | ATL: {professionalMetrics.atl}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Personal Bests Compatti */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                
                {/* Personal Bests Potenza */}
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Best Potenza</h2>
                      <p className="text-gray-600 dark:text-gray-400">Record per diverse durate</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">1s</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {professionalMetrics.personalBests.power1s ? `${professionalMetrics.personalBests.power1s}W` : 'N/D'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Picco massimo</p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">5s</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {professionalMetrics.personalBests.power5s ? `${professionalMetrics.personalBests.power5s}W` : 'N/D'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Sprint massimo</p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">1min</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {professionalMetrics.personalBests.power1min ? `${professionalMetrics.personalBests.power1min}W` : 'N/D'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Potenza neuromuscolare</p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">5min</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {professionalMetrics.personalBests.power5min ? `${professionalMetrics.personalBests.power5min}W` : 'N/D'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">VO2max</p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">20min</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {professionalMetrics.personalBests.power20min ? `${professionalMetrics.personalBests.power20min}W` : 'N/D'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Soglia anaerobica</p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">60min</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {professionalMetrics.personalBests.power60min ? `${professionalMetrics.personalBests.power60min}W` : 'N/D'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Resistenza aerobica</p>
                    </div>
                  </div>
                </div>

                {/* Statistiche Attività */}
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Statistiche Attività</h2>
                      <p className="text-gray-600 dark:text-gray-400">Dati dalle attività caricate</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ore totali</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{professionalMetrics.totalHours}h</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0V7" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Distanza</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{professionalMetrics.totalDistance}km</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dislivello</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{professionalMetrics.totalElevation}m</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attività</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{initialActivities.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <PerformanceAnalyticsDashboard 
                athleteId={athleteId} 
                athlete={athleteData} 
                userId={athleteData.user_id} 
              />
            </TabsContent>

            <TabsContent value="profilo">
              {/* Layout Professionale a Griglia */}
              <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header della Sezione Profilo */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-8 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-300 dark:to-slate-100 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white dark:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestione Profilo Atleta</h1>
                        <p className="text-slate-600 dark:text-slate-400">Informazioni personali, parametri fisiologici e storico misurazioni</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layout Principale a 2 Colonne */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  
                  {/* Colonna Sinistra - Form Principale (2/3) */}
                  <div className="xl:col-span-2 space-y-8">
                    
                    {/* Card Informazioni Personali */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informazioni Personali</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Dati anagrafici e caratteristiche fisiche</p>
                          </div>
                        </div>

                      <AthleteForm 
                        initialData={athleteData} 
                        onFormSubmitSuccess={refreshAthleteDataCallback}
                      />
                            </div>

                    {/* Card Storico Misurazioni */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Storico Misurazioni</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{profileEntriesData.length} misurazione{profileEntriesData.length !== 1 ? 'i' : ''} registrata{profileEntriesData.length !== 1 ? 'e' : ''}</p>
                            </div>
                          </div>
                          
                        <Button
                          onClick={() => setShowNewEntryForm(!showNewEntryForm)}
                          size="sm"
                          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
                          disabled={isPendingGlobal}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Nuova Misurazione
                        </Button>
                        </div>

                      {/* Form nuova misurazione */}
                      {showNewEntryForm && (
                        <div className="mb-8 p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
                          <AthleteProfileEntryForm 
                            athleteId={athleteId}
                            onEntrySaved={handleNewEntrySuccess}
                          />
                          <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/50">
                            <Button
                              onClick={() => setShowNewEntryForm(false)}
                              variant="outline"
                              size="sm"
                              className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              Annulla
                            </Button>
                            </div>
                          </div>
                        )}
                        
                      {/* Tabella storico */}
                        {profileEntriesData.length > 0 ? (
                        <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-100/80 dark:bg-gray-800/80">
                                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Data</th>
                                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">FTP</th>
                                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Peso</th>
                                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Azioni</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                                {profileEntriesData.map(entry => {
                                  return (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {format(new Date(entry.effective_date), 'dd/MM/yyyy', { locale: it })}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              {format(new Date(entry.effective_date), 'EEEE', { locale: it })}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {entry.ftp_watts ? (
                                            <>
                                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{entry.ftp_watts}W</span>
                                            </>
                                          ) : (
                                            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {entry.weight_kg ? (
                                            <>
                                              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{entry.weight_kg}kg</span>
                                            </>
                                          ) : (
                                            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                          onClick={() => handleDeleteProfileEntry(entry.id, entry.effective_date)}
                                          className="group inline-flex items-center justify-center w-10 h-10 text-red-500 hover:text-white hover:bg-red-500 transition-all duration-200 focus:outline-none disabled:opacity-50 rounded-lg hover:scale-105"
                                          disabled={isPendingGlobal}
                                          title="Elimina voce"
                                        >
                                          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                          </div>
                        ) : (
                        <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nessuna misurazione registrata</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">Inizia aggiungendo la prima misurazione dei parametri dell'atleta</p>
                          <Button
                            onClick={() => setShowNewEntryForm(true)}
                            variant="outline"
                            className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Aggiungi Prima Misurazione
                          </Button>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Colonna Destra - Parametri Attuali e Azioni (1/3) */}
                  <div className="space-y-6">
                    
                    {/* Card Parametri Attuali */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Parametri Attuali</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Valori fisiologici correnti</p>
                          </div>
                        </div>

                      {/* Parametri Cards */}
                      <div className="space-y-4">
                        {/* FTP */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">FTP</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Threshold Power</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {getCurrentProfile()?.ftp_watts ? `${getCurrentProfile()?.ftp_watts}W` : '--- W'}
                          </div>
                        </div>

                        {/* Peso */}
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/30 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Peso</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Body Weight</span>
                          </div>
                          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {getCurrentProfile()?.weight_kg ? `${getCurrentProfile()?.weight_kg}kg` : '--- kg'}
                            {getCurrentProfile()?.weight_kg && (
                              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>

                        {/* W/kg */}
                        <div className="bg-purple-50/50 dark:bg-purple-900/30 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">W/kg</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Power Ratio</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {getCurrentProfile()?.ftp_watts && getCurrentProfile()?.weight_kg ? 
                              `${(getCurrentProfile()!.ftp_watts! / getCurrentProfile()!.weight_kg!).toFixed(1)}` : 
                              '---'
                            }
                          </div>
                        </div>

                        {/* VO2max Display */}
                        <VO2maxDisplay
                          birth_date={athleteData.birth_date}
                          sex={athleteData.sex as 'M' | 'F'}
                          weight_kg={getCurrentProfile()?.weight_kg || undefined}
                          ftp_watts={getCurrentProfile()?.ftp_watts || undefined}
                          pb_power_300s_watts={professionalMetrics.personalBests.power5min || undefined}
                          pb_power_60s_watts={professionalMetrics.personalBests.power1min || undefined}
                          pb_power_1200s_watts={professionalMetrics.personalBests.power20min || undefined}
                          showDetails={false}
                          className="border-0 shadow-none bg-transparent p-0"
                        />
                      </div>
                    </div>

                    {/* Sezione Gestione Profilo - AGGIORNATA */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
                      
                      {/* Header discreto */}
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gestione Profilo</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Azioni avanzate</p>
                          </div>
                        </div>
                      </div>

                      {/* Contenuto azioni */}
                      <div className="p-6">
                        <div className="space-y-4">
                          
                          {/* Azione di esportazione CSV */}
                          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Esporta Profilo</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Download dati in formato CSV</div>
                              </div>
                            </div>

                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                try {
                                  // Prepara i dati per l'export CSV
                                  const csvData = [];
                                  
                                  // Header CSV
                                  csvData.push([
                                    'Data',
                                    'Nome',
                                    'Cognome', 
                                    'Email',
                                    'Data di Nascita',
                                    'Altezza (cm)',
                                    'Peso (kg)',
                                    'FTP (W)',
                                    'W/kg',
                                    'FC Max (bpm)',
                                    'LTHR (bpm)'
                                  ]);
                                  
                                  // Dati atleta di base
                                  const currentProfile = getCurrentProfile();
                                  csvData.push([
                                    new Date().toLocaleDateString('it-IT'),
                                    athleteData.name,
                                    athleteData.surname,
                                    athleteData.email,
                                    athleteData.birth_date ? new Date(athleteData.birth_date).toLocaleDateString('it-IT') : '',
                                    athleteData.height_cm || '',
                                    currentProfile?.weight_kg || '',
                                    currentProfile?.ftp_watts || '',
                                    currentProfile?.ftp_watts && currentProfile?.weight_kg ? 
                                      (currentProfile.ftp_watts / currentProfile.weight_kg).toFixed(2) : '',
                                    currentProfile?.max_hr_bpm || '',
                                    '' // Rimosso LTHR perché non esiste nel database
                                  ]);
                                  
                                  // Aggiungi storico misurazioni se presente
                                  if (profileEntriesData.length > 0) {
                                    csvData.push([]); // Riga vuota
                                    csvData.push(['STORICO MISURAZIONI']);
                                    csvData.push(['Data', 'FTP (W)', 'Peso (kg)', 'W/kg', 'FC Max']); // Rimosso LTHR
                                    
                                    profileEntriesData.forEach(entry => {
                                      const wPerKg = entry.ftp_watts && entry.weight_kg ? 
                                        (entry.ftp_watts / entry.weight_kg).toFixed(2) : '';
                                      
                                      csvData.push([
                                        new Date(entry.effective_date).toLocaleDateString('it-IT'),
                                        entry.ftp_watts || '',
                                        entry.weight_kg || '',
                                        wPerKg,
                                        entry.max_hr_bpm || '' // Corretto nome colonna
                                        // Rimosso LTHR
                                      ]);
                                    });
                                  }
                                  
                                  // Converte in CSV
                                  const csvContent = csvData.map(row => 
                                    row.map(field => `"${field}"`).join(',')
                                  ).join('\n');
                                  
                                  // Crea e scarica il file
                                  const blob = new Blob([csvContent], { type: 'text/csv;charset-utf-8;' });
                                  const link = document.createElement('a');
                                  const fileName = `profilo_${athleteData.name}_${athleteData.surname}_${new Date().toISOString().split('T')[0]}.csv`;
                                  
                                  if ((navigator as any).msSaveBlob) { // IE 10+
                                    (navigator as any).msSaveBlob(blob, fileName);
                                  } else {
                                    link.href = URL.createObjectURL(blob);
                                    link.download = fileName;
                                    link.style.visibility = 'hidden';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                  
                                  // Feedback positivo
                                  setFeedbackMessage({ 
                                    type: 'success', 
                                    text: `Profilo esportato con successo: ${fileName}` 
                                  });
                                  setTimeout(() => setFeedbackMessage(null), 3000);
                                  
                                } catch (error) {
                                  console.error('Errore durante l\'esportazione:', error);
                                  setFeedbackMessage({ 
                                    type: 'error', 
                                    text: 'Errore durante l\'esportazione del profilo' 
                                  });
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors"
                              style={{
                                position: 'relative',
                                zIndex: 10
                              }}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Esporta
                            </Button>
                          </div>
                            
                          {/* Azione di eliminazione - design discreto */}
                          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Elimina Atleta</div>
                            </div>
                          </div>
                          
                            {/* PULSANTE ELEGANTE E FUNZIONANTE */}
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Button clicked!'); // Debug
                                if (confirm(`Sei sicuro di voler eliminare ${athleteData.name} ${athleteData.surname}? Questa azione è irreversibile.`)) {
                                  alert('Pulsante funziona! Elimineremmo l\'atleta qui.');
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-300 transition-colors"
                              style={{
                                position: 'relative',
                                zIndex: 10
                              }}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Elimina
                            </Button>
                      </div>
                      
                          {/* Info disclaimer */}
                          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div className="text-xs text-amber-700 dark:text-amber-300">
                              <strong>Attenzione:</strong> L'eliminazione è irreversibile e cancellerà tutti i dati associati all'atleta.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attivita" className="space-y-6">
              <AthleteActivitiesTab 
                activities={initialActivities} 
                athleteName={`${initialAthlete.name} ${initialAthlete.surname}`}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 