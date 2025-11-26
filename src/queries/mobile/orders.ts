/**
 * Mobile Orders Queries
 * Database operations for mobile order management
 */

import { SupabaseClient } from "@supabase/supabase-js";

const DROP_CABLE_TABLE = "drop_cable";
const STAFF_TABLE = "staff";

/**
 * Get staff record by auth user ID
 */
export const getStaffByAuthUserId = async (
  db: SupabaseClient,
  authUserId: string
) => {
  return db
    .from(STAFF_TABLE)
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();
};

/**
 * List drop cable orders by technician (staff) ID
 */
export const listOrdersByTechnician = async (
  db: SupabaseClient,
  technicianId: string
) => {
  return db
    .from(DROP_CABLE_TABLE)
    .select("*, clients(company_name)")
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false });
};

/**
 * Get drop cable order by ID
 */
export const getOrderById = async (db: SupabaseClient, id: string) => {
  return db.from(DROP_CABLE_TABLE).select("*").eq("id", id).single();
};
