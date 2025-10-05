import { getSupabaseForRequest } from "../utilities/supabase";
import { errorResponse, successResponse } from "../utilities/responses";
import {
  clientInsertSchema,
  clientUpdateSchema,
} from "../schemas/clientSchema";
import { listClients, getClientById, createClient, updateClient } from "../queries/client";

export const getClients = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listClients(db);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Clients fetches");
  } catch (e: any) {
    console.log(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getClient = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getClientById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Client not found", 404);
    return successResponse(data, "Client fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const addClient = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = clientInsertSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await createClient(db, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Inventory item created");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const editClient = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const body = await c.req.json();
    const parsed = clientUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await updateClient(db, id, parsed.data);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Inventory item updated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
