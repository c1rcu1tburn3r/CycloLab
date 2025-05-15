import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatDistance, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity } from '@/lib/types';

async function getActivitiesForCurrentUser(supabaseClient: any, userId: string): Promise<Activity[]> {
  const { data, error } = await supabaseClient
    .from('activities')
    .select('*, athletes(name, surname)')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false });

  if (error) {
    console.error('Errore nel recuperare le attività:', error.message);
    return [];
  }
  return data || [];
}

export default async function ActivitiesPage() {
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

  const activities = await getActivitiesForCurrentUser(supabase, user.id);

  return (
    <div className="space-y-8 pb-8">
      {/* Header con sfondo gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Le tue attività</h1>
              <p className="text-blue-100 mt-2">
                {activities.length > 0 
                  ? `${activities.length} attività registrate` 
                  : 'Nessuna attività registrata'}
              </p>
            </div>
            <Link
              href="/activities/upload"
              className="bg-white text-indigo-700 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-sm flex items-center"
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
        <div className="bg-white p-12 rounded-lg shadow-md text-center text-slate-600 border border-slate-200 max-w-2xl mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-slate-800">Non hai ancora attività</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">Carica la tua prima attività per iniziare a monitorare i progressi dei tuoi atleti.</p>
          <Link
            href="/activities/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Carica la prima attività
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-200">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 text-slate-800">
                        <div className="font-medium">
                          {format(new Date(activity.activity_date), 'd MMM yyyy', { locale: it })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDistance(parseISO(activity.created_at), new Date(), { addSuffix: true, locale: it })}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">{activity.title}</td>
                      <td className="py-4 px-6 text-slate-800">
                        <div className="flex items-center">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-2 font-medium text-xs">
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
                          activity.activity_type === 'cycling' ? 'bg-blue-50 text-blue-700' : 
                          activity.activity_type === 'running' ? 'bg-green-50 text-green-700' : 
                          activity.activity_type === 'swimming' ? 'bg-cyan-50 text-cyan-700' :
                          activity.activity_type === 'strength' ? 'bg-orange-50 text-orange-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {activity.activity_type === 'cycling' && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                            </svg>
                          )}
                          {activity.activity_type === 'running' && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                          )}
                          <span className="capitalize">{activity.activity_type}</span>
                          {activity.is_indoor && (
                            <span className="ml-1.5 bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[10px]">Indoor</span>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-800">
                        {activity.distance_meters 
                          ? (
                            <div className="flex items-center">
                              <span className="font-medium">{(activity.distance_meters / 1000).toFixed(1)}</span>
                              <span className="ml-1 text-slate-500">km</span>
                            </div>
                          ) 
                          : <span className="text-slate-400">N/D</span>}
                      </td>
                      <td className="py-4 px-6 text-slate-800">
                        {activity.duration_seconds 
                          ? <span className="font-medium">{formatDuration(activity.duration_seconds)}</span> 
                          : <span className="text-slate-400">N/D</span>}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Link 
                          href={`/activities/${activity.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                          Dettagli
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
}

export const dynamic = 'force-dynamic'; 