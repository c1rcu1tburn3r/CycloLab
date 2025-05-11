// src/app/athletes/[id]/edit/page.tsx
import AthleteForm from '@/components/AthleteForm';
import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Athlete } from '@/app/athletes/page'; // Riutilizziamo l'interfaccia

interface EditAthletePageProps {
  params: {
    id: string; // L'ID dell'atleta dall'URL
  };
}

async function getAthleteById(supabaseClient: any, athleteId: string, userId: string): Promise<Athlete | null> {
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .eq('user_id', userId) // Assicura che il coach possa modificare solo i propri atleti
    .single(); // Ci aspettiamo un solo risultato

  if (error) {
    console.error('Errore nel recuperare l_atleta per la modifica:', error.message);
    return null;
  }
  return data;
}

export default async function EditAthletePage({ params }: EditAthletePageProps) {
  const supabase = createServerComponentClient({ cookies });
  const { id: athleteId } = params;

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athleteToEdit = await getAthleteById(supabase, athleteId, user.id);

  if (!athleteToEdit) {
    // Atleta non trovato o non appartenente all'utente
    // Potresti mostrare una pagina 404 o un messaggio di errore
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-red-600">Atleta non trovato</h1>
        <p className="text-slate-600">Impossibile trovare l'atleta che stai cercando di modificare, o non hai i permessi per farlo.</p>
        <Link href="/athletes" className="mt-4 inline-block text-blue-600 hover:underline">
          Torna alla lista atleti
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Modifica Profilo Atleta
        </h1>
        <Link href="/athletes" className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Torna alla lista atleti
        </Link>
      </div>
      {/* Passiamo i dati iniziali dell'atleta al form */}
      <AthleteForm initialData={athleteToEdit} />
    </div>
  );
}

export const dynamic = 'force-dynamic'; // Assicura che i dati siano sempre freschi