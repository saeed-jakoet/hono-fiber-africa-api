/**
 * Mobile Inventory Queries
 * Database operations for mobile inventory management
 * Supports all job types: drop_cable, link_build, etc.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// Types
// ============================================

/** Supported job types for inventory allocation */
export type JobType = "drop_cable" | "link_build";

/** Inventory item from the database */
export interface InventoryItem {
  id: string;
  item_name: string;
  item_code?: string;
  category?: string;
  quantity: number;
  unit?: string;
}

/** Item to be used/allocated */
export interface InventoryUsageItem {
  inventory_id: string;
  quantity: number;
  item_name?: string;
  unit?: string;
}

/** Payload for applying inventory usage */
export interface ApplyInventoryPayload {
  jobType: JobType;
  jobId: string;
  items: InventoryUsageItem[];
}

// ============================================
// Constants
// ============================================

/** Map job types to their database table names */
const JOB_TABLES: Record<JobType, string> = {
  drop_cable: "drop_cable",
  link_build: "link_build",
} as const;

const INVENTORY_TABLE = "inventory";

// ============================================
// Helper Functions
// ============================================

/**
 * Get the database table name for a job type
 */
const getJobTable = (jobType: JobType): string => {
  return JOB_TABLES[jobType] || JOB_TABLES.drop_cable;
};

/**
 * Validate that a job type is supported
 */
export const isValidJobType = (jobType: string): jobType is JobType => {
  return jobType in JOB_TABLES;
};

// ============================================
// Query Functions
// ============================================

/**
 * List all inventory items
 * Returns items sorted alphabetically by name
 */
export const listInventory = async (
  db: SupabaseClient
): Promise<{ data: InventoryItem[] | null; error: any }> => {
  return db
    .from(INVENTORY_TABLE)
    .select("id, item_name, item_code, category, quantity, unit")
    .order("item_name", { ascending: true });
};

/**
 * Get a single inventory item by ID
 */
export const getInventoryItem = async (
  db: SupabaseClient,
  inventoryId: string
): Promise<{ data: InventoryItem | null; error: any }> => {
  return db
    .from(INVENTORY_TABLE)
    .select("id, item_name, item_code, category, quantity, unit")
    .eq("id", inventoryId)
    .single();
};

/**
 * Get inventory used on a specific job
 */
export const getJobInventoryUsed = async (
  db: SupabaseClient,
  jobType: JobType,
  jobId: string
): Promise<{ data: { id: string; inventory_used: any[] } | null; error: any }> => {
  const table = getJobTable(jobType);
  return db
    .from(table)
    .select("id, inventory_used")
    .eq("id", jobId)
    .single();
};

/**
 * Decrement inventory quantity
 * Ensures quantity never goes below 0
 */
export const decrementInventoryQuantity = async (
  db: SupabaseClient,
  inventoryId: string,
  quantityToDeduct: number
): Promise<{ success: boolean; error?: any }> => {
  // Fetch current quantity
  const { data, error: fetchError } = await db
    .from(INVENTORY_TABLE)
    .select("quantity")
    .eq("id", inventoryId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError };
  }

  // Calculate new quantity (minimum 0)
  const currentQty = data?.quantity ?? 0;
  const newQty = Math.max(0, currentQty - quantityToDeduct);

  // Update inventory
  const { error: updateError } = await db
    .from(INVENTORY_TABLE)
    .update({ quantity: newQty })
    .eq("id", inventoryId);

  if (updateError) {
    return { success: false, error: updateError };
  }

  return { success: true };
};

/**
 * Apply inventory usage to a job
 * 1. Updates the job's inventory_used array
 * 2. Decrements quantity from each inventory item
 */
export const applyInventoryUsage = async (
  db: SupabaseClient,
  payload: ApplyInventoryPayload
): Promise<{ data: any; error: any }> => {
  const { jobType, jobId, items } = payload;
  const table = getJobTable(jobType);

  // 1. Fetch current job data
  const { data: job, error: jobError } = await db
    .from(table)
    .select("inventory_used")
    .eq("id", jobId)
    .single();

  if (jobError) {
    return { data: null, error: jobError };
  }

  // 2. Build new usage entries with timestamp
  const timestamp = new Date().toISOString();
  const existingUsed = Array.isArray(job?.inventory_used) ? job.inventory_used : [];
  
  const newEntries = items.map((item) => ({
    inventory_id: item.inventory_id,
    item_name: item.item_name,
    unit: item.unit,
    used_quantity: item.quantity,
    timestamp,
  }));

  const updatedInventoryUsed = [...existingUsed, ...newEntries];

  // 3. Update job with new inventory_used array
  const { data: updatedJob, error: updateError } = await db
    .from(table)
    .update({ inventory_used: updatedInventoryUsed })
    .eq("id", jobId)
    .select("*")
    .single();

  if (updateError) {
    return { data: null, error: updateError };
  }

  // 4. Decrement inventory quantities
  const decrementResults: { inventoryId: string; success: boolean; error?: any }[] = [];
  
  for (const item of items) {
    const result = await decrementInventoryQuantity(db, item.inventory_id, item.quantity);
    decrementResults.push({
      inventoryId: item.inventory_id,
      ...result,
    });

    if (!result.success) {
      console.error(
        `[Mobile Inventory] Failed to decrement inventory ${item.inventory_id}:`,
        result.error
      );
    }
  }

  return {
    data: {
      job: updatedJob,
      itemsAllocated: newEntries,
      decrementResults,
    },
    error: null,
  };
};
