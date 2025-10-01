import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";

import authRoutes from "./routes/auth";
import refreshRouter from "./routes/refreshToken";

const app = new Hono();

app.use(logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Removed manual CORS headers to allow hono/cors middleware to handle CORS properly for credentials

app.use("*", async (c, next) => {
  console.log("Request:", c.req.url);
  await next();
});

app.use("*", async (c, next) => {
  const cookies = getCookie(c);
  console.log("Cookies:", cookies);

  const accessToken = cookies.accessToken;
  const refreshToken = cookies.refreshToken;

  (c as any).accessToken = accessToken;
  (c as any).refreshToken = refreshToken;

  console.log("Access Token From Index:", accessToken);
  console.log("Refresh Token From Index:", refreshToken);

  await next();
});

app.route("/auth", authRoutes);
app.route("refresh", refreshRouter);

const PORT = process.env.PORT;

Bun.serve({
  fetch: app.fetch,
  port: PORT,
  hostname: "0.0.0.0",
});

console.log(
  `🚀 Hono Mission Control Server is running on http://localhost:${PORT}`
);
