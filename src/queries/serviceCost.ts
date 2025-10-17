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
