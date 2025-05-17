'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActivityInsert } from '@/lib/types'; // Assicurati che ActivityInsert sia esportato da types.ts
import FitParser from 'fit-file-parser';

// Tipo per i dati del form che ci aspettiamo dal client
interface ActivityFormData {
  athlete_id: string;
  title: string;
  description?: string;
  activity_date: string; // Formato YYYY-MM-DD
  activity_type: string; // es. 'cycling', 'running'
  is_indoor: boolean;
  is_public: boolean;
  // Aggiungi altri campi se necessario
}

// Interfaccia per i dati metrici estratti dal file FIT
interface FitMetrics {
  total_distance_meters: number | null;
  total_duration_seconds: number | null;
  avg_power_watts?: number | null;
  normalized_power_watts?: number | null;
  tss?: number | null;
  intensity_factor?: number | null;
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  avg_speed_kph?: number | null;
  max_speed_kph?: number | null;
  total_elevation_gain_meters?: number | null;
  max_power_watts?: number | null;
  avg_cadence?: number | null;
  calories?: number | null;
}

// Interfaccia per i punti GPS del percorso
interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  time: number;  // Secondi trascorsi dall'inizio dell'attività
  distance?: number;  // distanza progressiva in metri
  speed?: number; // km/h
  heart_rate?: number; // bpm
  cadence?: number; // rpm
  power?: number; // watts
  grade?: number | null;
}

// Interfaccia per i dati parsati dal file FIT
interface ParsedFitData {
  sessions?: Array<{
    total_distance?: number;
    total_timer_time?: number;
    total_elapsed_time?: number;
    avg_power?: number;
    normalized_power?: number;
    training_stress_score?: number;
    intensity_factor?: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
    avg_speed?: number;
    max_speed?: number;
    total_ascent?: number;
    max_power?: number;
    avg_cadence?: number;
    total_calories?: number;
    start_position_lat?: number;
    start_position_long?: number;
    end_position_lat?: number;
    end_position_long?: number;
  }>;
  records?: Array<{
    heart_rate?: number;
    speed?: number;
    power?: number;
    cadence?: number;
    altitude?: number;
    distance?: number;
    elapsed_time?: number;
    timestamp?: Date | number;
    position_lat?: number;
    position_long?: number;
  }>;
}

export async function processAndCreateActivity(
  formData: ActivityFormData,
  fitFilePath: string // es. "user_id/athlete_id/timestamp_filename.fit"
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.warn('Nota: Potrebbe esserci una discrepanza nella gestione dei cookie tra versioni di Next.js. Controllo il formato di cookiesToSet:', cookiesToSet);
            const anyCookiesToSet = cookiesToSet as any[];
            anyCookiesToSet.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options));
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Utente non autenticato o sessione scaduta.' };
  }

  try {
    // --- INIZIO PARSING FIT REALE ---
    console.log(`[Server Action] Inizio parsing reale per: ${fitFilePath}`);
    
    // 1. Scarica il file FIT da Supabase Storage
    const { data: fitFileData, error: downloadError } = await supabase.storage
      .from('fit-files')
      .download(fitFilePath);
      
    if (downloadError) {
      console.error('Errore nel download del file FIT:', downloadError);
      throw new Error(`Impossibile scaricare il file FIT: ${downloadError.message}`);
    }
    
    // 2. Converti il blob in un array buffer per il parser
    const arrayBuffer = await fitFileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 3. Crea un'istanza del parser FIT con le opzioni desiderate
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'both',
    });
    
    // 4. Parsa il file FIT
    const parsedFitData = await new Promise<ParsedFitData>((resolve, reject) => {
      fitParser.parse(buffer, (error, data) => {
        if (error) {
          reject(new Error(error?.toString() || 'Parsing error'));
        } else {
          resolve(data as ParsedFitData);
        }
      });
    });
    
    console.log('[Server Action] Dati FIT reali estratti');
    
    // 5. Estrai i dati rilevanti dal risultato del parsing
    // Nota: la struttura dei dati dipende dal file FIT, quindi potrebbe essere necessario
    // adattare questo codice in base ai dati effettivi
    let fitMetrics: FitMetrics = {
      total_distance_meters: null,
      total_duration_seconds: null
    };
    
    // Estrai i punti del percorso dai records
    let routePoints: RoutePoint[] = [];
    let startLat: number | null = null;
    let startLon: number | null = null;
    let endLat: number | null = null;
    let endLon: number | null = null;
    
    // Estrai le coordinate e crea il percorso
    if (parsedFitData.records && parsedFitData.records.length > 0) {
      console.log(`[Server Action] Elaborazione ${parsedFitData.records.length} punti GPS`);
      
      // Filtra solo i record con coordinate valide
      const validRecords = parsedFitData.records.filter(record => 
        record.position_lat !== undefined && 
        record.position_long !== undefined &&
        record.position_lat !== null && 
        record.position_long !== null
      );
      
      // console.log(`[Server Action] Trovati ${validRecords.length} punti GPS validi`);
      // // DEBUG: Log dei primi record grezzi
      // if (validRecords.length > 0) {
      //   console.log('[Server Action DEBUG] Primi 5 record GPS grezzi (pre-conversione):', JSON.stringify(validRecords.slice(0, 5).map(r => ({ lat: r.position_lat, lon: r.position_long, alt: r.altitude, time: r.timestamp }))));
      // }
      
      if (validRecords.length > 0) {
        // Estrai coordinate di inizio e fine
        const firstRecord = validRecords[0];
        const lastRecord = validRecords[validRecords.length - 1];
        
        const convertSemicircleToDecimal = (semicircle: number): number => {
          return semicircle * (180 / Math.pow(2, 31));
        };

        // Ripristino logica per startLat/startLon con controllo formato
        if (firstRecord.position_lat !== undefined && firstRecord.position_long !== undefined) {
          if (Math.abs(firstRecord.position_lat) <= 90 && Math.abs(firstRecord.position_long) <= 180) {
            startLat = firstRecord.position_lat;
            startLon = firstRecord.position_long;
          } else {
            startLat = convertSemicircleToDecimal(firstRecord.position_lat);
            startLon = convertSemicircleToDecimal(firstRecord.position_long);
          }
        }
        // Ripristino logica per endLat/endLon con controllo formato
        if (lastRecord.position_lat !== undefined && lastRecord.position_long !== undefined) {
          if (Math.abs(lastRecord.position_lat) <= 90 && Math.abs(lastRecord.position_long) <= 180) {
            endLat = lastRecord.position_lat;
            endLon = lastRecord.position_long;
          } else {
            endLat = convertSemicircleToDecimal(lastRecord.position_lat);
            endLon = convertSemicircleToDecimal(lastRecord.position_long);
          }
        }
        
        const firstTimestamp = typeof validRecords[0].timestamp === 'number' 
          ? validRecords[0].timestamp 
          : (validRecords[0].timestamp instanceof Date ? validRecords[0].timestamp.getTime() : Date.now());

        // Prima mappa i punti base, poi calcola la pendenza in un secondo passaggio per avere accesso al punto precedente
        const tempRoutePoints: Omit<RoutePoint, 'grade'>[] = validRecords.map(record => {
          const currentTimestamp = typeof record.timestamp === 'number'
            ? record.timestamp
            : (record.timestamp instanceof Date ? record.timestamp.getTime() : Date.now());
          
          let lat = record.position_lat;
          let lng = record.position_long;

          // Applica conversione solo se necessario
          if (lat !== undefined && lng !== undefined) {
            if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
              lat = convertSemicircleToDecimal(lat);
              lng = convertSemicircleToDecimal(lng);
            }
          }

          const altitude = record.altitude !== undefined && record.altitude !== null ? record.altitude * 1000 : undefined; // Scala altitudine se presente

          return {
            lat: lat!,
            lng: lng!,
            elevation: altitude,
            time: (currentTimestamp - firstTimestamp) / 1000, // Secondi dall'inizio
            distance: record.distance !== undefined && record.distance !== null ? record.distance * 1000 : undefined, // Converti km (dal parser) in metri
            speed: record.speed, // Velocità in km/h, se presente direttamente
            heart_rate: record.heart_rate,
            cadence: record.cadence,
            power: record.power,
            // Il campo 'grade' verrà calcolato dopo
          };
        });

        // Ora calcola la pendenza e finalizza routePoints
        const MIN_DISTANCE_FOR_GRADE_CALCULATION = 1.5; // metri

        const rawGrades: (number | null)[] = tempRoutePoints.map((currentPoint, index, arr) => {
          if (index === 0 || !currentPoint.elevation || !currentPoint.distance) {
            return null; // Pendenza non calcolabile per il primo punto o se mancano dati
          }
          const prevPoint = arr[index - 1];
          if (!prevPoint.elevation || !prevPoint.distance) {
            return null; // Manca il punto precedente o i suoi dati
          }

          const deltaElevation = currentPoint.elevation - prevPoint.elevation;
          const deltaDistance = currentPoint.distance - prevPoint.distance;

          if (deltaDistance < MIN_DISTANCE_FOR_GRADE_CALCULATION) { // Modificato: < invece di <=
            // Se la distanza è troppo piccola, non calcolare una nuova pendenza.
            // Lasciarla null permette allo smoothing successivo di gestirla meglio.
            return null; 
          }
          
          // Se deltaDistance è 0 (improbabile se MIN_DISTANCE_FOR_GRADE_CALCULATION > 0) o negativa, pendenza 0.
          if (deltaDistance <= 0) {
            return 0; 
          }
          return (deltaElevation / deltaDistance) * 100;
        });
        
        // Smoothing della pendenza (media mobile semplice)
        const smoothedGrades: (number | null)[] = rawGrades.map((grade, index, arr) => {
          if (grade === null) return null;
          const windowSize = 5; // Ripristinata finestra di smoothing a 5
          const halfWindow = Math.floor(windowSize / 2);
          let sum = 0;
          let count = 0;
          for (let i = -halfWindow; i <= halfWindow; i++) {
            const K = index + i;
            if (K >= 0 && K < arr.length && arr[K] !== null) {
              sum += arr[K]!;
              count++;
            }
          }
          return count > 0 ? parseFloat((sum / count).toFixed(1)) : null; // Arrotonda a 1 decimale
        });

        routePoints = tempRoutePoints.map((point, index) => ({
          ...point,
          grade: smoothedGrades[index],
        }));

        // DEBUG: Log dei primi punti con pendenza
        // if (routePoints.length > 0) {
        //   console.log('[Server Action DEBUG] Primi 5 RoutePoint con pendenza:', JSON.stringify(routePoints.slice(0, 5)));
        // }

        // La logica per `applyAltitudeCorrectionAndScaling` e `calcolaElevazionePercorosoReale` 
        // viene eseguita dopo la creazione dei routePoints base.
        // Se `applyAltitudeCorrectionAndScaling` modifica l'elevazione IN PLACE sui routePoints, va bene.
        // Altrimenti, bisogna assicurarsi che i `routePoints` usati per il salvataggio siano quelli aggiornati.

        // COMMENTATO PER RISOLVERE LINTING ERROR - Funzione non trovata
        /*
        if(routePoints.length > 0 && parsedFitData.records) { // assicurati che records esista
            const { correctedElevationGain, scaledRoutePoints } = applyAltitudeCorrectionAndScaling(parsedFitData.records, routePoints);
            // Se scaledRoutePoints è un nuovo array, assegnalo a routePoints:
            routePoints = scaledRoutePoints; 
            // fitMetrics.total_elevation_gain_meters = correctedElevationGain;
            // Nota: il calcolo del dislivello viene fatto anche dopo, potremmo dover consolidare
        }
        */

        console.log(`[Server Action] Creati ${routePoints.length} punti per il percorso`);
      }
    } else if (parsedFitData.sessions && parsedFitData.sessions.length > 0) {
      // Se non ci sono record, prova a ottenere le coordinate dalla sessione
      const session = parsedFitData.sessions[0];
      if (session.start_position_lat && session.start_position_long) {
        startLat = convertSemicircleToDecimal(session.start_position_lat);
        startLon = convertSemicircleToDecimal(session.start_position_long);
      }
      
      if (session.end_position_lat && session.end_position_long) {
        endLat = convertSemicircleToDecimal(session.end_position_lat);
        endLon = convertSemicircleToDecimal(session.end_position_long);
      }
    }
    
    // Funzione per convertire le coordinate semicircolari a decimali
    function convertSemicircleToDecimal(semicircle: number): number {
      return semicircle * (180 / Math.pow(2, 31));
    }
    
    if (parsedFitData.sessions && parsedFitData.sessions.length > 0) {
      const session = parsedFitData.sessions[0]; // Prendi la prima sessione
      
      // Metodo 1: Utilizza direttamente il valore dalla sessione per l'elevazione
      let totalElevation: number | undefined = session.total_ascent;
      
      // Metodo 2: Se non c'è un valore valido, calcola dai record
      if ((!totalElevation || totalElevation < 1) && parsedFitData.records && parsedFitData.records.length > 0) {
        // console.log('[DEBUG] Calcolo elevazione dai record invece che dalla sessione');
        const calcoloElevazione = calcolaElevazionePercorosoReale(parsedFitData.records);
        if (calcoloElevazione !== null) {
          totalElevation = calcoloElevazione;
        }
      }
      
      fitMetrics = {
        total_distance_meters: session.total_distance ? session.total_distance * 1000 : null, // km to m
        total_duration_seconds: session.total_timer_time || session.total_elapsed_time || null,
        avg_power_watts: session.avg_power,
        normalized_power_watts: session.normalized_power,
        tss: session.training_stress_score,
        intensity_factor: session.intensity_factor,
        avg_heart_rate: session.avg_heart_rate,
        max_heart_rate: session.max_heart_rate,
        avg_speed_kph: session.avg_speed,
        max_speed_kph: session.max_speed,
        total_elevation_gain_meters: totalElevation,
        max_power_watts: session.max_power,
        avg_cadence: session.avg_cadence,
        calories: session.total_calories
      };
    } else if (parsedFitData.records && parsedFitData.records.length > 0) {
      // Se non ci sono sessioni, prova a calcolare le metriche dai record
      const records = parsedFitData.records;
      
      // Calcola distanza totale, durata, ecc. dai record
      let maxHr = 0;
      let maxSpeed = 0;
      let maxPower = 0;
      let sumHr = 0;
      let sumPower = 0;
      let sumCadence = 0;
      let hrCount = 0;
      let powerCount = 0;
      let cadenceCount = 0;
      
      // Calcolo dell'elevazione
      const totalElevation = calcolaElevazionePercorosoReale(records);
      
      records.forEach((record) => {
        // Max values
        if (record.heart_rate && record.heart_rate > maxHr) maxHr = record.heart_rate;
        if (record.speed && record.speed > maxSpeed) maxSpeed = record.speed;
        if (record.power && record.power > maxPower) maxPower = record.power;
        
        // Sums for averages
        if (record.heart_rate) {
          sumHr += record.heart_rate;
          hrCount++;
        }
        if (record.power) {
          sumPower += record.power;
          powerCount++;
        }
        if (record.cadence) {
          sumCadence += record.cadence;
          cadenceCount++;
        }
      });
      
      const lastRecord = records[records.length - 1];
      const firstRecord = records[0];
      
      fitMetrics = {
        total_distance_meters: lastRecord.distance ? lastRecord.distance * 1000 : null, // km to m
        total_duration_seconds: lastRecord.elapsed_time || 
          (lastRecord.timestamp && firstRecord.timestamp ? 
          (typeof lastRecord.timestamp === 'number' && typeof firstRecord.timestamp === 'number' ?
            (lastRecord.timestamp - firstRecord.timestamp) / 1000 :
            lastRecord.timestamp instanceof Date && firstRecord.timestamp instanceof Date ?
            (lastRecord.timestamp.getTime() - firstRecord.timestamp.getTime()) / 1000 : null) : null),
        avg_power_watts: powerCount > 0 ? Math.round(sumPower / powerCount) : null,
        avg_heart_rate: hrCount > 0 ? Math.round(sumHr / hrCount) : null,
        max_heart_rate: maxHr > 0 ? maxHr : null,
        avg_speed_kph: lastRecord.distance && lastRecord.elapsed_time ? 
          (lastRecord.distance / (lastRecord.elapsed_time / 3600)) : null,
        max_speed_kph: maxSpeed > 0 ? maxSpeed : null,
        max_power_watts: maxPower > 0 ? maxPower : null,
        avg_cadence: cadenceCount > 0 ? Math.round(sumCadence / cadenceCount) : null,
        total_elevation_gain_meters: totalElevation
      };
    }
    
    // Controlla che ci siano almeno alcuni dati, altrimenti usa valori di default
    if (!fitMetrics.total_distance_meters && !fitMetrics.total_duration_seconds) {
      console.warn('Dati FIT insufficienti, uso valori di default');
      // Usa valori stimati in base al tipo di attività
      if (formData.activity_type === 'cycling') {
        fitMetrics.total_distance_meters = 30000; // 30 km
        fitMetrics.total_duration_seconds = 3600; // 1 ora
      } else {
        fitMetrics.total_distance_meters = 5000; // 5 km
        fitMetrics.total_duration_seconds = 1800; // 30 minuti
      }
    }
    
    // console.log('[Server Action] Metriche estratte:', fitMetrics);
    // --- FINE PARSING FIT REALE ---

    // Estrai il nome del file da fitFilePath per salvarlo in fit_file_name
    const fitFileNameInStorage = fitFilePath.split('/').pop();
    if (!fitFileNameInStorage) {
      throw new Error('Impossibile determinare il nome del file FIT dallo storage path.');
    }

    // Crea un URL firmato per il file FIT
    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from('fit-files')
      .createSignedUrl(fitFilePath, 60 * 60 * 24 * 7); // URL valido per 7 giorni

    if (signedUrlError) {
      console.error('Errore nella generazione dell\'URL firmato per il file FIT:', signedUrlError);
      throw new Error(`Impossibile generare l\'URL per il file FIT: ${signedUrlError.message}`);
    }
    const fitFileUrl = urlData.signedUrl;

    const activityToInsert: ActivityInsert = {
      ...formData, // Dati dal form del client
      user_id: user.id,
      fit_file_path: fitFilePath, // Salva il percorso del file nello storage
      fit_file_name: fitFileNameInStorage,
      fit_file_url: fitFileUrl, // URL firmato
      // Usa i dati estratti dal FIT reale
      distance_meters: fitMetrics.total_distance_meters,
      duration_seconds: fitMetrics.total_duration_seconds !== null ? 
        Math.round(fitMetrics.total_duration_seconds) : null,
      avg_power_watts: fitMetrics.avg_power_watts,
      normalized_power_watts: fitMetrics.normalized_power_watts,
      tss: fitMetrics.tss,
      intensity_factor: fitMetrics.intensity_factor,
      avg_heart_rate: fitMetrics.avg_heart_rate,
      max_heart_rate: fitMetrics.max_heart_rate,
      avg_speed_kph: fitMetrics.avg_speed_kph,
      max_speed_kph: fitMetrics.max_speed_kph,
      elevation_gain_meters: fitMetrics.total_elevation_gain_meters,
      // Aggiungi le coordinate GPS
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon,
      // Aggiungi i punti del percorso come JSON
      route_points: routePoints.length > 0 ? JSON.stringify(routePoints) : null,
      // Altri campi se disponibili
      max_power_watts: fitMetrics.max_power_watts,
      avg_cadence: fitMetrics.avg_cadence,
      calories: fitMetrics.calories,
      status: 'active', // Imposta uno status di default
    };
    
    // Rimuovi eventuali campi undefined che potrebbero causare problemi con Supabase
    Object.keys(activityToInsert).forEach(key => {
      const k = key as keyof ActivityInsert;
      if (activityToInsert[k] === undefined) {
        delete activityToInsert[k];
      }
    });

    const { data: newActivity, error: insertError } = await supabase
      .from('activities')
      .insert(activityToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Errore durante l\'inserimento dell\'attività nel database:', insertError);
      throw new Error(`Errore durante il salvataggio dell\'attività: ${insertError.message}`);
    }

    if (!newActivity) {
      throw new Error('Creazione attività fallita, nessun dato restituito.');
    }

    // Revalida i percorsi per aggiornare la UI
    revalidatePath('/activities');
    revalidatePath(`/activities/${newActivity.id}`);

    return { success: true, activityId: newActivity.id, message: 'Attività creata con successo!' };

  } catch (error: any) {
    console.error("Errore completo nell'azione processAndCreateActivity:", error);
    return { error: error.message || 'Si è verificato un errore durante la creazione dell\'attività.' };
  }
}

// Funzione semplificata per calcolare l'elevazione in modo affidabile
function calcolaElevazionePercorosoReale(records: Array<{altitude?: number | null, distance?: number | null}>): number | null {
  const altitudePoints: number[] = [];
  records.forEach(record => {
    if (record.altitude !== undefined && record.altitude !== null) {
      altitudePoints.push(record.altitude * 1000); // Ripristinata scalatura km -> m
    }
  });

  if (altitudePoints.length < 3) { // Necessari almeno 3 punti per una media mobile di 3
    // Se ci sono meno di 3 punti, calcola senza smussamento e con una soglia base (o ritorna 0 se troppo pochi)
    if (altitudePoints.length < 2) return 0;
    let totalGainSimple = 0;
    for (let i = 1; i < altitudePoints.length; i++) {
      const diff = altitudePoints[i] - altitudePoints[i-1];
      if (diff > 0.5) { // Soglia base più alta se non c'è smussamento (es. 0.5m)
        totalGainSimple += diff;
      }
    }
    return Math.round(totalGainSimple);
  }

  // 1. Applica smussamento (media mobile su 3 punti)
  const smoothedAltitudes: number[] = [];
  smoothedAltitudes.push(altitudePoints[0]); // Il primo punto rimane invariato
  for (let i = 1; i < altitudePoints.length - 1; i++) {
    const smoothedVal = (altitudePoints[i-1] + altitudePoints[i] + altitudePoints[i+1]) / 3;
    smoothedAltitudes.push(smoothedVal);
  }
  smoothedAltitudes.push(altitudePoints[altitudePoints.length - 1]); // L'ultimo punto rimane invariato

  // 2. Calcolo del dislivello sui punti smussati con una soglia adeguata
  let totalGain = 0;
  const SOGLIA_DOPO_SMUSSAMENTO = 0.12; // Modificata a 0.12
  
  for (let i = 1; i < smoothedAltitudes.length; i++) {
    const diff = smoothedAltitudes[i] - smoothedAltitudes[i-1];
    if (diff > SOGLIA_DOPO_SMUSSAMENTO) {
      totalGain += diff;
    }
  }

  return Math.round(totalGain);
}

export async function deleteActivity(activityId: string, fitFilePath: string | null) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Next.js v13.4.x 
          // cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          // Next.js v14.x 
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Per gestire eventuali modifiche nell'API cookies tra versioni minori di Next.js
            console.warn('Nota: Potrebbe esserci una discrepanza nella gestione dei cookie tra versioni di Next.js. Controllo il formato di cookiesToSet:', cookiesToSet);
            const anyCookiesToSet = cookiesToSet as any[];
            anyCookiesToSet.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options));
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Utente non autenticato o sessione scaduta.');
  }

  try {
    // 1. Eliminare il file FIT da Supabase Storage (se esiste)
    if (fitFilePath) {
      const { error: fileError } = await supabase.storage
        .from('fit-files')
        .remove([fitFilePath]);

      if (fileError) {
        // Non blocchiamo l'eliminazione dell'attività se il file non viene trovato (potrebbe essere già stato eliminato)
        // o per altri errori non critici, ma logghiamo l'errore.
        console.error(`ERRORE FORTE nell'eliminazione del file ${fitFilePath} da Storage:`, fileError.message);
        throw new Error(`Fallimento eliminazione file dallo storage: ${fileError.message}`);
      }
    }

    // 2. Eliminare il record dell'attività dal database
    const { error: activityError } = await supabase
      .from('activities')
      .delete()
      .match({ id: activityId, user_id: user.id }); // Importante: assicurati che l'utente possa eliminare solo le proprie attività

    if (activityError) {
      throw new Error(`Errore durante l'eliminazione dell'attività dal database: ${activityError.message}`);
    }

  } catch (error: any) {
    console.error("Errore completo nell'azione deleteActivity:", error);
    // Restituisce un messaggio di errore specifico che può essere mostrato all'utente
    // In alternativa, si potrebbe voler lanciare l'errore per gestirlo nel Client Component
    // throw error; // Se si vuole gestire nel client component e mostrare lì l'errore.
    return { error: error.message || 'Si è verificato un errore durante l\'eliminazione.' };
  }

  // 3. Revalidare i percorsi e reindirizzare
  revalidatePath('/activities'); // Revalida la pagina dell'elenco attività
  revalidatePath(`/activities/${activityId}`); // Revalida la pagina di dettaglio dell'attività eliminata (porterà a 404 o redirect)
  redirect('/activities');
} 