import { Hono } from "hono";
import {
  userSignIn,
  userSignUp,
  userMe,
  sendRefreshTokenToFrontend,
  userLogout,
  updateAuthUserController,
} from "../controllers/auth";

const authRoutes = new Hono();

authRoutes.get("/me", userMe);
authRoutes.get("/refresh-token", sendRefreshTokenToFrontend);

authRoutes.post("/signup", userSignUp);
authRoutes.post("/signin", userSignIn);
authRoutes.post("/logout", userLogout);

authRoutes.put("/", updateAuthUserController);

export default authRoutes;
