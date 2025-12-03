import { Hono } from "hono";
import {
  getDropCables,
  getDropCable,
  addDropCable,
  editDropCable,
  getDropCablesByClient,
  getDropCablesByTechnician,
  sendDropCableAccessRequest,
  deleteDropCable,
  getOrderCosts,
} from "../controllers/dropCable";
import { requireRole } from "../middleware/requireRole";
import { getWeeklyTotals } from "../controllers/dropCable";

const dropCable = new Hono();

dropCable.get("/", getDropCables);
dropCable.get("/:id", getDropCable);
dropCable.get("/:id/costs", getOrderCosts);
dropCable.get("/client/:clientId", getDropCablesByClient);
dropCable.get("/technician/:technicianId", getDropCablesByTechnician);

dropCable.post("/", addDropCable);
dropCable.put("/", editDropCable);

dropCable.post("email/drop-cable-access", sendDropCableAccessRequest);
dropCable.post("/weekly-totals", getWeeklyTotals);

// Delete a drop-cable order by id
dropCable.delete("/:id", deleteDropCable);

export default dropCable;
