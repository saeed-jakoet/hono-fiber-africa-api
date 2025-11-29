/**
 * Mobile Staff Queries
 * Database queries for staff-related operations in the mobile app
 */

import { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "staff";

/**
 * Get staff member by ID
 */
export const getStaffById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

/**
 * Get staff member by auth user ID
 */
export const getStaffByAuthUserId = async (
  db: SupabaseClient,
  authUserId: string
) => db.from(TABLE).select("*").eq("auth_user_id", authUserId).single();

/**
 * Update staff member's location
 */
export const updateStaffLocation = async (
  db: SupabaseClient,
  id: string,
  latitude: number,
  longitude: number
) =>
  db
    .from(TABLE)
    .update({
      latitude,
      longitude,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, latitude, longitude, location_updated_at")
    .single();
