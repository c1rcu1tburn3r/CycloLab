import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { formatDistance, parseISO } from 'date-fns';
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Attività</h1>
        <Link
          href="/activities/upload"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-sm"
        >
          + Carica Attività
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center text-slate-600 border border-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-400 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
          <p className="text-xl font-semibold mb-2 text-slate-700">Nessuna attività trovata.</p>
          <p className="text-sm">Carica la prima attività per iniziare a monitorare i progressi dei tuoi atleti.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">Data</th>
                <th className="py-3 px-4 text-left font-semibold">Titolo</th>
                <th className="py-3 px-4 text-left font-semibold">Atleta</th>
                <th className="py-3 px-4 text-left font-semibold">Tipo</th>
                <th className="py-3 px-4 text-left font-semibold">Distanza</th>
                <th className="py-3 px-4 text-left font-semibold">Durata</th>
                <th className="py-3 px-4 text-left font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-700">
                    {new Date(activity.activity_date).toLocaleDateString('it-IT')}
                    <div className="text-xs text-slate-500">
                      {formatDistance(parseISO(activity.created_at), new Date(), { addSuffix: true, locale: it })}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{activity.title}</td>
                  <td className="py-3 px-4 text-slate-700">
                    {/* @ts-ignore */}
                    {activity.athletes?.name} {activity.athletes?.surname}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      activity.activity_type === 'cycling' ? 'bg-blue-100 text-blue-800' : 
                      activity.activity_type === 'running' ? 'bg-green-100 text-green-800' : 
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {activity.distance_meters 
                      ? `${(activity.distance_meters / 1000).toFixed(1)} km` 
                      : 'N/D'}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {activity.duration_seconds 
                      ? formatDuration(activity.duration_seconds) 
                      : 'N/D'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Link 
                        href={`/activities/${activity.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Dettagli
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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