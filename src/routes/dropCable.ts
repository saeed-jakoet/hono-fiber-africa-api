import { Hono } from "hono";
import {
  getDropCables,
  getDropCable,
  addDropCable,
  editDropCable,
  getDropCablesByClient,
} from "../controllers/dropCable";
import { requireRole } from "../middleware/requireRole";

const dropCable = new Hono();

dropCable.get("/", getDropCables);
dropCable.get("/:id", getDropCable);
dropCable.get("/client/:clientId", getDropCablesByClient);

dropCable.post("/", addDropCable);
dropCable.put("/", editDropCable);

export default dropCable;
