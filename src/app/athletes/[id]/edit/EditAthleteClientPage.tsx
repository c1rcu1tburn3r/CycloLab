'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Athlete, AthleteProfileEntry, Activity } from '@/lib/types';
import { getAthleteDataForClient, getAthleteProfileEntriesDataForClient, type SaveAthleteProfileEntryResult, deleteAthleteProfileEntry } from '../../athleteProfileActions'; // Percorso corretto
import Image from 'next/image';

import AthleteForm from '@/components/AthleteForm';
import AthleteProfileEntryForm from '@/components/AthleteProfileEntryForm';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Importa i componenti Tabs di Shadcn/ui
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importa i componenti Card di Shadcn/ui
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Importa il nuovo componente grafico
import AthletePerformanceChart from '@/components/AthletePerformanceChart';

// Importa il nuovo componente per le statistiche attuali
import CurrentAthleteStats from '@/components/CurrentAthleteStats';

// Importa i nuovi componenti
import AthleteSummaryCard from '@/components/AthleteSummaryCard';
import PowerZonesDisplay from '@/components/PowerZonesDisplay';

// Importa il nuovo grafico PMC
import PmcChart from '@/components/charts/PmcChart';

// Importa la tabella dei Personal Bests
import OverallPersonalBestsTable from '@/components/OverallPersonalBestsTable';

import AthleteActivitiesTab from '@/components/AthleteActivitiesTab';

// Importa il componente per eliminare l'atleta
import DeleteAthleteButton from '@/components/DeleteAthleteButton';

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

  const [athleteData, setAthleteData] = useState<Athlete>(initialAthlete);
  const [profileEntriesData, setProfileEntriesData] = useState<AthleteProfileEntry[]>(initialProfileEntries);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Stato per controllare i tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
              {/* Statistiche Principali - Design Minimalista */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Profilo */}
                <div className="stats-card group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Profilo Atleta</h3>
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <AthleteSummaryCard athlete={athleteData} />
                </div>

                {/* Peso Attuale */}
                <div className="stats-card group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Peso Attuale</h3>
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {currentWeight ? `${currentWeight}` : 'N/D'}
                      {currentWeight && <span className="text-lg text-gray-500 ml-1">kg</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {latestEntry ? 'Ultima misurazione registrata' : 'Nessun dato disponibile'}
                    </p>
                  </div>
                </div>

                {/* FTP Attuale */}
                <div className="stats-card group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">FTP Attuale</h3>
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {currentFtp ? `${currentFtp}` : 'N/D'}
                      {currentFtp && <span className="text-lg text-gray-500 ml-1">W</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {latestEntry ? 'Functional Threshold Power' : 'Nessun dato disponibile'}
                    </p>
                  </div>
                </div>

                {/* W/kg */}
                <div className="stats-card group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Potenza/Peso</h3>
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {currentWPerKg ? `${currentWPerKg}` : 'N/D'}
                      {currentWPerKg && <span className="text-lg text-gray-500 ml-1">W/kg</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentWPerKg ? 'Rapporto potenza-peso' : 'Calcolo non disponibile'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Zone di Potenza - Solo se FTP disponibile */}
              {currentFtp && currentFtp > 0 && (
                <div className="stats-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Zone di Potenza</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Basate su FTP di {currentFtp}W</p>
                    </div>
                  </div>
                  <PowerZonesDisplay currentFtp={currentFtp} />
                </div>
              )}

              {/* Grafico Andamento */}
              <div className="stats-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Andamento Performance</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Evoluzione di peso, FTP e W/kg nel tempo</p>
                  </div>
                </div>
                {profileEntriesData.length > 0 ? (
                  <AthletePerformanceChart profileEntries={profileEntriesData} />
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Nessun dato storico disponibile</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Aggiungi delle voci nella scheda &quot;Storico&quot; per visualizzare il grafico</p>
                  </div>
                )}
              </div>

              {/* Performance Management Chart */}
              <div className="stats-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Performance Management Chart</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Analisi avanzata delle performance</p>
                  </div>
                </div>
                <PmcChart athleteId={athleteId} />
              </div>

              {/* Personal Bests */}
              <div className="stats-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Best</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Migliori prestazioni di potenza registrate</p>
                  </div>
                </div>
                <OverallPersonalBestsTable athleteId={athleteId} />
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
              <div className="space-y-8">
                {/* Form Modifica Profilo */}
                <div className="stats-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dettagli Anagrafici</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Modifica le informazioni personali dell&apos;atleta</p>
                    </div>
                  </div>
                  
                  {isPendingGlobal && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <p className="text-blue-700 dark:text-blue-300 text-sm">Aggiornamento dati atleta in corso...</p>
                    </div>
                  )}
                  
                  <AthleteForm initialData={athleteData} key={JSON.stringify(athleteData)} />
                </div>

                {/* Parametri Fisiologici Attuali - Read Only */}
                <div className="stats-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Parametri Fisiologici Attuali</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Valori correnti di FTP, peso e rapporto W/kg</p>
                    </div>
                  </div>

                  {(() => {
                    // Calcola i parametri attuali dall'ultimo profilo
                    const latestProfile = profileEntriesData.length > 0 
                      ? profileEntriesData.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0]
                      : null;
                    
                    const currentFTP = latestProfile?.ftp_watts || null;
                    const currentWeight = latestProfile?.weight_kg || null;
                    const currentWPerKg = currentFTP && currentWeight ? (currentFTP / currentWeight).toFixed(2) : null;
                    const lastMeasurementDate = latestProfile?.effective_date || null;
                    
                    // Determina se i dati sono obsoleti (più di 30 giorni)
                    const measurementsAreOld = () => {
                      if (!lastMeasurementDate) return true;
                      const lastDate = new Date(lastMeasurementDate);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return lastDate < thirtyDaysAgo;
                    };

                    return (
                      <>
                        {/* Alert se non ci sono misurazioni */}
                        {!latestProfile && (
                          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                  Nessuna misurazione disponibile
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                  Aggiungi FTP e peso in Analytics per analisi complete
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Alert se misurazioni obsolete */}
                        {latestProfile && measurementsAreOld() && (
                          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                  Misurazioni datate
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                  I dati sono vecchi di oltre 30 giorni. Aggiorna per analisi più accurate.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Griglia Parametri */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          {/* FTP */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">FTP</h3>
                            </div>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                              {currentFTP ? `${currentFTP} W` : 'N/D'}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                              Functional Threshold Power
                            </p>
                          </div>

                          {/* Peso */}
                          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800/50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-1m-3 1l-3-1" />
                                </svg>
                              </div>
                              <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Peso</h3>
                            </div>
                            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                              {currentWeight ? `${currentWeight} kg` : 'N/D'}
                            </p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                              Peso corporeo
                            </p>
                          </div>

                          {/* W/kg */}
                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800/50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                              </div>
                              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300">W/kg</h3>
                            </div>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                              {currentWPerKg || 'N/D'}
                            </p>
                            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                              Rapporto potenza/peso
                            </p>
                          </div>
                        </div>

                        {/* Info e Azione */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {lastMeasurementDate 
                                  ? `Ultima misurazione: ${format(new Date(lastMeasurementDate), 'dd MMM yyyy', { locale: it })}`
                                  : 'Nessuna misurazione disponibile'
                                }
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Per aggiornare i parametri e vedere stime automatiche, utilizza Analytics
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              // Naviga alla scheda Analytics usando lo stato React
                              setActiveTab('analytics');
                              // Scroll to top dopo il cambio tab
                              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                            }}
                            className="group inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Aggiorna in Analytics
                            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Tabella Misurazioni */}
                <div className="stats-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Storico Misurazioni</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {profileEntriesData.length} {profileEntriesData.length === 1 ? 'misurazione registrata' : 'misurazioni registrate'}
                      </p>
                    </div>
                  </div>

                  {feedbackMessage && (
                    <div className={`mb-6 p-4 rounded-xl ${
                      feedbackMessage.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}>
                      <p className="text-sm">{feedbackMessage.text}</p>
                    </div>
                  )}
                  
                  {profileEntriesData.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                        <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                          <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Data</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">FTP</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Peso</th>
                            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/30 dark:divide-gray-700/30">
                          {profileEntriesData.map(entry => (
                            <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {format(new Date(entry.effective_date), 'dd MMM yyyy', { locale: it })}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {entry.ftp_watts !== null ? `${entry.ftp_watts} W` : 'N/D'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {entry.weight_kg !== null ? `${entry.weight_kg} kg` : 'N/D'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => handleDeleteProfileEntry(entry.id, entry.effective_date)}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors focus:outline-none disabled:opacity-50 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                  disabled={isPendingGlobal}
                                  title="Elimina voce"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 mb-2">Nessuna misurazione registrata</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Aggiungi la prima misurazione usando il modulo sopra</p>
                    </div>
                  )}
                </div>

                {/* Card Eliminazione Atleta */}
                <div className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-red-200 dark:hover:border-red-800/50 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50/0 via-red-50/20 to-red-50/0 dark:from-red-900/0 dark:via-red-900/10 dark:to-red-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors duration-300">
                          <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                            Elimina Atleta
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            Rimuovi definitivamente questo atleta dal sistema. Tutti i dati associati, 
                            incluse attività e statistiche, verranno eliminati permanentemente.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 flex flex-col items-end gap-3">
                        <DeleteAthleteButton 
                          athlete={athleteData} 
                          onDeleteSuccess={() => {
                            router.push('/athletes');
                          }}
                        />
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span>Azione irreversibile</span>
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