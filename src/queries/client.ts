import { SupabaseClient } from "@supabase/supabase-js";
import { ClientInsert, ClientUpdate } from "../schemas/clientSchema";

const TABLE = "clients";

export const listClients = async (db: SupabaseClient) =>
  db.from(TABLE).select("*");

export const getClientById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

export const createClient = async (db: SupabaseClient, payload: ClientInsert) =>
  db.from(TABLE).insert(payload).select("*").single();

export const updateClient = async (
  db: SupabaseClient,
  id: string,
  payload: ClientUpdate
) => db.from(TABLE).update(payload).eq("id", id).select("*").single();
