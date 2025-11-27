/**
 * Mobile Queries Index
 * Re-exports all mobile query functions for easy importing
 */

// Auth queries
export { getUserById, updateUserPassword } from "./auth";

// Order queries
export {
  getStaffByAuthUserId,
  getDropCablesByTechnicianId,
  getDropCableById,
  getLinkBuildsByTechnicianId,
  getLinkBuildById,
} from "./orders";

// Document queries
export {
  getTemplateSignedUrl,
  uploadFile,
  insertDocument,
  listDocumentsByJob,
  getDocumentSignedUrl,
} from "./documents";

// Inventory queries
export {
  listInventory,
  getJobInventoryUsed,
  applyInventoryUsage,
} from "./inventory";
