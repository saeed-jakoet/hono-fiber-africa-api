import { database } from "../utilities/supabase";

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

// id-based authMe removed; controller resolves authenticated user directly.
