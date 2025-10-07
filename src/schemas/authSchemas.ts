import { z } from "zod";

export const signUpSchema = z.object({
  first_name: z.string().min(1),
  surname: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(1),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateAuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  surname: z.string().optional(),
  role: z.string().optional(),
});

export type UpdateAuthUserInput = z.infer<typeof updateAuthUserSchema>;
