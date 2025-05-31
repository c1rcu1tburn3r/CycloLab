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

/**
 * Recupera le attività con TSS per calcoli PMC
 * STRATEGIA ADATTIVA: Cerca attività nel periodo recente, ma se non ne trova abbastanza,
 * estende automaticamente il periodo per garantire analisi significative
 */
export async function getActivitiesForPmc(athleteId: string): Promise<{
  data?: PmcActivity[];
  error?: string;
  adaptiveMessage?: string;
  totalActivitiesFound?: number;
}> {
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
    // STRATEGIA ADATTIVA: Prima cerca attività recenti, poi estende se necessario
    let foundActivities: PmcActivity[] = [];
    let adaptiveMessage: string | undefined;
    let totalActivitiesFound = 0;

    // Prima prova: ultimi 6 mesi (per PMC attuale)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: recentActivities, error: recentError } = await supabase
      .from('activities')
      .select('id, activity_date, tss, normalized_power_watts, intensity_factor')
      .eq('athlete_id', athleteId)
      .not('tss', 'is', null)
      .gt('tss', 0)
      .gte('activity_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (recentError) {
      console.error('[getActivitiesForPmc] Errore attività recenti:', recentError);
      return { error: `Failed to fetch recent activities: ${recentError.message}` };
    }

    if (recentActivities && recentActivities.length >= 5) {
      // Abbiamo abbastanza attività recenti per un PMC significativo
      foundActivities = recentActivities.map(activity => ({
        id: activity.id,
        activity_date: activity.activity_date,
        tss: activity.tss as number,
      }));
      totalActivitiesFound = recentActivities.length;
    } else {
      // Non abbastanza attività recenti, cerchiamo in tutto lo storico
      console.log('[getActivitiesForPmc] Poche attività recenti, estendo ricerca a tutto lo storico...');
      
      const { data: allActivities, error: allError } = await supabase
        .from('activities')
        .select('id, activity_date, tss, normalized_power_watts, intensity_factor')
        .eq('athlete_id', athleteId)
        .not('tss', 'is', null)
        .gt('tss', 0)
        .order('activity_date', { ascending: true });

      if (allError) {
        console.error('[getActivitiesForPmc] Errore recupero tutte attività:', allError);
        return { error: `Failed to fetch all activities: ${allError.message}` };
      }

      if (!allActivities || allActivities.length === 0) {
        return { 
          data: [],
          totalActivitiesFound: 0,
          adaptiveMessage: 'Nessuna attività con TSS trovata. Carica attività per vedere l\'analisi del carico di allenamento.'
        };
      }

      foundActivities = allActivities.map(activity => ({
        id: activity.id,
        activity_date: activity.activity_date,
        tss: activity.tss as number,
      }));
      totalActivitiesFound = allActivities.length;

      // Calcola il periodo reale delle attività trovate
      if (foundActivities.length > 0) {
        const oldestActivity = foundActivities[0];
        const oldestDate = new Date(oldestActivity.activity_date);
        const monthsSpan = Math.ceil((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        
        const timeSpanText = monthsSpan >= 12 
          ? `${Math.floor(monthsSpan / 12)} anni e ${monthsSpan % 12} mesi`
          : `${monthsSpan} mesi`;
          
        adaptiveMessage = `📊 Utilizzando tutto lo storico disponibile (${foundActivities.length} attività in ${timeSpanText})`;
        
        // Se abbiamo poche attività ma distribuite nel tempo, avvisiamo dell'affidabilità
        if (foundActivities.length < 10) {
          adaptiveMessage += `. ⚠️ Con ${foundActivities.length} attività l'analisi PMC è limitata - carica più attività per risultati migliori.`;
        }
      }
    }

    console.log(`[getActivitiesForPmc] Trovate ${foundActivities.length} attività per atleta ${athleteId}`);

    return { 
      data: foundActivities,
      adaptiveMessage,
      totalActivitiesFound
    };

  } catch (e: any) {
    console.error('[getActivitiesForPmc] Eccezione durante il recupero delle attività:', e);
    return { error: `An unexpected error occurred: ${e.message}` };
  }
} 