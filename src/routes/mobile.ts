import { Hono } from "hono";
import { mobileAuthMiddleware } from "../middleware/mobileAuth";
import { 
  // Auth
  mobileSignIn, 
  mobileGetMe, 
  mobileLogout, 
  mobileChangePassword,
  // Orders
  mobileGetTechnicianOrders,
  mobileGetDropCableById,
  // Documents
  mobileGetHappyLetterTemplate,
  mobileUploadDocument,
  mobileListDocumentsForJob,
  mobileGetSignedUrl,
  // Inventory
  mobileListInventory,
  mobileGetJobInventory,
  mobileApplyInventoryUsage,
} from "../controllers/mobile";

const mobile = new Hono();

// ============================================
// Public Endpoints (no auth required)
// ============================================
mobile.post("/signin", mobileSignIn);

// ============================================
// Protected Endpoints (require valid JWT token)
// ============================================
mobile.use("/*", mobileAuthMiddleware);

// Authentication (protected)
mobile.get("/me", mobileGetMe);
mobile.post("/logout", mobileLogout);
mobile.post("/change-password", mobileChangePassword);

// Order Endpoints
mobile.get("/orders/:technicianId", mobileGetTechnicianOrders);
mobile.get("/drop-cable/:id", mobileGetDropCableById);

// Document Endpoints
mobile.get("/documents/template/happy-letter", mobileGetHappyLetterTemplate);
mobile.post("/documents/upload", mobileUploadDocument);
mobile.get("/documents/job/:jobType/:jobId", mobileListDocumentsForJob);
mobile.get("/documents/signed-url", mobileGetSignedUrl);

// Inventory Endpoints
mobile.get("/inventory", mobileListInventory);
mobile.get("/inventory/job/:jobId", mobileGetJobInventory);
mobile.post("/inventory/usage", mobileApplyInventoryUsage);

export default mobile;
