/**
 * Mobile Documents Queries
 * Database and storage operations for mobile document management
 */

import { SupabaseClient } from "@supabase/supabase-js";

const DOCUMENTS_TABLE = "documents";
const STORAGE_BUCKET = "documents";

/**
 * Get signed URL for a template file
 */
export const getTemplateSignedUrl = async (
  db: SupabaseClient,
  templatePath: string,
  expiresIn: number = 3600
) => {
  return db.storage.from(STORAGE_BUCKET).createSignedUrl(templatePath, expiresIn);
};

/**
 * Upload a file to storage
 */
export const uploadFile = async (
  db: SupabaseClient,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean; contentType?: string }
) => {
  return db.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: options?.cacheControl || "3600",
    upsert: options?.upsert ?? true,
    contentType: options?.contentType || "application/octet-stream",
  });
};

/**
 * Insert document record into database
 */
export const insertDocument = async (
  db: SupabaseClient,
  payload: {
    job_type: string;
    drop_cable_job_id: string | null;
    client_id: string;
    category: string;
    file_path: string;
    file_name: string;
    circuit_number: string | null;
    uploaded_by: string;
  }
) => {
  return db.from(DOCUMENTS_TABLE).insert(payload).select("*").single();
};

/**
 * List documents by job type and job ID
 */
export const listDocumentsByJob = async (
  db: SupabaseClient,
  jobType: string,
  jobId: string
) => {
  return db
    .from(DOCUMENTS_TABLE)
    .select("*")
    .eq("job_type", jobType)
    .eq("drop_cable_job_id", jobId)
    .order("created_at", { ascending: false });
};

/**
 * Get signed URL for a document
 */
export const getDocumentSignedUrl = async (
  db: SupabaseClient,
  filePath: string,
  expiresIn: number = 3600
) => {
  return db.storage.from(STORAGE_BUCKET).createSignedUrl(filePath, expiresIn);
};
