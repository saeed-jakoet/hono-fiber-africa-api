import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  inventoryInsertSchema,
  inventoryUpdateSchema,
} from "../schemas/inventorySchemas";
import {
  listInventory,
  getInventoryById,
  createInventory,
  updateInventory,
} from "../queries/inventory";
import { applyInventoryUsage } from "../queries/inventoryUsage";
import { inventoryUsageSchema } from "../schemas/inventoryUsageSchema";

export const getInventory = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listInventory(db);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Inventory fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getInventoryItem = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getInventoryById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Inventory item not found", 404);
    return successResponse(data, "Inventory item fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const addInventory = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = inventoryInsertSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await createInventory(db, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Inventory item created");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const editInventory = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const body = await c.req.json();
    const parsed = inventoryUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await updateInventory(db, id, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Inventory item updated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const applyUsage = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = inventoryUsageSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await applyInventoryUsage(db, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Inventory usage applied");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};


