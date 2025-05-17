'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Non stiamo usando Activity direttamente, ma un tipo derivato. 
// Se decidiamo di importare Activity per usarne parti, decommentare.
// import type { Activity } from '@/lib/types'; 

// Interfaccia specifica per i dati necessari al PMC
export interface PmcActivity {
  id: string;
  activity_date: string; // Formato YYYY-MM-DD
  tss: number; // Per il calcolo PMC, il TSS deve essere un numero. Filtriamo i null.
  // Potremmo aggiungere altri campi se utili per il grafico PMC, es:
  // normalized_power_watts?: number | null;
  // intensity_factor?: number | null;
}

export async function getActivitiesForPmc(
  athleteId: string
): Promise<{ data?: PmcActivity[]; error?: string }> {
  if (!athleteId) {
    console.warn('[getActivitiesForPmc] Athlete ID non fornito.');
    return { error: 'Athlete ID is required.' };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch (e) {
            // Fallback per diverse versioni di Next.js o struttura cookie non standard
            console.warn('[getActivitiesForPmc] Errore standard nel settare i cookie, tento fallback:', e);
            const anyCookiesToSet = cookiesToSet as any[]; // Asserzione di tipo
            anyCookiesToSet.forEach(cookie => {
              if (cookie && typeof cookie.name === 'string' && typeof cookie.value === 'string') {
                cookieStore.set(cookie.name, cookie.value, cookie.options);
              }
            });
          }
        },
      },
    }
  );

  // Verifica utente loggato (coach) - importante per RLS
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[getActivitiesForPmc] Utente non autenticato:', authError?.message);
    return { error: 'User not authenticated or session expired.' };
  }

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id, activity_date, tss, normalized_power_watts, intensity_factor') // Seleziona i campi
      .eq('athlete_id', athleteId)
      .not('tss', 'is', null) // CORRETTO: Verifica che tss NON SIA NULL
      .gt('tss', 0) // E che sia maggiore di 0, TSS negativo o 0 non ha senso per il PMC
      .order('activity_date', { ascending: true }); // Ordina per data crescente

    if (error) {
      console.error('[getActivitiesForPmc] Errore nel recuperare le attività dal DB:', error);
      return { error: `Failed to fetch activities for PMC: ${error.message}` };
    }

    if (!data || data.length === 0) {
        console.log(`[getActivitiesForPmc] Nessuna attività valida trovata per l'atleta con ID: ${athleteId}`);
        return { data: [] };
    }
    
    // Mappiamo i dati al tipo PmcActivity, assicurandoci che tss sia un numero.
    // Il filtro .is('tss', 'not.null') e .gt('tss', 0) nella query dovrebbe già garantirlo.
    const pmcActivities: PmcActivity[] = data.map(activity => ({
      id: activity.id,
      activity_date: activity.activity_date,
      tss: activity.tss as number, // Cast sicuro grazie ai filtri della query
    }));

    return { data: pmcActivities };

  } catch (e: any) {
    console.error('[getActivitiesForPmc] Eccezione durante il recupero delle attività:', e);
    return { error: `An unexpected error occurred: ${e.message}` };
  }
} 