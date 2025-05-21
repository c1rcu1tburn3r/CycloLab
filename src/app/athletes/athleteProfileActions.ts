'use server';

import { createClient } from '../../utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { Athlete, AthleteProfileEntry } from '@/lib/types'; // Aggiornato percorso import tipi

interface ProfileEntryData {
  effectiveDate: string;
  ftp?: number | string | null; // Può arrivare come stringa dal form
  weight?: number | string | null; // Può arrivare come stringa dal form
  // Aggiungere altri campi se necessario
}

export interface SaveAthleteProfileEntryResult {
  success: boolean;
  data?: any; // Tipo del record inserito
  error?: string | null;
}

export async function saveAthleteProfileEntry(
  athleteId: string,
  formData: ProfileEntryData
): Promise<SaveAthleteProfileEntryResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Utente non autenticato.', success: false };
  }

  if (!formData.effectiveDate) {
    return { error: 'La data effettiva è obbligatoria.', success: false };
  }
  // Valida il formato della data se necessario, es. YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.effectiveDate)) {
    return { error: 'Formato data non valido. Usare YYYY-MM-DD.', success: false };
  }

  const ftpString = typeof formData.ftp === 'number' ? String(formData.ftp) : formData.ftp;
  const weightString = typeof formData.weight === 'number' ? String(formData.weight) : formData.weight;

  const ftpValue = (ftpString === undefined || ftpString === null || ftpString.trim() === '') ? null : parseFloat(ftpString.replace(',', '.'));
  const weightValue = (weightString === undefined || weightString === null || weightString.trim() === '') ? null : parseFloat(weightString.replace(',', '.'));

  if (ftpValue !== null && isNaN(ftpValue)) {
    return { error: 'FTP non è un numero valido.', success: false };
  }
  if (weightValue !== null && isNaN(weightValue)) {
    return { error: 'Peso non è un numero valido.', success: false };
  }
  if (ftpValue !== null && ftpValue < 0) {
    return { error: 'FTP non può essere negativo.', success: false };
  }
  if (weightValue !== null && weightValue < 0) {
    return { error: 'Il peso non può essere negativo.', success: false };
  }


  const entryToUpsert = {
    athlete_id: athleteId,
    effective_date: formData.effectiveDate,
    ftp_watts: ftpValue,
    weight_kg: weightValue,
    // Se athlete_id e effective_date sono le colonne per il conflict,
    // e l'ID della riga (se esiste) non è parte del conflict target, 
    // non è necessario passarlo qui per l'upsert.
    // Supabase troverà la riga basandosi su onConflict.
  };

  const { data, error } = await supabase
    .from('athlete_profile_entries')
    .upsert(entryToUpsert, {
      onConflict: 'athlete_id, effective_date', // Assumiamo queste siano le colonne del constraint UNIQUE
    })
    .select() // Restituisce la riga inserita o aggiornata
    .single();

  if (error) {
    console.error('Errore upsert voce profilo atleta:', error);
    // Non ci aspettiamo più l'errore 23505 (unique_violation) con upsert corretto,
    // ma altri errori DB possono sempre verificarsi.
    return { error: `Errore database durante salvataggio profilo: ${error.message}`, success: false };
  }

  // Voce inserita/aggiornata con successo, ora proviamo ad aggiornare la tabella athletes
  // con l'ultimo peso se questa è la voce più recente.
  if (data && data.effective_date) { // data è la riga inserita
    const insertedEntry = data as { effective_date: string, weight_kg: number | null, ftp_watts: number | null };

    const { data: latestProfileEntries, error: latestEntryError } = await supabase
      .from('athlete_profile_entries')
      .select('effective_date')
      .eq('athlete_id', athleteId)
      .order('effective_date', { ascending: false })
      .limit(1);

    if (latestEntryError) {
      console.warn('Attenzione: Errore nel recuperare la data più recente del profilo per aggiornare athletes:', latestEntryError.message);
      // Non blocchiamo, ma logghiamo un warning.
    } else if (latestProfileEntries && latestProfileEntries.length > 0 && latestProfileEntries[0].effective_date === insertedEntry.effective_date) {
      // Se la data inserita è la più recente (o una delle più recenti)
      const athleteUpdateData: { weight_kg?: number | null } = {};
      
      if (insertedEntry.weight_kg !== null && insertedEntry.weight_kg !== undefined) {
        athleteUpdateData.weight_kg = insertedEntry.weight_kg;
      }

      if (Object.keys(athleteUpdateData).length > 0) {
        const { error: updateAthleteError } = await supabase
          .from('athletes')
          .update(athleteUpdateData)
          .eq('id', athleteId);

        if (updateAthleteError) {
          console.warn('Attenzione: Errore aggiornamento tabella athletes con ultimo peso del profilo:', updateAthleteError.message);
          // Non blocchiamo, ma logghiamo un warning.
        }
      }
    }
  }

  revalidatePath(`/athletes/${athleteId}/edit`);
  revalidatePath('/activities/[id]', 'page'); // Revalida anche la pagina dettaglio attività se necessario
  // Potrebbe essere necessario revalidare altre pagine che dipendono da questi dati

  return { success: true, data, error: null };
}

export async function getAthleteDataForClient(athleteId: string): Promise<Athlete | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('getAthleteDataForClient: Utente non autenticato.');
    return null; 
  }

  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', athleteId)
    .eq('user_id', user.id) 
    .single();

  if (error) {
    console.error('Errore in getAthleteDataForClient:', error.message);
    return null;
  }
  return data as Athlete | null;
}

export async function getAthleteProfileEntriesDataForClient(athleteId: string): Promise<AthleteProfileEntry[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('getAthleteProfileEntriesDataForClient: Utente non autenticato.');
    return [];
  }
  
  // TODO: Aggiungere una verifica più robusta per assicurarsi che il coach (user.id)
  // abbia il permesso di accedere ai dati di questo athleteId, ad esempio controllando
  // prima che l'atleta esista e sia associato al coach.

  const { data, error } = await supabase
    .from('athlete_profile_entries')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Errore in getAthleteProfileEntriesDataForClient:', error.message);
    return [];
  }
  return (data || []) as AthleteProfileEntry[];
}

export async function deleteAthleteProfileEntry(
  athleteId: string,
  entryId: string
): Promise<{ success: boolean; error?: string | null }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Utente non autenticato.', success: false };
  }

  // Verifica che l'atleta appartenga all'utente corrente
  const { data: athleteData, error: athleteError } = await supabase
    .from('athletes')
    .select('id')
    .eq('id', athleteId)
    .eq('user_id', user.id)
    .single();

  if (athleteError || !athleteData) {
    return { error: 'Non hai i permessi per gestire questo atleta.', success: false };
  }

  // Verifica che la voce esista e appartenga all'atleta
  const { data: entryData, error: entryError } = await supabase
    .from('athlete_profile_entries')
    .select('id, effective_date')
    .eq('id', entryId)
    .eq('athlete_id', athleteId)
    .single();

  if (entryError || !entryData) {
    return { error: 'Voce profilo non trovata o non autorizzata.', success: false };
  }

  // Esegui l'eliminazione
  const { error: deleteError } = await supabase
    .from('athlete_profile_entries')
    .delete()
    .eq('id', entryId);

  if (deleteError) {
    console.error('Errore eliminazione voce profilo atleta:', deleteError);
    return { error: `Errore database durante eliminazione: ${deleteError.message}`, success: false };
  }

  // Se l'eliminazione è avvenuta con successo, aggiorniamo la tabella athletes
  // se necessario (se abbiamo eliminato la voce più recente)
  const { data: latestEntries, error: latestEntryError } = await supabase
    .from('athlete_profile_entries')
    .select('id, weight_kg, effective_date')
    .eq('athlete_id', athleteId)
    .order('effective_date', { ascending: false })
    .limit(1);

  if (!latestEntryError && latestEntries && latestEntries.length > 0) {
    // Aggiorniamo il peso solo se abbiamo ancora voci
    const athleteUpdateData: { weight_kg?: number | null } = {
      weight_kg: latestEntries[0].weight_kg
    };

    const { error: updateAthleteError } = await supabase
      .from('athletes')
      .update(athleteUpdateData)
      .eq('id', athleteId);

    if (updateAthleteError) {
      console.warn('Attenzione: Errore aggiornamento tabella athletes dopo eliminazione:', updateAthleteError.message);
      // Non blocchiamo l'operazione per questo errore
    }
  }

  // Invalidiamo le pagine che potrebbero essere influenzate
  revalidatePath(`/athletes/${athleteId}/edit`);
  revalidatePath('/activities/[id]', 'page');

  return { success: true };
} 