// src/lib/types.ts
import { Database } from './database.types';

// Definizione dei tipi per le tabelle
export type Athlete = Database['public']['Tables']['athletes']['Row'];
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
  athletes?: { name: string; surname: string } | null; 
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
  // max_hr_bpm?: number | null; // Se avessimo la FC massima
  created_at: string; // Timestamp di creazione della voce
  updated_at?: string; // Timestamp di ultima modifica della voce
  // user_id?: string; // ID del coach che ha inserito/modificato questa voce, se volessimo tracciarlo qui
}

// Tipo per la tabella athlete_personal_bests
export type AthletePersonalBest = Database['public']['Tables']['athlete_personal_bests']['Row'];

// Potremmo anche definire un tipo per l'inserimento se necessario, ma per ora Row basta
// export type AthletePersonalBestInsert = Database['public']['Tables']['athlete_personal_bests']['Insert'];

// Aggiungeremo qui altri tipi condivisi man mano che servono...