import { z } from "zod";

export const dropCableStatusEnum = z.enum([
  "awaiting_client_installation_date",
  "survey_required",
  "survey_scheduled",
  "survey_completed",
  "lla_required",
  "awaiting_lla_approval",
  "lla_received",
  "installation_scheduled",
  "installation_completed",
  "as_built_submitted",
]);

export const countyEnum = z.enum(["tablebay", "falsebay"]).optional();

export const dropCableInsertSchema = z.object({
  // Client relationship
  client_id: z.string().uuid(),

  // Core identifiers
  job_number: z.string().min(1).optional(),
  circuit_number: z.string().min(1),

  // Business/site info
  site_b_name: z.string().min(1),
  county: countyEnum,
  physical_address_site_b: z.string().optional(),

  // People
  dfa_pm: z.string().optional(),
  client: z.string().optional(),
  client_contact_name: z.string().optional(),
  end_client_contact_name: z.string().optional(),
  end_client_contact_email: z.string().email().optional(),
  end_client_contact_phone: z.string().optional(),

  // Service provider
  service_provider: z.string().optional(),

  // Technicals
  dpc_distance_meters: z.number().nonnegative().optional(),

  // Survey fields
  survey_date: z.string().optional(), // ISO date (yyyy-mm-dd)
  survey_time: z.string().optional(), // HH:MM:SS

  // Timeline fields
  order_received_at: z.string().optional(),
  installation_date_requested_at: z.string().optional(),
  survey_scheduled_for: z.string().optional(),
  survey_completed_at: z.string().optional(),
  lla_sent_at: z.string().optional(),
  lla_received_at: z.string().optional(),
  installation_scheduled_for: z.string().optional(),
  installation_completed_at: z.string().optional(),
  as_built_submitted_at: z.string().optional(),

  // Assignment
  technician_name: z.string().optional(),

  // Status
  status: dropCableStatusEnum.optional(),
  notes: z.string().optional(),
});

// Update schema with id in body
export const dropCableUpdateWithIdSchema = dropCableInsertSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  });

export const dropCableUpdateSchema = dropCableInsertSchema.partial();

export type DropCableInsert = z.infer<typeof dropCableInsertSchema>;
export type DropCableUpdate = z.infer<typeof dropCableUpdateSchema>;
export type DropCableUpdateWithId = z.infer<typeof dropCableUpdateWithIdSchema>;
