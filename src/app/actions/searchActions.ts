'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import type { Athlete, Activity } from '@/lib/types';

interface AthleteSearchResult {
  id: string;
  name: string;
  surname: string;
  type: 'athlete';
  href: string;
}

interface ActivitySearchResult {
  id: string;
  title: string;
  athleteName?: string; // Nome e cognome dell'atleta
  type: 'activity';
  href: string;
}

export type GlobalSearchResult = AthleteSearchResult | ActivitySearchResult;

export async function searchGlobal(query: string): Promise<GlobalSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return []; // Non cercare se la query è troppo corta
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const loggedInUser = await supabase.auth.getUser();

  if (!loggedInUser.data.user) {
    return []; // L'utente non è loggato, non dovrebbe poter cercare
  }
  const userId = loggedInUser.data.user.id;

  const results: GlobalSearchResult[] = [];
  const searchTerm = `%${query.trim().toLowerCase()}%`;
  const limit = 5; // Limita il numero di risultati per tipo

  try {
    // Cerca Atleti
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, name, surname')
      .eq('user_id', userId) // Filtra per user_id del coach loggato
      .or(`name.ilike.${searchTerm},surname.ilike.${searchTerm}`)
      .limit(limit);

    if (athletesError) {
      console.error('Errore nella ricerca atleti:', athletesError.message);
    } else if (athletes) {
      athletes.forEach((athlete: Pick<Athlete, 'id' | 'name' | 'surname'>) => {
        results.push({
          id: athlete.id,
          name: athlete.name || 'N/A',
          surname: athlete.surname || '',
          type: 'athlete',
          href: `/athletes/${athlete.id}/edit`,
        });
      });
    }

    // Tipo per la singola entry di atleta joinata (potrebbe essere null o un array con 0 o 1 elemento)
    type JoinedAthleteEntry = Pick<Athlete, 'id' | 'name' | 'surname'>;

    // Tipo per il campo 'athletes' come Supabase lo restituisce per un join to-one (che in realtà è to-many)
    type JoinedAthleteField = JoinedAthleteEntry[] | null;

    // Tipo per l'attività con il campo 'athletes' joinato corretto
    type ActivityWithJoinedAthlete = Omit<Activity, 'athletes'> & { 
      athletes: JoinedAthleteField 
    };

    // Cerca Attività per titolo
    const { data: activitiesByTitle, error: activitiesByTitleError } = await supabase
      .from('activities')
      .select('id, title, athletes(id, name, surname)')
      .eq('user_id', userId)
      .ilike('title', searchTerm)
      .limit(limit);

    if (activitiesByTitleError) {
      console.error('Errore nella ricerca attività per titolo:', activitiesByTitleError.message);
    }

    // Cerca Attività per nome/cognome atleta (attraverso l'athlete_id)
    const { data: athleteIds, error: athleteIdsError } = await supabase
      .from('athletes')
      .select('id')
      .eq('user_id', userId)
      .or(`name.ilike.${searchTerm},surname.ilike.${searchTerm}`);

    let activitiesByAthlete: any[] = [];
    if (!athleteIdsError && athleteIds && athleteIds.length > 0) {
      const athleteIdsList = athleteIds.map(a => a.id);
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, athletes(id, name, surname)')
        .eq('user_id', userId)
        .in('athlete_id', athleteIdsList)
        .limit(limit);

      if (error) {
        console.error('Errore nella ricerca attività per atleta:', error.message);
      } else {
        activitiesByAthlete = data || [];
      }
    }

    // Combina i risultati evitando duplicati
    const allActivities = [...(activitiesByTitle || [])];
    activitiesByAthlete.forEach(activity => {
      if (!allActivities.find(a => a.id === activity.id)) {
        allActivities.push(activity);
      }
    });

    // Processa i risultati delle attività
    if (allActivities.length > 0) {
      const activities = allActivities as ActivityWithJoinedAthlete[];
      activities.forEach((activity: ActivityWithJoinedAthlete) => {
        // Prendiamo il primo atleta dall'array, se esiste
        const athleteInfo = activity.athletes && activity.athletes.length > 0 ? activity.athletes[0] : null;
        results.push({
          id: activity.id,
          title: activity.title || 'Attività senza titolo',
          athleteName: athleteInfo ? `${athleteInfo.name || ''} ${athleteInfo.surname || ''}`.trim() : undefined,
          type: 'activity',
          href: `/activities/${activity.id}`,
        });
      });
    }

  } catch (error: any) {
    console.error('Errore generico nella ricerca globale:', error.message);
    return [];
  }
  
  results.sort((a, b) => {
    const queryLower = query.toLowerCase();
    let scoreA = 0;
    let scoreB = 0;

    if (a.type === 'athlete') {
      if (a.name.toLowerCase().includes(queryLower) || a.surname.toLowerCase().includes(queryLower)) scoreA = 10;
    }
    if (a.type === 'activity') {
      if (a.title.toLowerCase().includes(queryLower)) scoreA = 5;
      if (a.athleteName?.toLowerCase().includes(queryLower)) scoreA = 3; 
    }

    if (b.type === 'athlete') {
      if (b.name.toLowerCase().includes(queryLower) || b.surname.toLowerCase().includes(queryLower)) scoreB = 10;
    }
    if (b.type === 'activity') {
      if (b.title.toLowerCase().includes(queryLower)) scoreB = 5;
      if (b.athleteName?.toLowerCase().includes(queryLower)) scoreB = 3;
    }
    return scoreB - scoreA;
  });

  return results.slice(0, 10);
} 