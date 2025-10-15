import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { randomBytes } from "crypto";

// Name of the cookie + header
export const CSRF_COOKIE = "csrfToken";
export const CSRF_HEADER = "x-csrf-token";

// Generate a strong random token
export function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

// Issue a CSRF cookie if one does not yet exist
export function ensureCsrfCookie(c: Context) {
  const existing = getCookie(c, CSRF_COOKIE);
  if (!existing) {
    const token = generateCsrfToken();
    setCookie(c, CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by frontend JS to mirror into header
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 6, // 6 hours (adjust as needed)
    });
    return token;
  }
  return existing;
}

// Middleware to validate CSRF on state-changing requests
export const csrfProtection = () => {
  return async (c: Context, next: Function) => {
    const method = c.req.method.toUpperCase();
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    // Skip protection for pure auth token establishment routes where browser may not yet have cookie
    const path = new URL(c.req.url).pathname;
    const skipPaths = [
      "/auth/signin",
      "/auth/signup",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/refresh/refresh-token",
    ]; // refresh is controlled separately

    if (isMutation && !skipPaths.includes(path)) {
      const cookieToken = getCookie(c, CSRF_COOKIE);
      const headerToken = c.req.header(CSRF_HEADER);
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return c.json({ message: "Invalid CSRF token" }, 403);
      }
    }

    // Always ensure a cookie exists (useful for initial GETs)
    ensureCsrfCookie(c);
    await next();
  };
};
