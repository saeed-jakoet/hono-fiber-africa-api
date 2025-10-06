import { Hono } from "hono";
import { getDropCables, getDropCable, addDropCable, editDropCable, getDropCablesByClient } from "../controllers/dropCable";
import { verifyJwt } from "../middleware/verifyJwt";


const dropCable = new Hono();

// dropCable.use("/*", verifyJwt);

dropCable.get("/", getDropCables);
dropCable.get("/:id", getDropCable);
dropCable.get("/client/:clientId", getDropCablesByClient);
dropCable.post("/", addDropCable);
// Update via body id rather than URL param
dropCable.put("/", editDropCable);
// Optionally support PATCH
dropCable.patch("/", editDropCable);

export default dropCable;
