import { Hono } from "hono";
import { getLogs } from "../controllers/log";

const logRoutes = new Hono();

logRoutes.get("/", getLogs);

export default logRoutes;
