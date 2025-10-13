import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  fleetInsertSchema,
  fleetUpdateSchema,
} from "../schemas/fleetSchema";
import {
  listFleet,
  getFleetById,
  createFleet,
  updateFleet,
  deleteFleet,
} from "../queries/fleet";

export const getFleet = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listFleet(db);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Fleet fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getFleetItem = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getFleetById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Fleet item not found", 404);
    return successResponse(data, "Fleet item fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const addFleet = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = fleetInsertSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await createFleet(db, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Fleet item created");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const editFleet = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const body = await c.req.json();
    const parsed = fleetUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await updateFleet(db, id, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Fleet item updated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const removeFleet = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await deleteFleet(db, id);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Fleet item deleted");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
