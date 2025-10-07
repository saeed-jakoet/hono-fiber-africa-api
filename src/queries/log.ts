import { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "logs";

export const listLogs = async (db: SupabaseClient) =>
  db.from(TABLE).select("*");