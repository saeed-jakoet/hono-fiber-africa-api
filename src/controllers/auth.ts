import { authSignup, authSignIn } from "../queries/auth";
import { successResponse, errorResponse } from "../utilities/responses";
import { signUpSchema, signInSchema } from "../schemas/authSchemas";
import { getCookie, setCookie } from "hono/cookie";
import { database, getSupabaseForRequest } from "../utilities/supabase";

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
        maxAge: 2 * 60 * 60, // seconds
        path: "/",
      });
    }

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
  return c.json({ message: "Logged out" });
};
