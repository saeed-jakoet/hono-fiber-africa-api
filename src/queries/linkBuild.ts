import { SupabaseClient } from "@supabase/supabase-js";
import { LinkBuildInsert, LinkBuildUpdate } from "../schemas/linkBuildSchemas";

const TABLE = "link_build";

export const listLinkBuilds = async (db: SupabaseClient) =>
  db.from(TABLE).select("*").order("created_at", { ascending: false });

export const getLinkBuildById = async (db: SupabaseClient, id: string) =>
  db.from(TABLE).select("*").eq("id", id).single();

export const createLinkBuild = async (
  db: SupabaseClient,
  payload: LinkBuildInsert
) => db.from(TABLE).insert(payload).select("*").single();

export const updateLinkBuild = async (
  db: SupabaseClient,
  id: string,
  payload: LinkBuildUpdate
) => db.from(TABLE).update(payload).eq("id", id).select("*").single();

export const listLinkBuildsByClient = async (
  db: SupabaseClient,
  clientName: string
) =>
  db
    .from(TABLE)
    .select("*")
    .eq("client", clientName)
    .order("created_at", { ascending: false });

export const listLinkBuildsByTechnician = async (
  db: SupabaseClient,
  technicianName: string
) =>
  db
    .from(TABLE)
    .select("*")
    .eq("technician", technicianName)
    .order("created_at", { ascending: false });

export const deleteLinkBuild = async (
  db: SupabaseClient,
  id: string
) => db.from(TABLE).delete().eq("id", id).select("*").maybeSingle();
