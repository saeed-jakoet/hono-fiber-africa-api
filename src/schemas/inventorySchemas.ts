import { z } from "zod";

const text = z.string();
const nullableText = z.string().nullable().optional();
const intLike = z
  .union([z.number().int(), z.string()])
  .transform((v) => (typeof v === "number" ? v : parseInt(v, 10)))
  .refine((v) => Number.isInteger(v), { message: "Must be an integer" })
  .optional();
const moneyLike = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : parseFloat(v)))
  .optional();

export const inventoryInsertSchema = z.object({
  item_name: text.min(1),
  item_code: text.optional(),
  description: nullableText,
  quantity: intLike, // defaults to 0 if omitted
  unit: nullableText,
  minimum_quantity: intLike,
  reorder_level: intLike,
  category: nullableText,
  supplier_name: nullableText,
  supplier_contact: nullableText,
  location: nullableText,
  cost_price: moneyLike,
  selling_price: moneyLike,
});

export const inventoryUpdateSchema = z
  .object({
    item_name: text.min(1).optional(),
    item_code: text.optional(),
    description: nullableText,
    quantity: intLike,
    unit: nullableText,
    minimum_quantity: intLike,
    reorder_level: intLike,
    category: nullableText,
    supplier_name: nullableText,
    supplier_contact: nullableText,
    location: nullableText,
    cost_price: moneyLike,
    selling_price: moneyLike,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type InventoryInsert = z.infer<typeof inventoryInsertSchema>;
export type InventoryUpdate = z.infer<typeof inventoryUpdateSchema>;
