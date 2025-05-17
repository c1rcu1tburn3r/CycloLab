'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface OverallPbRecord {
  duration_seconds: number;
  value_watts: number;
  activity_date: string; // Data in cui il PB è stato ottenuto (YYYY-MM-DD)
  activity_id: string;
  activity_title?: string | null; // Titolo dell'attività in cui è stato fatto il PB
  achieved_at: string; // Data in cui il record PB è stato registrato/aggiornato (ISO string)
}

export async function getAthleteOverallPersonalBests(
  athleteId: string
): Promise<{ data?: OverallPbRecord[]; error?: string }> {
  if (!athleteId) {
    console.warn('[getAthleteOverallPersonalBests] Athlete ID non fornito.');
    return { error: 'Athlete ID is required.' };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.warn('[pbActions.ts] Errore nel setAll cookies:', error);
            const anyCookiesToSet = cookiesToSet as any[];
            anyCookiesToSet.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options));
          }
        },
      },
    }
  );

  try {
    // La policy RLS su athlete_personal_bests dovrebbe già filtrare
    // i PB per i quali il coach loggato ha il permesso.
    // Qui selezioniamo i PB di potenza per l'atleta specificato.
    const { data, error } = await supabase
      .from('athlete_personal_bests')
      .select(`
        duration_seconds,
        value_watts,
        activity_date,
        activity_id,
        achieved_at,
        activities (title)  // Join con la tabella activities per prendere il titolo
      `)
      .eq('athlete_id', athleteId)
      .eq('metric_type', 'power') // Solo PB di potenza per ora
      .order('duration_seconds', { ascending: true }); // Ordina per durata

    if (error) {
      console.error('[getAthleteOverallPersonalBests] Errore nel recuperare PB dal DB:', error);
      return { error: `Failed to fetch personal bests: ${error.message}` };
    }

    if (!data) {
      console.log(`[getAthleteOverallPersonalBests] Nessun PB trovato per l'atleta ID: ${athleteId}`);
      return { data: [] };
    }

    // Trasforma i dati per includere activity_title direttamente nell'oggetto
    const transformedData: OverallPbRecord[] = data.map((pb: any) => ({
      duration_seconds: pb.duration_seconds,
      value_watts: pb.value_watts,
      activity_date: pb.activity_date,
      activity_id: pb.activity_id,
      // @ts-ignore Supabase specific type for joined table
      activity_title: pb.activities?.title ?? 'Attività Sconosciuta',
      achieved_at: pb.achieved_at,
    }));

    return { data: transformedData };

  } catch (e: any) {
    console.error('[getAthleteOverallPersonalBests] Eccezione:', e.message);
    return { error: `An unexpected error occurred: ${e.message}` };
  }
} 