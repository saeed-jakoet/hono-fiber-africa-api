/**
 * Mobile Authentication Controller
 * Handles login, logout, password changes, and user info
 */

import { verify } from "hono/jwt";
import { authSignIn } from "../../queries/auth";
import { successResponse, errorResponse } from "../../utilities/responses";
import { getAdminClient } from "../../utilities/supabase";
import { 
  verifyMobileAuth, 
  generateMobileToken, 
  JWT_SECRET 
} from "../../utilities/mobile";
import { signInSchema } from "../../schemas/authSchemas";
import { getUserById, updateUserPassword } from "../../queries/mobile";

/**
 * Mobile sign in - returns JWT token
 */
export const mobileSignIn = async (c: any) => {
  try {
    const body = await c.req.json();
    const parse = signInSchema.safeParse(body);

    if (!parse.success) {
      return errorResponse("Invalid email or password", 400);
    }

    const { email, password } = parse.data;
    const { data, error } = await authSignIn(email, password);

    if (error) {
      return errorResponse(error.message, 400);
    }

    const authUserId = data?.user?.id;

    // Fetch staff record to get staff ID for inventory requests
    const admin = getAdminClient();
    const { data: staffRecord } = await admin
      .from("staff")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    // Generate JWT token with both auth user ID and staff ID
    const token = await generateMobileToken({
      id: authUserId || "",
      staffId: staffRecord?.id || null, // Staff table ID for inventory requests
      email: data?.user?.email || "",
      role: data?.user?.user_metadata?.role,
    });

    return successResponse({
      token,
      user: {
        id: authUserId,
        staffId: staffRecord?.id || null,
        email: data?.user?.email,
        role: data?.user?.user_metadata?.role || null,
        first_name: data?.user?.user_metadata?.firstName || null,
        surname: data?.user?.user_metadata?.surname || null,
      },
    });
  } catch (e: any) {
    console.error("[Mobile Auth] Sign in error:", e);
    return errorResponse(e.message, e.status || 500);
  }
};

/**
 * Mobile get current user - requires JWT token
 */
export const mobileGetMe = async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Not authenticated", 401);
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = await verify(token, JWT_SECRET);
    } catch (err) {
      return errorResponse("Invalid or expired token", 401);
    }

    // Fetch fresh user data from Supabase
    const admin = getAdminClient();
    const {
      data: { user },
      error,
    } = await getUserById(admin, payload.id as string);

    if (error || !user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(
      {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || null,
        first_name: user.user_metadata?.firstName || null,
        surname: user.user_metadata?.surname || null,
        user_metadata: user.user_metadata || {},
      },
      "User fetched"
    );
  } catch (e: any) {
    console.error("[Mobile Auth] Get me error:", e);
    return errorResponse(e.message, 500);
  }
};

/**
 * Mobile logout - returns success (client clears token)
 */
export const mobileLogout = async (c: any) => {
  return successResponse({}, "Logged out");
};

/**
 * Mobile change password
 */
export const mobileChangePassword = async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Not authenticated", 401);
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = await verify(token, JWT_SECRET);
    } catch (err) {
      return errorResponse("Invalid or expired token", 401);
    }

    const body = await c.req.json();
    const { newPassword } = body;

    if (!newPassword) {
      return errorResponse("New password is required", 400);
    }

    if (newPassword.length < 8) {
      return errorResponse("Password must be at least 8 characters", 400);
    }

    // Get user to verify they exist
    const admin = getAdminClient();
    const {
      data: { user },
      error: userErr,
    } = await getUserById(admin, payload.id as string);

    if (userErr || !user) {
      return errorResponse("User not found", 404);
    }

    // Update password using admin client
    const { error: updErr } = await updateUserPassword(admin, user.id, newPassword);

    if (updErr) {
      return errorResponse(updErr.message, 400);
    }

    return successResponse({}, "Password changed successfully");
  } catch (e: any) {
    console.error("[Mobile Auth] Change password error:", e);
    return errorResponse(e.message || "Failed to change password", 400);
  }
};
