import { Hono } from "hono";
import { database } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import { setCookie } from "hono/cookie";

const refreshRouter = new Hono();

refreshRouter.post("/refresh-token", async (c) => {
  const { refresh_token } = await c.req.json();
  if (!refresh_token) {
    return errorResponse("Missing refresh token", 400);
  }
  try {
    const { data, error } = await database.auth.refreshSession({
      refresh_token,
    });
    if (error) {
      return errorResponse(error.message, 401);
    }
    if (data.session?.access_token) {
      setCookie(c, "accessToken", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000,
        path: "/",
      });
    }
    if (data.session?.refresh_token) {
      setCookie(c, "refreshToken", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 2 * 60 * 60 * 1000,
        path: "/",
      });
    }
    return successResponse({
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
      expiresAt: data.session?.expires_at,
    });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

export default refreshRouter;
