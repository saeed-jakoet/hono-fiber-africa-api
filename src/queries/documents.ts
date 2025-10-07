import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentRow = {
  id: string;
  job_type: string;
  drop_cable_job_id?: string | null;
  client_id: string;
  category: string;
  file_path: string;
  file_name: string;
  circuit_number?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
};

export async function insertDocument(db: SupabaseClient, payload: Omit<DocumentRow, "id" | "created_at">) {
  const { data, error } = await db
    .from("documents")
    .insert(payload)
    .select("*")
    .single();
  return { data, error } as { data: DocumentRow | null; error: any };
}

export async function listDocumentsByJob(db: SupabaseClient, jobType: string, jobId: string) {
  // For drop_cable jobs, filter on drop_cable_job_id
  const query = db.from("documents").select("*").eq("job_type", jobType);
  if (jobType === "drop_cable") {
    query.eq("drop_cable_job_id", jobId);
  } else {
    // Fallback for any future job types (adjust when schema evolves)
    query.eq("drop_cable_job_id", jobId);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  return { data: (data as DocumentRow[]) ?? [], error };
}

export async function getDocumentById(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  return { data: data as DocumentRow | null, error };
}

export async function deleteDocumentById(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("documents")
    .delete()
    .eq("id", id)
    .select("*")
    .single();
  return { data: data as DocumentRow | null, error };
}
