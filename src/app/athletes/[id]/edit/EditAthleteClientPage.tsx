'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Athlete, AthleteProfileEntry } from '@/lib/types';
import { getAthleteDataForClient, getAthleteProfileEntriesDataForClient, type SaveAthleteProfileEntryResult, deleteAthleteProfileEntry } from '../../athleteProfileActions'; // Percorso corretto
import Link from 'next/link';
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

interface EditAthleteClientPageProps {
  initialAthlete: Athlete;
  initialProfileEntries: AthleteProfileEntry[];
  athleteId: string;
}

export default function EditAthleteClientPage({
  initialAthlete,
  initialProfileEntries,
  athleteId,
}: EditAthleteClientPageProps) {
  const router = useRouter();
  const [isPendingGlobal, startTransitionGlobal] = useTransition(); // Per operazioni globali come il refresh dati

  const [athleteData, setAthleteData] = useState<Athlete>(initialAthlete);
  const [profileEntriesData, setProfileEntriesData] = useState<AthleteProfileEntry[]>(initialProfileEntries);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    <div className="min-h-screen bg-[#e9f1f5]">
      {/* Header/Navbar in stile con la landing page */}
      <div className="bg-[#1e2e42] text-white py-4 px-4 md:px-8 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#b4cad6] rounded-full flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1e2e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg">CycloLab</span>
          </div>
          <Link href="/athletes" className="text-[#b4cad6] hover:text-white flex items-center transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Tutti gli Atleti
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Header profilo atleta */}
        <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] rounded-xl text-white p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {initialAthlete.name} {initialAthlete.surname}
              </h1>
              <p className="text-[#b4cad6] mt-1">Dashboard Atleta</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center">
              <div className="w-12 h-12 rounded-full bg-[#b4cad6] flex items-center justify-center text-[#1e2e42] font-bold text-xl mr-4">
                {initialAthlete.name.charAt(0)}{initialAthlete.surname.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-sm text-[#b4cad6]">Ultima modifica</p>
                <p className="text-sm">{latestEntry ? format(new Date(latestEntry.effective_date), 'dd MMMM yyyy', { locale: it }) : 'N/D'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs con stile aggiornato */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-3 gap-2 mb-6 bg-white p-1 rounded-lg shadow-md">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-[#4a6b85] data-[state=active]:text-white transition-all"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="profilo"
              className="data-[state=active]:bg-[#4a6b85] data-[state=active]:text-white transition-all"
            >
              Profilo Atleta
            </TabsTrigger>
            <TabsTrigger 
              value="storico"
              className="data-[state=active]:bg-[#4a6b85] data-[state=active]:text-white transition-all"
            >
              Storico Dati
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              
              {/* Sezione Riepilogo Atleta e Statistiche Chiave */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] px-4 py-3">
                      <h2 className="text-white text-lg font-semibold">Profilo Atleta</h2>
                    </div>
                    <CardContent className="p-5">
                      <AthleteSummaryCard athlete={athleteData} />
                    </CardContent>
                  </Card>
                </div>
                
                <div className="lg:col-span-2">
                  <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#4a6b85] to-[#1e2e42] px-4 py-3">
                      <h2 className="text-white text-lg font-semibold">Statistiche Attuali</h2>
                    </div>
                    <CardContent className="p-5">
                      <CurrentAthleteStats 
                        currentWeight={currentWeight}
                        currentFtp={currentFtp}
                        currentWPerKg={currentWPerKg}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Sezione Zone di Potenza */}
              {currentFtp && currentFtp > 0 && (
                <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] px-4 py-3">
                    <h2 className="text-white text-lg font-semibold">Zone di Potenza</h2>
                  </div>
                  <CardContent className="p-5">
                    <PowerZonesDisplay currentFtp={currentFtp} />
                  </CardContent>
                </Card>
              )}

              {/* Grafico Andamento */}
              <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#4a6b85] to-[#1e2e42] px-4 py-3">
                  <h2 className="text-white text-lg font-semibold">Andamento Peso, FTP & W/kg</h2>
                </div>
                <CardContent className="p-5">
                  {profileEntriesData.length > 0 ? (
                    <AthletePerformanceChart profileEntries={profileEntriesData} />
                  ) : (
                    <p className="text-sm text-[#4a6b85] italic">
                      Nessun dato storico disponibile per visualizzare il grafico. Aggiungi voci nella scheda "Storico Dati".
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Grafico PMC */}
              <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] px-4 py-3">
                  <h2 className="text-white text-lg font-semibold">Performance Management Chart</h2>
                </div>
                <CardContent className="p-5">
                  <PmcChart athleteId={athleteId} />
                </CardContent>
              </Card>

              {/* Tabella Personal Bests Complessivi */}
              <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#4a6b85] to-[#1e2e42] px-4 py-3">
                  <h2 className="text-white text-lg font-semibold">Personal Best Complessivi (Potenza)</h2>
                </div>
                <CardContent className="p-5">
                  <p className="text-sm text-[#4a6b85] mb-4">
                    Migliori prestazioni di potenza registrate per questo atleta.
                  </p>
                  <OverallPersonalBestsTable athleteId={athleteId} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profilo">
            <Card className="border-none shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] px-4 py-3">
                <h2 className="text-white text-lg font-semibold">Dettagli Anagrafici</h2>
              </div>
              <CardContent className="p-5">
                <p className="text-sm text-[#4a6b85] mb-4">
                  Modifica le informazioni personali dell'atleta.
                </p>
                {isPendingGlobal && (
                  <div className="bg-[#e9f1f5] border border-[#b4cad6] text-[#4a6b85] px-4 py-2 mb-4 rounded-md text-sm">
                    Aggiornamento dati atleta in corso...
                  </div>
                )}
                <AthleteForm initialData={athleteData} key={JSON.stringify(athleteData)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storico">
            <div className="space-y-6">
              <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] px-4 py-3">
                  <h2 className="text-white text-lg font-semibold">Nuova Voce Storico</h2>
                </div>
                <CardContent className="p-5">
                  <p className="text-sm text-[#4a6b85] mb-4">
                    Aggiungi una misurazione di peso e FTP per una data specifica.
                  </p>
                  <AthleteProfileEntryForm athleteId={athleteId} onEntrySaved={handleProfileEntrySaved} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#4a6b85] to-[#1e2e42] px-4 py-3">
                  <h2 className="text-white text-lg font-semibold">Voci Registrate</h2>
                </div>
                <CardContent className="p-5">
                  {feedbackMessage && (
                    <div className={`mb-4 p-3 rounded-md ${
                      feedbackMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      <p className="text-sm">{feedbackMessage.text}</p>
                    </div>
                  )}
                  
                  {profileEntriesData.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-[#b4cad6]">
                      <table className="min-w-full divide-y divide-[#b4cad6]">
                        <thead className="bg-[#e9f1f5]">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1e2e42] uppercase tracking-wider">Data</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1e2e42] uppercase tracking-wider">FTP</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1e2e42] uppercase tracking-wider">Peso</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[#1e2e42] uppercase tracking-wider">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#b4cad6]">
                          {profileEntriesData.map(entry => (
                            <tr key={entry.id} className="hover:bg-[#e9f1f5] transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-[#1e2e42]">
                                  {format(new Date(entry.effective_date), 'dd MMM yyyy', { locale: it })}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-[#4a6b85]">{entry.ftp_watts !== null ? `${entry.ftp_watts} W` : 'N/D'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-[#4a6b85]">{entry.weight_kg !== null ? `${entry.weight_kg} kg` : 'N/D'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => handleDeleteProfileEntry(entry.id, entry.effective_date)}
                                  className="text-red-600 hover:text-red-800 transition-colors focus:outline-none disabled:opacity-50"
                                  disabled={isPendingGlobal}
                                  title="Elimina voce"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <p className="text-sm text-[#4a6b85] italic">
                      Nessuna voce di profilo prestativo ancora registrata per questo atleta.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 