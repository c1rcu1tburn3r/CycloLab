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
    <div className="min-h-screen bg-[#e9f1f5]">
      {/* Header/Navbar in stile con la landing page */}
      <div className="bg-[#1e2e42] text-white py-4 px-4 md:px-8 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#b4cad6] rounded-full flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1e2e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg">CycloLab</span>
          </div>
          <Link href="/athletes" className="text-[#b4cad6] hover:text-white flex items-center transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Tutti gli Atleti
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Header dell'attività */}
        <div className="bg-gradient-to-r from-[#1e2e42] to-[#4a6b85] rounded-xl text-white p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <Link 
                href="/activities" 
                className="text-[#b4cad6] hover:text-white flex items-center text-sm mb-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Torna alle attività
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold">{activity.title}</h1>
              <p className="text-[#b4cad6] mt-1">
                {format(new Date(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}
                {/* @ts-ignore */}
                {activity.athletes?.name && ` • ${activity.athletes?.name} ${activity.athletes?.surname}`}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/activities/${activity.id}/edit`}
                className="bg-[#b4cad6] hover:bg-white text-[#1e2e42] font-semibold py-2 px-4 rounded-lg shadow-md text-sm transition-colors"
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
              <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-[#b4cad6]">Distanza</p>
                <p className="text-2xl font-bold">{(activity.distance_meters / 1000).toFixed(1)} km</p>
              </div>
            )}
            {activity.duration_seconds && (
              <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-[#b4cad6]">Tempo</p>
                <p className="text-2xl font-bold">{formatDuration(activity.duration_seconds)}</p>
              </div>
            )}
            {activity.elevation_gain_meters && (
              <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-[#b4cad6]">Dislivello</p>
                <p className="text-2xl font-bold">{activity.elevation_gain_meters} m</p>
              </div>
            )}
            {activity.avg_speed_kph && (
              <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-[#b4cad6]">Velocità Media</p>
                <p className="text-2xl font-bold">{activity.avg_speed_kph.toFixed(1)} km/h</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Colonna sinistra - Descrizione e mappa */}
          <div className="lg:col-span-3 space-y-6">
            {/* Card con la descrizione */}
            {activity.description && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#b4cad6]">
                <h2 className="text-xl font-semibold mb-4 text-[#1e2e42] flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#4a6b85]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Descrizione
                </h2>
                <p className="text-[#4a6b85] whitespace-pre-line">{activity.description}</p>
              </div>
            )}
            
            {/* Sostituisci Mappa e Grafico con ActivityViewClient */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-[#b4cad6]">
              <ActivityViewClient {...activityViewProps} />
            </div>
          </div>

          {/* Colonna destra - Statistiche e metriche */}
          <div className="space-y-6">
            {/* Card con le metriche di potenza */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-[#b4cad6]">
              <h2 className="text-xl font-semibold mb-4 text-[#1e2e42] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-[#4a6b85]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Potenza
              </h2>
              <div className="space-y-3">
                {activity.avg_power_watts ? (
                  <div className="p-3 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
                    <p className="text-sm text-[#4a6b85]">Potenza Media</p>
                    <p className="font-medium text-[#1e2e42]">{activity.avg_power_watts.toFixed(0)} W</p>
                  </div>
                ) : (
                  <p className="text-[#4a6b85] italic">Dati di potenza non disponibili</p>
                )}
                {activity.normalized_power_watts && (
                  <div className="p-3 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
                    <p className="text-sm text-[#4a6b85]">Potenza Normalizzata</p>
                    <p className="font-medium text-[#1e2e42]">{activity.normalized_power_watts.toFixed(0)} W</p>
                  </div>
                )}
                {activity.max_power_watts && (
                  <div className="p-3 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
                    <p className="text-sm text-[#4a6b85]">Potenza Massima</p>
                    <p className="font-medium text-[#1e2e42]">{activity.max_power_watts.toFixed(0)} W</p>
                  </div>
                )}
              </div>

              {/* Personal Bests di potenza */}
              {(activity.power_1s || activity.power_5s || activity.power_10s || activity.power_30s || 
               activity.power_1min || activity.power_5min || activity.power_10min || activity.power_20min || 
               activity.power_30min || activity.power_1h) && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-[#1e2e42] mb-3">Best Intervals</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {activity.power_5s && renderPbItem("5s", activity.power_5s)}
                    {activity.power_30s && renderPbItem("30s", activity.power_30s)}
                    {activity.power_1min && renderPbItem("1min", activity.power_1min)}
                    {activity.power_5min && renderPbItem("5min", activity.power_5min)}
                    {activity.power_20min && renderPbItem("20min", activity.power_20min)}
                  </div>
                </div>
              )}
            </div>

            {/* Card con frequenza cardiaca */}
            {(activity.avg_heart_rate || activity.max_heart_rate) && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#b4cad6]">
                <h2 className="text-xl font-semibold mb-4 text-[#1e2e42] flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-[#4a6b85]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  Frequenza Cardiaca
                </h2>
                <div className="space-y-3">
                  {activity.avg_heart_rate && (
                    <div className="p-3 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
                      <p className="text-sm text-[#4a6b85]">Media</p>
                      <p className="font-medium text-[#1e2e42]">{activity.avg_heart_rate.toFixed(0)} bpm</p>
                    </div>
                  )}
                  {activity.max_heart_rate && (
                    <div className="p-3 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
                      <p className="text-sm text-[#4a6b85]">Massima</p>
                      <p className="font-medium text-[#1e2e42]">{activity.max_heart_rate.toFixed(0)} bpm</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card con cadenza */}
            {activity.avg_cadence && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#b4cad6]">
                <h2 className="text-xl font-semibold mb-4 text-[#1e2e42] flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-[#4a6b85]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Cadenza
                </h2>
                <div className="p-3 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
                  <p className="text-sm text-[#4a6b85]">Media</p>
                  <p className="font-medium text-[#1e2e42]">{activity.avg_cadence.toFixed(0)} rpm</p>
                </div>
              </div>
            )}

            {/* Scarica file originale */}
            {updatedFileUrl && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-[#b4cad6]">
                <h2 className="text-lg font-semibold mb-2 text-[#1e2e42]">File Originale</h2>
                <a 
                  href={updatedFileUrl} 
                  download
                  className="inline-flex items-center text-[#4a6b85] hover:text-[#1e2e42] transition-colors font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Scarica file FIT
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return 'N/D';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hStr = h > 0 ? `${h}h ` : '';
  const mStr = `${m}m `;
  const sStr = `${s}s`;
  
  return `${hStr}${mStr}${sStr}`;
}

function renderPbItem(label: string, value: number) {
  return (
    <div className="p-2 rounded-lg bg-[#e9f1f5] hover:bg-[#b4cad6]/20 transition-colors">
      <p className="text-xs text-[#4a6b85]">{label}</p>
      <p className="font-medium text-[#1e2e42]">{value} W</p>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 