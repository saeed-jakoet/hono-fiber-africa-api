import { SupabaseClient } from "@supabase/supabase-js";

// Pricing table name
const TABLE = "service_cost";

export type ServiceCostRow = {
  id?: string;
  client_id: string;
  order_type: string;
  survey_planning_cost?: number | null;
  callout_cost?: number | null;
  installation_cost?: number | null;
  spon_budi_opti_cost?: number | null;
  splitter_install_cost?: number | null;
  mousepad_install_cost?: number | null;
  // Link build pricing fields
  full_splice_cost?: number | null;
  full_splice_float_cost?: number | null;
  full_splice_broadband_cost?: number | null;
  access_float_cost?: number | null;
  link_build_discount_15_cost?: number | null;
  link_build_broadband_discount_15_cost?: number | null;
  link_build_float_discount_15_cost?: number | null;
  splice_per_km_after_15_cost?: number | null;
  created_at?: string;
  updated_at?: string;
};

export const getServiceCostByClientAndOrderType = async (
  db: SupabaseClient,
  clientId: string,
  orderType: string
) => {
  const normalizedOrderType = String(orderType || "")
    .toLowerCase()
    .replace(/-/g, "_");
  const altOrderType = normalizedOrderType.replace(/_/g, "-");

  return db
    .from(TABLE)
    .select("*")
    .eq("client_id", clientId)
    .in("order_type", [normalizedOrderType, altOrderType])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
};
