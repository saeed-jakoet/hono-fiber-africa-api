/**
 * Mobile API Routes
 * 
 * All routes for the Fiber Africa mobile technician app.
 * Protected routes require a valid JWT token in the Authorization header.
 */

import { Hono } from "hono";
import { mobileAuthMiddleware } from "../middleware/mobileAuth";
import {
  // Auth
  mobileSignIn,
  mobileGetMe,
  mobileLogout,
  mobileChangePassword,
  // Orders
  getTechnicianOrders,
  getDropCable,
  getLinkBuild,
  // Documents
  mobileGetHappyLetterTemplate,
  mobileUploadDocument,
  mobileListDocumentsForJob,
  mobileGetSignedUrl,
  // Inventory
  mobileListInventory,
  mobileGetJobInventory,
  mobileApplyInventoryUsage,
  mobileGetMyRequests,
  mobileGetJobRequests,
  // Location
  mobileUpdateLocation,
} from "../controllers/mobile";

const mobile = new Hono();

// ============================================
// Public Routes (no auth required)
// ============================================

mobile.post("/signin", mobileSignIn);

// ============================================
// Protected Routes (require valid JWT)
// ============================================

mobile.use("/*", mobileAuthMiddleware);

// --- Auth ---
mobile.get("/me", mobileGetMe);
mobile.post("/logout", mobileLogout);
mobile.post("/change-password", mobileChangePassword);

// --- Orders ---
mobile.get("/orders/:technicianId", getTechnicianOrders);
mobile.get("/drop-cable/:id", getDropCable);
mobile.get("/link-build/:id", getLinkBuild);

// --- Documents ---
mobile.get("/documents/template/happy-letter", mobileGetHappyLetterTemplate);
mobile.post("/documents/upload", mobileUploadDocument);
mobile.get("/documents/job/:jobType/:jobId", mobileListDocumentsForJob);
mobile.get("/documents/signed-url", mobileGetSignedUrl);

// --- Inventory ---
mobile.get("/inventory", mobileListInventory);
mobile.get("/inventory/job/:jobId", mobileGetJobInventory);
mobile.post("/inventory/usage", mobileApplyInventoryUsage);
mobile.get("/inventory/requests", mobileGetMyRequests);
mobile.get("/inventory/requests/job/:jobId", mobileGetJobRequests);

// --- Location ---
mobile.patch("/location", mobileUpdateLocation);

export default mobile;
