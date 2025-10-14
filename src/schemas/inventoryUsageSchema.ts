import { z } from "zod";

export const inventoryUsageItemSchema = z.object({
  inventory_id: z.string().min(1),
  quantity: z
    .union([z.number().int().nonnegative(), z.string()])
    .transform((v) => (typeof v === "number" ? v : parseInt(v, 10)))
    .refine((v) => Number.isFinite(v) && v >= 0, {
      message: "quantity must be a non-negative integer",
    }),
  item_name: z.string().optional(),
  unit: z.string().optional(),
});

export const inventoryUsageSchema = z.object({
  jobType: z
    .string()
    .min(1)
    .transform((s) => s.replace(/-/g, "_")),
  jobId: z.string().min(1),
  items: z.array(inventoryUsageItemSchema).min(1),
  note: z.string().optional(),
});

export type InventoryUsageItem = z.infer<typeof inventoryUsageItemSchema>;
export type InventoryUsagePayload = z.infer<typeof inventoryUsageSchema>;
