import { Hono } from "hono";
import {
  getInventory,
  getInventoryItem,
  addInventory,
  editInventory,
} from "../controllers/inventory";
import { requireRole } from "../middleware/requireRole";

const inventoryRoutes = new Hono();

inventoryRoutes.use("*", requireRole(["super_admin", "admin"]));

inventoryRoutes.get("/", getInventory);
inventoryRoutes.get("/:id", getInventoryItem);
inventoryRoutes.post("/", addInventory);
inventoryRoutes.put("/:id", editInventory);

export default inventoryRoutes;
