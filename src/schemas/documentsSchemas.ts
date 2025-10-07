import { z } from "zod";

export const documentCategoryEnum = z.enum(["as-built", "planning", "happy_letter"]);

export const uploadDocumentSchema = z.object({
  clientName: z.string().min(1),
  clientIdentifier: z.string().min(1),
  jobType: z.string().min(1), // e.g., 'drop_cable'
  category: documentCategoryEnum,
  // Prefer new field; keep old jobId for backward compatibility
  dropCableJobId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  circuitNumber: z.string().optional(),
}).superRefine((val, ctx) => {
  // Require one of the job id fields
  if (!val.dropCableJobId && !val.jobId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dropCableJobId"],
      message: "dropCableJobId (or jobId) is required",
    });
  }
  if (val.jobType === "drop_cable" && (!val.circuitNumber || val.circuitNumber.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["circuitNumber"],
      message: "circuitNumber is required for drop_cable jobs",
    });
  }
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
