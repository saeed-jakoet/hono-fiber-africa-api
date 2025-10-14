import { authSignup, authSignIn, updateAuthUserTable } from "../queries/auth";
import { successResponse, errorResponse } from "../utilities/responses";
import { signUpSchema, signInSchema } from "../schemas/authSchemas";
import { getCookie, setCookie } from "hono/cookie";
import { ensureCsrfCookie, CSRF_COOKIE } from "../middleware/csrf";
import { database, getAdminClient } from "../utilities/supabase";
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "../schemas/authSchemas";

export const userSignUp = async (c: any) => {
  try {
    const body = await c.req.json();
    const parse = signUpSchema.safeParse(body);
    if (!parse.success) {
      return errorResponse("Invalid input", 400);
    }
    const { first_name, surname, phone_number, email, password, role } =
      parse.data;
    const { data, error } = await authSignup(
      first_name,
      surname,
      phone_number,
      email,
      password,
      role
    );
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "successful");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message, e.status);
  }
};

export const userSignIn = async (c: any) => {
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

    const accessTokenToSet = data?.session?.access_token || "";
    const refreshTokenToSet = data?.session?.refresh_token || "";

    if (accessTokenToSet) {
      setCookie(c, "accessToken", accessTokenToSet, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // seconds
        path: "/",
      });
    }
    if (refreshTokenToSet) {
      setCookie(c, "refreshToken", encodeURIComponent(refreshTokenToSet), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    // Ensure CSRF token cookie exists for subsequent mutating requests
    ensureCsrfCookie(c);

    return successResponse({ id: data?.user?.id });
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message, e.status);
  }
};

export const userMe = async (c: any) => {
  try {
    const token = getCookie(c, "accessToken");

    if (!token) {
      return errorResponse("Not authenticated", 401);
    }

    const {
      data: { user },
      error,
    } = await database.auth.getUser(token as string);

    if (error || !user) {
      return errorResponse("Not authenticated", 401);
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
    return errorResponse(e.message, 500);
  }
};

export const sendRefreshTokenToFrontend = async (c: any) => {
  const cookies = getCookie(c);
  const refreshToken = cookies["refreshToken"];

  if (!refreshToken) {
    return c.json({ refreshToken: null }, 401);
  }

  return c.json({ refreshToken });
};

export const userLogout = async (c: any) => {
  setCookie(c, "accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  setCookie(c, "refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  // Clear CSRF cookie
  setCookie(c, CSRF_COOKIE, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return c.json({ message: "Logged out" });
};

export const updateAuthUserController = async (c: any) => {
  try {
    const token = getCookie(c, "accessToken");
    if (!token) return errorResponse("Not authenticated", 401);

    const { data: me, error: meErr } = await database.auth.getUser(
      token as string
    );
    if (meErr || !me?.user) return errorResponse("Not authenticated", 401);

    const callerRole = me.user.user_metadata?.role;

    const payload = await c.req.json();
    const { id, ...fields } = payload || {};
    if (!id) return errorResponse("Missing user id", 400);

    const overrideEnabled = process.env.ALLOW_AUTH_UPDATE_OVERRIDE === "true";
    if (!overrideEnabled) {
      // Normal mode: only super_admin can update any user
      if (callerRole !== "super_admin") return errorResponse("Forbidden", 403);
    } else {
      // Override mode: only allow self-update
      if (me.user.id !== id)
        return errorResponse(
          "Forbidden (override allows self-update only)",
          403
        );
    }

    const { data, error } = await updateAuthUserTable(id, fields);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err.message || "Failed to update user", 400);
  }
};

// Fetch a Supabase Auth account by id (admin)
export const getAuthAccountById = async (c: any) => {
  try {
    const callerToken = getCookie(c, "accessToken");
    if (!callerToken) return errorResponse("Not authenticated", 401);

    // Ensure caller exists (optionally, rely on route-level requireRole)
    const me = await database.auth.getUser(callerToken as string);
    if (me.error || !me.data?.user)
      return errorResponse("Not authenticated", 401);

    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);

    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data?.user)
      return errorResponse(error?.message || "User not found", 404);

    const u = data.user;
    return successResponse(
      {
        id: u.id,
        email: u.email,
        role: (u.user_metadata as any)?.role ?? null,
        first_name: (u.user_metadata as any)?.firstName ?? null,
        surname: (u.user_metadata as any)?.surname ?? null,
        phone_number: (u.user_metadata as any)?.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        confirmed_at: u.confirmed_at,
      },
      "Auth account fetched"
    );
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// --- Password Reset Flow ---
export const requestPasswordReset = async (c: any) => {
  try {
    const body = await c.req.json();
    const parse = forgotPasswordSchema.safeParse(body);
    if (!parse.success) return errorResponse("Invalid email", 400);

    const email = parse.data.email;
    // Send Supabase reset email with a redirect back to frontend page
  const redirectTo = `${process.env.FRONTEND_BASE_URL}/auth/reset-password`;
    const { error } = await database.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    // To avoid user enumeration, always return success even if the user doesn't exist
    if (error) {
      console.warn("resetPasswordForEmail error:", error.message);
      return successResponse({}, "If an account exists for that email, a reset link has been sent");
    }
    return successResponse({}, "If an account exists for that email, a reset link has been sent");
  } catch (e: any) {
    return errorResponse(e.message || "Failed to request password reset", 400);
  }
};

export const applyPasswordReset = async (c: any) => {
  try {
    const body = await c.req.json();
    const parse = resetPasswordSchema.safeParse(body);
    if (!parse.success) return errorResponse("Invalid payload", 400);
    const { token, new_password } = parse.data;

    // Validate the recovery token by fetching the user it belongs to
    const {
      data: { user },
      error: tokenErr,
    } = await database.auth.getUser(token);
    if (tokenErr || !user) {
      return errorResponse("Invalid or expired token", 400);
    }

    // Update the user's password using the admin client
    const admin = getAdminClient();
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (updErr) return errorResponse(updErr.message, 400);
    return successResponse({}, "Password updated successfully");
  } catch (e: any) {
    return errorResponse(e.message || "Failed to reset password", 400);
  }
};

// Change password for the currently authenticated user
export const changeMyPassword = async (c: any) => {
  try {
    const body = await c.req.json();
    const parse = changePasswordSchema.safeParse(body);
    if (!parse.success) return errorResponse("Invalid payload", 400);

    // Identify current user from access token cookie
    const token = getCookie(c, "accessToken");
    if (!token) return errorResponse("Not authenticated", 401);
    const { data: me, error: meErr } = await database.auth.getUser(token as string);
    if (meErr || !me?.user) return errorResponse("Not authenticated", 401);

    const user = me.user;
    const { current_password, new_password } = parse.data;

    // Verify current password by attempting sign-in with email + current password
    if (!user.email) return errorResponse("Email not found for user", 400);
    const { error: signInErr } = await database.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });
    if (signInErr) {
      return errorResponse("Current password is incorrect", 400);
    }

    // Update password using admin client
    const admin = getAdminClient();
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (updErr) return errorResponse(updErr.message, 400);

    return successResponse({}, "Password updated successfully");
  } catch (e: any) {
    return errorResponse(e.message || "Failed to change password", 400);
  }
};
