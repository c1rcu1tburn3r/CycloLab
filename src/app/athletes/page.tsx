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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching athletes in getAthletesForUser:', error);
    // Potremmo voler sollevare l'errore o ritornare un array vuoto a seconda della strategia di errore
    return [];
  }
  return athletes || [];
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