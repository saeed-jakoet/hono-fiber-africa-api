import { SupabaseClient } from "@supabase/supabase-js";
import { InventoryUsagePayload } from "../schemas/inventoryUsageSchema";

// Map jobType to table name
const jobTableMap: Record<string, string> = {
  drop_cable: "drop_cable",
  link_build: "link_build",
  // future: maintenance: "maintenance", fleet: "fleet_jobs", etc.
};

export const applyInventoryUsage = async (
  db: SupabaseClient,
  payload: InventoryUsagePayload
) => {
  const table = jobTableMap[payload.jobType] || payload.jobType;

  // 1) Fetch current job row
  const jobRes = await db.from(table).select("id, inventory_used").eq("id", payload.jobId).single();
  if (jobRes.error) return { data: null, error: jobRes.error };

  const usedArray: any[] = Array.isArray(jobRes.data?.inventory_used)
    ? jobRes.data.inventory_used
    : [];

  // 2) For each item, decrement inventory.quantity and build used record
  const updatedItems: any[] = [];
  for (const item of payload.items) {
    // Fetch inventory item
    const invRes = await db
      .from("inventory")
      .select("id, item_name, quantity, unit")
      .eq("id", item.inventory_id)
      .single();
    if (invRes.error) return { data: null, error: invRes.error };

    const currentQty = invRes.data.quantity ?? 0;
    const newQty = Math.max(0, currentQty - item.quantity);

    const updRes = await db
      .from("inventory")
      .update({ quantity: newQty })
      .eq("id", item.inventory_id)
      .select("*")
      .single();
    if (updRes.error) return { data: null, error: updRes.error };

    updatedItems.push({
      inventory_id: item.inventory_id,
      item_name: item.item_name || invRes.data.item_name,
      unit: item.unit || invRes.data.unit,
      used_quantity: item.quantity,
      timestamp: new Date().toISOString(),
    });
  }

  // 3) Update job row inventory_used (array of usage entries)
  const newUsedArray = [...usedArray, ...updatedItems];
  const jobUpdate = await db
    .from(table)
    .update({ inventory_used: newUsedArray })
    .eq("id", payload.jobId)
    .select("*")
    .single();

  if (jobUpdate.error) return { data: null, error: jobUpdate.error };

  return { data: { job: jobUpdate.data, items: updatedItems }, error: null };
};
