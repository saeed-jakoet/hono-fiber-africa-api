/**
 * Mobile Inventory Controller
 * Handles inventory listing and usage tracking for mobile app
 * Supports all job types: drop_cable, link_build, etc.
 */

import { Context } from "hono";
import { successResponse, errorResponse } from "../../utilities/responses";
import { getAdminClient } from "../../utilities/supabase";
import { verifyMobileAuth } from "../../utilities/mobile";
import {
  listInventory,
  getJobInventoryUsed,
  applyInventoryUsage,
  isValidJobType,
  JobType,
} from "../../queries/mobile/inventory";
import { inventoryUsageSchema } from "../../schemas/inventoryUsageSchema";

// ============================================
// Controllers
// ============================================

/**
 * GET /mobile/inventory
 * List all inventory items
 */
export const mobileListInventory = async (c: Context) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ("error" in auth) {
      return errorResponse(auth.error, 401);
    }

    const db = getAdminClient();
    const { data, error } = await listInventory(db);

    if (error) {
      console.error("[Mobile Inventory] List error:", error);
      return errorResponse(error.message, 400);
    }

    return successResponse(data ?? [], "Inventory fetched");
  } catch (e: any) {
    console.error("[Mobile Inventory] List error:", e);
    return errorResponse(e.message || "Failed to fetch inventory", 500);
  }
};

/**
 * GET /mobile/inventory/job/:jobId
 * Get inventory used on a specific job
 * Query params: jobType (drop_cable | link_build)
 */
export const mobileGetJobInventory = async (c: Context) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ("error" in auth) {
      return errorResponse(auth.error, 401);
    }

    // Get and validate parameters
    const jobId = c.req.param("jobId");
    const jobTypeParam = c.req.query("jobType") || "drop_cable";

    if (!jobId) {
      return errorResponse("Missing job ID", 400);
    }

    if (!isValidJobType(jobTypeParam)) {
      return errorResponse(`Invalid job type: ${jobTypeParam}`, 400);
    }

    const jobType = jobTypeParam as JobType;
    const db = getAdminClient();

    const { data, error } = await getJobInventoryUsed(db, jobType, jobId);

    if (error) {
      console.error("[Mobile Inventory] Get job inventory error:", error);
      return errorResponse(error.message, 400);
    }

    if (!data) {
      return errorResponse("Job not found", 404);
    }

    return successResponse(
      {
        jobId: data.id,
        jobType,
        inventoryUsed: data.inventory_used ?? [],
      },
      "Job inventory fetched"
    );
  } catch (e: any) {
    console.error("[Mobile Inventory] Get job inventory error:", e);
    return errorResponse(e.message || "Failed to fetch job inventory", 500);
  }
};

/**
 * POST /mobile/inventory/usage
 * Apply inventory usage to a job
 * Body: { jobType, jobId, items: [{ inventory_id, quantity, item_name?, unit? }] }
 */
export const mobileApplyInventoryUsage = async (c: Context) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ("error" in auth) {
      return errorResponse(auth.error, 401);
    }

    // Parse and validate request body
    const body = await c.req.json();
    const parsed = inventoryUsageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.message, 400);
    }

    const { jobType, jobId, items } = parsed.data;

    // Validate job type
    if (!isValidJobType(jobType)) {
      return errorResponse(`Invalid job type: ${jobType}`, 400);
    }

    const db = getAdminClient();
    const { data, error } = await applyInventoryUsage(db, {
      jobType: jobType as JobType,
      jobId,
      items,
    });

    if (error) {
      console.error("[Mobile Inventory] Apply usage error:", error);
      return errorResponse(error.message, 400);
    }

    return successResponse(data, "Inventory usage applied successfully");
  } catch (e: any) {
    console.error("[Mobile Inventory] Apply usage error:", e);
    return errorResponse(e.message || "Failed to apply inventory usage", 500);
  }
};
