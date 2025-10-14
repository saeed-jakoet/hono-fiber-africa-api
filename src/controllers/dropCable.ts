import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import { Resend } from "resend";
import { z } from "zod";
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
  listDropCablesByTechnician,
} from "../queries/dropCable";

const resend = new Resend(process.env.RESEND_API_KEY!);

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
    // Normalize notes to array of {text, timestamp}
    const payload: any = { ...parsed.data };
    const nowIso = new Date().toISOString();
    if (payload.notes === undefined) {
      // leave undefined to allow DB default or set to empty array if preferred
    } else if (typeof payload.notes === "string") {
      payload.notes = payload.notes.trim()
        ? [{ text: payload.notes, timestamp: nowIso }]
        : [];
    } else if (Array.isArray(payload.notes)) {
      // assume already normalized by client; ensure structure
      payload.notes = payload.notes.map((n: any) => ({
        text: String(n.text ?? ""),
        timestamp: String(n.timestamp ?? nowIso),
      }));
    }
    const { data, error } = await createDropCable(db, payload);
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
    // If notes is provided as a string, append to existing notes; if array, replace
    let finalPayload: any = { ...payload };
    if (typeof payload.notes === "string") {
      const nowIso = new Date().toISOString();
      // fetch existing to append
      const { data: existing, error: fetchErr } = await getDropCableById(
        db,
        id
      );
      if (fetchErr) return errorResponse(fetchErr.message, 400);
      const existingNotes = Array.isArray(existing?.notes)
        ? existing.notes
        : [];
      const toAppend = payload.notes.trim()
        ? [{ text: payload.notes, timestamp: nowIso }]
        : [];
      finalPayload.notes = [...existingNotes, ...toAppend];
    }
    const { data, error } = await updateDropCable(db, id, finalPayload);
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

export const getDropCablesByTechnician = async (c: any) => {
  try {
    const technicianId = c.req.param("technicianId");
    if (!technicianId) return errorResponse("Missing technicianId", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await listDropCablesByTechnician(db, technicianId);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Drop cables for technician fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const sendDropCableAccessRequest = async (c: any) => {
  // Validate input (now expects html from frontend)
  const body = await c.req.json();
  const schema = z.object({
    to: z.string().email(),
    html: z.string().min(10),
    subject: z.string().default("Drop Cable Access Request"),
  });
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return c.json({ status: "error", message: "Invalid input" }, 400);
  }
  const { to, html, subject } = parse.data;

  try {
    const result = await resend.emails.send({
      from: "admin@ikiesprayworx.co.za",
      to,
      subject,
      html,
    });
    return c.json({ status: "success", message: "Email sent", result });
  } catch (error: any) {
    return c.json({ status: "error", message: error.message }, 500);
  }
};
