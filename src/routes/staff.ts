import { Hono } from "hono";
import { requireRole } from "../middleware/requireRole";
import { getStaffList, getStaffMember, updateStaffController, createStaffWithAuthController, createStaffController, grantAccessController, revokeAccessController, listStaffDocumentsController } from "../controllers/staff";

const staffRoutes = new Hono();

staffRoutes.get("/", requireRole(["super_admin", "admin"]), getStaffList);
staffRoutes.get("/:id", requireRole(["super_admin", "admin"]), getStaffMember);
// Staff documents
staffRoutes.get("/:id/documents", requireRole(["super_admin", "admin"]), listStaffDocumentsController);
staffRoutes.put("/:id", requireRole(["super_admin", "admin"]), updateStaffController);
// New flow: create staff only
staffRoutes.post("/", requireRole(["super_admin"]), createStaffController);
// Grant / revoke system access
staffRoutes.post("/:id/grant-access", requireRole(["super_admin"]), grantAccessController);
staffRoutes.delete("/:id/access", requireRole(["super_admin"]), revokeAccessController);

export default staffRoutes;
