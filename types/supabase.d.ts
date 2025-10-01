import { SupabaseClient } from "@supabase/supabase-js";
declare module "../utilities/supabase" {
  export const database: SupabaseClient;
}
