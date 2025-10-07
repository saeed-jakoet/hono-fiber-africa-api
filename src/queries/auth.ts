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

  if (data?.user && !error) {
    const { id, email: userEmail } = data.user;
    const { error: insertError } = await database.from("users").insert({
      id,
      email: userEmail,
      first_name,
      surname,
      phone_number,
      role,
    });
    if (insertError) return { data, error: insertError };
  }
  return { data, error };
};

export const authSignIn = async (email: string, password: string) => {
  return await database.auth.signInWithPassword({ email, password });
};

export const updateAuthUserTable = async (
  id: string,
  payload: Partial<Pick<any, "email" | "phone" | "firstName" | "surname" | "role">>
) => {
  const validated = updateAuthUserSchema.parse({ id, ...payload });
  const { id: _omit, email, firstName, surname, role, phone } = validated as any;

  // Build auth update object succinctly
  const authUpdateFields: any = {
    ...(email ? { email } : {}),
    ...((firstName || surname || role || phone)
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
  const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdateFields);
  if (authError) return { data: null, error: authError };

  // Map to table column names (snake_case)
  const dbUpdate: any = {
    ...(email ? { email } : {}),
    ...(role ? { role } : {}),
    ...(firstName ? { first_name: firstName } : {}),
    ...(surname ? { surname } : {}),
    ...(phone ? { phone_number: phone } : {}),
  };

  const { data, error } = await database
    .from("users")
    .update(dbUpdate)
    .eq("id", id)
    .select("*")
    .limit(1)
    .single();

  return { data, error };
};
