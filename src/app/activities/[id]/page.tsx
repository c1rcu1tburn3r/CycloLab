import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Activity } from '@/lib/types';
import DeleteActivityButton from '@/components/DeleteActivityButton';

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link 
            href="/activities" 
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm mb-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Torna alle attività
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{activity.title}</h1>
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/activities/${activity.id}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md text-sm"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna sinistra - Informazioni principali */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card con le informazioni di base */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Dettagli Attività</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Data</p>
                <p className="font-medium">
                  {format(new Date(activity.activity_date), 'EEEE d MMMM yyyy', { locale: it })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Atleta</p>
                <p className="font-medium">
                  {/* @ts-ignore */}
                  {activity.athletes?.name} {activity.athletes?.surname}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Tipo</p>
                <p className="font-medium capitalize">{activity.activity_type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Ambiente</p>
                <p className="font-medium">{activity.is_indoor ? 'Indoor' : 'Outdoor'}</p>
              </div>
              {activity.distance_meters && (
                <div>
                  <p className="text-sm text-slate-500">Distanza</p>
                  <p className="font-medium">{(activity.distance_meters / 1000).toFixed(1)} km</p>
                </div>
              )}
              {activity.duration_seconds && (
                <div>
                  <p className="text-sm text-slate-500">Durata</p>
                  <p className="font-medium">{formatDuration(activity.duration_seconds)}</p>
                </div>
              )}
              {activity.elevation_gain_meters && (
                <div>
                  <p className="text-sm text-slate-500">Dislivello</p>
                  <p className="font-medium">{activity.elevation_gain_meters} m</p>
                </div>
              )}
              {activity.avg_speed_kph && (
                <div>
                  <p className="text-sm text-slate-500">Velocità Media</p>
                  <p className="font-medium">{activity.avg_speed_kph.toFixed(1)} km/h</p>
                </div>
              )}
            </div>
          </div>

          {/* Card con la descrizione */}
          {activity.description && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">Descrizione</h2>
              <p className="text-slate-700 whitespace-pre-line">{activity.description}</p>
            </div>
          )}
        </div>

        {/* Colonna destra - Statistiche e metriche */}
        <div className="space-y-6">
          {/* Card con le metriche di potenza */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Metriche di Potenza</h2>
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
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Metriche Cardiache</h2>
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
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Altre Metriche</h2>
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
            </div>
          </div>

          {/* Card con il file originale */}
          {updatedFileUrl && activity.fit_file_name && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">File FIT Associato</h2>
              <a 
                href={updatedFileUrl} 
                download={activity.fit_file_name} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
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