import { MiddlewareHandler } from "hono";
import { verify } from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export const verifyJwt: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = verify(token, SUPABASE_JWT_SECRET);
    c.set("user", payload);
    await next();
  } catch (e: any) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};
