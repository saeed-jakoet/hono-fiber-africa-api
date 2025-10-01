import { Hono } from "hono";
import {
  userSignIn,
  userSignUp,
  userMe,
  sendRefreshTokenToFrontend,
  userLogout,
} from "../controllers/auth";
import { requireRole } from "../middleware/requireRole";

const authRoutes = new Hono();

authRoutes.get("/me", userMe);
authRoutes.get("/refresh-token", sendRefreshTokenToFrontend);

authRoutes.post("/signup", userSignUp);
authRoutes.post("/signin", userSignIn);
authRoutes.post("/logout", userLogout);

// Example of role-protected endpoint (adjust or remove as needed)
authRoutes.get("/admin-only-ping", requireRole(["super_admin"]), (c) =>
  c.json({ pong: true })
);

export default authRoutes;
