import { Hono } from "hono";
import { getClients, addClient, editClient } from "../controllers/client";
import { requireRole } from "../middleware/requireRole";

const clientRoutes = new Hono();

clientRoutes.use("*", requireRole(["super_admin", "admin"]));

clientRoutes.get("/", getClients);
clientRoutes.post("/", addClient);
clientRoutes.patch("/:id", editClient);

export default clientRoutes;
