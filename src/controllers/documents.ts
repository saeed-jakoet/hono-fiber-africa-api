import { getSupabaseForRequest, getAdminClient } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  insertDocument,
  listDocumentsByJob,
  getDocumentById,
  deleteDocumentById,
} from "../queries/documents";
import { uploadDocumentSchema } from "../schemas/documentsSchemas";

function sanitizeSegment(s: string) {
  return s
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompare(s: string) {
  return s.toLowerCase().replace(/[\\/\s_-]+/g, "").trim();
}

function buildPath({
  clientName,
  clientIdentifier,
  circuitNumber,
  jobType,
  category,
}: {
  clientName: string;
  clientIdentifier: string;
  circuitNumber?: string;
  jobType: string;
  category: string;
}) {
  const cn = sanitizeSegment(clientName);
  const ci = sanitizeSegment(clientIdentifier);
  const circ = circuitNumber ? sanitizeSegment(circuitNumber) : undefined;
  const jt = sanitizeSegment(jobType); // remains for future-proofing, though we fix it to drop_cable in path
  // Determine filename purely by category
  const filenameByCategory: Record<string, string> = {
    "as-built": "asbuilt.pdf",
    planning: "planning.pdf",
    happy_letter: "happyletter.pdf",
  };
  const fileName = filenameByCategory[category] || "document.pdf";

  // New required structure:
  // {Client Name}/{Client Identifier}/drop_cable/{circuit_number}/{fileName}
  // If identifier effectively equals the name (e.g., spacing vs underscore), avoid duplication.
  const circuitSegment = circ ? `${circ}/` : "";
  const sameIdentity = !ci || normalizeForCompare(cn) === normalizeForCompare(ci);
  const basePath = sameIdentity ? `${cn}` : `${cn}/${ci}`;
  return `${basePath}/drop_cable/${circuitSegment}${fileName}`;
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
      category: String(form.get("category") || ""),
      // New field preferred
      dropCableJobId: form.get("dropCableJobId")
        ? String(form.get("dropCableJobId"))
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

    const folderPath = buildPath({ ...parsed.data });

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

    // Insert using service role client (bypass RLS)
    const { data, error } = await insertDocument(adminDb, {
      job_type: parsed.data.jobType,
      drop_cable_job_id: parsed.data.dropCableJobId || parsed.data.jobId || null,
      client_id: parsed.data.clientId,
      category: parsed.data.category,
      file_path: folderPath,
      file_name: folderPath.split("/").pop() || "document.pdf",
      circuit_number: parsed.data.circuitNumber ?? null,
      uploaded_by: uploadedBy,
    });
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
