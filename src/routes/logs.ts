import { Hono } from "hono";
import { getLogs } from "../controllers/log";
import { requireRole } from "../middleware/requireRole";

const logRoutes = new Hono();

logRoutes.get("/", requireRole(["super_admin"]), getLogs);

export default logRoutes;
