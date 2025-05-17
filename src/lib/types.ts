// src/lib/types.ts
import { Database } from './database.types';

// Definizione dei tipi per le tabelle
export type Athlete = Database['public']['Tables']['athletes']['Row'];
export interface ActivityData {
  id: string;
  file_name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  activity_type: string;
  total_distance?: number;
  total_duration?: number;
  total_ascent?: number;
  total_descent?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_cadence?: number;
  max_cadence?: number;
  activity_date?: string;
  description?: string | null;
  original_file_url?: string | null;
  // Aggiungiamo un campo opzionale per l'atleta espanso
  athletes?: { name: string; surname: string } | null;
  // Aggiunto per referenziare direttamente l'atleta dall'attività
  athlete_id?: string; // ID dell'atleta che ha svolto l'attività (dalla tabella athletes)
}

export type Activity = Database['public']['Tables']['activities']['Row'] & {
  // Aggiungiamo route_points come array di RoutePoint se parsato, o stringa/null
  route_points?: RoutePoint[] | string | null;
  // Aggiungiamo un campo opzionale per l'atleta espanso
  athletes?: { name: string; surname: string } | null; 
  // NUOVO: ID dell'atleta che ha svolto l'attività (dalla colonna athlete_id della tabella activities)
  athlete_id?: string | null; // Aggiunto per coerenza, dovrebbe corrispondere alla colonna nel DB
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

// Aggiungeremo qui altri tipi condivisi man mano che servono...