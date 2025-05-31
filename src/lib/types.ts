// src/lib/types.ts
import { Database } from './database.types';

// Definizione dei tipi per le tabelle
export type AthleteRow = Database['public']['Tables']['athletes']['Row'];

// Tipo Athlete usato nell'applicazione, estende AthleteRow per includere campi addizionali
// o campi che ci si aspetta siano nella tabella athletes ma potrebbero non essere
// ancora riflessi in AthleteRow se i tipi generati da Supabase non sono aggiornati.
export type Athlete = AthleteRow & {
  email?: string | null;
  phone_number?: string | null;
  current_ftp?: number | null; // Campo calcolato per dashboard analytics
  // Se avatar_url non fosse in AthleteRow ma necessario, andrebbe aggiunto qui.
  // Da AthleteForm.tsx, avatar_url è omesso da AthleteFormData,
  // il che implica che è già in AthleteRow (e quindi in Athlete).
};

export interface ActivityData {
  id: string;
  file_name: string;
  user_id: string; // Coach ID
  created_at: string;
  updated_at: string;
  activity_type: string;
  total_distance?: number | null;
  total_duration?: number | null; // Assumiamo sia in secondi (tempo in movimento)
  total_ascent?: number | null;
  total_descent?: number | null;
  avg_speed?: number | null;
  max_speed?: number | null;
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  avg_power?: number | null;
  max_power?: number | null;
  normalized_power_watts?: number | null;
  intensity_factor?: number | null; // NUOVO per PMC
  tss?: number | null;              // NUOVO per PMC
  avg_cadence?: number | null;
  max_cadence?: number | null;
  activity_date?: string;
  description?: string | null;
  original_file_url?: string | null;
  athletes?: { name: string; surname: string } | null;
  athlete_id?: string; 
  // Campi per Personal Bests della singola attività (potenza)
  pb_power_5s_watts?: number | null;
  pb_power_15s_watts?: number | null;
  pb_power_30s_watts?: number | null;
  pb_power_60s_watts?: number | null;
  pb_power_300s_watts?: number | null;
  pb_power_600s_watts?: number | null;
  pb_power_1200s_watts?: number | null;
  pb_power_1800s_watts?: number | null;
  pb_power_3600s_watts?: number | null;
  pb_power_5400s_watts?: number | null;
  // pb_power_1s_watts?: number | null; // Se decidi di aggiungerlo e non usare max_power_watts
}

export type Activity = Database['public']['Tables']['activities']['Row'] & {
  route_points?: RoutePoint[] | string | null;
  athletes?: Pick<Athlete, 'name' | 'surname'> | null;
  athlete_id?: string | null; 
  normalized_power_watts?: number | null;
  intensity_factor?: number | null;
  tss?: number | null;
  // Aggiungiamo anche qui i campi PB per coerenza, 
  // dato che 'Row' ora li includerà dopo l'ALTER TABLE.
  pb_power_5s_watts?: number | null;
  pb_power_15s_watts?: number | null;
  pb_power_30s_watts?: number | null;
  pb_power_60s_watts?: number | null;
  pb_power_300s_watts?: number | null;
  pb_power_600s_watts?: number | null;
  pb_power_1200s_watts?: number | null;
  pb_power_1800s_watts?: number | null;
  pb_power_3600s_watts?: number | null;
  pb_power_5400s_watts?: number | null;
  // pb_power_1s_watts?: number | null;
  
  // Aggiungo le proprietà power_* usate nella pagina di dettaglio attività
  power_1s?: number | null;
  power_5s?: number | null;
  power_10s?: number | null;
  power_30s?: number | null;
  power_1min?: number | null;
  power_5min?: number | null;
  power_10min?: number | null;
  power_20min?: number | null;
  power_30min?: number | null;
  power_1h?: number | null;
};

// Tipi per l'inserimento di nuovi record
export type AthleteInsert = Database['public']['Tables']['athletes']['Insert'];
export type ActivityInsert = Database['public']['Tables']['activities']['Insert'];

// Tipi per l'aggiornamento di record esistenti
export type AthleteUpdate = Database['public']['Tables']['athletes']['Update'];
export type ActivityUpdate = Database['public']['Tables']['activities']['Update'];

// Definizione del tipo RoutePoint
export interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  time: number; // Timestamp in secondi dall'inizio
  distance?: number; // Distanza progressiva in metri
  speed?: number; // kph
  heart_rate?: number; // bpm
  cadence?: number; // rpm
  power?: number; // watts
  timestamp?: number; // Potrebbe essere il timestamp originale del record FIT
  grade?: number;         // Pendenza in % in quel punto (calcolata)
}

export interface SegmentMetrics {
  // Metriche Generali
  durationSeconds: number | null;
  distanceMeters: number | null;
  totalElevationGain: number | null; // Dislivello positivo del segmento
  totalElevationLoss: number | null; // Dislivello negativo del segmento
  
  // Pendenza
  averageGrade: number | null;
  maxGrade: number | null;
  
  // Velocità
  averageSpeedKph: number | null;
  maxSpeedKph: number |null;
  vam: number | null; // Velocità Ascensionale Media (m/h)

  // Potenza
  averagePower: number | null; // AP
  normalizedPower?: number | null; // NP (richiede FTP)
  maxPower: number | null;
  wattsPerKg?: number | null; // Richiede peso atleta e AP (o NP)
  variabilityIndex?: number | null; // VI = NP / AP (richiede FTP)
  intensityFactor?: number | null; // IF = NP / FTP (richiede FTP)
  tss?: number | null; // (richiede FTP, NP, IF)
  workKiloJoules: number | null; // Lavoro totale

  // Frequenza Cardiaca
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  powerToHeartRateDecoupling?: number | null; // Pw:Hr in %

  // Cadenza
  averageCadence: number | null;
  maxCadence: number | null;

  // Efficienza Pedalata (se disponibili dai dati FIT)
  averageTorqueEffectiveness?: number | null;
  averagePedalSmoothness?: number | null;
  
  // Tempo nelle Zone (richiedono definizione zone atleta)
  timeInPowerZones?: Record<string, number>; // es. { "Z1": 120, "Z2": 300, ... } (secondi)
  timeInHeartRateZones?: Record<string, number>;
}

// Tipo per una singola voce nello storico del profilo prestativo dell'atleta
export interface AthleteProfileEntry {
  id: string; // UUID della voce di profilo
  athlete_id: string; // UUID dell'atleta a cui questa voce appartiene
  effective_date: string; // Data da cui questa voce è valida (YYYY-MM-DD)
  ftp_watts?: number | null; // FTP in watt
  weight_kg?: number | null; // Peso in kg
  max_hr_bpm?: number | null; // FC massima in bpm
  vo2max_ml_kg_min?: number | null; // VO2max calcolato scientificamente (ml/kg/min)
  vo2max_method?: string | null; // Metodo usato per calcolo VO2max
  vo2max_confidence?: number | null; // Affidabilità calcolo VO2max (0.0-1.0)
  vo2max_reasoning?: string | null; // Spiegazione dettagliata del calcolo VO2max
  created_at: string; // Timestamp di creazione della voce
  updated_at?: string; // Timestamp di ultima modifica della voce
  // user_id?: string; // ID del coach che ha inserito/modificato questa voce, se volessimo tracciarlo qui
}

// Tipo per la tabella athlete_personal_bests
export type AthletePersonalBest = Database['public']['Tables']['athlete_personal_bests']['Row'];

// Potremmo anche definire un tipo per l'inserimento se necessario, ma per ora Row basta
// export type AthletePersonalBestInsert = Database['public']['Tables']['athlete_personal_bests']['Insert'];

// Aggiungeremo qui altri tipi condivisi man mano che servono...

// Tipi per il sistema di segmenti intelligenti
export interface GPS_Point {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
}

export interface ActivitySegment {
  activityId: string;
  athleteId: string;
  athleteName: string;
  startIndex: number;
  endIndex: number;
  startTime: string;
  endTime: string;
  distance: number; // metri
  duration: number; // secondi
  avgPower?: number;
  avgSpeed: number;
  avgHeartRate?: number;
  elevationGain?: number;
  performance_score: number; // 0-100 basato su velocità/potenza
}

export interface CommonSegment {
  id: string;
  name?: string; // "Segmento auto-riconosciuto" o nome custom
  type: 'auto_detected' | 'pre_defined' | 'user_created';
  path: GPS_Point[];
  startPoint: GPS_Point;
  endPoint: GPS_Point;
  distance: number;
  elevationGain?: number;
  category: 'climb' | 'descent' | 'flat' | 'sprint' | 'mixed';
  confidence: number; // 0-100 quanto è sicuro che sia lo stesso segmento
  activitySegments: ActivitySegment[];
  createdAt: string;
  updatedAt: string;
}

export interface SegmentComparison {
  segmentId: string;
  segmentName: string;
  segments: ActivitySegment[];
  bestPerformance: ActivitySegment;
  analysis: {
    avgSpeedRange: [number, number];
    powerRange?: [number, number];
    timeRange: [number, number];
    winner: {
      fastest: ActivitySegment;
      highestPower?: ActivitySegment;
      mostEfficient?: ActivitySegment;
    };
  };
}