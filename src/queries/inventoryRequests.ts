/**
 * Inventory Requests Queries
 * Database operations for inventory request approval workflow
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// Types
// ============================================

export type RequestStatus = "pending" | "approved" | "rejected";

export interface InventoryRequestItem {
  inventory_id: string;
  quantity: number;
  item_name?: string;
  unit?: string;
}

export interface CreateInventoryRequest {
  job_id: string;
  job_type: string;
  technician_id: string;
  items: InventoryRequestItem[];
}

// ============================================
// Constants
// ============================================

const TABLE = "inventory_requests";

// ============================================
// Query Functions
// ============================================

/**
 * Create a new inventory request (pending approval)
 */
export const createInventoryRequest = async (
  db: SupabaseClient,
  payload: CreateInventoryRequest
) => {
  return db
    .from(TABLE)
    .insert({
      job_id: payload.job_id,
      job_type: payload.job_type,
      technician_id: payload.technician_id,
      items: payload.items,
      status: "pending",
      requested_at: new Date().toISOString(),
    })
    .select(`
      *,
      technician:staff!technician_id(id, first_name, surname, email)
    `)
    .single();
};

/**
 * List all inventory requests with optional status filter
 */
export const listInventoryRequests = async (
  db: SupabaseClient,
  status?: RequestStatus
) => {
  let query = db
    .from(TABLE)
    .select(`
      *,
      technician:staff!technician_id(id, first_name, surname, email)
    `)
    .order("requested_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  return query;
};

/**
 * Get pending requests count
 */
export const getPendingRequestsCount = async (db: SupabaseClient) => {
  const { count, error } = await db
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return { count: count ?? 0, error };
};

/**
 * Get a single inventory request by ID
 */
export const getInventoryRequestById = async (
  db: SupabaseClient,
  id: string
) => {
  return db
    .from(TABLE)
    .select(`
      *,
      technician:staff!technician_id(id, first_name, surname, email)
    `)
    .eq("id", id)
    .single();
};

/**
 * Approve an inventory request
 * Updates status and applies inventory changes
 */
export const approveInventoryRequest = async (
  db: SupabaseClient,
  requestId: string,
  reviewerId: string
) => {
  // 1. Get the request
  const { data: request, error: fetchError } = await db
    .from(TABLE)
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (fetchError) return { data: null, error: fetchError };
  if (!request) return { data: null, error: { message: "Request not found or already processed" } };

  const { job_id, job_type, items } = request;

  // 2. Get the job table name
  const jobTable = job_type === "link_build" ? "link_build" : "drop_cable";

  // 3. Get current job inventory_used
  const { data: job, error: jobError } = await db
    .from(jobTable)
    .select("inventory_used")
    .eq("id", job_id)
    .single();

  if (jobError) return { data: null, error: jobError };

  // 4. Build new inventory_used entries
  const timestamp = new Date().toISOString();
  const existingUsed = Array.isArray(job?.inventory_used) ? job.inventory_used : [];
  
  const newEntries = (items as InventoryRequestItem[]).map((item) => ({
    inventory_id: item.inventory_id,
    item_name: item.item_name,
    unit: item.unit,
    used_quantity: item.quantity,
    timestamp,
  }));

  const updatedInventoryUsed = [...existingUsed, ...newEntries];

  // 5. Update job with new inventory_used
  const { error: jobUpdateError } = await db
    .from(jobTable)
    .update({ inventory_used: updatedInventoryUsed })
    .eq("id", job_id);

  if (jobUpdateError) return { data: null, error: jobUpdateError };

  // 6. Decrement inventory quantities
  for (const item of items as InventoryRequestItem[]) {
    const { data: invData, error: fetchInvError } = await db
      .from("inventory")
      .select("quantity")
      .eq("id", item.inventory_id)
      .single();

    if (fetchInvError) {
      console.error("[Inventory Request] Failed to fetch inventory:", fetchInvError);
      continue;
    }

    const currentQty = invData?.quantity ?? 0;
    const newQty = Math.max(0, currentQty - item.quantity);

    const { error: updateInvError } = await db
      .from("inventory")
      .update({ quantity: newQty })
      .eq("id", item.inventory_id);

    if (updateInvError) {
      console.error("[Inventory Request] Failed to decrement inventory:", updateInvError);
    }
  }

  // 7. Update request status to approved
  const { data: updatedRequest, error: updateError } = await db
    .from(TABLE)
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", requestId)
    .select(`
      *,
      technician:staff!technician_id(id, first_name, surname, email)
    `)
    .single();

  if (updateError) return { data: null, error: updateError };

  return { data: updatedRequest, error: null };
};

/**
 * Reject an inventory request
 */
export const rejectInventoryRequest = async (
  db: SupabaseClient,
  requestId: string,
  reviewerId: string,
  reason?: string
) => {
  return db
    .from(TABLE)
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      rejection_reason: reason || null,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select(`
      *,
      technician:staff!technician_id(id, first_name, surname, email)
    `)
    .single();
};

/**
 * Get requests for a specific technician
 */
export const getRequestsByTechnician = async (
  db: SupabaseClient,
  technicianId: string
) => {
  return db
    .from(TABLE)
    .select("*")
    .eq("technician_id", technicianId)
    .order("requested_at", { ascending: false });
};

/**
 * Get requests for a specific job
 */
export const getRequestsByJob = async (
  db: SupabaseClient,
  jobId: string,
  jobType: string
) => {
  return db
    .from(TABLE)
    .select("*")
    .eq("job_id", jobId)
    .eq("job_type", jobType)
    .order("requested_at", { ascending: false });
};
