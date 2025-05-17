import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity, RoutePoint } from '@/lib/types';
import DeleteActivityButton from '@/components/DeleteActivityButton';
import ActivityViewClient from '@/components/ActivityViewClient';
import { Suspense } from 'react';

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

  // Estrai e parsa i route_points
  let parsedRoutePoints: RoutePoint[] = [];
  if (typeof activity.route_points === 'string') {
    try {
      parsedRoutePoints = JSON.parse(activity.route_points) as RoutePoint[];
    } catch (e) {
      console.error("Errore nel parsing dei route_points:", e);
      // Lascia parsedRoutePoints come array vuoto
    }
  } else if (Array.isArray(activity.route_points)) {
    // Se per caso route_points è già un array (improbabile dal DB, ma per sicurezza)
    parsedRoutePoints = activity.route_points as RoutePoint[];
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

  // Prepara le props per ActivityViewClient
  const activityViewProps = {
    activityFull: activity,
    parsedRoutePoints: parsedRoutePoints,
    activityTitle: activity.title,
    activityDate: format(new Date(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it }),
    athleteName: activity.athletes ? `${activity.athletes.name} ${activity.athletes.surname}` : undefined,
    distanceKm: activity.distance_meters ? (activity.distance_meters / 1000).toFixed(1) + ' km' : undefined,
    durationFormatted: activity.duration_seconds ? formatDuration(activity.duration_seconds) : undefined,
    elevationGain: activity.elevation_gain_meters ? activity.elevation_gain_meters + ' m' : undefined,
    avgSpeed: activity.avg_speed_kph ? activity.avg_speed_kph.toFixed(1) + ' km/h' : undefined,
    description: activity.description,
    avgPower: activity.avg_power_watts ? activity.avg_power_watts.toFixed(0) + ' W' : undefined,
    normalizedPower: activity.normalized_power_watts ? activity.normalized_power_watts.toFixed(0) + ' W' : undefined,
    avgHeartRate: activity.avg_heart_rate ? activity.avg_heart_rate.toFixed(0) + ' bpm' : undefined,
    maxHeartRate: activity.max_heart_rate ? activity.max_heart_rate.toFixed(0) + ' bpm' : undefined,
    avgCadence: activity.avg_cadence ? activity.avg_cadence.toFixed(0) + ' rpm' : undefined,
    downloadUrl: updatedFileUrl,
  };

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
          
          {/* Sostituisci Mappa e Grafico con ActivityViewClient */}
          {/* Il Suspense qui può avvolgere ActivityViewClient se necessario */}
          {/* ActivityViewClient gestirà internamente Suspense per i suoi figli se sono caricati dinamicamente */}
          <ActivityViewClient {...activityViewProps} />
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
                  <p className="text-sm text-slate-700">Potenza Media</p>
                  <p className="font-medium text-slate-900">{activity.avg_power_watts.toFixed(0)} W</p>
                </div>
              ) : (
                <p className="text-slate-700">Dati di potenza non disponibili</p>
              )}
              {activity.normalized_power_watts && (
                <div>
                  <p className="text-sm text-slate-700">Potenza Normalizzata</p>
                  <p className="font-medium text-slate-900">{activity.normalized_power_watts.toFixed(0)} W</p>
                </div>
              )}
              {activity.max_power_watts && (
                <div>
                  <p className="text-sm text-slate-700">Potenza Massima</p>
                  <p className="font-medium text-slate-900">{activity.max_power_watts.toFixed(0)} W</p>
                </div>
              )}
              {/* Visualizzazione Personal Bests di Potenza CORRETTAMENTE POSIZIONATA QUI */}
              {(activity.pb_power_5s_watts || activity.pb_power_15s_watts || activity.pb_power_30s_watts || activity.pb_power_60s_watts || activity.pb_power_300s_watts || activity.pb_power_600s_watts || activity.pb_power_1200s_watts || activity.pb_power_1800s_watts || activity.pb_power_3600s_watts || activity.pb_power_5400s_watts) && (
                <div className="pt-3 mt-3 border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Activity's Best Intervals</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    {activity.pb_power_5s_watts && renderPbItem("5s", activity.pb_power_5s_watts)}
                    {activity.pb_power_15s_watts && renderPbItem("15s", activity.pb_power_15s_watts)}
                    {activity.pb_power_30s_watts && renderPbItem("30s", activity.pb_power_30s_watts)}
                    {activity.pb_power_60s_watts && renderPbItem("1min", activity.pb_power_60s_watts)}
                    {activity.pb_power_300s_watts && renderPbItem("5min", activity.pb_power_300s_watts)}
                    {activity.pb_power_600s_watts && renderPbItem("10min", activity.pb_power_600s_watts)}
                    {activity.pb_power_1200s_watts && renderPbItem("20min", activity.pb_power_1200s_watts)}
                    {activity.pb_power_1800s_watts && renderPbItem("30min", activity.pb_power_1800s_watts)}
                    {activity.pb_power_3600s_watts && renderPbItem("1h", activity.pb_power_3600s_watts)}
                    {activity.pb_power_5400s_watts && renderPbItem("1h 30min", activity.pb_power_5400s_watts)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card con le metriche di Frequenza Cardiaca (esempio, assicurati che esista o sia corretta) */}
          {(activity.avg_heart_rate || activity.max_heart_rate) && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                Frequenza Cardiaca
              </h2>
              <div className="space-y-3">
                {activity.avg_heart_rate && (
                  <div>
                    <p className="text-sm text-slate-700">FC Media</p>
                    <p className="font-medium text-slate-900">{activity.avg_heart_rate.toFixed(0)} bpm</p>
                  </div>
                )}
                {activity.max_heart_rate && (
                  <div>
                    <p className="text-sm text-slate-700">FC Massima</p>
                    <p className="font-medium text-slate-900">{activity.max_heart_rate.toFixed(0)} bpm</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card con le metriche di Cadenza (esempio, assicurati che esista o sia corretta) */}
          {activity.avg_cadence && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.108 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.11v1.093c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.142.854.107 1.204l.527.738c.32.447.27.96-.12 1.45l-.773.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.78.93l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.424-.384-.764-.78-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 0 1-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.019.94-1.11l.894-.149c.424-.07.764-.384.93-.78.164-.398.142-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.93l.15-.893Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Cadenza
              </h2>
              <div className="space-y-3">
                {activity.avg_cadence && (
                  <div>
                    <p className="text-sm text-slate-700">Cadenza Media</p>
                    <p className="font-medium text-slate-900">{activity.avg_cadence.toFixed(0)} rpm</p>
                  </div>
                )}
                {/* Potremmo aggiungere Max Cadence se disponibile e rilevante */}
              </div>
            </div>
          )}

          {/* RIPRISTINO Card Intensità e Stress */}
          {(activity.intensity_factor || activity.tss) && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-orange-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.608c0-.703-.042-1.403-.125-2.092M15.245 7.825A8.25 8.25 0 0 1 18.75 12a8.25 8.25 0 0 1-3.505 6.953A8.289 8.289 0 0 0 15 14.392c0-.703.042-1.403.125-2.092m-2.49-4.542A8.25 8.25 0 0 0 9.75 2.25c-1.582 0-3.04.478-4.275 1.295a8.286 8.286 0 0 0 3.025 2.443c.64.263 1.36.394 2.1.394.285 0 .56-.018.83-.053Z" />
                </svg>
                Intensità e Stress
              </h2>
              <div className="space-y-3">
                {activity.intensity_factor && (
                  <div>
                    <p className="text-sm text-slate-700">Intensity Factor (IF)</p>
                    <p className="font-medium text-slate-900">{activity.intensity_factor.toFixed(3)}</p>
                  </div>
                )}
                {activity.tss && (
                  <div>
                    <p className="text-sm text-slate-700">Training Stress Score (TSS)</p>
                    <p className="font-medium text-slate-900">{activity.tss.toFixed(0)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
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

// Helper function per renderizzare un item dei PB
function renderPbItem(label: string, value: number) {
  return (
    <div>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="font-medium text-sm text-slate-800">{Math.round(value)} W</p>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 