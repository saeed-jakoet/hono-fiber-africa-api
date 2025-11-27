import { z } from "zod";

// Helper for optional nullable strings
const optionalNullableString = z.string().nullable().optional();

export const countyEnum = z
  .enum(["tablebay", "falsebay"])
  .nullable()
  .optional();

export const linkBuildStatusEnum = z
  .enum([
    "not_started",
    "work_in_progress",
    "completed",
    "completed_asbuild_outstanding",
    "cancelled",
    "On_hold",
    "awaiting_health_and_safety",
    "adw_required",
    "special_access_required"
  ])
  .nullable()
  .optional();

export const linkBuildInsertSchema = z.object({
  // Core identifier
  circuit_number: optionalNullableString,
  client_id: z.string().uuid().nullable().optional(),

  // Business/site info
  site_b_name: optionalNullableString,
  county: countyEnum,

  // People
  pm: optionalNullableString,
  client: optionalNullableString,
  client_contact_name: optionalNullableString,

  // ATP (Acceptance Test Procedure) details
  submission_date: optionalNullableString, // Date string
  atp_pack_submitted: optionalNullableString, // Date string
  splice_and_float: optionalNullableString, // String for dropdown selection (legacy)
  service_type: optionalNullableString, // Service type for pricing calculation
  check_date: optionalNullableString,
  atp_pack_loaded: optionalNullableString, // Now a date string
  atp_date: optionalNullableString,

  // Technical details
  technician: optionalNullableString,
  technician_id: z.string().uuid().nullable().optional(),
  no_of_fiber_pairs: z.number().int().nonnegative().nullable().optional(),
  link_distance: z.number().nonnegative().nullable().optional(),
  no_of_splices_after_15km: z.number().int().nonnegative().nullable().optional(),

  // Status
  status: linkBuildStatusEnum,

  // Additional info
  week: optionalNullableString,
  notes: z.any().nullable().optional(), // JSONB field for notes array
  quote_no: optionalNullableString,
});

// Update schema with id in body
export const linkBuildUpdateWithIdSchema = linkBuildInsertSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  });

export const linkBuildUpdateSchema = linkBuildInsertSchema.partial();

export type LinkBuildInsert = z.infer<typeof linkBuildInsertSchema>;
export type LinkBuildUpdate = z.infer<typeof linkBuildUpdateSchema>;
export type LinkBuildUpdateWithId = z.infer<typeof linkBuildUpdateWithIdSchema>;
