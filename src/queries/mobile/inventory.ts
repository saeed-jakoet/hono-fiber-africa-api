/**
 * Mobile Inventory Queries
 * Database operations for mobile inventory management
 */

import { SupabaseClient } from "@supabase/supabase-js";

const INVENTORY_TABLE = "inventory";
const DROP_CABLE_TABLE = "drop_cable";

/**
 * List all inventory items
 */
export const listInventory = async (db: SupabaseClient) => {
  return db
    .from(INVENTORY_TABLE)
    .select("*")
    .order("item_name", { ascending: true });
};

/**
 * Get inventory used on a specific job
 */
export const getJobInventoryUsed = async (db: SupabaseClient, jobId: string) => {
  return db
    .from(DROP_CABLE_TABLE)
    .select("id, inventory_used")
    .eq("id", jobId)
    .single();
};

/**
 * Apply inventory usage to a job
 * Updates both the job's inventory_used array and decrements inventory quantities
 */
export const applyInventoryUsage = async (
  db: SupabaseClient,
  payload: {
    jobType: string;
    jobId: string;
    items: Array<{
      inventory_id: string;
      quantity: number;
      item_name?: string;
      unit?: string;
    }>;
  }
) => {
  const { jobType, jobId, items } = payload;
  const table = jobType === "drop_cable" ? DROP_CABLE_TABLE : DROP_CABLE_TABLE;

  // Get current job data
  const { data: job, error: jobError } = await db
    .from(table)
    .select("inventory_used")
    .eq("id", jobId)
    .single();

  if (jobError) return { data: null, error: jobError };

  // Merge new items with existing
  const existingUsed = (job?.inventory_used as any[]) || [];
  const timestamp = new Date().toISOString();

  const newEntries = items.map((item) => ({
    inventory_id: item.inventory_id,
    item_name: item.item_name,
    unit: item.unit,
    used_quantity: item.quantity,
    timestamp,
  }));

  const updatedInventoryUsed = [...existingUsed, ...newEntries];

  // Update the job with new inventory_used
  const { data: updatedJob, error: updateError } = await db
    .from(table)
    .update({ inventory_used: updatedInventoryUsed })
    .eq("id", jobId)
    .select("*")
    .single();

  if (updateError) return { data: null, error: updateError };

  // Decrement inventory quantities
  for (const item of items) {
    const { error: invError } = await db.rpc("decrement_inventory", {
      p_inventory_id: item.inventory_id,
      p_quantity: item.quantity,
    });

    if (invError) {
      console.error("[Mobile Inventory] Failed to decrement inventory:", invError);
    }
  }

  return { data: updatedJob, error: null };
};
