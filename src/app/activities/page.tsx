import Link from 'next/link';
// import Image from 'next/image'; // Non più usato direttamente qui se ActivitiesClientManager lo gestisce
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatDistance, parseISO, format } from 'date-fns'; // formatDistance non sembra usato, format sì
import { it } from 'date-fns/locale';
import type { Activity, Athlete } from '@/lib/types';
// DeleteActivityButton sarà usato dentro ActivitiesClientManager
// import { Button } from '@/components/ui/button'; // Usato da ActivitiesClientManager
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Usato da ActivitiesClientManager
import ActivitiesClientManager from './ActivitiesClientManager'; // IMPORTIAMO IL CLIENT MANAGER

async function getActivitiesForCoach(
  supabaseClient: any, 
  coachUserId: string
  // filterByAthleteId non è più necessario qui, il client component gestirà tutti i filtri
): Promise<Activity[]> {
  const { data, error } = await supabaseClient
    .from('activities')
    .select('*, athletes(name, surname)') // Manteniamo il join per avere i dati dell'atleta
    .eq('user_id', coachUserId)
    .order('activity_date', { ascending: false });

  if (error) {
    console.error('Errore nel recuperare le attività:', error.message);
    return [];
  }
  return data || [];
}

// Funzione helper per formattare la durata - LA LASCIAMO QUI PER ORA se serve altrove in page.tsx non legato al client manager
// Se è usata SOLO dal client manager per le card, andrebbe spostata lì o in utils
function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return 'N/D';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hStr = h > 0 ? `${h}:` : '';
  const mStr = m < 10 && h > 0 ? `0${m}:` : `${m}:`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  
  if (h > 0) {
    return `${hStr}${mStr}${sStr}`;
  } else {
    // Modificato per coerenza con ActivitiesClientManager se m è 0
    if (m > 0) {
        return `${m.toString()}:${s.toString().padStart(2, '0')}`;
    } else {
        return `0:${s.toString().padStart(2, '0')}`;
    }
  }
}

// getAthleteById non sembra essere più usato in questa pagina se il client gestisce i dettagli
/*
async function getAthleteById(supabaseClient: any, athleteId: string, userId: string): Promise<{ name: string, surname: string } | null> {
  if (!athleteId || !userId) {
    return null;
  }
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('name, surname')
    .eq('id', athleteId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
        console.error(`Errore nel recuperare l'atleta con ID ${athleteId}:`, error.message);
    }
    return null;
  }
  return data;
}
*/

async function getAllCoachAthletes(supabaseClient: any, coachUserId: string): Promise<Athlete[]> {
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('id, name, surname')
    .eq('user_id', coachUserId)
    .order('surname', { ascending: true });

  if (error) {
    console.error('Errore nel recuperare tutti gli atleti del coach:', error.message);
    return [];
  }
  return data || [];
}

// Rimuoviamo getActivityIcon e getActivityColor da qui, sono in ActivitiesClientManager
// const getActivityIcon = (type: string) => { ... };
// const getActivityColor = (type: string) => { ... };

// La props searchParams non serve più se il client gestisce tutto
export default async function ActivitiesPage() { 
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  // Recupera il nome del coach dai metadati dell'utente (solo il primo nome)
  const fullName = user.user_metadata?.full_name || '';
  const coachName = fullName ? fullName.split(' ')[0] : 'Coach';

  // Recuperiamo TUTTE le attività del coach
  const allActivities = await getActivitiesForCoach(supabase, user.id);
  // Recuperiamo TUTTI gli atleti del coach per popolare il filtro
  const allCoachAthletes = await getAllCoachAthletes(supabase, user.id);
  
  // La logica di filteringAthleteName e activitiesToDisplay è ora nel Client Manager
  // const athleteIdFilter = searchParams?.athleteId as string | undefined;
  // let activitiesToDisplay: Activity[] = allActivities;
  // let filteringAthleteName: string | null = null;

  // if (athleteIdFilter) { ... } // Rimossa questa logica

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          {/* 
            L'Ultra-Modern Header e le Quick Stats che erano qui 
            saranno ora renderizzati e gestiti da ActivitiesClientManager.
            ActivitiesClientManager avrà al suo interno una struttura simile 
            per l'header e le stats, basata sulle attività filtrate.
          */}

          {/* Passiamo i dati necessari ad ActivitiesClientManager */}
          <ActivitiesClientManager 
            initialActivities={allActivities} 
            coachAthletes={allCoachAthletes}
            currentUserId={user.id}
            coachName={coachName}
          />
          
          {/* 
            Rimuoviamo il vecchio blocco di visualizzazione attività:
            {activitiesToDisplay.length === 0 ? ( ... ) : ( <div className="space-y-6"> ... </div> )}
            Questo sarà gestito interamente da ActivitiesClientManager.
          */}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 