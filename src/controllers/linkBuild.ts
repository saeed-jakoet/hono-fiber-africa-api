import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  linkBuildInsertSchema,
  linkBuildUpdateWithIdSchema,
} from "../schemas/linkBuildSchemas";
import {
  listLinkBuilds,
  getLinkBuildById,
  createLinkBuild,
  updateLinkBuild,
  listLinkBuildsByClient,
  listLinkBuildsByTechnician,
  deleteLinkBuild as deleteLinkBuildQuery,
} from "../queries/linkBuild";

// Normalize top-level fields: convert empty strings to null to allow clearing values
function normalizeEmptyToNull<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === "string" && v.trim() === "") out[k] = null;
    else out[k] = v;
  }
  return out as T;
}

// Parse input week which can be a number-like string or canonical 'YYYY-WW'
function parseWeekYear(val: any): { year: number; week: number } | null {
  if (val === null || typeof val === "undefined" || val === "") return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    if (Number.isFinite(year) && Number.isFinite(week)) return { year, week };
    return null;
  }
  const w = parseInt(s, 10);
  if (Number.isFinite(w)) return { year: new Date().getFullYear(), week: w };
  return null;
}

function canonicalizeWeek(val: any): string | null {
  const parsed = parseWeekYear(val);
  if (!parsed) return null;
  const ww = String(parsed.week).padStart(2, "0");
  return `${parsed.year}-${ww}`;
}

export const getLinkBuilds = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listLinkBuilds(db);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Link builds fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const deleteLinkBuild = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    // Basic UUID v4 format check; keep lightweight since DB will also enforce
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(id);
    if (!isUuid) return errorResponse("Invalid id format", 400);

    const db = getSupabaseForRequest(c);
    const { data, error } = await deleteLinkBuildQuery(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return successResponse(null, "No record found or already deleted");
    return successResponse(data, "Link build job deleted");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getLinkBuild = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getLinkBuildById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Link build job not found", 404);
    return successResponse(data, "Link build job fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const addLinkBuild = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = linkBuildInsertSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const db = getSupabaseForRequest(c);

    const payload: any = { ...parsed.data };

    // Canonicalize week to 'YYYY-WW' if provided
    if (Object.prototype.hasOwnProperty.call(payload, "week")) {
      const canon = canonicalizeWeek(payload.week);
      payload.week = canon;
    }

    // Normalize notes to array of {text, timestamp}
    const nowIso = new Date().toISOString();
    if (payload.notes === undefined) {
      payload.notes = [];
    } else if (typeof payload.notes === "string") {
      payload.notes = payload.notes.trim()
        ? [{ text: payload.notes, timestamp: nowIso }]
        : [];
    } else if (Array.isArray(payload.notes)) {
      // If provided as array, ensure each entry has timestamp
      payload.notes = payload.notes.map((n: any) => ({
        text: n.text || n,
        timestamp: n.timestamp || nowIso,
      }));
    }

    // Convert all empty strings to null so DB stores NULL rather than ""
    const normalized = normalizeEmptyToNull(payload);
    const { data, error } = await createLinkBuild(db, normalized);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Link build job created");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const editLinkBuild = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = linkBuildUpdateWithIdSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const { id, ...payload } = parsed.data as any;
    const db = getSupabaseForRequest(c);

    let finalPayload: any = { ...payload };

    // Canonicalize week if present in body
    if (Object.prototype.hasOwnProperty.call(body, "week")) {
      finalPayload.week = canonicalizeWeek((finalPayload as any).week);
    }

    // If notes is provided as a string, append to existing notes; if array, replace
    const nowIso = new Date().toISOString();
    if (typeof finalPayload.notes === "string") {
      // Fetch existing record to append to notes
      const { data: existing, error: fetchErr } = await getLinkBuildById(db, id);
      if (fetchErr) return errorResponse(fetchErr.message, 400);
      if (!existing) return errorResponse("Link build job not found", 404);

      const existingNotes = Array.isArray(existing?.notes)
        ? existing.notes
        : [];
      const toAppend = finalPayload.notes.trim()
        ? [{ text: finalPayload.notes, timestamp: nowIso }]
        : [];
      finalPayload.notes = [...existingNotes, ...toAppend];
    }

    // Convert all empty strings to null so DB stores NULL rather than ""
    finalPayload = normalizeEmptyToNull(finalPayload);
    const { data, error } = await updateLinkBuild(db, id, finalPayload);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data, "Link build job updated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getLinkBuildsByClient = async (c: any) => {
  try {
    const clientName = c.req.param("clientName");
    if (!clientName) return errorResponse("Missing clientName", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await listLinkBuildsByClient(db, decodeURIComponent(clientName));
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Link builds for client fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getLinkBuildsByTechnician = async (c: any) => {
  try {
    const technicianName = c.req.param("technicianName");
    if (!technicianName) return errorResponse("Missing technicianName", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await listLinkBuildsByTechnician(db, decodeURIComponent(technicianName));
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Link builds for technician fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
