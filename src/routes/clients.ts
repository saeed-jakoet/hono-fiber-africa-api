import { Hono } from "hono";
import { getClients, getClient, addClient, editClient } from "../controllers/client";
import { requireRole } from "../middleware/requireRole";

const clientRoutes = new Hono();

clientRoutes.get("/", getClients);
clientRoutes.get("/:id", getClient);

clientRoutes.post("/", addClient);

clientRoutes.put("/:id", editClient);

export default clientRoutes;
