import { getSupabaseForRequest } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import { z } from "zod";
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
import { getServiceCostByClientAndOrderType } from "../queries/serviceCost";

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

export const getLinkBuildWeeklyTotals = async (c: any) => {
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

    // Only link_build supported
    const orderType = String(order_type).toLowerCase().replace(/-/g, "_");
    if (orderType !== "link_build")
      return errorResponse("Unsupported order_type", 400);

    // Canonicalize week to 'YYYY-WW'
    const canonWeek = ((): string => {
      const parsedW = parseWeekYear(week);
      if (!parsedW) return String(week);
      return `${parsedW.year}-${String(parsedW.week).padStart(2, "0")}`;
    })();

    // Fetch orders for week
    const { data: orders, error: ordersErr } = await db
      .from("link_build")
      .select(
        "id, circuit_number, site_b_name, county, client, pm, technician, no_of_fiber_pairs, link_distance, no_of_splices_after_15km, service_type, quote_no"
      )
      .eq("client_id", client_id)
      .eq("week", canonWeek);
    if (ordersErr) return errorResponse(ordersErr.message, 400);

    // Fetch service costs
    const { data: costs, error: costErr } =
      await getServiceCostByClientAndOrderType(db, client_id, orderType);
    if (costErr) return errorResponse(costErr.message, 400);
    const price = costs || {};

    const items = (orders || []).map((o: any) => {
      const fiberPairs = Number(o.no_of_fiber_pairs || 0);
      const linkDistance = Number(o.link_distance || 0);
      const splicesAfter15 = Number(o.no_of_splices_after_15km || 0);
      const serviceType = String(o.service_type || "").toLowerCase();

      let baseCost = 0;

      // Determine base cost based on service_type selection
      if (serviceType === "splice") {
        baseCost = Number(price.full_splice_cost || 0);
      } else if (serviceType === "splice_and_float") {
        baseCost = Number(price.full_splice_float_cost || 0);
      } else if (serviceType === "splice_broadband") {
        baseCost = Number(price.full_splice_broadband_cost || 0);
      } else if (serviceType === "access_float") {
        baseCost = Number(price.access_float_cost || 0);
      } else if (serviceType === "link_build_discount_15") {
        baseCost = Number(price.link_build_discount_15_cost || 0);
      } else if (serviceType === "link_build_broadband_discount_15") {
        baseCost = Number(price.link_build_broadband_discount_15_cost || 0);
      } else if (serviceType === "link_build_float_discount_15") {
        baseCost = Number(price.link_build_float_discount_15_cost || 0);
      }

      // Apply fiber pairs multiplier: if exactly 2, multiply by 2 (capped at 2)
      if (fiberPairs >= 2) {
        baseCost = baseCost * 2;
      }

      // Calculate splices after 15km cost
      const splicePerKm = Number(price.splice_per_km_after_15_cost || 0);
      const splicesCost = splicesAfter15 * splicePerKm;

      const total = round2(baseCost + splicesCost);

      return {
        id: o.id,
        circuit_number: o.circuit_number,
        site_b_name: o.site_b_name,
        county: o.county,
        client: o.client,
        pm: o.pm,
        technician: o.technician,
        fiber_pairs: fiberPairs,
        link_distance: linkDistance,
        splices_after_15km: splicesAfter15,
        service_type: serviceType,
        base_cost: baseCost,
        splices_cost: splicesCost,
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

// Calculate costs for a single link build order
export const getOrderCosts = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const orderId = c.req.param("id");
    
    if (!orderId) return errorResponse("Missing order id", 400);

    // Fetch the order
    const { data: order, error: orderErr } = await db
      .from("link_build")
      .select(
        "id, client_id, circuit_number, site_b_name, county, client, pm, technician, no_of_fiber_pairs, link_distance, no_of_splices_after_15km, service_type, quote_no, week"
      )
      .eq("id", orderId)
      .single();

    if (orderErr) return errorResponse(orderErr.message, 400);
    if (!order) return errorResponse("Order not found", 404);

    // Fetch service costs for this client
    const { data: costs, error: costErr } = await getServiceCostByClientAndOrderType(
      db,
      order.client_id,
      "link_build"
    );
    if (costErr) return errorResponse(costErr.message, 400);
    const price = costs || {};

    const o = order;
    const fiberPairs = Number(o.no_of_fiber_pairs || 0);
    const linkDistance = Number(o.link_distance || 0);
    const splicesAfter15 = Number(o.no_of_splices_after_15km || 0);
    const serviceType = String(o.service_type || "").toLowerCase();

    // Service type mapping for display
    const serviceTypeLabels: Record<string, string> = {
      splice: "Full Splice",
      splice_and_float: "Full Splice + Float",
      splice_broadband: "Full Splice Broadband",
      access_float: "Access Float",
      link_build_discount_15: "Link Build (-15%)",
      link_build_broadband_discount_15: "Link Build Broadband (-15%)",
      link_build_float_discount_15: "Link Build + Float (-15%)",
    };

    // Build cost breakdown
    const breakdown: any = {
      service_type: {
        key: serviceType,
        label: serviceTypeLabels[serviceType] || serviceType || "Not Selected",
        base_rate: 0,
        fiber_pairs: fiberPairs,
        fiber_multiplier: fiberPairs === 2 ? 2 : 1,
        base_cost: 0,
      },
      splices: {
        distance: linkDistance,
        splices_after_15km: splicesAfter15,
        rate_per_splice: Number(price.splice_per_km_after_15_cost || 0),
        cost: 0,
      },
      rates: {
        full_splice_cost: Number(price.full_splice_cost || 0),
        full_splice_float_cost: Number(price.full_splice_float_cost || 0),
        full_splice_broadband_cost: Number(price.full_splice_broadband_cost || 0),
        access_float_cost: Number(price.access_float_cost || 0),
        link_build_discount_15_cost: Number(price.link_build_discount_15_cost || 0),
        link_build_broadband_discount_15_cost: Number(price.link_build_broadband_discount_15_cost || 0),
        link_build_float_discount_15_cost: Number(price.link_build_float_discount_15_cost || 0),
        splice_per_km_after_15_cost: Number(price.splice_per_km_after_15_cost || 0),
      }
    };

    let baseCost = 0;
    let baseRate = 0;

    // Determine base cost based on service_type selection
    if (serviceType === "splice") {
      baseRate = Number(price.full_splice_cost || 0);
    } else if (serviceType === "splice_and_float") {
      baseRate = Number(price.full_splice_float_cost || 0);
    } else if (serviceType === "splice_broadband") {
      baseRate = Number(price.full_splice_broadband_cost || 0);
    } else if (serviceType === "access_float") {
      baseRate = Number(price.access_float_cost || 0);
    } else if (serviceType === "link_build_discount_15") {
      baseRate = Number(price.link_build_discount_15_cost || 0);
    } else if (serviceType === "link_build_broadband_discount_15") {
      baseRate = Number(price.link_build_broadband_discount_15_cost || 0);
    } else if (serviceType === "link_build_float_discount_15") {
      baseRate = Number(price.link_build_float_discount_15_cost || 0);
    }

    baseCost = baseRate;
    breakdown.service_type.base_rate = baseRate;

    // Apply fiber pairs multiplier: if exactly 2, multiply by 2
    if (fiberPairs === 2) {
      baseCost = baseCost * 2;
    }
    breakdown.service_type.base_cost = round2(baseCost);

    // Calculate splices after 15km cost
    const splicePerKm = Number(price.splice_per_km_after_15_cost || 0);
    const splicesCost = splicesAfter15 * splicePerKm;
    breakdown.splices.cost = round2(splicesCost);

    const total = round2(baseCost + splicesCost);

    return successResponse({
      order_id: o.id,
      circuit_number: o.circuit_number,
      site_b_name: o.site_b_name,
      week: o.week,
      quote_no: o.quote_no,
      client: o.client,
      pm: o.pm,
      technician: o.technician,
      breakdown,
      base_cost: round2(baseCost),
      splices_cost: round2(splicesCost),
      total,
    }, "Order costs calculated");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
