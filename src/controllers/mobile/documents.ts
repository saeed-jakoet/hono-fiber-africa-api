/**
 * Mobile Documents Controller
 * Handles document uploads, templates, and signed URLs
 */

import { successResponse, errorResponse } from "../../utilities/responses";
import { getAdminClient } from "../../utilities/supabase";
import { verifyMobileAuth, buildDocumentPath } from "../../utilities/mobile";
import { uploadDocumentSchema } from "../../schemas/documentsSchemas";
import {
  getTemplateSignedUrl,
  uploadFile,
  insertDocument,
  listDocumentsByJob,
  getDocumentSignedUrl,
} from "../../queries/mobile";

/**
 * Get happy letter template - returns signed URL
 */
export const mobileGetHappyLetterTemplate = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const expiresIn = Number(c.req.query("expires")) || 3600;
    const adminDb = getAdminClient();
    const templatePath = "templates/happy-letter.pdf";

    const { data: signed, error } = await getTemplateSignedUrl(adminDb, templatePath, expiresIn);

    if (error) return errorResponse(error.message, 400);
    if (!signed?.signedUrl) return errorResponse("Failed to create signed URL", 400);

    return successResponse({ url: signed.signedUrl, path: templatePath }, "Happy letter template URL");
  } catch (e: any) {
    console.error("[Mobile Documents] Get template error:", e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

/**
 * Upload document
 */
export const mobileUploadDocument = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const adminDb = getAdminClient();
    const form = await c.req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) return errorResponse("Missing file", 400);

    const fields = {
      clientName: String(form.get("clientName") || ""),
      clientIdentifier: String(form.get("clientIdentifier") || ""),
      jobType: String(form.get("jobType") || ""),
      category: String(form.get("category") || ""),
      dropCableJobId: form.get("dropCableJobId")
        ? String(form.get("dropCableJobId"))
        : undefined,
      jobId: form.get("jobId") ? String(form.get("jobId")) : undefined,
      clientId: String(form.get("clientId") || ""),
      circuitNumber: form.get("circuitNumber")
        ? String(form.get("circuitNumber"))
        : undefined,
    };

    const parsed = uploadDocumentSchema.safeParse(fields);
    if (!parsed.success) return errorResponse("Invalid input", 400);

    const folderPath = buildDocumentPath({
      clientName: parsed.data.clientName,
      circuitNumber: parsed.data.circuitNumber,
      jobType: parsed.data.jobType,
      fileBaseName: parsed.data.category,
      originalFileName: (file as File).name,
    });

    const { error: uploadError } = await uploadFile(adminDb, folderPath, file as File, {
      cacheControl: "3600",
      upsert: true,
      contentType: (file as File).type || "application/octet-stream",
    });

    if (uploadError) return errorResponse(uploadError.message, 400);

    // Use the auth user id from JWT
    const uploadedBy = auth.payload.id;

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
    console.error("[Mobile Documents] Upload error:", e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

/**
 * List documents for a job
 */
export const mobileListDocumentsForJob = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const jobType = c.req.param("jobType");
    const jobId = c.req.param("jobId");
    if (!jobType || !jobId) return errorResponse("Missing job type or id", 400);

    const adminDb = getAdminClient();
    const { data, error } = await listDocumentsByJob(adminDb, jobType, jobId);
    if (error) return errorResponse(error.message, 400);

    return successResponse(data ?? [], "Documents fetched");
  } catch (e: any) {
    console.error("[Mobile Documents] List documents error:", e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

/**
 * Get signed URL for a document
 */
export const mobileGetSignedUrl = async (c: any) => {
  try {
    const auth = await verifyMobileAuth(c);
    if ('error' in auth) {
      return errorResponse(auth.error, 401);
    }

    const filePath = c.req.query("path");
    const expiresIn = Number(c.req.query("expires")) || 3600;

    if (!filePath) return errorResponse("Missing file path", 400);

    const adminDb = getAdminClient();
    const { data: signed, error } = await getDocumentSignedUrl(adminDb, filePath, expiresIn);

    if (error) return errorResponse(error.message, 400);
    if (!signed?.signedUrl) return errorResponse("Failed to create signed URL", 400);

    return successResponse({ url: signed.signedUrl }, "Signed URL created");
  } catch (e: any) {
    console.error("[Mobile Documents] Get signed URL error:", e);
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
