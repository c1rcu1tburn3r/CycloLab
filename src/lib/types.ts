// src/lib/types.ts
import { Database } from './database.types';

// Definizione dei tipi per le tabelle
export type Athlete = Database['public']['Tables']['athletes']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'] & {
  // Aggiungiamo route_points come array di RoutePoint se parsato, o stringa/null
  route_points?: RoutePoint[] | string | null;
  // Aggiungiamo un campo opzionale per l'atleta espanso
  athletes?: { name: string; surname: string } | null;
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