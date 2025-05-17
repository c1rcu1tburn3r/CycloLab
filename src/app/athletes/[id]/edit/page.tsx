// src/app/athletes/[id]/edit/page.tsx
// Rimuoviamo gli import non più usati direttamente qui
// import AthleteForm from '@/components/AthleteForm'; 
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Athlete, AthleteProfileEntry } from '@/lib/types';
// import AthleteProfileEntryForm from '@/components/AthleteProfileEntryForm';
// import { format } from 'date-fns';
// import { it } from 'date-fns/locale';

import EditAthleteClientPage from './EditAthleteClientPage'; // Importiamo il nuovo componente client

interface EditAthletePageProps {
  params: {
    id: string;
  };
}

// La definizione di AthleteProfileEntry è ora in @/lib/types

async function getAthleteById(supabaseClient: any, athleteId: string, userId: string): Promise<Athlete | null> {
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Errore nel recuperare l_atleta per la modifica:', error.message);
    return null;
  }
  return data; // Non serve più il cast as Athlete | null se il tipo Athlete è corretto da @/lib/types
}

async function getAthleteProfileEntries(supabaseClient: any, athleteId: string): Promise<AthleteProfileEntry[]> {
  const { data, error } = await supabaseClient
    .from('athlete_profile_entries')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Errore nel recuperare lo storico profilo atleta:', error.message);
    return [];
  }
  return data || [];
}

export default async function EditAthletePage({ params }: EditAthletePageProps) {
  const cookieStore = await cookies();
  const { id: athleteId } = params;

  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athleteToEdit = await getAthleteById(supabase, athleteId, user.id);
  
  if (!athleteToEdit) {
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

  const profileEntries = await getAthleteProfileEntries(supabase, athleteId);

  // Il link "Torna alla lista atleti" potrebbe essere passato a EditAthleteClientPage o gestito qui se necessario un layout diverso
  return (
    <EditAthleteClientPage 
      initialAthlete={athleteToEdit} 
      initialProfileEntries={profileEntries} 
      athleteId={athleteId} 
    />
  );
}

export const dynamic = 'force-dynamic';