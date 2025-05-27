import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity, RoutePoint } from '@/lib/types';
import DeleteActivityButton from '@/components/DeleteActivityButton';
import ActivityViewClient from '@/components/ActivityViewClient';
import ClimbsSection from '@/components/ClimbsSection';
import { getActivityClimbs, detectAndSaveClimbs } from '@/app/activities/climbActions';
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
  if (!activity.fit_file_url || !activity.fit_file_name) {
    return null;
  }

  try {
    const filePath = `${activity.user_id}/${activity.athlete_id}/${activity.fit_file_name}`;
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

  let parsedRoutePoints: RoutePoint[] = [];
  if (typeof activity.route_points === 'string') {
    try {
      parsedRoutePoints = JSON.parse(activity.route_points) as RoutePoint[];
    } catch (e) {
      console.error("Errore nel parsing dei route_points:", e);
    }
  } else if (Array.isArray(activity.route_points)) {
    parsedRoutePoints = activity.route_points as RoutePoint[];
  }

  if (activity.user_id !== user.id) {
    redirect('/activities?error=unauthorized');
  }

  // Rilevamento automatico salite se ci sono dati GPS
  let climbsData = null;
  let climbsError = null;
  
  if (parsedRoutePoints.length > 0) {
    try {
      // Prima prova a recuperare salite esistenti
      const existingClimbs = await getActivityClimbs(activity.id);
      
      if (existingClimbs.success && existingClimbs.climbs.length > 0) {
        climbsData = existingClimbs.climbs;
        console.log(`✅ Trovate ${existingClimbs.climbs.length} salite esistenti per attività ${activity.id}`);
      } else {
        // Se non ci sono salite, FORZA il rilevamento automatico
        console.log(`🔍 Nessuna salita trovata, avvio rilevamento automatico per attività ${activity.id}`);
        const detectionResult = await detectAndSaveClimbs(
          activity.id, 
          parsedRoutePoints, 
          activity.title
        );
        
        if (detectionResult.success) {
          climbsData = detectionResult.climbs;
          console.log(`✅ Rilevate ${detectionResult.climbs.length} nuove salite per attività ${activity.id}`);
        } else {
          climbsError = detectionResult.error;
          console.log(`❌ Errore rilevamento salite: ${detectionResult.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Errore nel rilevamento salite:', error);
      climbsError = error instanceof Error ? error.message : 'Errore sconosciuto';
    }
  }

  const updatedFileUrl = activity.fit_file_url && activity.fit_file_name && activity.user_id && activity.athlete_id ? 
    await getUpdatedFileUrl(supabase, activity) : null;

  const fitFilePathForDelete = activity.fit_file_name && activity.user_id && activity.athlete_id
    ? `${activity.user_id}/${activity.athlete_id}/${activity.fit_file_name}`
    : null;

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        {/* Ultra-Modern Header */}
        <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
              {/* Gradient Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-t-3xl" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Icon Moderno */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  
                  {/* Titolo */}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{activity.title}</h1>
                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                       {format(new Date(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}
                        {/* @ts-ignore */}
                        {activity.athletes?.name && ` • ${activity.athletes?.name} ${activity.athletes?.surname}`}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-4">
                  <Link
                    href="/activities"
                    className="group inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Tutte le Attività
                  </Link>
                  <DeleteActivityButton 
                    activityId={activity.id} 
                    activityTitle={activity.title} 
                    fitFilePath={fitFilePathForDelete} 
                  />
                </div>
              </div>
            </div>
          </div>

        {/* Statistiche Principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[ 
            { label: "Distanza", value: activity.distance_meters ? `${(activity.distance_meters / 1000).toFixed(1)} km` : null, icon: <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            { label: "Tempo", value: activity.duration_seconds ? formatDuration(activity.duration_seconds) : null, icon: <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: "Dislivello", value: activity.elevation_gain_meters ? `${activity.elevation_gain_meters} m` : null, icon: <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
            { label: "Velocità Media", value: activity.avg_speed_kph ? `${activity.avg_speed_kph.toFixed(1)} km/h` : null, icon: <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12.675 2.196a.75.75 0 01.65 1.03L12.53 5.5H17a.75.75 0 010 1.5h-4.21l-2.077 7.27a.75.75 0 01-1.4-.4l2.72-9.52H7.5a.75.75 0 010-1.5h4.304l.8-2.8a.75.75 0 011.07-.404zM5.22 17.508l.552-1.933a.75.75 0 011.4.4l-.552 1.933a.75.75 0 01-1.4-.4zm2.516-1.44c.33.12.534.47.413.8l-.552 1.934a.75.75 0 01-1.4-.4l.552-1.934a.75.75 0 01.987-.4zM10.252 14.633l.552-1.933a.75.75 0 111.4.4l-.552 1.933a.75.75 0 11-1.4-.4z" /></svg> },
          ].map((stat, index) => stat.value ? (
            <div key={index} className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</h3>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ) : null)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna Principale (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrizione Attività */}
            {activity.description && (
              <div className="stats-card">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Descrizione
                </h2>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{activity.description}</p>
              </div>
            )}
            
            {/* Mappa e Grafico */}
            <div className="stats-card p-0 overflow-hidden">
              <ActivityViewClient {...activityViewProps} />
            </div>

            {/* Sezione Salite Rilevate - Sempre visibile se ci sono dati GPS */}
            {parsedRoutePoints.length > 0 && (
              <Suspense fallback={
                <div className="stats-card">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              }>
                <div className="stats-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l6 6m0 0l6-6M11 9v12a2 2 0 104 0V9" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Salite Rilevate</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {climbsData ? `${climbsData.length} salite trovate` : 'Analisi automatica del percorso'}
                      </p>
                    </div>
                  </div>
                  
                  {climbsError ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Errore nel rilevamento</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">{climbsError}</p>
                    </div>
                  ) : climbsData && climbsData.length > 0 ? (
                    <ClimbsSection 
                      climbs={climbsData}
                      showActions={true}
                      routePoints={parsedRoutePoints}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3l6 6m0 0l6-6M11 9v12a2 2 0 104 0V9" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nessuna salita rilevata</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Il percorso non contiene salite significative secondo i criteri di rilevamento
                      </p>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        <p>• Dislivello minimo: 50m</p>
                        <p>• Distanza minima: 500m</p>
                        <p>• Pendenza minima: 3%</p>
                      </div>
                    </div>
                  )}
                </div>
              </Suspense>
            )}
          </div>

          {/* Colonna Laterale (1/3) */}
          <div className="space-y-6">
            {/* Metriche di Potenza */}
            {(activity.avg_power_watts || activity.normalized_power_watts || activity.max_power_watts) && (
            <div className="stats-card">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Potenza
              </h2>
              <div className="space-y-3">
                {activity.avg_power_watts && (
                  <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Potenza Media</p>
                    <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{activity.avg_power_watts.toFixed(0)} W</p>
                  </div>
                )}
                {activity.normalized_power_watts && (
                  <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Potenza Normalizzata</p>
                    <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{activity.normalized_power_watts.toFixed(0)} W</p>
                  </div>
                )}
                {activity.max_power_watts && (
                  <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Potenza Massima</p>
                    <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{activity.max_power_watts.toFixed(0)} W</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Metriche Cardiache */}
            {(activity.avg_heart_rate || activity.max_heart_rate) && (
            <div className="stats-card">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                Frequenza Cardiaca
              </h2>
              <div className="space-y-3">
                {activity.avg_heart_rate && (
                  <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">FC Media</p>
                    <p className="font-bold text-lg text-red-600 dark:text-red-400">{activity.avg_heart_rate.toFixed(0)} bpm</p>
                  </div>
                )}
                {activity.max_heart_rate && (
                  <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">FC Massima</p>
                    <p className="font-bold text-lg text-red-600 dark:text-red-400">{activity.max_heart_rate.toFixed(0)} bpm</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Metriche Cadenza */}
            {activity.avg_cadence && (
            <div className="stats-card">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-emerald-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cadenza
              </h2>
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/30">
                <p className="text-xs text-gray-500 dark:text-gray-400">Cadenza Media</p>
                <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{activity.avg_cadence.toFixed(0)} rpm</p>
              </div>
            </div>
            )}

            {/* File Originale */}
            {updatedFileUrl && (
            <div className="stats-card">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-purple-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                File Originale
              </h2>
              <a 
                href={updatedFileUrl} 
                download={activity.fit_file_name || 'activity.fit'} 
                className="group flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Scarica File FIT
              </a>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

// Funzione per renderizzare gli elementi dei Personal Bests in modo consistente
function renderPbItem(label: string, value: number) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value.toFixed(0)} W</p>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 