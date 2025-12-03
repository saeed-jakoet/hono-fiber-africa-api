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
  deleteDropCable as deleteDropCableQuery,
} from "../queries/dropCable";
import { getServiceCostByClientAndOrderType } from "../queries/serviceCost";

const resend = new Resend(process.env.RESEND_API_KEY!);

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

export const deleteDropCable = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    // Basic UUID v4 format check; keep lightweight since DB will also enforce
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(id);
    if (!isUuid) return errorResponse("Invalid id format", 400);

    const db = getSupabaseForRequest(c);
    const { data, error } = await deleteDropCableQuery(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return successResponse(null, "No record found or already deleted");
    return successResponse(data, "Drop cable job deleted");
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

    // Canonicalize week to 'YYYY-WW' if provided
    if (Object.prototype.hasOwnProperty.call(payload, "week")) {
      const canon = canonicalizeWeek(payload.week);
      payload.week = canon;
    }
    // Convert all empty strings to null so DB stores NULL rather than ""
    const normalized = normalizeEmptyToNull(payload);
    const { data, error } = await createDropCable(db, normalized);
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

    // Canonicalize week if present in body
    if (Object.prototype.hasOwnProperty.call(body, "week")) {
      finalPayload.week = canonicalizeWeek((finalPayload as any).week);
    }
    // Convert all empty strings to null so DB stores NULL rather than ""
    finalPayload = normalizeEmptyToNull(finalPayload);
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
      from: "admin@fiberafrica.co.za",
      to,
      subject,
      html,
      cc: ["admin@fiberafrica.co.za"],
    });
    return c.json({ status: "success", message: "Email sent", result });
  } catch (error: any) {
    return c.json({ status: "error", message: error.message }, 500);
  }
};

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
    const { client_id, order_type } = parsed.data;
    let { week } = parsed.data as any;

    // Only drop_cable supported
    const orderType = String(order_type).toLowerCase().replace(/-/g, "_");
    if (orderType !== "drop_cable")
      return errorResponse("Unsupported order_type", 400);

    // Canonicalize week to 'YYYY-WW'
    const canonWeek = ((): string => {
      const parsedW = parseWeekYear(week);
      if (!parsedW) return String(week);
      return `${parsedW.year}-${String(parsedW.week).padStart(2, "0")}`;
    })();

    // Fetch orders for week
    const { data: orders, error: ordersErr } = await db
      .from("drop_cable")
      .select(
        "id, circuit_number, site_b_name, county, pm, dpc_distance_meters, survey_planning, callout, installation, spon_budi_opti, splitter_install, mousepad_install, additonal_cost, install_completion_percent, quote_no, survey_planning_multiplier, callout_multiplier"
      )
      .eq("client_id", client_id)
      .eq("week", canonWeek);
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

      // Get multipliers from order (default to 1 if not set)
      const surveyMult = Number(o.survey_planning_multiplier) || 1;
      const calloutMult = Number(o.callout_multiplier) || 1;

      // Installation cost: distance-based base then 15% discount, optional percent reduction (no multiplier)
      let install = 0;
      if (o.installation) {
        const distance = Number(o.dpc_distance_meters || 0);
        const flat = Number(price.installation_cost || 0); // e.g., 1997.5
        const perMeter = Number(price.per_meter_rate || 0);
        const base = distance < 101 ? flat : distance * perMeter;
        const discounted = base * Number(price.discount || 0); // apply 15% discount
        // If percent provided, subtract that percent from discounted base (e.g., 50% => pay 50% less)
        install = hasPct && pct > 0
            ? round2(discounted * (pct / 100))
            : round2(discounted);
      }

      // Apply multipliers to survey and callout costs
      const survey = take(o.survey_planning, price.survey_planning_cost) * surveyMult;
      const callout = take(o.callout, price.callout_cost) * calloutMult;
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
        quote_no: o.quote_no,
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

// Calculate costs for a single drop cable order
export const getOrderCosts = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const orderId = c.req.param("id");
    
    if (!orderId) return errorResponse("Missing order id", 400);

    // Fetch the order
    const { data: order, error: orderErr } = await db
      .from("drop_cable")
      .select(
        "id, client_id, circuit_number, site_b_name, county, pm, dpc_distance_meters, survey_planning, callout, installation, spon_budi_opti, splitter_install, mousepad_install, additonal_cost, additonal_cost_reason, install_completion_percent, quote_no, survey_planning_multiplier, callout_multiplier, week"
      )
      .eq("id", orderId)
      .single();

    if (orderErr) return errorResponse(orderErr.message, 400);
    if (!order) return errorResponse("Order not found", 404);

    // Fetch service costs for this client
    const { data: costs, error: costErr } = await getServiceCostByClientAndOrderType(
      db,
      order.client_id,
      "drop_cable"
    );
    if (costErr) return errorResponse(costErr.message, 400);
    const price = costs || {};

    // Helper to include cost only when flag is true
    const take = (flag: any, val: any) => (flag ? Number(val || 0) : 0);

    const o = order;
    const pct = Number(o.install_completion_percent);
    const hasPct = Number.isFinite(pct) && pct >= 0 && pct <= 100;

    // Get multipliers from order (default to 1 if not set)
    const surveyMult = Number(o.survey_planning_multiplier) || 1;
    const calloutMult = Number(o.callout_multiplier) || 1;

    // Build cost breakdown with rates
    const breakdown: any = {
      services: [],
      installation: null,
      additional: null,
      rates: {
        survey_planning_rate: Number(price.survey_planning_cost || 0),
        callout_rate: Number(price.callout_cost || 0),
        installation_flat_rate: Number(price.installation_cost || 0),
        per_meter_rate: Number(price.per_meter_rate || 0),
        discount_rate: Number(price.discount || 0.85),
        spon_budi_opti_rate: Number(price.spon_budi_opti_cost || 0),
        splitter_install_rate: Number(price.splitter_install_cost || 0),
        mousepad_install_rate: Number(price.mousepad_install_cost || 0),
      }
    };

    let subtotal = 0;

    // Survey Planning
    if (o.survey_planning) {
      const rate = Number(price.survey_planning_cost || 0);
      const cost = rate * surveyMult;
      breakdown.services.push({
        name: "Survey Planning",
        rate,
        multiplier: surveyMult,
        cost: round2(cost),
        active: true,
      });
      subtotal += cost;
    }

    // Callout
    if (o.callout) {
      const rate = Number(price.callout_cost || 0);
      const cost = rate * calloutMult;
      breakdown.services.push({
        name: "Callout",
        rate,
        multiplier: calloutMult,
        cost: round2(cost),
        active: true,
      });
      subtotal += cost;
    }

    // Installation (distance-based)
    if (o.installation) {
      const distance = Number(o.dpc_distance_meters || 0);
      const flat = Number(price.installation_cost || 0);
      const perMeter = Number(price.per_meter_rate || 0);
      const discountRate = Number(price.discount || 0.85);
      
      const base = distance < 101 ? flat : distance * perMeter;
      const discounted = base * discountRate;
      
      let finalCost = discounted;
      let percentApplied = null;
      
      if (hasPct && pct > 0) {
        finalCost = discounted * (pct / 100);
        percentApplied = pct;
      }

      breakdown.installation = {
        distance,
        base_calculation: distance < 101 ? "flat_rate" : "per_meter",
        base_amount: round2(base),
        discount_rate: discountRate,
        after_discount: round2(discounted),
        completion_percent: percentApplied,
        final_cost: round2(finalCost),
        active: true,
      };
      subtotal += finalCost;
    }

    // SPON Budi Opti
    if (o.spon_budi_opti) {
      const cost = Number(price.spon_budi_opti_cost || 0);
      breakdown.services.push({
        name: "SPON Budi Opti",
        rate: cost,
        multiplier: 1,
        cost: round2(cost),
        active: true,
      });
      subtotal += cost;
    }

    // Splitter Install
    if (o.splitter_install) {
      const cost = Number(price.splitter_install_cost || 0);
      breakdown.services.push({
        name: "Splitter Install",
        rate: cost,
        multiplier: 1,
        cost: round2(cost),
        active: true,
      });
      subtotal += cost;
    }

    // Mousepad Install
    if (o.mousepad_install) {
      const cost = Number(price.mousepad_install_cost || 0);
      breakdown.services.push({
        name: "Mousepad Install",
        rate: cost,
        multiplier: 1,
        cost: round2(cost),
        active: true,
      });
      subtotal += cost;
    }

    // Additional costs
    const additionalCost = Number(o.additonal_cost || 0);
    if (additionalCost > 0) {
      breakdown.additional = {
        amount: round2(additionalCost),
        reason: o.additonal_cost_reason || null,
      };
      subtotal += additionalCost;
    }

    const total = round2(subtotal);

    return successResponse({
      order_id: o.id,
      circuit_number: o.circuit_number,
      site_b_name: o.site_b_name,
      week: o.week,
      quote_no: o.quote_no,
      breakdown,
      subtotal: round2(subtotal - additionalCost),
      additional_cost: additionalCost,
      total,
    }, "Order costs calculated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
