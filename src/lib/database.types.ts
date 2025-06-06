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
          max_cadence: number | null
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
          max_cadence?: number | null
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
          max_cadence?: number | null
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
          achieved_at: string
          activity_date: string
          activity_id: string
          athlete_id: string
          created_at: string
          duration_seconds: number
          id: string
          metric_type: string
          updated_at: string
          value_watts: number | null
        }
        Insert: {
          achieved_at?: string
          activity_date: string
          activity_id: string
          athlete_id: string
          created_at?: string
          duration_seconds: number
          id?: string
          metric_type?: string
          updated_at?: string
          value_watts?: number | null
        }
        Update: {
          achieved_at?: string
          activity_date?: string
          activity_id?: string
          athlete_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          metric_type?: string
          updated_at?: string
          value_watts?: number | null
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
          vo2max_confidence: number | null
          vo2max_method: string | null
          vo2max_ml_kg_min: number | null
          vo2max_reasoning: string | null
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
          vo2max_confidence?: number | null
          vo2max_method?: string | null
          vo2max_ml_kg_min?: number | null
          vo2max_reasoning?: string | null
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
          vo2max_confidence?: number | null
          vo2max_method?: string | null
          vo2max_ml_kg_min?: number | null
          vo2max_reasoning?: string | null
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
          email: string | null
          height_cm: number | null
          id: string
          name: string
          nationality: string | null
          phone_number: string | null
          sex: string | null
          surname: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date: string
          created_at?: string
          email?: string | null
          height_cm?: number | null
          id?: string
          name: string
          nationality?: string | null
          phone_number?: string | null
          sex?: string | null
          surname: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string
          created_at?: string
          email?: string | null
          height_cm?: number | null
          id?: string
          name?: string
          nationality?: string | null
          phone_number?: string | null
          sex?: string | null
          surname?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      climb_performances: {
        Row: {
          activity_id: string | null
          athlete_id: string | null
          avg_cadence: number | null
          avg_heart_rate: number | null
          avg_power_watts: number | null
          bike_weight_kg: number | null
          created_at: string | null
          detected_climb_id: string | null
          efficiency_score: number | null
          id: string
          improvement_seconds: number | null
          is_personal_best: boolean | null
          master_climb_id: string | null
          max_heart_rate: number | null
          normalized_power_watts: number | null
          notes: string | null
          personal_rank: number | null
          power_to_weight_ratio: number | null
          rider_weight_kg: number | null
          time_seconds: number
          user_id: string | null
          vam_meters_per_hour: number | null
          weather_conditions: Json | null
        }
        Insert: {
          activity_id?: string | null
          athlete_id?: string | null
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_power_watts?: number | null
          bike_weight_kg?: number | null
          created_at?: string | null
          detected_climb_id?: string | null
          efficiency_score?: number | null
          id?: string
          improvement_seconds?: number | null
          is_personal_best?: boolean | null
          master_climb_id?: string | null
          max_heart_rate?: number | null
          normalized_power_watts?: number | null
          notes?: string | null
          personal_rank?: number | null
          power_to_weight_ratio?: number | null
          rider_weight_kg?: number | null
          time_seconds: number
          user_id?: string | null
          vam_meters_per_hour?: number | null
          weather_conditions?: Json | null
        }
        Update: {
          activity_id?: string | null
          athlete_id?: string | null
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_power_watts?: number | null
          bike_weight_kg?: number | null
          created_at?: string | null
          detected_climb_id?: string | null
          efficiency_score?: number | null
          id?: string
          improvement_seconds?: number | null
          is_personal_best?: boolean | null
          master_climb_id?: string | null
          max_heart_rate?: number | null
          normalized_power_watts?: number | null
          notes?: string | null
          personal_rank?: number | null
          power_to_weight_ratio?: number | null
          rider_weight_kg?: number | null
          time_seconds?: number
          user_id?: string | null
          vam_meters_per_hour?: number | null
          weather_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "climb_performances_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_detected_climb_id_fkey"
            columns: ["detected_climb_id"]
            isOneToOne: false
            referencedRelation: "detected_climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_detected_climb_id_fkey"
            columns: ["detected_climb_id"]
            isOneToOne: false
            referencedRelation: "user_top_climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_master_climb_id_fkey"
            columns: ["master_climb_id"]
            isOneToOne: false
            referencedRelation: "master_climbs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athletes: {
        Row: {
          assigned_at: string
          athlete_id: string
          coach_user_id: string
        }
        Insert: {
          assigned_at?: string
          athlete_id: string
          coach_user_id: string
        }
        Update: {
          assigned_at?: string
          athlete_id?: string
          coach_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_climbs: {
        Row: {
          activity_id: string | null
          avg_cadence: number | null
          avg_gradient_percent: number
          avg_heart_rate: number | null
          avg_power_watts: number | null
          avg_speed_kph: number | null
          category: string | null
          climb_score: number | null
          created_at: string | null
          detection_algorithm_version: string | null
          difficulty_rating: number | null
          distance_meters: number
          duration_seconds: number
          elevation_gain_meters: number
          elevation_loss_meters: number | null
          end_lat: number
          end_lon: number
          end_point_index: number
          id: string
          is_favorite: boolean | null
          is_named: boolean | null
          is_significant: boolean | null
          max_gradient_percent: number | null
          max_heart_rate: number | null
          max_power_watts: number | null
          min_gradient_percent: number | null
          name: string | null
          start_lat: number
          start_lon: number
          start_point_index: number
          updated_at: string | null
          user_id: string | null
          vam_meters_per_hour: number | null
        }
        Insert: {
          activity_id?: string | null
          avg_cadence?: number | null
          avg_gradient_percent: number
          avg_heart_rate?: number | null
          avg_power_watts?: number | null
          avg_speed_kph?: number | null
          category?: string | null
          climb_score?: number | null
          created_at?: string | null
          detection_algorithm_version?: string | null
          difficulty_rating?: number | null
          distance_meters: number
          duration_seconds: number
          elevation_gain_meters: number
          elevation_loss_meters?: number | null
          end_lat: number
          end_lon: number
          end_point_index: number
          id?: string
          is_favorite?: boolean | null
          is_named?: boolean | null
          is_significant?: boolean | null
          max_gradient_percent?: number | null
          max_heart_rate?: number | null
          max_power_watts?: number | null
          min_gradient_percent?: number | null
          name?: string | null
          start_lat: number
          start_lon: number
          start_point_index: number
          updated_at?: string | null
          user_id?: string | null
          vam_meters_per_hour?: number | null
        }
        Update: {
          activity_id?: string | null
          avg_cadence?: number | null
          avg_gradient_percent?: number
          avg_heart_rate?: number | null
          avg_power_watts?: number | null
          avg_speed_kph?: number | null
          category?: string | null
          climb_score?: number | null
          created_at?: string | null
          detection_algorithm_version?: string | null
          difficulty_rating?: number | null
          distance_meters?: number
          duration_seconds?: number
          elevation_gain_meters?: number
          elevation_loss_meters?: number | null
          end_lat?: number
          end_lon?: number
          end_point_index?: number
          id?: string
          is_favorite?: boolean | null
          is_named?: boolean | null
          is_significant?: boolean | null
          max_gradient_percent?: number | null
          max_heart_rate?: number | null
          max_power_watts?: number | null
          min_gradient_percent?: number | null
          name?: string | null
          start_lat?: number
          start_lon?: number
          start_point_index?: number
          updated_at?: string | null
          user_id?: string | null
          vam_meters_per_hour?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detected_climbs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      master_climbs: {
        Row: {
          alternative_names: string[] | null
          center_lat: number
          center_lon: number
          country: string | null
          created_at: string | null
          description: string | null
          famous_climbs_rank: number | null
          id: string
          is_famous: boolean | null
          is_verified: boolean | null
          name: string
          official_avg_gradient_percent: number | null
          official_category: string | null
          official_distance_meters: number | null
          official_elevation_gain_meters: number | null
          radius_meters: number | null
          region: string | null
          strava_segment_id: string | null
          updated_at: string | null
          wikipedia_url: string | null
        }
        Insert: {
          alternative_names?: string[] | null
          center_lat: number
          center_lon: number
          country?: string | null
          created_at?: string | null
          description?: string | null
          famous_climbs_rank?: number | null
          id?: string
          is_famous?: boolean | null
          is_verified?: boolean | null
          name: string
          official_avg_gradient_percent?: number | null
          official_category?: string | null
          official_distance_meters?: number | null
          official_elevation_gain_meters?: number | null
          radius_meters?: number | null
          region?: string | null
          strava_segment_id?: string | null
          updated_at?: string | null
          wikipedia_url?: string | null
        }
        Update: {
          alternative_names?: string[] | null
          center_lat?: number
          center_lon?: number
          country?: string | null
          created_at?: string | null
          description?: string | null
          famous_climbs_rank?: number | null
          id?: string
          is_famous?: boolean | null
          is_verified?: boolean | null
          name?: string
          official_avg_gradient_percent?: number | null
          official_category?: string | null
          official_distance_meters?: number | null
          official_elevation_gain_meters?: number | null
          radius_meters?: number | null
          region?: string | null
          strava_segment_id?: string | null
          updated_at?: string | null
          wikipedia_url?: string | null
        }
        Relationships: []
      }
      personal_climb_rankings: {
        Row: {
          athlete_id: string | null
          avg_improvement_per_attempt: number | null
          best_power_performance_id: string | null
          best_power_watts: number | null
          best_time_performance_id: string | null
          best_time_seconds: number | null
          best_vam_meters_per_hour: number | null
          best_vam_performance_id: string | null
          consistency_score: number | null
          created_at: string | null
          detected_climb_id: string | null
          id: string
          improvement_trend: string | null
          last_attempt_date: string | null
          master_climb_id: string | null
          total_attempts: number | null
          total_time_seconds: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          avg_improvement_per_attempt?: number | null
          best_power_performance_id?: string | null
          best_power_watts?: number | null
          best_time_performance_id?: string | null
          best_time_seconds?: number | null
          best_vam_meters_per_hour?: number | null
          best_vam_performance_id?: string | null
          consistency_score?: number | null
          created_at?: string | null
          detected_climb_id?: string | null
          id?: string
          improvement_trend?: string | null
          last_attempt_date?: string | null
          master_climb_id?: string | null
          total_attempts?: number | null
          total_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          avg_improvement_per_attempt?: number | null
          best_power_performance_id?: string | null
          best_power_watts?: number | null
          best_time_performance_id?: string | null
          best_time_seconds?: number | null
          best_vam_meters_per_hour?: number | null
          best_vam_performance_id?: string | null
          consistency_score?: number | null
          created_at?: string | null
          detected_climb_id?: string | null
          id?: string
          improvement_trend?: string | null
          last_attempt_date?: string | null
          master_climb_id?: string | null
          total_attempts?: number | null
          total_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_climb_rankings_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_best_power_performance_id_fkey"
            columns: ["best_power_performance_id"]
            isOneToOne: false
            referencedRelation: "climb_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_best_power_performance_id_fkey"
            columns: ["best_power_performance_id"]
            isOneToOne: false
            referencedRelation: "recent_climb_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_best_time_performance_id_fkey"
            columns: ["best_time_performance_id"]
            isOneToOne: false
            referencedRelation: "climb_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_best_time_performance_id_fkey"
            columns: ["best_time_performance_id"]
            isOneToOne: false
            referencedRelation: "recent_climb_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_best_vam_performance_id_fkey"
            columns: ["best_vam_performance_id"]
            isOneToOne: false
            referencedRelation: "climb_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_best_vam_performance_id_fkey"
            columns: ["best_vam_performance_id"]
            isOneToOne: false
            referencedRelation: "recent_climb_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_detected_climb_id_fkey"
            columns: ["detected_climb_id"]
            isOneToOne: false
            referencedRelation: "detected_climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_detected_climb_id_fkey"
            columns: ["detected_climb_id"]
            isOneToOne: false
            referencedRelation: "user_top_climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_climb_rankings_master_climb_id_fkey"
            columns: ["master_climb_id"]
            isOneToOne: false
            referencedRelation: "master_climbs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recent_climb_performances: {
        Row: {
          activity_id: string | null
          athlete_id: string | null
          avg_cadence: number | null
          avg_gradient_percent: number | null
          avg_heart_rate: number | null
          avg_power_watts: number | null
          bike_weight_kg: number | null
          climb_name: string | null
          climb_score: number | null
          created_at: string | null
          detected_climb_id: string | null
          efficiency_score: number | null
          elevation_gain_meters: number | null
          id: string | null
          improvement_seconds: number | null
          is_personal_best: boolean | null
          master_climb_id: string | null
          max_heart_rate: number | null
          normalized_power_watts: number | null
          notes: string | null
          personal_rank: number | null
          power_to_weight_ratio: number | null
          rider_weight_kg: number | null
          time_seconds: number | null
          user_id: string | null
          vam_meters_per_hour: number | null
          weather_conditions: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "climb_performances_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_detected_climb_id_fkey"
            columns: ["detected_climb_id"]
            isOneToOne: false
            referencedRelation: "detected_climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_detected_climb_id_fkey"
            columns: ["detected_climb_id"]
            isOneToOne: false
            referencedRelation: "user_top_climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climb_performances_master_climb_id_fkey"
            columns: ["master_climb_id"]
            isOneToOne: false
            referencedRelation: "master_climbs"
            referencedColumns: ["id"]
          },
        ]
      }
      slow_queries: {
        Row: {
          calls: number | null
          mean_exec_time: number | null
          percentage_of_total: number | null
          query: string | null
          total_exec_time: number | null
        }
        Relationships: []
      }
      user_top_climbs: {
        Row: {
          avg_gradient_percent: number | null
          best_time_seconds: number | null
          category: string | null
          climb_score: number | null
          distance_meters: number | null
          elevation_gain_meters: number | null
          id: string | null
          last_attempt_date: string | null
          name: string | null
          total_attempts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_climb_score: {
        Args: {
          distance_m: number
          elevation_gain_m: number
          avg_gradient: number
        }
        Returns: number
      }
      categorize_climb: {
        Args: { climb_score: number }
        Returns: string
      }
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
