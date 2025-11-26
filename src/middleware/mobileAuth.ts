/**
 * Mobile Authentication Middleware
 * Protects mobile routes by verifying JWT tokens
 */

import { Context, Next } from "hono";
import { verify } from "hono/jwt";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Middleware to verify JWT token for mobile endpoints
 * Extracts token from Authorization header and validates it
 * Sets the verified payload on context for use in controllers
 */
export const mobileAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { status: "error", message: "Not authenticated" },
      401
    );
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, JWT_SECRET);
    
    // Set the verified user payload on context for use in controllers
    c.set("user", payload);
    
    await next();
  } catch (err) {
    return c.json(
      { status: "error", message: "Invalid or expired token" },
      401
    );
  }
};
