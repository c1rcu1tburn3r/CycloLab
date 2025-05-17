'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Athlete, AthleteProfileEntry } from '@/lib/types';
import { getAthleteDataForClient, getAthleteProfileEntriesDataForClient, type SaveAthleteProfileEntryResult } from '../../athleteProfileActions'; // Percorso corretto

import AthleteForm from '@/components/AthleteForm';
import AthleteProfileEntryForm from '@/components/AthleteProfileEntryForm';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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

  return (
    <div className="space-y-10 pb-10">
      {/* Sezione Modifica Dati Anagrafici Atleta */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Modifica Dati Atleta
          </h1>
          {/* Link indietro gestito dalla pagina server o qui se necessario */}
        </div>
        {isPendingGlobal && <p className='text-sm text-slate-500 mb-2'>Aggiornamento dati atleta...</p>}
        <AthleteForm initialData={athleteData} key={JSON.stringify(athleteData)} /> 
        {/* Modificata la key per forzare il rerender quando athleteData cambia */}
      </section>

      <hr className="border-slate-300" />
      
      {/* Nuova Sezione per Storico Profilo Prestativo */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
          Storico Profilo Prestativo
        </h2>
        
        <AthleteProfileEntryForm athleteId={athleteId} onEntrySaved={handleProfileEntrySaved} />

        {profileEntriesData.length > 0 ? (
          <div className="mt-8 bg-white p-6 rounded-lg shadow border border-slate-200">
            <h3 className="text-md font-semibold text-slate-700 mb-4">Voci Registrate:</h3>
            <ul className="divide-y divide-slate-200">
              {profileEntriesData.map(entry => (
                <li key={entry.id} className="py-3 grid grid-cols-3 gap-4 items-center text-sm">
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
          </div>
        ) : (
          <p className="text-sm text-slate-600 mt-4 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
            Nessuna voce di profilo prestativo ancora registrata per questo atleta.
          </p>
        )}
      </section>
    </div>
  );
} 