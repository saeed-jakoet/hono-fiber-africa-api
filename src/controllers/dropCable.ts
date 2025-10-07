import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  dropCableInsertSchema,
  dropCableUpdateWithIdSchema,
} from "../schemas/dropCableSchemas";
import {
  listDropCables,
  getDropCableById,
  createDropCable,
  updateDropCable,
  listDropCablesByClient,
} from "../queries/dropCable";

export const getDropCables = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listDropCables(db);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Drop cables fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getDropCable = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getDropCableById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Drop cable job not found", 404);
    return successResponse(data, "Drop cable job fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const addDropCable = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = dropCableInsertSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await createDropCable(db, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Drop cable job created");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const editDropCable = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = dropCableUpdateWithIdSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const { id, ...payload } = parsed.data as any;
    const db = getSupabaseForRequest(c);
    const { data, error } = await updateDropCable(db, id, payload);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Drop cable job updated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getDropCablesByClient = async (c: any) => {
  try {
    const clientId = c.req.param("clientId");
    if (!clientId) return errorResponse("Missing clientId", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await listDropCablesByClient(db, clientId);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Drop cables for client fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
