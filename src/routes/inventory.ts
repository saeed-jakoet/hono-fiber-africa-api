import { Hono } from "hono";
import {
  getInventory,
  addInventory,
  editInventory,
} from "../controllers/inventory";
import { requireRole } from "../middleware/requireRole";

const inventoryRoutes = new Hono();

inventoryRoutes.use("*", requireRole(["super_admin", "admin"]));

inventoryRoutes.get("/", getInventory);
inventoryRoutes.post("/", addInventory);
inventoryRoutes.patch("/:id", editInventory);

export default inventoryRoutes;
