'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActivityInsert, RoutePoint } from '@/lib/types';
import FitParser from 'fit-file-parser';
import type { SupabaseClient } from '@supabase/supabase-js'; // Aggiunto per tipizzare il client
import { calculatePowerBests, PowerBests } from '../../lib/fitnessCalculations'; 

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

// Funzione per recuperare l'FTP più recente di un atleta fino a una certa data
async function getAthleteFTPOnDate(
  supabase: SupabaseClient<any, "public", any>, // Tipizzazione più generica se Database non è disponibile qui
  athleteId: string,
  activityDate: string // Formato YYYY-MM-DD
): Promise<number | null> {
  if (!athleteId || !activityDate) {
    console.warn('[getAthleteFTPOnDate] athleteId o activityDate mancanti.');
    return null;
  }

  try {
    // 1. PRIMA: Cerca FTP <= data attività (comportamento normale)
    const { data: profileEntry, error } = await supabase
      .from('athlete_profile_entries')
      .select('ftp_watts, effective_date')
      .eq('athlete_id', athleteId)
      .lte('effective_date', activityDate) // Data effettiva minore o uguale alla data dell'attività
      .order('effective_date', { ascending: false }) // Prendi la più recente
      .limit(1)
      .single();

    // Se trovato FTP retroattivo, usalo
    if (!error && profileEntry && profileEntry.ftp_watts) {
      console.log(`[getAthleteFTPOnDate] FTP retroattivo trovato: ${profileEntry.ftp_watts}W (data: ${profileEntry.effective_date})`);
      return profileEntry.ftp_watts;
    }

    // 2. FALLBACK: Se non trovato, cerca qualsiasi FTP disponibile (anche futuro)
    console.warn(`[getAthleteFTPOnDate] Nessun FTP retroattivo per atleta ${athleteId} alla data ${activityDate}. Cerco FTP futuro...`);
    
    const { data: anyProfileEntry, error: futureError } = await supabase
      .from('athlete_profile_entries')
      .select('ftp_watts, effective_date')
      .eq('athlete_id', athleteId)
      .order('effective_date', { ascending: true }) // Prendi il primo disponibile
      .limit(1)
      .single();

    if (!futureError && anyProfileEntry && anyProfileEntry.ftp_watts) {
      console.warn(`[getAthleteFTPOnDate] ⚠️  USANDO FTP FUTURO: ${anyProfileEntry.ftp_watts}W (data: ${anyProfileEntry.effective_date}) per attività del ${activityDate}`);
      return anyProfileEntry.ftp_watts;
    }

    // 3. ULTIMO FALLBACK: Nessun FTP disponibile
    console.warn(`[getAthleteFTPOnDate] ❌ Nessun FTP disponibile per atleta ${athleteId}. Usando fallback intelligente.`);
    return 200; // FTP default per amatori

  } catch (e: any) {
    console.error('[getAthleteFTPOnDate] Eccezione nel recupero del profilo FTP:', e.message);
    return 200; // FTP default per amatori
  }
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
    // Recupera l'FTP dell'atleta alla data dell'attività
    const athleteFTP = await getAthleteFTPOnDate(supabase, formData.athlete_id, formData.activity_date);
    console.log(`[Server Action] FTP recuperato per atleta ${formData.athlete_id} in data ${formData.activity_date}: ${athleteFTP} W`);

    // Verifica se stiamo usando FTP default o futuro
    let ftpWarningMessage = '';
    if (athleteFTP === 200) {
      ftpWarningMessage = '⚠️ Usato FTP default (200W) - considera l\'aggiunta di dati FTP reali per questo atleta.';
    }

    // --- INIZIO PARSING FIT REALE ---
    // console.log(`[Server Action] Inizio parsing reale per: ${fitFilePath}`);
    
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
    
    // console.log('[Server Action] Dati FIT reali estratti');
    
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
      // console.log(`[Server Action] Elaborazione ${parsedFitData.records.length} punti GPS`);
      
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
        const tempRoutePoints: Omit<RoutePoint, 'grade'>[] = validRecords.map((record, index) => {
          
          let recordAbsoluteTimestampSeconds: number | undefined = undefined;
          if (record.timestamp instanceof Date) {
            recordAbsoluteTimestampSeconds = Math.floor(record.timestamp.getTime() / 1000);
          } else if (typeof record.timestamp === 'number') {
            // Se è un numero, dobbiamo capire se è già in secondi o millisecondi.
            // Molti timestamp Unix sono in secondi. Se > (circa anno 2000 in sec), potrebbe essere ms.
            // Assumiamo per ora che se è un numero, sia già in secondi o il parser lo gestisce.
            // Se il tuo parser fornisce timestamp numerici in millisecondi, dovrai dividere per 1000 qui.
            // Per sicurezza, logghiamo se è un numero per ispezione.
            // console.log("[actions.ts] record.timestamp is a number:", record.timestamp);
            recordAbsoluteTimestampSeconds = record.timestamp; // Potrebbe necessitare di /1000
          }

          let lat = record.position_lat;
          let lng = record.position_long;

          // Applica conversione solo se necessario
          if (lat !== undefined && lng !== undefined) {
            if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
              lat = convertSemicircleToDecimal(lat);
              lng = convertSemicircleToDecimal(lng);
            }
          }

          const altitude = record.altitude !== undefined && record.altitude !== null ? record.altitude * 1000 : undefined;

          return {
            lat: lat!,
            lng: lng!,
            elevation: altitude,
            time: record.elapsed_time ?? 0, 
            distance: record.distance !== undefined ? record.distance * 1000 : undefined, 
            speed: record.speed,
            heart_rate: record.heart_rate,
            cadence: record.cadence,
            power: record.power,
            timestamp: recordAbsoluteTimestampSeconds, // Assegna il timestamp assoluto in secondi
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
          grade: smoothedGrades[index] === null ? undefined : smoothedGrades[index],
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

        // console.log(`[Server Action] Creati ${routePoints.length} punti per il percorso`);
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
            (lastRecord.timestamp - firstRecord.timestamp) : // Assumiamo che i timestamp dei record siano in secondi, come per RoutePoint.timestamp
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

    // Inizializza le metriche NP, IF, TSS dai dati della sessione se presenti
    let sessionNP: number | null = null;
    let sessionIF: number | null = null;
    let sessionTSS: number | null = null;

    if (parsedFitData.sessions && parsedFitData.sessions.length > 0) {
      const session = parsedFitData.sessions[0];
      sessionNP = session.normalized_power ?? null;
      sessionIF = session.intensity_factor ?? null;
      sessionTSS = session.training_stress_score ?? null;
    }

    // --- CALCOLO/RICALCOLO NP, IF, TSS ---
    let calculatedNP: number | null = fitMetrics.normalized_power_watts ?? null; // CORRETTO: gestisce undefined da fitMetrics

    // Se NP non è nel FIT (o è 0, che è improbabile per NP), prova a calcolarlo dai routePoints
    if (!calculatedNP || calculatedNP === 0) {
      if (routePoints && routePoints.length > 0) {
        const powerDataForNP = routePoints.map(p => p.power);
        // console.log(`[Server Action] Tentativo di calcolo NP da ${powerDataForNP.length} punti di potenza.`);
        calculatedNP = calculateNormalizedPower(powerDataForNP);
        if (calculatedNP) {
          // console.log('[Server Action] NP calcolato dai routePoints:', calculatedNP);
          fitMetrics.normalized_power_watts = parseFloat(calculatedNP.toFixed(0));
        } else {
          // console.warn('[Server Action] Calcolo NP dai routePoints non riuscito o ha restituito null.');
        }
      } else {
        // console.warn('[Server Action] Nessun routePoints disponibile per calcolare NP.');
      }
    } else {
      // console.log('[Server Action] NP utilizzato dal file FIT:', calculatedNP);
    }

    // Ricalcola IF e TSS se abbiamo l'FTP dell'atleta e un NP valido
    if (athleteFTP && athleteFTP > 0 && calculatedNP && calculatedNP > 0) {
      // console.log(`[Server Action] Ricalcolo IF e TSS con FTP: ${athleteFTP} W, NP: ${calculatedNP} W`);
      
      const newIF = calculatedNP / athleteFTP;
      fitMetrics.intensity_factor = parseFloat(newIF.toFixed(3));
      // console.log('[Server Action] IF ricalcolato:', fitMetrics.intensity_factor);

      if (fitMetrics.total_duration_seconds && fitMetrics.total_duration_seconds > 0) {
        const newTSS = (fitMetrics.total_duration_seconds * calculatedNP * newIF) / (athleteFTP * 3600) * 100;
        fitMetrics.tss = parseFloat(newTSS.toFixed(0));
        // console.log('[Server Action] TSS ricalcolato:', fitMetrics.tss);
      } else {
        // console.warn('[Server Action] Durata totale non disponibile, TSS non ricalcolato.');
        // Manteniamo il TSS dal FIT se presente, altrimenti sarà null
        fitMetrics.tss = sessionTSS ?? null;
      }
    } else {
      // console.warn('[Server Action] FTP o NP non validi, IF e TSS non saranno ricalcolati. Si utilizzeranno i valori del FIT (se presenti).');
      // Assicura che se non ricalcoliamo, usiamo quelli della sessione (che dovrebbero già essere number | null)
      const finalSessionIF: number | null = sessionIF !== undefined ? sessionIF : null;
      const finalSessionTSS: number | null = sessionTSS !== undefined ? sessionTSS : null;
      fitMetrics.intensity_factor = finalSessionIF;
      fitMetrics.tss = finalSessionTSS;
    }
    // Arrotonda NP a intero se è stato calcolato o preso dal FIT
    if (fitMetrics.normalized_power_watts) {
        fitMetrics.normalized_power_watts = Math.round(fitMetrics.normalized_power_watts);
    }
    // Arrotonda IF a 3 decimali e TSS a intero se sono stati calcolati o presi dal FIT
    if (fitMetrics.intensity_factor) {
        fitMetrics.intensity_factor = parseFloat(fitMetrics.intensity_factor.toFixed(3));
    }
    if (fitMetrics.tss) {
        fitMetrics.tss = Math.round(fitMetrics.tss);
    }

    // console.log('[Server Action] Metriche finali prima del salvataggio:', JSON.stringify(fitMetrics));

    // --- CALCOLO PERSONAL BESTS DI POTENZA PER L'ATTIVITÀ ---
    let activityPowerBests: PowerBests | null = null;
    if (routePoints && routePoints.length > 0) {
      // console.log(`[Server Action] Calcolo Power Bests da ${routePoints.length} route points.`);
      activityPowerBests = calculatePowerBests(routePoints);
      // console.log("[Server Action] Power Bests calcolati per l'attività:", activityPowerBests);
    } else {
      // console.warn("[Server Action] Nessun routePoints disponibile per calcolare i Power Bests.");
    }

    // --- FINE PARSING FIT REALE E CALCOLI AGGIUNTIVI ---

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

      // Aggiungi i Personal Bests di potenza dell'attività
      pb_power_5s_watts: activityPowerBests?.p5s ?? null,
      pb_power_15s_watts: activityPowerBests?.p15s ?? null,
      pb_power_30s_watts: activityPowerBests?.p30s ?? null,
      pb_power_60s_watts: activityPowerBests?.p60s ?? null,
      pb_power_300s_watts: activityPowerBests?.p300s ?? null,
      pb_power_600s_watts: activityPowerBests?.p600s ?? null,
      pb_power_1200s_watts: activityPowerBests?.p1200s ?? null,
      pb_power_1800s_watts: activityPowerBests?.p1800s ?? null,
      pb_power_3600s_watts: activityPowerBests?.p3600s ?? null,
      pb_power_5400s_watts: activityPowerBests?.p5400s ?? null,
      // Se avessi peak_power separato e una colonna nel DB, lo aggiungeresti qui
      // max_power_watts: activityPowerBests?.peak_power ?? fitMetrics.max_power_watts, // Sovrascrivi se calcolato
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

    // --- AGGIORNAMENTO PERSONAL BESTS STORICI DELL'ATLETA ---
    if (activityPowerBests && formData.athlete_id && newActivity.id && newActivity.activity_date) {
      // console.log(`[Server Action] Inizio aggiornamento PB storici per atleta: ${formData.athlete_id}`);
      const pbsToUpdate = [];

      for (const key in activityPowerBests) {
        if (key.startsWith('p') && key.endsWith('s')) { // Considera solo pXs (es. p5s, p60s)
          const durationSeconds = parseInt(key.substring(1, key.length - 1), 10);
          const newPbValue = activityPowerBests[key as keyof PowerBests] as number | null;

          if (newPbValue !== null && !isNaN(durationSeconds)) {
            // console.log(`[Server Action] Controllo PB per durata ${durationSeconds}s, valore: ${newPbValue}W`);
            // L'operazione di UPSERT gestirà il confronto implicito.
            // Se c'è un conflitto su (athlete_id, metric_type, duration_seconds),
            // aggiornerà solo se il nuovo `value_watts` è maggiore o se `activity_date` è più recente.
            // Per semplicità, facciamo un upsert che sovrascrive se il nuovo PB è da questa attività.
            // Il confronto "migliore" lo facciamo prima dell'UPSERT qui.

            // Recupera il PB esistente per questa durata
            const { data: existingPb, error: fetchError } = await supabase
              .from('athlete_personal_bests')
              .select('value_watts')
              .eq('athlete_id', formData.athlete_id)
              .eq('metric_type', 'power')
              .eq('duration_seconds', durationSeconds)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = single row not found, che va bene
              // console.error(`[Server Action] Errore nel recuperare PB esistente per ${durationSeconds}s:`, fetchError.message);
              // continua con le altre durate
              continue;
            }
            
            if (!existingPb || (existingPb && newPbValue > existingPb.value_watts)) {
              // console.log(`[Server Action] Nuovo PB (${newPbValue}W) migliore o non esistente per ${durationSeconds}s. Preparo UPSERT.`);
              pbsToUpdate.push({
                athlete_id: formData.athlete_id,
                metric_type: 'power',
                duration_seconds: durationSeconds,
                value_watts: newPbValue,
                activity_id: newActivity.id, // ID della nuova attività appena creata
                activity_date: newActivity.activity_date, // Data della nuova attività
                achieved_at: new Date().toISOString(), // Ora corrente in cui il record PB viene aggiornato
              });
            } else {
              // console.log(`[Server Action] PB esistente (${existingPb?.value_watts}W) per ${durationSeconds}s è uguale o migliore. Non aggiorno.`);
            }
          }
        }
      }

      if (pbsToUpdate.length > 0) {
        // console.log("[Server Action] Eseguo UPSERT per PB storici:", pbsToUpdate);
        const { error: upsertError } = await supabase
          .from('athlete_personal_bests')
          .upsert(pbsToUpdate, {
            onConflict: 'athlete_id,metric_type,duration_seconds',
            // ignoreDuplicates: false // default è false, quindi farà UPDATE in caso di conflitto
          });

        if (upsertError) {
          // console.error('[Server Action] Errore durante UPSERT dei PB storici:', upsertError.message);
          // Non bloccare il successo della creazione attività per questo, ma logga l'errore
        } else {
          // console.log('[Server Action] PB storici aggiornati con successo.');
        }
      }
    }
    // --- FINE AGGIORNAMENTO PERSONAL BESTS STORICI ---

    revalidatePath('/activities');
    revalidatePath(`/activities/${newActivity.id}`);

    // Componi messaggio finale
    let finalMessage = 'Attività creata con successo!';
    if (ftpWarningMessage) {
      finalMessage += ` ${ftpWarningMessage}`;
    }

    return { 
      success: true, 
      activityId: newActivity.id, 
      message: finalMessage,
      warning: ftpWarningMessage || undefined
    };

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

// Funzione per calcolare la Normalized Power (NP)
// Basata sull'algoritmo: media mobile a 30s sulla potenza, elevazione alla quarta, media, radice quarta.
function calculateNormalizedPower(powerReadings: (number | undefined | null)[]): number | null {
  const validPowerReadings = powerReadings.filter(p => p !== undefined && p !== null && p >= 0) as number[];

  if (validPowerReadings.length < 30) {
    // Non abbastanza dati per una media mobile a 30s significativa, 
    // potremmo restituire la media semplice o null.
    // Per NP, è meglio restituire null se non si può calcolare correttamente.
    // O, alternativamente, se ci sono dati ma meno di 30, si potrebbe usare la media semplice della potenza.
    // Per ora, restituiamo null per forzare un calcolo più robusto o l'uso del valore dal FIT.
    if (validPowerReadings.length > 0) {
      // Calcola la media semplice come fallback se ci sono meno di 30 punti ma più di 0
      // return validPowerReadings.reduce((acc, p) => acc + p, 0) / validPowerReadings.length;
      // Decidiamo di ritornare null se non si può fare il calcolo a 30s
      console.warn("[calculateNormalizedPower] Non abbastanza dati (<30) per calcolare NP in modo standard. Lunghezza dati:", validPowerReadings.length);
      return null; 
    }
    return null;
  }

  const thirtySecondRollingAverage: number[] = [];
  for (let i = 0; i <= validPowerReadings.length - 30; i++) {
    let sum = 0;
    for (let j = 0; j < 30; j++) {
      sum += validPowerReadings[i + j];
    }
    thirtySecondRollingAverage.push(sum / 30);
  }

  if (thirtySecondRollingAverage.length === 0) {
    return null; // Non dovrebbe succedere se validPowerReadings.length >= 30
  }

  const fourthPowerValues = thirtySecondRollingAverage.map(p => Math.pow(p, 4));
  const averageOfFourthPowerValues = fourthPowerValues.reduce((acc, p) => acc + p, 0) / fourthPowerValues.length;
  
  return Math.pow(averageOfFourthPowerValues, 0.25);
} 