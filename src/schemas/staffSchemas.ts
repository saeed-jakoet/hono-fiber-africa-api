import { z } from "zod";

// Basic YYYY-MM-DD date string validator (optional)
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
  );

// NOTE: Client must NOT send masked_national_id or encrypted_national_id.
// Those are computed server-side from `national_id` when provided.
export const createStaffWithAuthSchema = z
  .object({
  // Auth-required
  email: z.string().email(),
  role: z.enum(["super_admin", "admin", "manager", "field_worker", "client"]).default("field_worker"),

  // Profile/HR
  first_name: z.string().min(1),
  surname: z.string().min(1),
  phone_number: z.string().optional().nullable(),

  date_of_birth: dateStr.optional().nullable(),
  address: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  hire_date: dateStr.optional().nullable(),
  salary: z.coerce.number().optional().nullable(),
  employment_type: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  national_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  })
  .strict();

// Update schema only allows editable HR fields; disallow masked/encrypted inputs.
export const updateStaffSchema = z
  .object({
  phone_number: z.string().optional().nullable(),
  date_of_birth: dateStr.optional().nullable(),
  address: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  hire_date: dateStr.optional().nullable(),
  salary: z.coerce.number().optional().nullable(),
  employment_type: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  national_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  })
  .strict();

export type CreateStaffWithAuthInput = z.infer<typeof createStaffWithAuthSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

// Create-staff-only schema (no auth fields)
// Create-staff-only schema (no auth fields). Strict to prevent sensitive fields.
export const createStaffSchema = z
  .object({
  first_name: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  // Optional default role for staff record; kept in staff for convenience
  role: z.enum(["super_admin", "admin", "manager", "field_worker", "client"]).optional().nullable(),

  date_of_birth: dateStr.optional().nullable(),
  address: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  hire_date: dateStr.optional().nullable(),
  salary: z.coerce.number().optional().nullable(),
  employment_type: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  national_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  })
  .strict();

// Grant access schema: may provide password and role overrides
export const grantAccessSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["super_admin", "admin", "manager", "field_worker", "client"]).optional(),
});
