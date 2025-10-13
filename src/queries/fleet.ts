import { SupabaseClient } from "@supabase/supabase-js";
import { FleetInsert, FleetUpdate } from "../schemas/fleetSchema";

const TABLE = "fleet";

export const listFleet = async (db: SupabaseClient) =>
  db.from(TABLE).select("*");

export const getFleetById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

export const createFleet = async (
  db: SupabaseClient,
  payload: FleetInsert
) => db.from(TABLE).insert(payload).select("*").single();

export const updateFleet = async (
  db: SupabaseClient,
  id: string,
  payload: FleetUpdate
) => db.from(TABLE).update(payload).eq("id", id).select("*").single();

export const deleteFleet = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).delete().eq("id", id).select("*").single();
