// src/app/athletes/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Athlete } from '@/lib/types';
import AthletesClient from '@/components/AthletesClient';
import { unstable_cache as nextCache } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';



async function getAthletesForUser(supabase: SupabaseClient, userId: string): Promise<Athlete[]> {
  const { data: athletes, error } = await supabase
    .from('athletes')
    .select(`
      *,
      athlete_profile_entries(
        ftp_watts,
        effective_date
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching athletes in getAthletesForUser:', error);
    return [];
  }

  // Processa i dati per estrarre l'FTP più recente per ogni atleta
  const processedAthletes: Athlete[] = (athletes || []).map(athlete => {
    let currentFtp = null;
    
    if (athlete.athlete_profile_entries && Array.isArray(athlete.athlete_profile_entries)) {
      // Trova l'entry più recente con FTP
      const latestEntry = athlete.athlete_profile_entries
        .filter((entry: any) => entry.ftp_watts != null)
        .sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
      
      if (latestEntry) {
        currentFtp = latestEntry.ftp_watts;
      }
    }

    // Rimuovi il campo athlete_profile_entries dall'oggetto finale e aggiungi current_ftp
    const { athlete_profile_entries, ...athleteData } = athlete;
    
    return {
      ...athleteData,
      current_ftp: currentFtp
    };
  });

  return processedAthletes;
}

export default async function AthletesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const getCachedAthletes = nextCache(
    async (userId: string) => getAthletesForUser(supabase, userId),
    ['athletes-list-for-user'], // Base key parts
    {
      tags: [`athletes-user-${user.id}`], // Tag per la revalidazione on-demand
      revalidate: 60, // Revalida ogni 60 secondi
    }
  );

  const athletesList = await getCachedAthletes(user.id);
  
  // Non c'è più bisogno di gestire l'errore qui se getAthletesForUser lo gestisce o lo solleva
  // e unstable_cache lo propaga. Se getAthletesForUser ritorna [] in caso di errore,
  // athletesList sarà [] e la UI gestirà il caso di lista vuota.

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          }>
            <AthletesClient userId={user.id} initialAthletes={athletesList} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';