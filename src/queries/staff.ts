import { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "staff";

export const listStaff = async (db: SupabaseClient) => db.from(TABLE).select("*");

export const getStaffById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

export const createStaff = async (
  db: SupabaseClient,
  payload: Partial<Record<string, any>>,
  id?: string
) => db
  .from(TABLE)
  .insert(id ? { id, ...payload } : { ...payload })
  .select("*")
  .single();

export const updateStaff = async (
  db: SupabaseClient,
  id: string,
  payload: Partial<Record<string, any>>
) => db.from(TABLE).update(payload).eq("id", id).select("*").single();
