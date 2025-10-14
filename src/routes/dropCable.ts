import { Hono } from "hono";
import {
  getDropCables,
  getDropCable,
  addDropCable,
  editDropCable,
  getDropCablesByClient,
  getDropCablesByTechnician,
  sendDropCableAccessRequest,
} from "../controllers/dropCable";
import { requireRole } from "../middleware/requireRole";

const dropCable = new Hono();

dropCable.get("/", getDropCables);
dropCable.get("/:id", getDropCable);
dropCable.get("/client/:clientId", getDropCablesByClient);
dropCable.get("/technician/:technicianId", getDropCablesByTechnician);

dropCable.post("/", addDropCable);
dropCable.put("/", editDropCable);

dropCable.post("email/drop-cable-access", sendDropCableAccessRequest);

export default dropCable;
