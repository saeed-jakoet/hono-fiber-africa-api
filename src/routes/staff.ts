import { Hono } from "hono";
import { requireRole } from "../middleware/requireRole";
import { getStaffList, getStaffMember, updateStaffController, createStaffWithAuthController, createStaffController, grantAccessController, revokeAccessController, listStaffDocumentsController, revealNationalIdController, getMyStaffProfile } from "../controllers/staff";

const staffRoutes = new Hono();

// 1. List and get staff
staffRoutes.get("/", requireRole(["super_admin", "admin"]), getStaffList);
staffRoutes.get("/me", requireRole(["super_admin", "admin", "manager", "technician"]), getMyStaffProfile);
staffRoutes.get("/:id", requireRole(["super_admin", "admin"]), getStaffMember);

// 2. Create staff
staffRoutes.post("/", requireRole(["super_admin"]), createStaffController);

// 3. Update staff
staffRoutes.put("/:id", requireRole(["super_admin", "admin"]), updateStaffController);

// 4. Staff documents and sensitive info
staffRoutes.get("/:id/documents", requireRole(["super_admin", "admin"]), listStaffDocumentsController);
staffRoutes.get("/:id/reveal-national-id", requireRole(["super_admin", "admin"]), revealNationalIdController);

// 5. Access management
staffRoutes.post("/:id/grant-access", requireRole(["super_admin"]), grantAccessController);
staffRoutes.delete("/:id/access", requireRole(["super_admin"]), revokeAccessController);

export default staffRoutes;
