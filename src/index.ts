import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";

import authRoutes from "./routes/auth";
import refreshRouter from "./routes/refreshToken";
import inventoryRoutes from "./routes/inventory";
import clientRoutes from "./routes/clients";
import dropCableRoutes from "./routes/dropCable";
import logRoutes from "./routes/logs";
import documentsRoutes from "./routes/documents";
import staffRoutes from "./routes/staff";
import fleetRoutes from "./routes/fleet";
import { csrfProtection } from "./middleware/csrf";

const app = new Hono();

app.use(logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://192.168.3.89:3000"],
    credentials: true,
  })
);

app.use("*", async (c, next) => {
  console.log("Request:", c.req.url);
  await next();
});

app.get("/health", (c) => c.json({ status: "ok" }));

// CSRF protection (after CORS & logging, before routes)
app.use("*", csrfProtection());

app.use("*", async (c, next) => {
  const cookies = getCookie(c);
  // console.log("Cookies:", cookies);

  const accessToken = cookies.accessToken;
  const refreshToken = cookies.refreshToken;

  (c as any).accessToken = accessToken;
  (c as any).refreshToken = refreshToken;

  // console.log("Access Token From Index:", accessToken);
  // console.log("Refresh Token From Index:", refreshToken);

  await next();
});

app.route("/auth", authRoutes);
app.route("/refresh", refreshRouter);
app.route("/inventory", inventoryRoutes);
app.route("/client", clientRoutes);
app.route("/drop-cable", dropCableRoutes);
app.route("/log", logRoutes);
app.route("/documents", documentsRoutes);
app.route("/staff", staffRoutes);
app.route("/fleet", fleetRoutes);

const PORT = process.env.PORT;

Bun.serve({
  fetch: app.fetch,
  port: PORT,
  hostname: "0.0.0.0",
});

console.log(
  `🚀 Hono Fiber Africa Control Center Server is running on http://localhost:${PORT}`
);
