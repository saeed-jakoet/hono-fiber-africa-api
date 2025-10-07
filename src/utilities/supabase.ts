// supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getCookie } from "hono/cookie";
import "dotenv/config";

// Validate environment
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment");
}

// Base anon client (no user session) for public auth calls (signUp/signIn)
export const database: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Create a per-request client bound to the JWT from cookies
export function getSupabaseForRequest(c: any): SupabaseClient {
  // Use precise getter to avoid typing issues
  const accessToken = getCookie(c, "accessToken") || "";
  return createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Admin client (service role) – use ONLY for privileged server-side operations
export function getAdminClient(): SupabaseClient {
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for admin operations");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
