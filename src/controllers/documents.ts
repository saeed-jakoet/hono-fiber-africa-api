import { getSupabaseForRequest, getAdminClient } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  insertDocument,
  listDocumentsByJob,
  getDocumentById,
  deleteDocumentById,
} from "../queries/documents";
import { uploadDocumentSchema } from "../schemas/documentsSchemas";
import { log } from "node:console";

function sanitizeSegment(s: string) {
  return s
    .replace(/[\\/]+/g, "-") // prevent path traversal
    .replace(/\s+/g, "_") // use underscores for spaces
    .trim();
}

function normalizeForCompare(s: string) {
  return s.toLowerCase().replace(/[\\/\s_-]+/g, "").trim();
}

function buildPath({
  clientName,
  circuitNumber,
  jobType,
  fileBaseName,
  originalFileName,
}: {
  clientName: string;
  circuitNumber?: string;
  jobType: string;
  fileBaseName: string; // e.g., 'planning' | 'as-built' | 'happy_letter'
  originalFileName: string;
}) {
  const cn = sanitizeSegment(clientName);
  const circ = circuitNumber ? sanitizeSegment(circuitNumber) : undefined;
  const jt = sanitizeSegment(jobType);
  // Validate/normalize known job types to prevent arbitrary paths
  const allowedJobTypes = new Set([
    "drop_cable",
    "floating",
    "civils",
    "link_build",
    "access_build",
    "root_build",
    "maintenance",
    "relocations",
  ]);
  const jobTypeSegment = allowedJobTypes.has(jt) ? jt : "unknown";

  // Derive stored filename from category with original extension
  const rawName = originalFileName || "document.pdf";
  const dotIdx = rawName.lastIndexOf(".");
  const ext = dotIdx >= 0 ? rawName.slice(dotIdx) : ""; // includes dot, e.g. '.pdf'
  const base = sanitizeSegment(fileBaseName || "document");
  const safeFileName = `${base}${ext || ".pdf"}`;

  // Structure: company_name/job_type/circuit_number/filename
  const circuitSegment = circ ? `${circ}/` : "";
  const basePath = `${cn}`;
  return `${basePath}/${jobTypeSegment}/${circuitSegment}${safeFileName}`;
}

export const uploadDocument = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const adminDb = getAdminClient();
    const form = await c.req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) return errorResponse("Missing file", 400);

    const fields = {
      clientName: String(form.get("clientName") || ""),
      clientIdentifier: String(form.get("clientIdentifier") || ""),
      jobType: String(form.get("jobType") || ""),
      category: form.get("category") ? String(form.get("category")) : undefined,
      fileName: form.get("fileName") ? String(form.get("fileName")) : undefined,
      // New field preferred
      dropCableJobId: form.get("dropCableJobId")
        ? String(form.get("dropCableJobId"))
        : undefined,
      linkBuildJobId: form.get("linkBuildJobId")
        ? String(form.get("linkBuildJobId"))
        : undefined,
      // Back-compat field
      jobId: form.get("jobId") ? String(form.get("jobId")) : undefined,
      clientId: String(form.get("clientId") || ""),
      circuitNumber: form.get("circuitNumber")
        ? String(form.get("circuitNumber"))
        : undefined,
    };

    const parsed = uploadDocumentSchema.safeParse(fields);
    if (!parsed.success) return errorResponse("Invalid input", 400);

    // Use fileName if provided, otherwise fall back to category
    const fileBaseName = parsed.data.fileName || parsed.data.category || "document";

    const folderPath = buildPath({
      clientName: parsed.data.clientName,
      circuitNumber: parsed.data.circuitNumber,
      jobType: parsed.data.jobType,
      fileBaseName: fileBaseName,
      originalFileName: (file as File).name,
    });

    const { error: uploadError } = await adminDb.storage
      .from("documents")
      .upload(folderPath, file as File, {
        cacheControl: "3600",
        upsert: true,
        contentType: (file as File).type || "application/octet-stream",
      });

    if (uploadError) return errorResponse(uploadError.message, 400);

    // Try to associate the uploader user id
    let uploadedBy: string | undefined = undefined;
    try {
      const { data: authData } = await db.auth.getUser();
      uploadedBy = authData?.user?.id;
    } catch {}

    // Determine job ID field based on job type
    const dropCableJobId = parsed.data.jobType === "drop_cable" 
      ? (parsed.data.dropCableJobId || parsed.data.jobId || null)
      : null;
    const linkBuildJobId = parsed.data.jobType === "link_build"
      ? (parsed.data.linkBuildJobId || parsed.data.jobId || null)
      : null;

    // Insert using service role client (bypass RLS)
    const { data, error } = await insertDocument(adminDb, {
      job_type: parsed.data.jobType,
      drop_cable_job_id: dropCableJobId,
      link_build_job_id: linkBuildJobId,
      client_id: parsed.data.clientId,
      category: parsed.data.category || fileBaseName,
      file_path: folderPath,
      file_name: folderPath.split("/").pop() || "document.pdf",
      circuit_number: parsed.data.circuitNumber ?? null,
      uploaded_by: uploadedBy,
    });
    console.log(error)
    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Document uploaded and linked");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const listDocumentsForJob = async (c: any) => {
  try {
    const jobType = c.req.param("jobType");
    const jobId = c.req.param("jobId");
    if (!jobType || !jobId) return errorResponse("Missing job type or id", 400);
    const adminDb = getAdminClient();
    const { data, error } = await listDocumentsByJob(adminDb, jobType, jobId);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Documents fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Convenience handler for drop_cable documents
export const listDocumentsForDropCable = async (c: any) => {
  try {
    const jobId = c.req.param("jobId");
    if (!jobId) return errorResponse("Missing job id", 400);
    const adminDb = getAdminClient();
    const { data, error } = await listDocumentsByJob(adminDb, "drop_cable", jobId);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Documents fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Convenience handler for link_build documents
export const listDocumentsForLinkBuild = async (c: any) => {
  try {
    const jobId = c.req.param("jobId");
    if (!jobId) return errorResponse("Missing job id", 400);
    const adminDb = getAdminClient();
    const { data, error } = await listDocumentsByJob(adminDb, "link_build", jobId);
    if (error) return errorResponse(error.message, 400);
    return successResponse(data ?? [], "Documents fetched");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getSignedUrl = async (c: any) => {
  try {
    const id = c.req.query("id");
    const expiresIn = Number(c.req.query("expires")) || 3600;
    if (!id) return errorResponse("Missing id", 400);
    const adminDb = getAdminClient();
    const { data: doc, error } = await getDocumentById(adminDb, id);
    if (error) return errorResponse(error.message, 400);
    if (!doc) return errorResponse("Document not found", 404);

    const { data: signed, error: signErr } = await adminDb.storage
      .from("documents")
      .createSignedUrl(doc.file_path, expiresIn);
    if (signErr) return errorResponse(signErr.message, 400);

    return successResponse({ url: signed?.signedUrl }, "Signed URL created");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const deleteDocument = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const adminDb = getAdminClient();
    const { data: doc, error } = await getDocumentById(adminDb, id);
    if (error) return errorResponse(error.message, 400);
    if (!doc) return errorResponse("Document not found", 404);

    const { error: delErr } = await adminDb.storage
      .from("documents")
      .remove([doc.file_path]);
    if (delErr) return errorResponse(delErr.message, 400);

    const { data, error: rowErr } = await deleteDocumentById(adminDb, id);
    if (rowErr) return errorResponse(rowErr.message, 400);

    return successResponse(data, "Document deleted");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Return a signed URL for the happy letter template stored in the 'documents' bucket
// at path 'templates/happy-letter.pdf'. Optional query param: ?expires=3600
export const getHappyLetterTemplate = async (c: any) => {
  try {
    const expiresIn = Number(c.req.query("expires")) || 3600;
    const adminDb = getAdminClient();
    const templatePath = "templates/happy-letter.pdf";

    const { data: signed, error } = await adminDb.storage
      .from("documents")
      .createSignedUrl(templatePath, expiresIn);

    if (error) return errorResponse(error.message, 400);
    if (!signed?.signedUrl) return errorResponse("Failed to create signed URL", 400);

    return successResponse({ url: signed.signedUrl, path: templatePath }, "Happy letter template URL");
  } catch (e: any) {
    console.error(e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
