/**
 * Inventory Requests Routes
 * API routes for inventory request approval workflow
 */

import { Hono } from "hono";
import {
  getInventoryRequests,
  getInventoryRequest,
  getPendingCount,
  approveRequest,
  rejectRequest,
} from "../controllers/inventoryRequests";
import { requireRole } from "../middleware/requireRole";

const inventoryRequestsRoutes = new Hono();

// Get all inventory requests (with optional status filter)
inventoryRequestsRoutes.get("/", getInventoryRequests);

// Get pending count for notification badge
inventoryRequestsRoutes.get("/pending/count", getPendingCount);

// Get single request
inventoryRequestsRoutes.get("/:id", getInventoryRequest);

// Approve request (super_admin only)
inventoryRequestsRoutes.put("/:id/approve", requireRole(["super_admin"]), approveRequest);

// Reject request (super_admin only)
inventoryRequestsRoutes.put("/:id/reject", requireRole(["super_admin"]), rejectRequest);

export default inventoryRequestsRoutes;
