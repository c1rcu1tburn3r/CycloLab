

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "activity_date" "date" NOT NULL,
    "activity_type" "text" NOT NULL,
    "fit_file_url" "text",
    "fit_file_name" "text",
    "duration_seconds" integer,
    "distance_meters" real,
    "elevation_gain_meters" real,
    "avg_heart_rate" integer,
    "max_heart_rate" integer,
    "avg_power_watts" real,
    "max_power_watts" real,
    "avg_cadence" integer,
    "avg_speed_kph" real,
    "max_speed_kph" real,
    "calories" integer,
    "temperature_avg_celsius" real,
    "weather_condition" "text",
    "training_load" integer,
    "intensity_factor" real,
    "tss" real,
    "normalized_power_watts" real,
    "start_lat" real,
    "start_lon" real,
    "end_lat" real,
    "end_lon" real,
    "is_public" boolean DEFAULT false,
    "is_indoor" boolean DEFAULT false,
    "status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."activities" IS 'Attività ciclistiche degli atleti registrate nella piattaforma CycloLab';



COMMENT ON COLUMN "public"."activities"."id" IS 'Identificatore univoco dell''attività';



COMMENT ON COLUMN "public"."activities"."user_id" IS 'ID del coach proprietario dell''attività';



COMMENT ON COLUMN "public"."activities"."athlete_id" IS 'ID dell''atleta a cui appartiene l''attività';



COMMENT ON COLUMN "public"."activities"."fit_file_url" IS 'URL al file FIT archiviato su Supabase Storage';



COMMENT ON COLUMN "public"."activities"."training_load" IS 'Carico di allenamento calcolato in base a durata e intensità';



COMMENT ON COLUMN "public"."activities"."is_public" IS 'Se true, l''attività può essere visualizzata da altri utenti autorizzati';



CREATE TABLE IF NOT EXISTS "public"."athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "surname" "text" NOT NULL,
    "birth_date" "date" NOT NULL,
    "height_cm" integer,
    "weight_kg" numeric,
    "nationality" "text",
    "avatar_url" "text"
);


ALTER TABLE "public"."athletes" OWNER TO "postgres";


COMMENT ON TABLE "public"."athletes" IS 'Tabella per memorizzare i profili degli atleti.';



COMMENT ON COLUMN "public"."athletes"."user_id" IS 'ID del coach (utente) a cui questo atleta è associato.';



COMMENT ON COLUMN "public"."athletes"."height_cm" IS 'Altezza dell''atleta in centimetri.';



COMMENT ON COLUMN "public"."athletes"."weight_kg" IS 'Peso dell''atleta in chilogrammi.';



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activities_activity_date" ON "public"."activities" USING "btree" ("activity_date");



CREATE INDEX "idx_activities_activity_type" ON "public"."activities" USING "btree" ("activity_type");



CREATE INDEX "idx_activities_athlete_id" ON "public"."activities" USING "btree" ("athlete_id");



CREATE INDEX "idx_activities_user_id" ON "public"."activities" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "activities_updated_at" BEFORE UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Coaches can delete their own athletes." ON "public"."athletes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Coaches can insert their own athletes." ON "public"."athletes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Coaches can update their own athletes." ON "public"."athletes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Coaches can view their own athletes." ON "public"."athletes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activities_delete_policy" ON "public"."activities" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "activities_insert_policy" ON "public"."activities" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE (("athletes"."id" = "activities"."athlete_id") AND ("athletes"."user_id" = "auth"."uid"()))))));



CREATE POLICY "activities_select_policy" ON "public"."activities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "activities_update_policy" ON "public"."activities" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE (("athletes"."id" = "activities"."athlete_id") AND ("athletes"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."athletes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."athletes" TO "anon";
GRANT ALL ON TABLE "public"."athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."athletes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
