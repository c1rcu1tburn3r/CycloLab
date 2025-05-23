export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          athlete_id: string
          avg_cadence: number | null
          avg_heart_rate: number | null
          avg_power_watts: number | null
          avg_speed_kph: number | null
          calories: number | null
          created_at: string
          description: string | null
          distance_meters: number | null
          duration_seconds: number | null
          elevation_gain_meters: number | null
          end_lat: number | null
          end_lon: number | null
          fit_file_name: string | null
          fit_file_path: string | null
          fit_file_url: string | null
          id: string
          intensity_factor: number | null
          is_indoor: boolean | null
          is_public: boolean | null
          max_heart_rate: number | null
          max_power_watts: number | null
          max_speed_kph: number | null
          normalized_power_watts: number | null
          pb_power_1200s_watts: number | null
          pb_power_15s_watts: number | null
          pb_power_1800s_watts: number | null
          pb_power_300s_watts: number | null
          pb_power_30s_watts: number | null
          pb_power_3600s_watts: number | null
          pb_power_5400s_watts: number | null
          pb_power_5s_watts: number | null
          pb_power_600s_watts: number | null
          pb_power_60s_watts: number | null
          route_points: string | null
          start_lat: number | null
          start_lon: number | null
          status: string | null
          temperature_avg_celsius: number | null
          title: string
          training_load: number | null
          tss: number | null
          updated_at: string
          user_id: string
          weather_condition: string | null
        }
        Insert: {
          activity_date: string
          activity_type: string
          athlete_id: string
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_power_watts?: number | null
          avg_speed_kph?: number | null
          calories?: number | null
          created_at?: string
          description?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          elevation_gain_meters?: number | null
          end_lat?: number | null
          end_lon?: number | null
          fit_file_name?: string | null
          fit_file_path?: string | null
          fit_file_url?: string | null
          id?: string
          intensity_factor?: number | null
          is_indoor?: boolean | null
          is_public?: boolean | null
          max_heart_rate?: number | null
          max_power_watts?: number | null
          max_speed_kph?: number | null
          normalized_power_watts?: number | null
          pb_power_1200s_watts?: number | null
          pb_power_15s_watts?: number | null
          pb_power_1800s_watts?: number | null
          pb_power_300s_watts?: number | null
          pb_power_30s_watts?: number | null
          pb_power_3600s_watts?: number | null
          pb_power_5400s_watts?: number | null
          pb_power_5s_watts?: number | null
          pb_power_600s_watts?: number | null
          pb_power_60s_watts?: number | null
          route_points?: string | null
          start_lat?: number | null
          start_lon?: number | null
          status?: string | null
          temperature_avg_celsius?: number | null
          title: string
          training_load?: number | null
          tss?: number | null
          updated_at?: string
          user_id: string
          weather_condition?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          athlete_id?: string
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_power_watts?: number | null
          avg_speed_kph?: number | null
          calories?: number | null
          created_at?: string
          description?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          elevation_gain_meters?: number | null
          end_lat?: number | null
          end_lon?: number | null
          fit_file_name?: string | null
          fit_file_path?: string | null
          fit_file_url?: string | null
          id?: string
          intensity_factor?: number | null
          is_indoor?: boolean | null
          is_public?: boolean | null
          max_heart_rate?: number | null
          max_power_watts?: number | null
          max_speed_kph?: number | null
          normalized_power_watts?: number | null
          pb_power_1200s_watts?: number | null
          pb_power_15s_watts?: number | null
          pb_power_1800s_watts?: number | null
          pb_power_300s_watts?: number | null
          pb_power_30s_watts?: number | null
          pb_power_3600s_watts?: number | null
          pb_power_5400s_watts?: number | null
          pb_power_5s_watts?: number | null
          pb_power_600s_watts?: number | null
          pb_power_60s_watts?: number | null
          route_points?: string | null
          start_lat?: number | null
          start_lon?: number | null
          status?: string | null
          temperature_avg_celsius?: number | null
          title?: string
          training_load?: number | null
          tss?: number | null
          updated_at?: string
          user_id?: string
          weather_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_personal_bests: {
        Row: {
          activity_date: string
          activity_id: string | null
          athlete_id: string
          created_at: string
          duration_seconds: number
          id: string
          metric_type: string
          updated_at: string
          value: number
        }
        Insert: {
          activity_date: string
          activity_id?: string | null
          athlete_id: string
          created_at?: string
          duration_seconds: number
          id?: string
          metric_type: string
          updated_at?: string
          value: number
        }
        Update: {
          activity_date?: string
          activity_id?: string | null
          athlete_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          metric_type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_personal_bests_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_personal_bests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_profile_entries: {
        Row: {
          athlete_id: string
          created_at: string | null
          effective_date: string
          ftp_watts: number | null
          id: string
          max_hr_bpm: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          effective_date: string
          ftp_watts?: number | null
          id?: string
          max_hr_bpm?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          effective_date?: string
          ftp_watts?: number | null
          id?: string
          max_hr_bpm?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_profile_entries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          avatar_url: string | null
          birth_date: string
          created_at: string
          height_cm: number | null
          id: string
          name: string
          nationality: string | null
          surname: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date: string
          created_at?: string
          height_cm?: number | null
          id?: string
          name: string
          nationality?: string | null
          surname: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          name?: string
          nationality?: string | null
          surname?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
