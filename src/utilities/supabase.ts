// supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getCookie } from "hono/cookie";
import "dotenv/config";

// Validate environment
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment");
}

// Base anon client (no user session) for public auth calls (signUp/signIn)
export const database: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Create a per-request client bound to the JWT from cookies
export function getSupabaseForRequest(c: any): SupabaseClient {
  // Use precise getter to avoid typing issues
  const accessToken = getCookie(c, "accessToken") || "";
  return createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => accessToken,
  });
}
