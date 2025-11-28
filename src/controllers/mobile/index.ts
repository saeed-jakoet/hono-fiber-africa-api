/**
 * Mobile Controllers Index
 * Re-exports all mobile controller functions for easy importing
 */

// Auth controllers
export {
  mobileSignIn,
  mobileGetMe,
  mobileLogout,
  mobileChangePassword,
} from "./auth";

// Order controllers
export {
  getTechnicianOrders,
  getDropCable,
  getLinkBuild,
} from "./orders";

// Document controllers
export {
  mobileGetHappyLetterTemplate,
  mobileUploadDocument,
  mobileListDocumentsForJob,
  mobileGetSignedUrl,
} from "./documents";

// Inventory controllers
export {
  mobileListInventory,
  mobileGetJobInventory,
  mobileApplyInventoryUsage,
  mobileGetMyRequests,
  mobileGetJobRequests,
} from "./inventory";
