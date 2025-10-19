import { z } from "zod";

// Helper for optional nullable strings
const optionalNullableString = z.string().nullable().optional();

export const dropCableStatusEnum = z.enum([
  "awaiting_client_confirmation_date",
  "survey_required",
  "survey_scheduled",
  "survey_completed",
  "lla_required",
  "awaiting_lla_approval",
  "lla_received",
  "installation_scheduled",
  "installation_completed",
  "installation_complete_as_built_outstanding",
  "as_built_submitted",
  "issue_logged",
  "on_hold",
  "awaiting_health_and_safety",
  "planning_document_submitted",
  "awaiting_service_provider",
  "adw_required",
  "site_not_ready",
]);

export const countyEnum = z
  .enum(["tablebay", "falsebay"])
  .nullable()
  .optional();

//TODO: add week of year to schema
export const dropCableInsertSchema = z.object({
  // Client relationship
  client_id: z.string().uuid(),

  // Core identifier
  circuit_number: z.string().min(1),

  // Business/site info
  site_b_name: z.string().min(1),
  county: countyEnum,
  physical_address_site_b: optionalNullableString,

  // People
  pm: optionalNullableString,
  client: optionalNullableString,
  client_contact_name: optionalNullableString,
  end_client_contact_name: optionalNullableString,
  end_client_contact_email: z.string().email().nullable().optional(),
  end_client_contact_phone: optionalNullableString,

  // Service provider
  service_provider: optionalNullableString,

  // Technicals
  dpc_distance_meters: z.number().nonnegative().nullable().optional(),

  // Timeline fields
  survey_scheduled_date: optionalNullableString,
  survey_scheduled_time: optionalNullableString,
  survey_completed_at: optionalNullableString,
  installation_scheduled_date: optionalNullableString,
  installation_scheduled_time: optionalNullableString,
  installation_completed_date: optionalNullableString,
  lla_sent_at: optionalNullableString,
  lla_received_at: optionalNullableString,
  as_built_submitted_at: optionalNullableString,
  installation_complete_as_built_outstanding: optionalNullableString,
  quote_no: optionalNullableString,
  //TODO: remove unused
  order_received_at: optionalNullableString,
  installation_date_requested_at: optionalNullableString,
  survey_scheduled_for: optionalNullableString,

  link_manager: optionalNullableString,
  week: optionalNullableString,

  // Assignment
  technician_name: optionalNullableString,
  technician_id: z.string().nullable().optional(),

  //Invoice details
  survey_planning: z.boolean().optional(),
  callout: z.boolean().optional(),
  installation: z.boolean().optional(),
  spon_budi_opti: z.boolean().optional(),
  splitter_install: z.boolean().optional(),
  mousepad_install: z.boolean().optional(),

  // Installation completion override (percentage of install to be paid: 0-100)
  install_completion_percent: z.number().min(0).max(100).nullable().optional(),

  // Additional cost
  additonal_cost: z.number().nonnegative().nullable().optional(),
  additonal_cost_reason: optionalNullableString,

  // Status
  status: dropCableStatusEnum.nullable().optional(),
  // Notes can be a simple string (legacy) or an array of note objects with timestamp
  notes: z
    .union([
      z.string(),
      z
        .array(
          z.object({
            text: z.string(),
            timestamp: z.string(), // ISO string
          })
        )
        .min(0),
    ])
    .optional(),
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
