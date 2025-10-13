import { Hono } from "hono";
import { database } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import { setCookie, getCookie } from "hono/cookie";

const refreshRouter = new Hono();

refreshRouter.post("/refresh-token", async (c) => {
  const raw = getCookie(c, "refreshToken");
  let refresh_token = "";
  if (raw) {
    try {
      refresh_token = decodeURIComponent(raw);
    } catch {
      refresh_token = raw;
    }
  }
  if (!refresh_token) return errorResponse("Unauthorized", 401);

  try {
    const { data, error } = await database.auth.refreshSession({
      refresh_token,
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isAlreadyUsedOrInvalid =
        msg.includes("already used") ||
        msg.includes("invalid refresh token") ||
        msg.includes("invalid_grant") ||
        msg.includes("invalid grant");

      if (isAlreadyUsedOrInvalid) {
        const currentAccess = getCookie(c, "accessToken");
        if (currentAccess) {
          const { data: udata, error: uerr } = await database.auth.getUser(
            currentAccess as string
          );
          if (udata?.user && !uerr) {
            return successResponse({ message: "Refresh already processed" });
          }
        }
      }
      return errorResponse("Unauthorized", 401);
    }

    if (data.session?.access_token) {
      setCookie(c, "accessToken", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60,
        path: "/",
      });
    }
    if (data.session?.refresh_token) {
      setCookie(
        c,
        "refreshToken",
        encodeURIComponent(data.session.refresh_token),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        }
      );
    }

    return successResponse({
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
      expiresAt: data.session?.expires_at,
    });
  } catch {
    return errorResponse("Server error", 500);
  }
});

export default refreshRouter;
