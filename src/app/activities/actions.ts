'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActivityInsert } from '@/lib/types'; // Assicurati che ActivityInsert sia esportato da types.ts

// Tipo per i dati del form che ci aspettiamo dal client
// Espandilo in base ai campi del tuo form ActivityUploadForm
interface ActivityFormData {
  athlete_id: string;
  title: string;
  description?: string;
  activity_date: string; // Formato YYYY-MM-DD
  activity_type: string; // es. 'cycling', 'running'
  is_indoor: boolean;
  is_public: boolean;
  // Aggiungi altri campi se necessario
}

export async function processAndCreateActivity(
  formData: ActivityFormData,
  fitFilePath: string // es. "user_id/athlete_id/timestamp_filename.fit"
) {
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
            console.warn('Nota: Potrebbe esserci una discrepanza nella gestione dei cookie tra versioni di Next.js. Controllo il formato di cookiesToSet:', cookiesToSet);
            const anyCookiesToSet = cookiesToSet as any[];
            anyCookiesToSet.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options));
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Utente non autenticato o sessione scaduta.' };
  }

  try {
    // --- INIZIO SIMULAZIONE PARSING FIT ---
    // In futuro, qui chiamerai il tuo script Python/servizio Docker
    // Lo script riceverà fitFilePath (o il file stesso), lo scaricherà/leggerà da Supabase Storage,
    // lo parserà con fitparse e restituirà i dati estratti.

    console.log(`[Server Action] Inizio parsing simulato per: ${fitFilePath}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simula un piccolo ritardo di elaborazione

    const parsedFitData = {
      total_distance_meters: Math.random() * 50000 + 1000, // NUMERIC
      total_duration_seconds: Math.round(Math.random() * 7200 + 1800), // INTEGER
      avg_power_watts: Math.round(Math.random() * 200 + 100), // INTEGER
      normalized_power_watts: Math.round(Math.random() * 220 + 110), // INTEGER
      tss: Math.round(Math.random() * 100 + 30), // INTEGER
      intensity_factor: Math.random() * 0.3 + 0.7, // NUMERIC
      avg_heart_rate: Math.round(Math.random() * 60 + 120), // INTEGER
      max_heart_rate: Math.round(Math.random() * 20 + 180), // INTEGER
      avg_speed_kph: Math.random() * 15 + 20, // NUMERIC
      max_speed_kph: Math.random() * 20 + 35, // NUMERIC
      total_elevation_gain_meters: Math.random() * 500, // NUMERIC
      // Aggiungi e arrotonda altri campi INTEGER mock se necessario:
      // max_power_watts: Math.round(Math.random() * 1000 + 300), // Esempio INTEGER
      // avg_cadence: Math.round(Math.random() * 30 + 70), // Esempio INTEGER
      // max_cadence: Math.round(Math.random() * 40 + 90), // Esempio INTEGER
      // total_calories: Math.round(Math.random() * 1000 + 200), // Esempio INTEGER
    };
    console.log('[Server Action] Dati FIT simulati estratti (arrotondati dove serve):', parsedFitData);
    // --- FINE SIMULAZIONE PARSING FIT ---

    // Estrai il nome del file da fitFilePath per salvarlo in fit_file_name
    const fitFileNameInStorage = fitFilePath.split('/').pop();
    if (!fitFileNameInStorage) {
      throw new Error('Impossibile determinare il nome del file FIT dallo storage path.');
    }

    // Crea un URL firmato per il file FIT (opzionale se non lo salvi direttamente, ma utile)
    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from('fit-files')
      .createSignedUrl(fitFilePath, 60 * 60 * 24 * 7); // URL valido per 7 giorni

    if (signedUrlError) {
      console.error('Errore nella generazione dell\'URL firmato per il file FIT:', signedUrlError);
      throw new Error(`Impossibile generare l\'URL per il file FIT: ${signedUrlError.message}`);
    }
    const fitFileUrl = urlData.signedUrl;

    const activityToInsert: ActivityInsert = {
      ...formData, // Dati dal form del client
      user_id: user.id,
      fit_file_path: fitFilePath, // Salva il percorso del file nello storage
      fit_file_name: fitFileNameInStorage,
      fit_file_url: fitFileUrl, // URL firmato
      // Sovrascrivi o aggiungi i dati estratti dal FIT (attualmente simulati)
      distance_meters: parsedFitData.total_distance_meters,
      duration_seconds: parsedFitData.total_duration_seconds, // Già arrotondato se necessario
      avg_power_watts: parsedFitData.avg_power_watts, // Già arrotondato
      normalized_power_watts: parsedFitData.normalized_power_watts, // Già arrotondato
      tss: parsedFitData.tss, // Già arrotondato
      intensity_factor: parsedFitData.intensity_factor,
      avg_heart_rate: parsedFitData.avg_heart_rate, // Già arrotondato
      max_heart_rate: parsedFitData.max_heart_rate, // Già arrotondato
      avg_speed_kph: parsedFitData.avg_speed_kph,
      max_speed_kph: parsedFitData.max_speed_kph,
      elevation_gain_meters: parsedFitData.total_elevation_gain_meters,
      // Assicurati di mappare anche gli altri campi arrotondati se li hai aggiunti:
      // max_power_watts: parsedFitData.max_power_watts,
      // avg_cadence: parsedFitData.avg_cadence,
      // max_cadence: parsedFitData.max_cadence,
      // total_calories: parsedFitData.total_calories,
      status: 'active', // Imposta uno status di default
      // Assicurati che tutti i campi NOT NULL della tabella 'activities' siano coperti
      // o abbiano valori di default nel database
    };
    
    // Rimuovi eventuali campi undefined che potrebbero causare problemi con Supabase
    Object.keys(activityToInsert).forEach(key => {
      const k = key as keyof ActivityInsert;
      if (activityToInsert[k] === undefined) {
        delete activityToInsert[k];
      }
    });


    const { data: newActivity, error: insertError } = await supabase
      .from('activities')
      .insert(activityToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Errore durante l\'inserimento dell\'attività nel database:', insertError);
      throw new Error(`Errore durante il salvataggio dell\'attività: ${insertError.message}`);
    }

    if (!newActivity) {
      throw new Error('Creazione attività fallita, nessun dato restituito.');
    }

    // Revalida i percorsi per aggiornare la UI
    revalidatePath('/activities');
    revalidatePath(`/activities/${newActivity.id}`);

    // Non è necessario redirect qui se la gestione del successo avviene nel client
    // Se però vuoi forzare il redirect da server action, puoi farlo
    // redirect('/activities'); 
    // In alternativa, restituisci i dati dell'attività creata o un messaggio di successo
    return { success: true, activityId: newActivity.id, message: 'Attività creata con successo!' };

  } catch (error: any) {
    console.error("Errore completo nell'azione processAndCreateActivity:", error);
    return { error: error.message || 'Si è verificato un errore durante la creazione dell\'attività.' };
  }
}

export async function deleteActivity(activityId: string, fitFilePath: string | null) {
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
          // Next.js v13.4.x 
          // cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          // Next.js v14.x 
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Per gestire eventuali modifiche nell'API cookies tra versioni minori di Next.js
            console.warn('Nota: Potrebbe esserci una discrepanza nella gestione dei cookie tra versioni di Next.js. Controllo il formato di cookiesToSet:', cookiesToSet);
            const anyCookiesToSet = cookiesToSet as any[];
            anyCookiesToSet.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options));
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Utente non autenticato o sessione scaduta.');
  }

  try {
    // 1. Eliminare il file FIT da Supabase Storage (se esiste)
    if (fitFilePath) {
      const { error: fileError } = await supabase.storage
        .from('fit-files')
        .remove([fitFilePath]);

      if (fileError) {
        // Non blocchiamo l'eliminazione dell'attività se il file non viene trovato (potrebbe essere già stato eliminato)
        // o per altri errori non critici, ma logghiamo l'errore.
        console.error(`ERRORE FORTE nell'eliminazione del file ${fitFilePath} da Storage:`, fileError.message);
        throw new Error(`Fallimento eliminazione file dallo storage: ${fileError.message}`);
      }
    }

    // 2. Eliminare il record dell'attività dal database
    const { error: activityError } = await supabase
      .from('activities')
      .delete()
      .match({ id: activityId, user_id: user.id }); // Importante: assicurati che l'utente possa eliminare solo le proprie attività

    if (activityError) {
      throw new Error(`Errore durante l'eliminazione dell'attività dal database: ${activityError.message}`);
    }

  } catch (error: any) {
    console.error("Errore completo nell'azione deleteActivity:", error);
    // Restituisce un messaggio di errore specifico che può essere mostrato all'utente
    // In alternativa, si potrebbe voler lanciare l'errore per gestirlo nel Client Component
    // throw error; // Se si vuole gestire nel client component e mostrare lì l'errore.
    return { error: error.message || 'Si è verificato un errore durante l\'eliminazione.' };
  }

  // 3. Revalidare i percorsi e reindirizzare
  revalidatePath('/activities'); // Revalida la pagina dell'elenco attività
  revalidatePath(`/activities/${activityId}`); // Revalida la pagina di dettaglio dell'attività eliminata (porterà a 404 o redirect)
  redirect('/activities');
} 