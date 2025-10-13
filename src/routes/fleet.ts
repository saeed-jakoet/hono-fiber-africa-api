import { Hono } from "hono";
import {
  getFleet,
  getFleetItem,
  addFleet,
  editFleet,
  removeFleet,
} from "../controllers/fleet";
import { requireRole } from "../middleware/requireRole";

const fleetRoutes = new Hono();

fleetRoutes.get("/", getFleet);
fleetRoutes.get("/:id", getFleetItem);

fleetRoutes.post("/", addFleet);

fleetRoutes.put("/:id", editFleet);

fleetRoutes.delete("/:id", removeFleet);

export default fleetRoutes;
