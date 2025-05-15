import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity } from '@/lib/types';
import DeleteActivityButton from '@/components/DeleteActivityButton';
import ActivityMap from '@/components/ActivityMap';
import { Suspense } from 'react';
import NextDynamic from 'next/dynamic';

// Caricamento dinamico per ActivityElevationChart
const ActivityElevationChart = NextDynamic(
  () => import('@/components/ActivityElevationChart'),
  { 
    ssr: false, // Assicura che venga renderizzato solo sul client
    loading: () => (
      <div className="bg-white p-6 rounded-lg shadow-md h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Caricamento grafico altimetrico...</p>
      </div>
    )
  }
);

interface ActivityDetailPageProps {
  params: {
    id: string;
  };
}

async function getActivityById(supabaseClient: any, activityId: string): Promise<Activity | null> {
  const { data, error } = await supabaseClient
    .from('activities')
    .select('*, athletes(name, surname)')
    .eq('id', activityId)
    .single();

  if (error || !data) {
    console.error('Errore nel recuperare l\'attività:', error?.message);
    return null;
  }
  
  return data;
}

async function getUpdatedFileUrl(supabaseClient: any, activity: Activity): Promise<string | null> {
  // Se non c'è un URL del file o non contiene il percorso del file, restituisci null
  if (!activity.fit_file_url || !activity.fit_file_name) {
    return null;
  }

  try {
    // Estrai il percorso del file dall'URL o costruiscilo
    const filePath = `${activity.user_id}/${activity.athlete_id}/${activity.fit_file_name}`;
    
    // Crea un nuovo URL firmato valido per 60 minuti
    const { data, error } = await supabaseClient.storage
      .from('fit-files')
      .createSignedUrl(filePath, 60 * 60);
    
    if (error || !data || !data.signedUrl) {
      console.error('[getUpdatedFileUrl] Errore nella generazione dell\'URL firmato da Supabase:', error?.message);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('[getUpdatedFileUrl] Errore generico nel recuperare l\'URL aggiornato del file:', error);
    return null;
  }
}

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
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

  const activity = await getActivityById(supabase, params.id);

  if (!activity) {
    notFound();
  }

  // Estrai e parsa i route_points per il grafico di elevazione
  let parsedRoutePoints = [];
  if (typeof activity.route_points === 'string') {
    try {
      parsedRoutePoints = JSON.parse(activity.route_points);
    } catch (e) {
      console.error("Errore nel parsing dei route_points per il grafico:", e);
    }
  }

  // Verifica che l'utente sia il proprietario dell'attività
  if (activity.user_id !== user.id) {
    redirect('/activities?error=unauthorized');
  }

  // Ottieni un URL firmato aggiornato per il file FIT
  const updatedFileUrl = activity.fit_file_url && activity.fit_file_name && activity.user_id && activity.athlete_id ? 
    await getUpdatedFileUrl(supabase, activity) : null;

  // Ricostruisci il percorso del file FIT per l'eliminazione
  // Assicurati che activity.fit_file_name, activity.user_id, activity.athlete_id esistano sull'oggetto activity
  // La tabella activities dovrebbe avere user_id e athlete_id. fit_file_name è stato aggiunto durante l'upload.
  const fitFilePathForDelete = activity.fit_file_name && activity.user_id && activity.athlete_id
    ? `${activity.user_id}/${activity.athlete_id}/${activity.fit_file_name}`
    : null;

  return (
    <div className="space-y-8 pb-8">
      {/* Header con sfondo gradiente e informazioni principali */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <Link 
                href="/activities" 
                className="text-blue-100 hover:text-white flex items-center text-sm mb-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Torna alle attività
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold">{activity.title}</h1>
              <p className="text-blue-100 mt-2">
                {format(new Date(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}
                {/* @ts-ignore */}
                {activity.athletes?.name && ` • ${activity.athletes?.name} ${activity.athletes?.surname}`}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/activities/${activity.id}/edit`}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg shadow-md text-sm transition-colors"
              >
                Modifica
              </Link>
              <DeleteActivityButton 
                activityId={activity.id} 
                activityTitle={activity.title} 
                fitFilePath={fitFilePathForDelete} 
              />
            </div>
          </div>

          {/* Statistiche principali in pillole */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {activity.distance_meters && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Distanza</p>
                <p className="text-2xl font-bold">{(activity.distance_meters / 1000).toFixed(1)} km</p>
              </div>
            )}
            {activity.duration_seconds && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Tempo</p>
                <p className="text-2xl font-bold">{formatDuration(activity.duration_seconds)}</p>
              </div>
            )}
            {activity.elevation_gain_meters && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Dislivello</p>
                <p className="text-2xl font-bold">{activity.elevation_gain_meters} m</p>
              </div>
            )}
            {activity.avg_speed_kph && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Velocità Media</p>
                <p className="text-2xl font-bold">{activity.avg_speed_kph.toFixed(1)} km/h</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Colonna sinistra - Descrizione e mappa */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card con la descrizione */}
          {activity.description && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">Descrizione</h2>
              <p className="text-slate-700 whitespace-pre-line">{activity.description}</p>
            </div>
          )}
          
          {/* Mappa del percorso */}
          <Suspense fallback={
            <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-32 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          }>
            <ActivityMap activity={activity} />
          </Suspense>

          {/* Grafico Altimetrico */}
          {parsedRoutePoints.length > 0 && (
            <ActivityElevationChart routePoints={parsedRoutePoints} />
          )}
        </div>

        {/* Colonna destra - Statistiche e metriche */}
        <div className="space-y-6">
          {/* Card con le metriche di potenza */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Potenza
            </h2>
            <div className="space-y-3">
              {activity.avg_power_watts ? (
                <div>
                  <p className="text-sm text-slate-500">Potenza Media</p>
                  <p className="font-medium">{activity.avg_power_watts.toFixed(0)} W</p>
                </div>
              ) : (
                <p className="text-slate-500">Dati di potenza non disponibili</p>
              )}
              {activity.normalized_power_watts && (
                <div>
                  <p className="text-sm text-slate-500">Potenza Normalizzata</p>
                  <p className="font-medium">{activity.normalized_power_watts.toFixed(0)} W</p>
                </div>
              )}
              {activity.max_power_watts && (
                <div>
                  <p className="text-sm text-slate-500">Potenza Massima</p>
                  <p className="font-medium">{activity.max_power_watts.toFixed(0)} W</p>
                </div>
              )}
              {activity.intensity_factor && (
                <div>
                  <p className="text-sm text-slate-500">Intensity Factor</p>
                  <p className="font-medium">{activity.intensity_factor.toFixed(2)}</p>
                </div>
              )}
              {activity.tss && (
                <div>
                  <p className="text-sm text-slate-500">Training Stress Score</p>
                  <p className="font-medium">{activity.tss.toFixed(0)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Card con le metriche cardiache */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              Cardio
            </h2>
            <div className="space-y-3">
              {activity.avg_heart_rate ? (
                <div>
                  <p className="text-sm text-slate-500">Frequenza Cardiaca Media</p>
                  <p className="font-medium">{activity.avg_heart_rate} bpm</p>
                </div>
              ) : (
                <p className="text-slate-500">Dati cardiaci non disponibili</p>
              )}
              {activity.max_heart_rate && (
                <div>
                  <p className="text-sm text-slate-500">Frequenza Cardiaca Massima</p>
                  <p className="font-medium">{activity.max_heart_rate} bpm</p>
                </div>
              )}
            </div>
          </div>

          {/* Card con altre metriche */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
              </svg>
              Altre Metriche
            </h2>
            <div className="space-y-3">
              {activity.avg_cadence && (
                <div>
                  <p className="text-sm text-slate-500">Cadenza Media</p>
                  <p className="font-medium">{activity.avg_cadence} rpm</p>
                </div>
              )}
              {activity.calories && (
                <div>
                  <p className="text-sm text-slate-500">Calorie</p>
                  <p className="font-medium">{activity.calories} kcal</p>
                </div>
              )}
              {activity.temperature_avg_celsius && (
                <div>
                  <p className="text-sm text-slate-500">Temperatura Media</p>
                  <p className="font-medium">{activity.temperature_avg_celsius}°C</p>
                </div>
              )}
              {activity.weather_condition && (
                <div>
                  <p className="text-sm text-slate-500">Condizioni Meteo</p>
                  <p className="font-medium capitalize">{activity.weather_condition}</p>
                </div>
              )}
              {(activity.is_indoor !== null) && (
                <div>
                  <p className="text-sm text-slate-500">Ambiente</p>
                  <p className="font-medium">{activity.is_indoor ? 'Indoor' : 'Outdoor'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500">Tipo</p>
                <p className="font-medium capitalize">{activity.activity_type}</p>
              </div>
            </div>
          </div>

          {/* Card con il file originale */}
          {updatedFileUrl && activity.fit_file_name && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-indigo-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                File FIT
              </h2>
              <a 
                href={updatedFileUrl} 
                download={activity.fit_file_name} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Scarica {activity.fit_file_name}
              </a>
              <p className="text-xs text-slate-500 mt-1">L'URL del file è valido per 60 minuti.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
}

export const dynamic = 'force-dynamic'; 