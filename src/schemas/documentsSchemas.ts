import { z } from "zod";

export const documentCategoryEnum = z.enum(["as-built", "planning", "happy_letter"]);

export const jobTypeEnum = z.enum([
  "drop_cable",
  "floating",
  "civils",
  "link_build",
  "access_build",
  "root_build",
  "maintenance",
  "relocations",
]);

export const uploadDocumentSchema = z.object({
  clientName: z.string().min(1),
  clientIdentifier: z.string().min(1),
  jobType: jobTypeEnum, // e.g., 'drop_cable'
  // category is now optional - use fileName instead for custom names
  category: documentCategoryEnum.optional(),
  // fileName for custom document names (replaces category for storage)
  fileName: z.string().optional(),
  // Prefer new field; keep old jobId for backward compatibility
  dropCableJobId: z.string().uuid().optional(),
  linkBuildJobId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  circuitNumber: z.string().optional(),
}).superRefine((val, ctx) => {
  // Require one of the job id fields
  if (!val.dropCableJobId && !val.linkBuildJobId && !val.jobId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dropCableJobId"],
      message: "dropCableJobId, linkBuildJobId, or jobId is required",
    });
  }
  // Require either category or fileName
  if (!val.category && !val.fileName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fileName"],
      message: "Either category or fileName is required",
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
