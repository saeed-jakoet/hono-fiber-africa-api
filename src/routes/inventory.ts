import { Hono } from "hono";
import {
  getInventory,
  addInventory,
  editInventory,
  removeInventory,
} from "../controllers/inventory";
import { requireRole } from "../middleware/requireRole";

const inventoryRoutes = new Hono();

inventoryRoutes.use("*", requireRole(["super_admin", "admin"]));

inventoryRoutes.get("/", getInventory);
inventoryRoutes.post("/", addInventory);
inventoryRoutes.patch("/:id", editInventory);
inventoryRoutes.delete("/:id", removeInventory);

export default inventoryRoutes;
