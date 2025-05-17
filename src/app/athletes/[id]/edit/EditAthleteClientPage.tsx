'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Athlete, AthleteProfileEntry } from '@/lib/types';
import { getAthleteDataForClient, getAthleteProfileEntriesDataForClient, type SaveAthleteProfileEntryResult } from '../../athleteProfileActions'; // Percorso corretto

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
    <div className="space-y-6 pb-10 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          {initialAthlete.name} {initialAthlete.surname}
        </h1>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-3 gap-2 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="profilo">Profilo Atleta</TabsTrigger>
          <TabsTrigger value="storico">Storico Dati</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="space-y-6">
            
            {/* Sezione Riepilogo Atleta e Statistiche Chiave */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <AthleteSummaryCard athlete={athleteData} />
              </div>
              <div className="lg:col-span-2">
                <CurrentAthleteStats 
                  currentWeight={currentWeight}
                  currentFtp={currentFtp}
                  currentWPerKg={currentWPerKg}
                />
              </div>
            </div>

            {/* Sezione Zone di Potenza */}
            {currentFtp && currentFtp > 0 && (
              <PowerZonesDisplay currentFtp={currentFtp} />
            )}

            {/* Grafico Andamento */}
            {profileEntriesData.length > 0 ? (
              <AthletePerformanceChart profileEntries={profileEntriesData} />
            ) : (
              <Card className="mt-6"> {/* Aggiunto mt-6 per coerenza se il grafico non c'è ma le stats sì*/}
                <CardHeader>
                  <CardTitle>Andamento Peso, FTP & W/kg</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Nessun dato storico disponibile per visualizzare il grafico. Aggiungi voci nella scheda "Storico Dati".
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Grafico PMC */}
            {/* Passiamo athleteId al PmcChart */}
            {/* Possiamo aggiungere un controllo simile a profileEntriesData.length se il grafico PMC
                 non dovesse essere mostrato se non ci sono attività, ma la logica interna a PmcChart
                 già gestisce l'assenza di dati. Lo mostriamo sempre e lui gestirà il suo stato. */}
            <PmcChart athleteId={athleteId} />

            {/* Tabella Personal Bests Complessivi */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Personal Best Complessivi (Potenza)</CardTitle>
                <CardDescription>
                  Migliori prestazioni di potenza registrate per questo atleta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OverallPersonalBestsTable athleteId={athleteId} />
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="profilo">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Anagrafici</CardTitle>
              <CardDescription>Modifica le informazioni personali dell'atleta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isPendingGlobal && <p className='text-sm text-slate-500 mb-2'>Aggiornamento dati atleta...</p>}
              <AthleteForm initialData={athleteData} key={JSON.stringify(athleteData)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storico">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nuova Voce Storico</CardTitle>
                <CardDescription>Aggiungi una misurazione di peso e FTP per una data specifica.</CardDescription>
              </CardHeader>
              <CardContent>
                <AthleteProfileEntryForm athleteId={athleteId} onEntrySaved={handleProfileEntrySaved} />
              </CardContent>
            </Card>

            {profileEntriesData.length > 0 ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Voci Registrate</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-slate-200">
                    {profileEntriesData.map(entry => (
                      <li key={entry.id} className="py-3 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center text-sm">
                        <div>
                          <span className="font-medium text-slate-800">
                            {format(new Date(entry.effective_date), 'dd MMM yyyy', { locale: it })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">FTP: </span>
                          <span className="font-medium text-slate-800">{entry.ftp_watts !== null ? `${entry.ftp_watts} W` : 'N/D'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Peso: </span>
                          <span className="font-medium text-slate-800">{entry.weight_kg !== null ? `${entry.weight_kg} kg` : 'N/D'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Voci Registrate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Nessuna voce di profilo prestativo ancora registrata per questo atleta.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 