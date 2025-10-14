import { database, getAdminClient } from "../utilities/supabase";
import { updateAuthUserSchema } from "../schemas/authSchemas";

export const authSignup = async (
  first_name: string,
  surname: string,
  phone_number: string,
  email: string,
  password: string,
  role: string
) => {
  const { data, error } = await database.auth.signUp({
    email,
    password,
    options: {
      data: { firstName: first_name, surname, phoneNumber: phone_number, role },
    },
  });

  // No custom users table insert; user profile is managed in staff table
  return { data, error };
};

export const authSignIn = async (email: string, password: string) => {
  return await database.auth.signInWithPassword({ email, password });
};

// List Supabase Auth accounts (admin)
export const listAuthAccounts = async (
  page: number = 1,
  perPage: number = 50
) => {
  const admin = getAdminClient();
  // @ts-ignore: supabase-js admin listUsers supports pagination
  return await admin.auth.admin.listUsers({ page, perPage });
};

export const updateAuthUserTable = async (
  id: string,
  payload: Partial<
    Pick<any, "email" | "phone" | "firstName" | "surname" | "role">
  >
) => {
  const validated = updateAuthUserSchema.parse({ id, ...payload });
  const {
    id: _omit,
    email,
    firstName,
    surname,
    role,
    phone,
  } = validated as any;

  // Build auth update object succinctly
  const authUpdateFields: any = {
    ...(email ? { email } : {}),
    ...(firstName || surname || role || phone
      ? {
          user_metadata: {
            ...(firstName ? { firstName } : {}),
            ...(surname ? { surname } : {}),
            ...(role ? { role } : {}),
            ...(phone ? { phone } : {}),
          },
        }
      : {}),
  };

  // Use admin client ONLY for auth updates
  const admin = getAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(
    id,
    authUpdateFields
  );
  if (authError) return { data: null, error: authError };

  // If role is being updated, also update the staff table
  if (role) {
    const { error: staffError } = await database
      .from("staff")
      .update({ role })
      .eq("auth_user_id", id);

    if (staffError) {
      console.error("Failed to update staff role:", staffError);
    }
  }

  return { data: { id }, error: null as any };
};
