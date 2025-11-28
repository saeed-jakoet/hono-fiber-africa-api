/**
 * Inventory Requests Controller
 * Handles inventory request approval workflow for web dashboard
 */

import { Context } from "hono";
import { successResponse, errorResponse } from "../utilities/responses";
import { getSupabaseForRequest } from "../utilities/supabase";
import {
  listInventoryRequests,
  getInventoryRequestById,
  getPendingRequestsCount,
  approveInventoryRequest,
  rejectInventoryRequest,
  RequestStatus,
} from "../queries/inventoryRequests";

/**
 * GET /inventory-requests
 * List all inventory requests (optionally filter by status)
 */
export const getInventoryRequests = async (c: Context) => {
  try {
    const status = c.req.query("status") as RequestStatus | undefined;
    const db = getSupabaseForRequest(c);

    const { data, error } = await listInventoryRequests(db, status);

    if (error) {
      console.error("[Inventory Requests] List error:", error);
      return errorResponse(error.message, 400);
    }

    // Enrich requests with job details (circuit_number, site_b_name)
    const enrichedData = await Promise.all(
      (data ?? []).map(async (request: any) => {
        const jobTable = request.job_type === "link_build" ? "link_build" : "drop_cable";
        const { data: jobData } = await db
          .from(jobTable)
          .select("circuit_number, site_b_name")
          .eq("id", request.job_id)
          .single();

        return {
          ...request,
          circuit_number: jobData?.circuit_number || null,
          site_name: jobData?.site_b_name || null,
        };
      })
    );

    return successResponse(enrichedData, "Inventory requests fetched");
  } catch (e: any) {
    console.error("[Inventory Requests] List error:", e);
    return errorResponse(e.message || "Failed to fetch inventory requests", 500);
  }
};

/**
 * GET /inventory-requests/pending/count
 * Get count of pending requests (for notification badge)
 */
export const getPendingCount = async (c: Context) => {
  try {
    const db = getSupabaseForRequest(c);
    const { count, error } = await getPendingRequestsCount(db);

    if (error) {
      console.error("[Inventory Requests] Count error:", error);
      return errorResponse(error.message, 400);
    }

    return successResponse({ count }, "Pending count fetched");
  } catch (e: any) {
    console.error("[Inventory Requests] Count error:", e);
    return errorResponse(e.message || "Failed to fetch pending count", 500);
  }
};

/**
 * GET /inventory-requests/:id
 * Get a single inventory request
 */
export const getInventoryRequest = async (c: Context) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing request ID", 400);

    const db = getSupabaseForRequest(c);
    const { data, error } = await getInventoryRequestById(db, id);

    if (error) {
      console.error("[Inventory Requests] Get error:", error);
      return errorResponse(error.message, 400);
    }

    if (!data) {
      return errorResponse("Request not found", 404);
    }

    return successResponse(data, "Inventory request fetched");
  } catch (e: any) {
    console.error("[Inventory Requests] Get error:", e);
    return errorResponse(e.message || "Failed to fetch inventory request", 500);
  }
};

/**
 * PUT /inventory-requests/:id/approve
 * Approve an inventory request
 */
export const approveRequest = async (c: Context) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing request ID", 400);

    // Get auth user ID from auth context
    const user = c.get("user");
    const authUserId = user?.id;

    if (!authUserId) {
      return errorResponse("Unauthorized: Unable to identify reviewer", 401);
    }

    const db = getSupabaseForRequest(c);

    // Look up staff ID from auth user ID
    const { data: staffRecord } = await db
      .from("staff")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (!staffRecord?.id) {
      return errorResponse("Unable to find staff record for reviewer", 400);
    }

    const { data, error } = await approveInventoryRequest(db, id, staffRecord.id);

    if (error) {
      console.error("[Inventory Requests] Approve error:", error);
      return errorResponse(error.message, 400);
    }

    return successResponse(data, "Inventory request approved successfully");
  } catch (e: any) {
    console.error("[Inventory Requests] Approve error:", e);
    return errorResponse(e.message || "Failed to approve inventory request", 500);
  }
};

/**
 * PUT /inventory-requests/:id/reject
 * Reject an inventory request
 */
export const rejectRequest = async (c: Context) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing request ID", 400);

    // Get auth user ID from auth context
    const user = c.get("user");
    const authUserId = user?.id;

    if (!authUserId) {
      return errorResponse("Unauthorized: Unable to identify reviewer", 401);
    }

    // Get optional rejection reason from body
    let reason: string | undefined;
    try {
      const body = await c.req.json();
      reason = body.reason;
    } catch {
      // No body provided, that's fine
    }

    const db = getSupabaseForRequest(c);

    // Look up staff ID from auth user ID
    const { data: staffRecord } = await db
      .from("staff")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (!staffRecord?.id) {
      return errorResponse("Unable to find staff record for reviewer", 400);
    }

    const { data, error } = await rejectInventoryRequest(db, id, staffRecord.id, reason);

    if (error) {
      console.error("[Inventory Requests] Reject error:", error);
      return errorResponse(error.message, 400);
    }

    return successResponse(data, "Inventory request rejected");
  } catch (e: any) {
    console.error("[Inventory Requests] Reject error:", e);
    return errorResponse(e.message || "Failed to reject inventory request", 500);
  }
};
