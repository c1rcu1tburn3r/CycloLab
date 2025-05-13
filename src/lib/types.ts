// src/lib/types.ts
import { Database } from './database.types';

// Definizione dei tipi per le tabelle
export type Athlete = Database['public']['Tables']['athletes']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];

// Tipi per l'inserimento di nuovi record
export type AthleteInsert = Database['public']['Tables']['athletes']['Insert'];
export type ActivityInsert = Database['public']['Tables']['activities']['Insert'];

// Tipi per l'aggiornamento di record esistenti
export type AthleteUpdate = Database['public']['Tables']['athletes']['Update'];
export type ActivityUpdate = Database['public']['Tables']['activities']['Update'];