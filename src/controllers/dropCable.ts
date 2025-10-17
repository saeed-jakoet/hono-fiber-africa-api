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
    for (const k of serviceKeys)
      if (k in body) (finalPayload as any)[k] = !!(body as any)[k];
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

    // Input validation
    const parsed = z
      .object({
        client_id: z.string().uuid(),
        order_type: z.string(),
        week: z.string(),
      })
      .safeParse(body);
    if (!parsed.success) return errorResponse("Invalid input", 400);
    const { client_id, order_type, week } = parsed.data;

    // Only drop_cable supported
    const orderType = String(order_type).toLowerCase().replace(/-/g, "_");
    if (orderType !== "drop_cable")
      return errorResponse("Unsupported order_type", 400);

    // Fetch orders for week
    const { data: orders, error: ordersErr } = await db
      .from("drop_cable")
      .select(
        "id, circuit_number, site_b_name, county, pm, dpc_distance_meters, survey_planning, callout, installation, spon_budi_opti, splitter_install, mousepad_install, additonal_cost, install_completion_percent"
      )
      .eq("client_id", client_id)
      .eq("week", String(week));
    if (ordersErr) return errorResponse(ordersErr.message, 400);

    // Fetch service costs
    const { data: costs, error: costErr } =
      await getServiceCostByClientAndOrderType(db, client_id, orderType);
    if (costErr) return errorResponse(costErr.message, 400);
    const price = costs || {};

    // Helper to include cost only when flag is true
    const take = (flag: any, val: any) => (flag ? Number(val || 0) : 0);

    const items = (orders || []).map((o: any) => {
      const pct = Number(o.install_completion_percent);
      const hasPct = Number.isFinite(pct) && pct >= 0 && pct <= 100;

      // Installation cost: distance-based base then 15% discount, optional percent reduction
      let install = 0;
      if (o.installation) {
        const distance = Number(o.dpc_distance_meters || 0);
        const flat = Number(price.installation_cost || 0); // e.g., 1997.5
        const perMeter = 19.98;
        const base = distance < 101 ? flat : distance * perMeter;
        const discounted = base * 0.85; // apply 15% discount
        // If percent provided, subtract that percent from discounted base (e.g., 50% => pay 50% less)
        install =
          hasPct && pct > 0
            ? round2(discounted * (pct / 100))
            : round2(discounted);
      }

      const survey = take(o.survey_planning, price.survey_planning_cost);
      const callout = take(o.callout, price.callout_cost);
      const spon = take(o.spon_budi_opti, price.spon_budi_opti_cost);
      const splitter = take(o.splitter_install, price.splitter_install_cost);
      const mousepad = take(o.mousepad_install, price.mousepad_install_cost);
      const additional = Number(o.additonal_cost || 0);

      const total = round2(
        survey + callout + spon + splitter + mousepad + install + additional
      );

      return {
        id: o.id,
        circuit_number: o.circuit_number,
        site_b_name: o.site_b_name,
        county: o.county,
        pm: o.pm,
        distance: Number(o.dpc_distance_meters || 0),
        survey_planning_cost: survey,
        callout_cost: callout,
        installation_cost: install,
        spon_budi_opti_cost: spon,
        splitter_cost: splitter,
        mousepad_cost: mousepad,
        additional_cost: additional,
        total,
      };
    });

    const total = round2(
      (items || []).reduce((sum: number, it: any) => sum + it.total, 0)
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
