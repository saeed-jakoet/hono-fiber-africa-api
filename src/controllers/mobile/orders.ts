/**
 * Mobile Orders Controller
 * Handles technician order operations
 */

import { successResponse, errorResponse } from "../../utilities/responses";
import { getAdminClient } from "../../utilities/supabase";
import { verifyMobileAuth } from "../../utilities/mobile";
import { 
  getStaffByAuthUserId, 
  listOrdersByTechnician, 
  getOrderById 
} from "../../queries/mobile";

/**
 * Get technician orders - requires JWT token
 */
export const mobileGetTechnicianOrders = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const authUserId = c.req.param("technicianId");
    if (!authUserId) {
      return errorResponse("Missing technicianId", 400);
    }

    console.log("[Mobile Orders] Auth user ID:", authUserId);

    // Verify the user is requesting their own orders
    if (auth.payload.id !== authUserId) {
      return errorResponse("Unauthorized", 403);
    }

    const admin = getAdminClient();
    
    // First, get the staff record for this auth user
    const { data: staffData, error: staffError } = await getStaffByAuthUserId(admin, authUserId);
    
    console.log("[Mobile Orders] Staff lookup - data:", staffData, "error:", staffError);
    
    if (staffError || !staffData) {
      console.log("[Mobile Orders] No staff record found for this user");
      return successResponse([], "Orders fetched");
    }

    // Now get orders using the staff ID
    const { data, error } = await listOrdersByTechnician(admin, staffData.id);
    
    console.log("[Mobile Orders] Query result - data count:", data?.length || 0, "error:", error);
    
    if (error) {
      return errorResponse(error.message, 400);
    }

    return successResponse(data ?? [], "Orders fetched");
  } catch (e: any) {
    console.error("[Mobile Orders] Error:", e);
    return errorResponse(e.message || "Failed to fetch orders", 500);
  }
};

/**
 * Get single drop cable order by ID - requires JWT token
 */
export const mobileGetDropCableById = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const id = c.req.param("id");
    if (!id) {
      return errorResponse("Missing order id", 400);
    }

    const admin = getAdminClient();
    const { data, error } = await getOrderById(admin, id);
    
    if (error) {
      return errorResponse(error.message, 400);
    }
    
    if (!data) {
      return errorResponse("Drop cable order not found", 404);
    }

    return successResponse(data, "Order fetched");
  } catch (e: any) {
    console.error("[Mobile Orders] Get order error:", e);
    return errorResponse(e.message || "Failed to fetch order", 500);
  }
};
