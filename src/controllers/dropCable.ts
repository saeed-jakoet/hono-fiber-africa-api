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
import { getServiceCostByClientAndOrderType } from "../queries/serviceCost";

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
    // Minimal: copy boolean service flags from request body if present
    const serviceKeys = [
      "survey_planning",
      "callout",
      "installation",
      "spon_budi_opti",
      "splitter_install",
      "mousepad_install",
    ];
    for (const k of serviceKeys) if (k in body) payload[k] = !!(body as any)[k];
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
    // Minimal: copy boolean service flags from request body if present
    const serviceKeys = [
      "survey_planning",
      "callout",
      "installation",
      "spon_budi_opti",
      "splitter_install",
      "mousepad_install",
    ];
    for (const k of serviceKeys) if (k in body) (finalPayload as any)[k] = !!(body as any)[k];
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

// Calculate weekly totals for a client's orders of a given type
export const getWeeklyTotals = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const body = await c.req.json();
    const schema = z.object({
      client_id: z.string().uuid(),
      order_type: z.string().min(1), // e.g., "drop_cable"
      week: z.string().min(1),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const { client_id, order_type, week } = parsed.data;
    const normalizedOrderType = String(order_type || "")
      .toLowerCase()
      .replace(/-/g, "_");

    // Fetch all orders for this client/week depending on order_type
    // Currently only supports drop_cable
    if (normalizedOrderType !== "drop_cable") {
      return errorResponse("Unsupported order_type", 400);
    }

    const weekStr = String(week);
    const { data: orders, error: ordersErr } = await db
      .from("drop_cable")
      .select(
        "id, week, circuit_number, site_b_name, county, pm, dpc_distance_meters, survey_planning, callout, installation, spon_budi_opti, splitter_install, mousepad_install, additonal_cost, additonal_cost_reason"
      )
      .eq("client_id", client_id)
      .eq("week", weekStr);
    if (ordersErr) return errorResponse(ordersErr.message, 400);

    // Determine if any service flags are true across fetched orders
    const anyServiceSelected = (orders ?? []).some((o: any) =>
      Boolean(
        o?.survey_planning ||
          o?.callout ||
          o?.installation ||
          o?.spon_budi_opti ||
          o?.splitter_install ||
          o?.mousepad_install
      )
    );

    // Only fetch costs if needed (at least one service is selected)
    let costs: any = null;
    if (anyServiceSelected) {
      const { data: costsRow, error: costErr } = await getServiceCostByClientAndOrderType(
        db,
        client_id,
        normalizedOrderType
      );
      if (costErr) return errorResponse(costErr.message, 400);
      costs = costsRow;
    }

    const items = (orders ?? []).map((o: any) => {
      const perMeterRate = 19.98;
      const discountFactor = 0.85; // 15% discount

      const distance = Number(o.dpc_distance_meters ?? 0);
      const costsSafe = costs || {};

      // Service components
      const compSurvey = o.survey_planning
        ? Number(costsSafe.survey_planning_cost ?? 0)
        : 0;
      const compCallout = o.callout ? Number(costsSafe.callout_cost ?? 0) : 0;
      const compSpon = o.spon_budi_opti
        ? Number(costsSafe.spon_budi_opti_cost ?? 0)
        : 0;
      const compSplitter = o.splitter_install
        ? Number(costsSafe.splitter_install_cost ?? 0)
        : 0;
      const compMouse = o.mousepad_install
        ? Number(costsSafe.mousepad_install_cost ?? 0)
        : 0;

      // Installation total
      let installFinal = 0;
      if (o.installation) {
        const baseUnderOrEqual100 = Number(costsSafe.installation_cost ?? 0);
        const preDiscount =
          distance <= 100 ? baseUnderOrEqual100 : perMeterRate * distance;
        installFinal = round2(preDiscount * discountFactor);
      }

      const additional = Number(o.additonal_cost ?? 0);
      const subtotal =
        compSurvey +
        compCallout +
        compSpon +
        compSplitter +
        compMouse +
        installFinal +
        additional;
      return {
        id: o.id,
        circuit_number: o.circuit_number,
        site_b_name: o.site_b_name,
        county: o.county,
        pm: o.pm,
        distance: distance,
        survey_planning_cost: compSurvey,
        callout_cost: compCallout,
        installation_cost: installFinal,
        spon_budi_opti_cost: compSpon,
        splitter_cost: compSplitter,
        mousepad_cost: compMouse,
        additional_cost: additional,
        total: round2(subtotal),
      };
    });

    const total = round2(
      items.reduce((sum: number, it: any) => sum + it.total, 0)
    );
    return successResponse({ total, items }, "Weekly totals calculated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
