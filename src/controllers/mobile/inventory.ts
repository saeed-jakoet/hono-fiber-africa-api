/**
 * Mobile Inventory Controller
 * Handles inventory listing and usage tracking
 */

import { successResponse, errorResponse } from "../../utilities/responses";
import { getAdminClient } from "../../utilities/supabase";
import { verifyMobileAuth } from "../../utilities/mobile";
import { inventoryUsageSchema } from "../../schemas/inventoryUsageSchema";
import {
  listInventory,
  getJobInventoryUsed,
  applyInventoryUsage,
} from "../../queries/mobile";

/**
 * List all inventory items
 */
export const mobileListInventory = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const adminDb = getAdminClient();
    const { data, error } = await listInventory(adminDb);
    
    if (error) return errorResponse(error.message, 400);

    return successResponse(data ?? [], "Inventory fetched");
  } catch (e: any) {
    console.error("[Mobile Inventory] List inventory error:", e);
    return errorResponse(e.message || "Failed to fetch inventory", 500);
  }
};

/**
 * Get inventory used on a specific job
 */
export const mobileGetJobInventory = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const jobId = c.req.param("jobId");
    if (!jobId) return errorResponse("Missing job ID", 400);

    const adminDb = getAdminClient();
    
    // Get the job with inventory_used
    const { data, error } = await getJobInventoryUsed(adminDb, jobId);
    
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Job not found", 404);

    return successResponse({
      jobId: data.id,
      inventoryUsed: data.inventory_used ?? [],
    }, "Job inventory fetched");
  } catch (e: any) {
    console.error("[Mobile Inventory] Get job inventory error:", e);
    return errorResponse(e.message || "Failed to fetch job inventory", 500);
  }
};

/**
 * Apply inventory usage to a job
 */
export const mobileApplyInventoryUsage = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const body = await c.req.json();
    const parsed = inventoryUsageSchema.safeParse(body);
    
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.message, 400);
    }

    const adminDb = getAdminClient();
    const { data, error } = await applyInventoryUsage(adminDb, parsed.data);
    
    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Inventory usage applied");
  } catch (e: any) {
    console.error("[Mobile Inventory] Apply inventory usage error:", e);
    return errorResponse(e.message || "Failed to apply inventory usage", 500);
  }
};
