import { getCookie } from "hono/cookie";
import { database } from "../utilities/supabase";
import { errorResponse } from "../utilities/responses";

export type Role = "super_admin" | "admin" | "manager" | "technician";

export const requireRole = (allowed: Role[]) => {
  return async (c: any, next: any) => {
    const token = getCookie(c, "accessToken");
    if (!token) {
      return errorResponse("Not authenticated", 401);
    }
    const {
      data: { user },
      error,
    } = await database.auth.getUser(token);
    if (error || !user) {
      return errorResponse("Not authenticated", 401);
    }
    const role = (user.user_metadata?.role as Role) || null;
    if (!role || !allowed.includes(role)) {
      return errorResponse("Forbidden", 403);
    }
    c.set("user", user);
    c.set("role", role);
    await next();
  };
};
