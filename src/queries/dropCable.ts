import { SupabaseClient } from "@supabase/supabase-js";
import { DropCableInsert, DropCableUpdate } from "../schemas/dropCableSchemas";

const TABLE = "drop_cable";

export const listDropCables = async (db: SupabaseClient) =>
  db.from(TABLE).select("*").order("created_at", { ascending: false });

export const getDropCableById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

export const createDropCable = async (
  db: SupabaseClient,
  payload: DropCableInsert
) => db.from(TABLE).insert(payload).select("*").single();

export const updateDropCable = async (
  db: SupabaseClient,
  id: string,
  payload: DropCableUpdate
) => db.from(TABLE).update(payload).eq("id", id).select("*").single();

export const listDropCablesByClient = async (
  db: SupabaseClient,
  clientId: string
) =>
  db
    .from(TABLE)
    .select("*, clients(company_name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
