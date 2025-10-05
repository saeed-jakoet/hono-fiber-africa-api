import { z } from "zod";

const uuid = z.string().uuid();
const text = z.string();
const nullableText = z.string().nullable().optional();
const email = z.string().email();
const phone = z.string().nullable().optional();
const booleanLike = z.boolean().optional();
const timestamp = z.string().datetime().optional();

export const clientInsertSchema = z.object({
  first_name: text.min(1),
  last_name: text.min(1),
  email: email,
  phone_number: phone,
  address: nullableText,
  company_name: nullableText,
  notes: nullableText,
  is_active: z.boolean().optional(),
  id: uuid.optional(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const clientUpdateSchema = clientInsertSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type ClientInsert = z.infer<typeof clientInsertSchema>;
export type ClientUpdate = z.infer<typeof clientUpdateSchema>;
