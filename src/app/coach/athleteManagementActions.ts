'use server';

import { createClient } from '@/utils/supabase/server'; // Corretto import
import { cookies } from 'next/headers';
import type { Athlete } from '@/lib/types';

export interface ManagedAthlete extends Athlete {
  assigned_at: string; 
  // Aggiungiamo una proprietà opzionale per l'email dell'atleta se non è già in Athlete
  // email?: string; // Sembra che Athlete già includa l'email opzionalmente
}

export async function getManagedAthletes(): Promise<{
  data?: ManagedAthlete[];
  error?: string;
}> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); // Corretto utilizzo

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('[getManagedAthletes] Utente non autenticato:', userError?.message);
    return { error: 'Utente non autenticato o sessione scaduta.' };
  }

  const coachUserId = user.id;

  try {
    const query = `
      assigned_at,
      athletes (
        id,
        user_id,
        name,
        surname,
        birth_date,
        nationality,
        created_at
      )
    `;

    const { data, error } = await supabase
      .from('coach_athletes')
      .select(query)
      .eq('coach_user_id', coachUserId)
      .order('surname', { foreignTable: 'athletes', ascending: true })
      .order('name', { foreignTable: 'athletes', ascending: true });

    if (error) {
      console.error('[getManagedAthletes] Errore DB nel recuperare atleti associati:', error);
      return { error: `Errore nel recupero degli atleti: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { data: [] }; // Nessun atleta associato
    }
    
    // Trasformazione per appiattire la struttura e usare il tipo ManagedAthlete
    // Ci assicuriamo che athletes non sia null prima di accedere alle sue proprietà
    const managedAthletes: ManagedAthlete[] = data
      .filter(item => item.athletes) // Filtra via i record dove il join con athletes fallisce (non dovrebbe succedere con FK)
      .map((item: any) => ({
        ...(item.athletes as Athlete), 
        assigned_at: item.assigned_at,
      }));

    return { data: managedAthletes };

  } catch (e: any) {
    console.error('[getManagedAthletes] Eccezione:', e.message);
    return { error: `Errore imprevisto: ${e.message}` };
  }
}

export async function searchPotentialAthletes(searchTerm: string): Promise<{
  data?: Athlete[]; // Restituisce atleti semplici, non ManagedAthlete
  error?: string;
}> {
  if (!searchTerm || searchTerm.trim().length < 2) { // Evita ricerche vuote o troppo brevi
    return { data: [] };
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Utente non autenticato.' };
  }
  const coachUserId = user.id;

  try {
    // 1. Trova gli ID degli atleti già associati a questo coach
    const { data: associatedAthletesData, error: associatedError } = await supabase
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_user_id', coachUserId);

    if (associatedError) {
      console.error('[searchPotentialAthletes] Errore nel recuperare atleti già associati:', associatedError);
      return { error: 'Errore nel recuperare gli atleti già associati.' };
    }

    const associatedAthleteIds = associatedAthletesData?.map(item => item.athlete_id) || [];

    // 2. Cerca atleti che corrispondono al searchTerm e NON sono tra quelli già associati
    //    Cerchiamo per nome o cognome (case-insensitive)
    //    Nota: il tipo Athlete include user_id, name, surname, ecc. ma NON email (come da verifica precedente)
    let query = supabase
      .from('athletes')
      .select(`
        id,
        user_id,
        name,
        surname,
        birth_date,
        nationality,
        created_at,
        avatar_url,
        height_cm,
        weight_kg
      `)
      .or(`name.ilike.%${searchTerm.trim()}%,surname.ilike.%${searchTerm.trim()}%`);
    // TODO: Considerare la ricerca per email se l'email fosse disponibile in `athletes` 
    // o se volessimo fare una ricerca più complessa che coinvolga `auth.users` (più difficile con RLS)

    if (associatedAthleteIds.length > 0) {
      query = query.not('id', 'in', `(${associatedAthleteIds.join(',')})`);
    }

    const { data: potentialAthletes, error: searchError } = await query
      .limit(10); // Limita il numero di risultati

    if (searchError) {
      console.error('[searchPotentialAthletes] Errore nella ricerca atleti:', searchError);
      return { error: 'Errore durante la ricerca degli atleti.' };
    }

    return { data: potentialAthletes || [] };

  } catch (e: any) {
    console.error('[searchPotentialAthletes] Eccezione:', e.message);
    return { error: `Errore imprevisto durante la ricerca: ${e.message}` };
  }
}

export async function associateAthleteToCoach(athleteId: string): Promise<{
  success?: boolean;
  error?: string;
  data?: { coach_user_id: string; athlete_id: string; assigned_at: string };
}> {
  if (!athleteId) {
    return { error: 'ID Atleta non fornito.' };
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Utente non autenticato.' };
  }
  const coachUserId = user.id;

  try {
    // Verifica se l'atleta esiste (opzionale, ma buona pratica)
    const { data: athleteExists, error: athleteCheckError } = await supabase
      .from('athletes')
      .select('id')
      .eq('id', athleteId)
      .maybeSingle();

    if (athleteCheckError) {
      console.error('[associateAthleteToCoach] Errore controllo esistenza atleta:', athleteCheckError);
      return { error: 'Errore durante la verifica dell\'atleta.' };
    }

    if (!athleteExists) {
      return { error: 'Atleta non trovato.' };
    }

    // Verifica se l'associazione esiste già per evitare duplicati
    const { data: existingAssociation, error: existingCheckError } = await supabase
      .from('coach_athletes')
      .select('*')
      .eq('coach_user_id', coachUserId)
      .eq('athlete_id', athleteId)
      .maybeSingle();
    
    if (existingCheckError) {
      console.error('[associateAthleteToCoach] Errore controllo associazione esistente:', existingCheckError);
      return { error: 'Errore durante la verifica dell\'associazione esistente.' };
    }

    if (existingAssociation) {
      // Restituisce successo ma indica che l'associazione esisteva già, potrebbe essere utile per l'UI
      return { success: true, data: existingAssociation, error: 'Atleta già associato a questo coach.' }; 
    }

    // Crea la nuova associazione
    const assigned_at = new Date().toISOString();
    const { data: newAssociation, error: insertError } = await supabase
      .from('coach_athletes')
      .insert({
        coach_user_id: coachUserId,
        athlete_id: athleteId,
        assigned_at: assigned_at, // Aggiungiamo la data di assegnazione
      })
      .select()
      .single(); // ci aspettiamo un solo record inserito

    if (insertError) {
      console.error('[associateAthleteToCoach] Errore inserimento associazione:', insertError);
      // Potrebbe essere un errore RLS se il coach non ha i permessi per scrivere su coach_athletes
      // o se athleteId non è valido per qualche policy
      return { error: `Impossibile associare l'atleta: ${insertError.message}` };
    }

    return { success: true, data: newAssociation };

  } catch (e: any) {
    console.error('[associateAthleteToCoach] Eccezione:', e.message);
    return { error: `Errore imprevisto durante l'associazione: ${e.message}` };
  }
}

// TODO: Implementare dissociateAthleteFromCoach 