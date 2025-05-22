import Link from 'next/link';
import Image from 'next/image';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatDistance, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity } from '@/lib/types';
import DeleteActivityButton from '@/components/DeleteActivityButton';

async function getActivitiesForCoach(
  supabaseClient: any, 
  coachUserId: string, 
  filterByAthleteId?: string | null
): Promise<Activity[]> {
  let query = supabaseClient
    .from('activities')
    .select('*, athletes(name, surname)')
    .eq('user_id', coachUserId);

  if (filterByAthleteId) {
    query = query.eq('athlete_id', filterByAthleteId);
  }

  query = query.order('activity_date', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Errore nel recuperare le attività:', error.message);
    return [];
  }
  return data || [];
}

// Funzione helper per formattare la durata da secondi a hh:mm:ss o mm:ss
function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return 'N/D';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hStr = h > 0 ? `${h}:` : '';
  const mStr = m < 10 && h > 0 ? `0${m}:` : `${m}:`; // Aggiunge zero se ci sono ore
  const sStr = s < 10 ? `0${s}` : `${s}`;
  
  if (h > 0) {
    return `${hStr}${mStr}${sStr}`;
  } else {
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  }
}

async function getAthleteById(supabaseClient: any, athleteId: string, userId: string): Promise<{ name: string, surname: string } | null> {
  if (!athleteId || !userId) { // Controllo aggiunto per evitare query con parametri nulli
    return null;
  }
  const { data, error } = await supabaseClient
    .from('athletes')
    .select('name, surname')
    .eq('id', athleteId)
    .eq('user_id', userId) // Assicura che il coach possa accedere solo ai propri atleti
    .single();

  if (error) {
    // Non logghiamo 'not found' come errore critico, potrebbe essere un caso normale
    if (error.code !== 'PGRST116') { // PGRST116: "Searched for a single row, but found no rows"
        console.error(`Errore nel recuperare l'atleta con ID ${athleteId}:`, error.message);
    }
    return null;
  }
  return data;
}

export default async function ActivitiesPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  const athleteIdFilter = searchParams?.athleteId as string | undefined;
  let activities: Activity[] = [];
  let filteringAthleteName: string | null = null;

  if (athleteIdFilter) {
    // Recupera prima i dettagli dell'atleta per il nome
    const athlete = await getAthleteById(supabase, athleteIdFilter, user.id);
    if (athlete) {
      filteringAthleteName = `${athlete.name} ${athlete.surname}`;
      // Poi recupera le attività per questo atleta
      activities = await getActivitiesForCoach(supabase, user.id, athleteIdFilter);
    } else {
      // Se l'atleta non viene trovato (o non appartiene al coach),
      // non mostriamo attività e potremmo voler reindirizzare o mostrare un errore specifico.
      // Per ora, filteringAthleteName rimarrà null e activities vuoto.
      // Potremmo anche impostare un messaggio di errore specifico qui se necessario.
      console.warn(`Atleta con ID ${athleteIdFilter} non trovato per l'utente ${user.id}.`);
    }
  } else {
    // Nessun filtro per atleta, recupera tutte le attività per il coach
    activities = await getActivitiesForCoach(supabase, user.id);
  }

  return (
    <div className="">
      <div className="container mx-auto px-4 pt-6 pb-12">
        {/* Header della pagina */}
        <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] rounded-xl text-white p-6 mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {filteringAthleteName ? `Attività di ${filteringAthleteName}` : 'Le tue attività'}
              </h1>
              <p className="text-[#b4cad6] mt-1">
                {activities.length > 0 
                  ? `${activities.length} attività registrate${filteringAthleteName ? ' per questo atleta' : ''}` 
                  : filteringAthleteName 
                    ? `Nessuna attività registrata per ${filteringAthleteName}`
                    : 'Nessuna attività registrata'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 sm:mt-0 self-start sm:self-center">
              {filteringAthleteName && (
                <Link 
                  href="/athletes" 
                  className="bg-[#e9f1f5] hover:bg-white text-[#1e2e42] font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-sm flex items-center w-full sm:w-auto justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  Elenco Atleti
                </Link>
              )}
              <Link
                href="/activities/upload"
                className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-sm flex items-center w-full sm:w-auto justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Carica nuova attività
              </Link>
            </div>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-lg text-center text-[#4a6b85] border border-[#b4cad6] max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#e9f1f5] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[#4a6b85]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-[#1e2e42]">Non hai ancora attività</h2>
            <p className="text-[#4a6b85] mb-6 max-w-md mx-auto">Carica la tua prima attività per iniziare a monitorare i progressi dei tuoi atleti.</p>
            <Link
              href="/activities/upload"
              className="bg-[#4a6b85] hover:bg-[#1e2e42] text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Carica la prima attività
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#1e2e42] text-white border-b border-[#4a6b85]">
                  <tr>
                    <th className="py-4 px-6 text-left font-semibold">Data</th>
                    <th className="py-4 px-6 text-left font-semibold">Titolo</th>
                    <th className="py-4 px-6 text-left font-semibold">Atleta</th>
                    <th className="py-4 px-6 text-left font-semibold">Tipo</th>
                    <th className="py-4 px-6 text-left font-semibold">Distanza</th>
                    <th className="py-4 px-6 text-left font-semibold">Durata</th>
                    <th className="py-4 px-6 text-center font-semibold">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9f1f5]">
                  {activities.map((activity) => {
                    const fitFilePathForDelete = activity.fit_file_name && activity.user_id && activity.athlete_id
                      ? `${activity.user_id}/${activity.athlete_id}/${activity.fit_file_name}`
                      : null;

                    return (
                      <tr key={activity.id} className="hover:bg-[#e9f1f5] transition-colors">
                        <td className="py-4 px-6 text-[#1e2e42]">
                          <div className="font-medium">
                            {format(new Date(activity.activity_date), 'd MMM yyyy', { locale: it })}
                          </div>
                          <div className="text-xs text-[#4a6b85]">
                            {formatDistance(parseISO(activity.created_at), new Date(), { addSuffix: true, locale: it })}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-[#1e2e42]">{activity.title}</td>
                        <td className="py-4 px-6 text-[#1e2e42]">
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-[#4a6b85] text-white flex items-center justify-center mr-2 font-medium text-xs">
                              {/* @ts-ignore */}
                              {activity.athletes?.name?.charAt(0)}{activity.athletes?.surname?.charAt(0)}
                            </div>
                            <span>
                              {/* @ts-ignore */}
                              {activity.athletes?.name} {activity.athletes?.surname}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            activity.activity_type === 'cycling' ? 'bg-[#e9f1f5] text-[#1e2e42]' : 
                            activity.activity_type === 'running' ? 'bg-[#e9f1f5] text-[#1e2e42]' : 
                            activity.activity_type === 'swimming' ? 'bg-[#e9f1f5] text-[#1e2e42]' :
                            activity.activity_type === 'strength' ? 'bg-[#e9f1f5] text-[#1e2e42]' :
                            'bg-[#e9f1f5] text-[#1e2e42]'
                          }`}>
                            {activity.activity_type === 'cycling' && (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                              </svg>
                            )}
                            <span className="capitalize">{activity.activity_type}</span>
                            {activity.is_indoor && (
                              <span className="ml-1.5 bg-[#b4cad6] text-[#1e2e42] px-1 py-0.5 rounded text-[10px]">Indoor</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[#1e2e42]">
                          {activity.distance_meters 
                            ? (
                              <>
                                {(activity.distance_meters / 1000).toFixed(1)} <span className="text-xs text-[#4a6b85]">km</span>
                              </>
                            )
                            : 'N/D'}
                        </td>
                        <td className="py-4 px-6 text-[#1e2e42]">
                          {activity.duration_seconds ? formatDuration(activity.duration_seconds) : 'N/D'}
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/activities/${activity.id}`}
                              className="bg-[#4a6b85] hover:bg-[#1e2e42] text-white font-medium py-2 px-4 rounded-lg text-sm shadow-sm hover:shadow-md transition-all duration-150"
                            >
                              Dettagli
                            </Link>
                            <DeleteActivityButton
                              activityId={activity.id}
                              activityTitle={activity.title || 'attività senza titolo'}
                              fitFilePath={fitFilePathForDelete}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 