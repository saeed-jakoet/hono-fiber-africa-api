/**
 * Mobile Orders Controller
 * 
 * Handles all order-related endpoints for the mobile app.
 * Technicians can view their assigned drop cables and link builds.
 */

import { Context } from "hono";
import { successResponse, errorResponse } from "../../utilities/responses";
import { getAdminClient } from "../../utilities/supabase";
import {
  getStaffByAuthUserId,
  getDropCablesByTechnicianId,
  getDropCableById,
  getLinkBuildsByTechnicianId,
  getLinkBuildById,
} from "../../queries/mobile";

// ============================================
// Helper Functions
// ============================================

/**
 * Get the authenticated user's staff record.
 * Returns null if no staff record exists for this auth user.
 */
const getAuthenticatedStaff = async (authUserId: string) => {
  const admin = getAdminClient();
  const { data, error } = await getStaffByAuthUserId(admin, authUserId);
  
  if (error || !data) {
    return null;
  }
  
  return data;
};

/**
 * Verify the requesting user owns the resource.
 */
const verifyOwnership = (c: Context, requestedUserId: string): boolean => {
  const user = c.get("user");
  return user?.id === requestedUserId;
};

// ============================================
// Order List Endpoints
// ============================================

/**
 * GET /mobile/orders/:technicianId
 * 
 * Get all orders (drop cables + link builds) for a technician.
 * Returns orders grouped by type with a total count.
 */
export const getTechnicianOrders = async (c: Context) => {
  try {
    const technicianId = c.req.param("technicianId");
    
    if (!technicianId) {
      return errorResponse("Missing technicianId parameter", 400);
    }

    // Verify user is requesting their own orders
    if (!verifyOwnership(c, technicianId)) {
      return errorResponse("Unauthorized", 403);
    }

    // Get staff record from auth user ID
    const staff = await getAuthenticatedStaff(technicianId);
    
    if (!staff) {
      return successResponse(
        { drop_cables: [], link_builds: [], total: 0 },
        "No staff record found"
      );
    }

    // Fetch both order types in parallel for efficiency
    const admin = getAdminClient();
    const [dropCablesResult, linkBuildsResult] = await Promise.all([
      getDropCablesByTechnicianId(admin, staff.id),
      getLinkBuildsByTechnicianId(admin, staff.id),
    ]);

    const dropCables = dropCablesResult.data ?? [];
    const linkBuilds = linkBuildsResult.data ?? [];

    return successResponse(
      {
        drop_cables: dropCables,
        link_builds: linkBuilds,
        total: dropCables.length + linkBuilds.length,
      },
      "Orders fetched"
    );
  } catch (e: any) {
    console.error("[Mobile Orders] Error:", e);
    return errorResponse(e.message || "Failed to fetch orders", 500);
  }
};

// ============================================
// Drop Cable Endpoints
// ============================================

/**
 * GET /mobile/drop-cable/:id
 * 
 * Get a single drop cable order by ID.
 */
export const getDropCable = async (c: Context) => {
  try {
    const id = c.req.param("id");
    
    if (!id) {
      return errorResponse("Missing order id", 400);
    }

    const admin = getAdminClient();
    const { data, error } = await getDropCableById(admin, id);

    if (error) {
      return errorResponse(error.message, 400);
    }

    if (!data) {
      return errorResponse("Drop cable not found", 404);
    }

    return successResponse(data, "Drop cable fetched");
  } catch (e: any) {
    console.error("[Mobile Orders] Get drop cable error:", e);
    return errorResponse(e.message || "Failed to fetch drop cable", 500);
  }
};

// ============================================
// Link Build Endpoints
// ============================================

/**
 * GET /mobile/link-build/:id
 * 
 * Get a single link build order by ID.
 */
export const getLinkBuild = async (c: Context) => {
  try {
    const id = c.req.param("id");
    
    if (!id) {
      return errorResponse("Missing order id", 400);
    }

    const admin = getAdminClient();
    const { data, error } = await getLinkBuildById(admin, id);

    if (error) {
      return errorResponse(error.message, 400);
    }

    if (!data) {
      return errorResponse("Link build not found", 404);
    }

    return successResponse(data, "Link build fetched");
  } catch (e: any) {
    console.error("[Mobile Orders] Get link build error:", e);
    return errorResponse(e.message || "Failed to fetch link build", 500);
  }
};
