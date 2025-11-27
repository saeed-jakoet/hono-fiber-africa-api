/**
 * Mobile Orders Queries
 * 
 * Database operations for fetching technician orders (drop cables & link builds).
 * All queries use the staff table ID (not auth_user_id) for technician lookups.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// Table Constants
// ============================================
const TABLES = {
  DROP_CABLE: "drop_cable",
  LINK_BUILD: "link_build",
  STAFF: "staff",
} as const;

// ============================================
// Staff Queries
// ============================================

/**
 * Get staff record by Supabase auth user ID.
 * Used to map auth user -> staff record for technician lookups.
 */
export const getStaffByAuthUserId = async (
  db: SupabaseClient,
  authUserId: string
) => {
  return db
    .from(TABLES.STAFF)
    .select("id, first_name, surname, email, role")
    .eq("auth_user_id", authUserId)
    .single();
};

// ============================================
// Drop Cable Queries
// ============================================

/**
 * List all drop cables assigned to a technician.
 * @param technicianId - The staff table ID (NOT auth_user_id)
 */
export const getDropCablesByTechnicianId = async (
  db: SupabaseClient,
  technicianId: string
) => {
  return db
    .from(TABLES.DROP_CABLE)
    .select(`
      id,
      circuit_number,
      site_b_name,
      status,
      client,
      county,
      installation_scheduled_date,
      survey_scheduled_date,
      created_at,
      clients(company_name)
    `)
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false });
};

/**
 * Get a single drop cable by ID with full details.
 */
export const getDropCableById = async (db: SupabaseClient, id: string) => {
  return db
    .from(TABLES.DROP_CABLE)
    .select("*, clients(company_name)")
    .eq("id", id)
    .single();
};

// ============================================
// Link Build Queries
// ============================================

/**
 * List all link builds assigned to a technician.
 * @param technicianId - The staff table ID (NOT auth_user_id)
 */
export const getLinkBuildsByTechnicianId = async (
  db: SupabaseClient,
  technicianId: string
) => {
  return db
    .from(TABLES.LINK_BUILD)
    .select(`
      id,
      circuit_number,
      site_b_name,
      status,
      client,
      county,
      week,
      created_at
    `)
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false });
};

/**
 * Get a single link build by ID with full details.
 */
export const getLinkBuildById = async (db: SupabaseClient, id: string) => {
  return db
    .from(TABLES.LINK_BUILD)
    .select("*")
    .eq("id", id)
    .single();
};
