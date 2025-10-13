import { z } from "zod";

const uuid = z.string().uuid();
const text = z.string();
const nullableText = z.string().nullable().optional();
const intYear = z
  .union([z.number().int(), z.string()])
  .transform((v) => (typeof v === "number" ? v : parseInt(v, 10)))
  .refine((v) => Number.isInteger(v) && v > 1900, {
    message: "Year must be > 1900",
  })
  .optional();

export const fleetInsertSchema = z.object({
  registration: text.max(20),
  make: text.optional(),
  model: text.optional(),
  vin: text.max(50).optional(),
  vehicle_type: nullableText,
  technician: nullableText,
  technician_id: uuid.optional(),
});

export const fleetUpdateSchema = z
  .object({
    registration: text.max(20).optional(),
    make: text.optional(),
    model: text.optional(),
    vin: text.max(50).optional(),
    vehicle_type: nullableText,
    technician: nullableText,
    technician_id: uuid.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type FleetInsert = z.infer<typeof fleetInsertSchema>;
export type FleetUpdate = z.infer<typeof fleetUpdateSchema>;
