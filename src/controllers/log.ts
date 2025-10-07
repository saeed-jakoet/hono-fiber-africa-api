import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import { listLogs } from "../queries/log";

export const getLogs = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listLogs(db);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Inventory fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
