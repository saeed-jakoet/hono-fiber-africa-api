import { Hono } from "hono";
import { requireRole } from "../middleware/requireRole";
import {
  userSignIn,
  userSignUp,
  userMe,
  sendRefreshTokenToFrontend,
  userLogout,
  updateAuthUserController,
  getAuthAccountById,
  requestPasswordReset,
  applyPasswordReset,
  changeMyPassword,
} from "../controllers/auth";

const authRoutes = new Hono();

authRoutes.get("/me", userMe);
authRoutes.get("/refresh-token", sendRefreshTokenToFrontend);

authRoutes.post("/signup", userSignUp);
authRoutes.post("/signin", userSignIn);
authRoutes.post("/logout", userLogout);

// Password reset
authRoutes.post("/forgot-password", requestPasswordReset);
authRoutes.post("/reset-password", applyPasswordReset);
authRoutes.post("/change-password", requireRole(["super_admin", "admin", "manager", "technician"]), changeMyPassword);

authRoutes.put("/", updateAuthUserController);

// Admin: fetch auth account by id
authRoutes.get("/accounts/:id", requireRole(["super_admin", "admin"]), getAuthAccountById);

export default authRoutes;
