import { Hono } from "hono";
import {
  getInventory,
  getInventoryItem,
  addInventory,
  editInventory,
  applyUsage,
} from "../controllers/inventory";
import { requireRole } from "../middleware/requireRole";

const inventoryRoutes = new Hono();

inventoryRoutes.get("/", getInventory);
inventoryRoutes.get("/:id", getInventoryItem);

inventoryRoutes.post("/", addInventory);

inventoryRoutes.put("/:id", editInventory);

// Apply inventory usage to a job (generic across job types)
inventoryRoutes.post("/usage", applyUsage);

export default inventoryRoutes;
