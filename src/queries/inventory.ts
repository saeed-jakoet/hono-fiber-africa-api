import { SupabaseClient } from "@supabase/supabase-js";
import { InventoryInsert, InventoryUpdate } from "../schemas/inventorySchemas";

const TABLE = "inventory";

export const listInventory = async (db: SupabaseClient) =>
  db.from(TABLE).select("*");

export const getInventoryById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

export const createInventory = async (
  db: SupabaseClient,
  payload: InventoryInsert
) => db.from(TABLE).insert(payload).select("*").single();

export const updateInventory = async (
  db: SupabaseClient,
  id: string,
  payload: InventoryUpdate
) => db.from(TABLE).update(payload).eq("id", id).select("*").single();

export const deleteInventory = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).delete().eq("id", id).select("*").single();
