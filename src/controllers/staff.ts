import { getSupabaseForRequest, getAdminClient } from "../utilities/supabase";
import { successResponse, errorResponse } from "../utilities/responses";
import {
  listStaff,
  getStaffById,
  getStaffByAuthUserId,
  updateStaff,
  createStaff,
} from "../queries/staff";
import {
  createStaffWithAuthSchema,
  updateStaffSchema,
  createStaffSchema,
  grantAccessSchema,
} from "../schemas/staffSchemas";
import { z } from "zod";
import { encryptNationalId, decryptNationalId, maskNationalId } from "../utilities/nationalIdCrypto";

// Allowed document types and helpers for upload
const documentTypeEnum = z.enum(["id", "medical", "employment_contract"]);

function getFileExtension(name?: string | null) {
  if (!name) return "";
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : "";
}

async function maybeUploadStaffDocument(opts: {
  admin: ReturnType<typeof getAdminClient>;
  bucket: string;
  staffId: string;
  file: File | null | undefined;
  documentType: string | null | undefined;
}) {
  const { admin, bucket, staffId, file, documentType } = opts;
  if (!file || !documentType) return { uploaded: false } as const;

  const parsed = documentTypeEnum.safeParse(documentType);
  if (!parsed.success)
    return { uploaded: false, error: "Invalid document_type" } as const;

  const ext = getFileExtension((file as any)?.name || undefined);
  const objectPath = `${staffId}/${parsed.data}${ext}`;
  const contentType = (file as any)?.type || undefined;
  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await admin.storage
    .from(bucket)
    .upload(objectPath, arrayBuffer, {
      contentType,
      upsert: true,
    });
  if (error) return { uploaded: false, error: error.message } as const;
  return { uploaded: true, path: objectPath, key: data?.path } as const;
}

export const getStaffList = async (c: any) => {
  try {
    const db = getSupabaseForRequest(c);
    const { data, error } = await listStaff(db);
    if (error) return errorResponse(error.message, 400);
    // Ensure we never leak plaintext national_id; only masked is returned
    const safe = (data || []).map((row: any) => {
      const { national_id, encrypted_national_id, ...rest } = row || {};
      return rest;
    });
    return successResponse(safe, "Staff fetched");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const getStaffMember = async (c: any) => {
  try {
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getStaffById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Staff member not found", 404);
    const { national_id, encrypted_national_id, ...rest } = data as any;
    return successResponse(rest, "Staff member fetched");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Return the staff profile for the currently authenticated user
export const getMyStaffProfile = async (c: any) => {
  try {
    const user = c.get ? c.get("user") : undefined;
    if (!user?.id) return errorResponse("Not authenticated", 401);
    const db = getSupabaseForRequest(c);
    const { data, error } = await getStaffByAuthUserId(db, user.id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Staff profile not found", 404);
    const { national_id, encrypted_national_id, ...rest } = data as any;
    return successResponse(rest, "My staff profile fetched");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const updateStaffController = async (c: any) => {
  try {
    const callerRole = c.get ? c.get("role") : undefined;
    if (callerRole !== "super_admin") return errorResponse("Forbidden", 403);
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const body = await c.req.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid staff payload", 400);
    const db = getSupabaseForRequest(c);
    const payload: any = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(parsed.data, "national_id")) {
      const raw = parsed.data.national_id || "";
      if (raw && raw.trim() !== "") {
        payload.encrypted_national_id = encryptNationalId(raw.trim());
        payload.masked_national_id = maskNationalId(raw.trim());
      } else {
        payload.encrypted_national_id = null;
        payload.masked_national_id = null;
      }
      delete payload.national_id;
    }
    const { data, error } = await updateStaff(db, id, payload);
    if (error) return errorResponse(error.message, 400);
    const { national_id, encrypted_national_id, ...rest } = (data as any) || {};
    return successResponse(rest, "Staff updated");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

export const createStaffWithAuthController = async (c: any) => {
  try {
    const callerRole = c.get ? c.get("role") : undefined;
    if (callerRole !== "super_admin") return errorResponse("Forbidden", 403);
    const contentType = c.req.header("content-type") || "";

    // Accept both JSON and multipart/form-data
    let body: any;
    let documentFile: File | null = null;
    let documentType: string | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.parseBody();
      body = {
        email: form["email"],
        password: form["password"],
        role: form["role"],
        first_name: form["first_name"],
        surname: form["surname"],
        phone_number: form["phone_number"],
        date_of_birth: form["date_of_birth"],
        address: form["address"],
        position: form["position"],
        department: form["department"],
        hire_date: form["hire_date"],
        salary: form["salary"],
        employment_type: form["employment_type"],
        emergency_contact_name: form["emergency_contact_name"],
        emergency_contact_phone: form["emergency_contact_phone"],
        national_id: form["national_id"],
        notes: form["notes"],
      };
      documentType = (form["document_type"] as string) || null;
      documentFile =
        (form["document"] as File) || (form["file"] as File) || null;
    } else {
      body = await c.req.json();
    }
    const parsed = createStaffWithAuthSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid staff payload", 400);
    const {
      email,
      role = "field_worker",
      first_name,
      surname,
      phone_number,
      date_of_birth,
      address,
      position,
      department,
      hire_date,
      salary,
      employment_type,
      emergency_contact_name,
      emergency_contact_phone,
      national_id,
      notes,
    } = parsed.data;
    const password: string | undefined = (body as any)?.password;

    const admin = getAdminClient();

    // 1) Create auth user (service role) and set metadata
    const { data: authRes, error: authErr } = await admin.auth.admin.createUser(
      {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          firstName: first_name,
          surname,
          phone: phone_number,
        },
      }
    );
    if (authErr || !authRes?.user?.id)
      return errorResponse(
        authErr?.message || "Failed to create auth user",
        400
      );

    const id = authRes.user.id;

    // 2) Insert into staff table
    const db = getSupabaseForRequest(c);
    const staffPayload: any = {
      first_name,
      surname,
      email,
      phone_number,
      date_of_birth,
      address,
      position,
      department,
      hire_date,
      salary,
      employment_type,
      emergency_contact_name,
      emergency_contact_phone,
      notes,
    };
    if (national_id && national_id.trim() !== "") {
      staffPayload.encrypted_national_id = encryptNationalId(national_id.trim());
      staffPayload.masked_national_id = maskNationalId(national_id.trim());
    }
    const { data: staffRow, error: staffErr } = await createStaff(
      db,
      staffPayload,
      id
    );
    if (staffErr) {
      // rollback auth best-effort
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {}
      return errorResponse(staffErr.message, 400);
    }

    // Optional document upload into 'staff-documents' bucket
    let upload: any = undefined;
    if (contentType.includes("multipart/form-data")) {
      const up = await maybeUploadStaffDocument({
        admin,
        bucket: "staff-documents",
        staffId: id,
        file: documentFile!,
        documentType: documentType!,
      });
      upload = up;
    }

    const { national_id: ni, encrypted_national_id: eni, ...restStaff } = (staffRow as any) || {};
    return successResponse(
      { id, auth: { id, email, role }, staff: restStaff, upload },
      "Staff created"
    );
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Create staff record only (no auth user)
export const createStaffController = async (c: any) => {
  try {
    const callerRole = c.get ? c.get("role") : undefined;
    if (callerRole !== "super_admin") return errorResponse("Forbidden", 403);
    const contentType = c.req.header("content-type") || "";
    let body: any;
    let documentFile: File | null = null;
    let documentType: string | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.parseBody();
      body = {
        first_name: form["first_name"],
        surname: form["surname"],
        email: form["email"],
        phone_number: form["phone_number"],
        role: form["role"],
        date_of_birth: form["date_of_birth"],
        address: form["address"],
        position: form["position"],
        department: form["department"],
        hire_date: form["hire_date"],
        salary: form["salary"],
        employment_type: form["employment_type"],
        emergency_contact_name: form["emergency_contact_name"],
        emergency_contact_phone: form["emergency_contact_phone"],
        national_id: form["national_id"],
        notes: form["notes"],
      };
      documentType = (form["document_type"] as string) || null;
      documentFile =
        (form["document"] as File) || (form["file"] as File) || null;
    } else {
      body = await c.req.json();
    }
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid staff payload", 400);

    const db = getSupabaseForRequest(c);
    const id =
      (globalThis as any).crypto?.randomUUID?.() ||
      (await import("node:crypto")).randomUUID();
    const payload: any = { ...parsed.data };
    if (payload.national_id && payload.national_id.trim() !== "") {
      payload.encrypted_national_id = encryptNationalId(payload.national_id.trim());
      payload.masked_national_id = maskNationalId(payload.national_id.trim());
    }
    delete payload.national_id;
    const { data, error } = await createStaff(db, payload, id);
    if (error) return errorResponse(error.message, 400);
    // Optional document upload
    let upload: any = undefined;
    if (contentType.includes("multipart/form-data")) {
      const admin = getAdminClient();
      const up = await maybeUploadStaffDocument({
        admin,
        bucket: "staff-documents",
        staffId: id,
        file: documentFile!,
        documentType: documentType!,
      });
      upload = up;
    }
    const { national_id, encrypted_national_id, ...rest } = (data as any) || {};
    return successResponse({ ...rest, upload }, "Staff created");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// List staff documents from Supabase Storage (staff-documents bucket)
export const listStaffDocumentsController = async (c: any) => {
  try {
    const staffId = c.req.param("id");
    if (!staffId) return errorResponse("Missing id", 400);

    // Ensure staff exists (optional but safer)
    const db = getSupabaseForRequest(c);
    const { data: staffRow, error: staffErr } = await getStaffById(db, staffId);
    if (staffErr) return errorResponse(staffErr.message, 400);
    if (!staffRow) return errorResponse("Staff not found", 404);

    const admin = getAdminClient();

    // List files under the folder `${staffId}/`
    const { data: files, error: listErr } = await admin.storage
      .from("staff-documents")
      .list(staffId, {
        limit: 100,
        sortBy: { column: "updated_at", order: "desc" },
      } as any);

    if (listErr) return errorResponse(listErr.message, 400);

    if (!files || files.length === 0) {
      return successResponse([], "No documents found");
    }

    // Build signed URLs for each file so the frontend can display/download
    const items: Array<{
      name: string;
      path: string;
      type?: string;
      size?: number | null;
      last_modified?: string | null;
      url?: string;
    }> = [];

    for (const f of files) {
      if ((f as any).id || (f as any).name) {
        const name = (f as any).name as string;
        const path = `${staffId}/${name}`;
        const dot = name.lastIndexOf(".");
        const type = dot > 0 ? name.slice(0, dot) : name; // e.g. id, medical, employment_contract

        let url: string | undefined = undefined;
        try {
          const { data: signed, error: signErr } = await admin.storage
            .from("staff-documents")
            .createSignedUrl(path, 3600);
          if (!signErr) url = signed?.signedUrl;
        } catch {}

        items.push({
          name,
          path,
          type,
          size: (f as any).metadata?.size ?? null,
          last_modified: (f as any).updated_at ?? null,
          url,
        });
      }
    }

    return successResponse(items, "Staff documents fetched");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Grant system access: create Supabase Auth user from staff row and link
export const grantAccessController = async (c: any) => {
  try {
    const callerRole = c.get ? c.get("role") : undefined;
    if (callerRole !== "super_admin") return errorResponse("Forbidden", 403);
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const body = await c.req.json();
    const parsed = grantAccessSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid payload", 400);

    const db = getSupabaseForRequest(c);
    const { data: staffRow, error: staffErr } = await getStaffById(db, id);
    if (staffErr) return errorResponse(staffErr.message, 400);
    if (!staffRow) return errorResponse("Staff not found", 404);
    if (staffRow.auth_user_id)
      return errorResponse("Access already granted", 400);

    const email = parsed.data.email || staffRow.email;
    if (!email)
      return errorResponse(
        "Email is required (set on staff or provide now)",
        400
      );
    const password = parsed.data.password;
    const role = parsed.data.role || staffRow.role || "field_worker";

    const admin = getAdminClient();
    let authUserId: string | null = null;
    const cryptoMod = await import("node:crypto");
    const tempPassword =
      password && password.length >= 8
        ? password
        : cryptoMod.randomBytes(16).toString("hex");
    const { data: authRes, error: authErr } = await admin.auth.admin.createUser(
      {
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role,
          firstName: staffRow.first_name || null,
          surname: staffRow.surname || null,
          phone: staffRow.phone_number || null,
        },
      }
    );
    if (authErr || !authRes?.user?.id)
      return errorResponse(
        authErr?.message || "Failed to create auth user",
        400
      );
    authUserId = authRes.user.id;
    const { data: updated, error: updErr } = await updateStaff(db, id, {
      auth_user_id: authUserId,
      role,
    });
    if (updErr) {
      try {
        await admin.auth.admin.deleteUser(authUserId);
      } catch {}
      return errorResponse(updErr.message, 400);
    }
    const autoGenerated = !(password && password.length >= 8);
    return successResponse(
      {
        staff: updated,
        auth: {
          id: authUserId,
          email,
          role,
          tempPassword: autoGenerated ? tempPassword : undefined,
        },
      },
      "Access granted"
    );
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Revoke system access: delete auth user and unlink
export const revokeAccessController = async (c: any) => {
  try {
    const callerRole = c.get ? c.get("role") : undefined;
    if (callerRole !== "super_admin") return errorResponse("Forbidden", 403);
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);
    const db = getSupabaseForRequest(c);
    const { data: staffRow, error } = await getStaffById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!staffRow) return errorResponse("Staff not found", 404);
    if (!staffRow.auth_user_id)
      return errorResponse("No access to revoke", 400);

    const authId = staffRow.auth_user_id as string;
    const admin = getAdminClient();
    const { error: delErr } = await admin.auth.admin.deleteUser(authId);
    if (delErr) return errorResponse(delErr.message, 400);

    const { data: updated, error: updErr } = await updateStaff(db, id, {
      auth_user_id: null,
    });
    if (updErr) return errorResponse(updErr.message, 400);
    return successResponse({ staff: updated }, "Access revoked");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};

// Reveal national id for a staff member (admin/super_admin only) and audit the access
export const revealNationalIdController = async (c: any) => {
  try {
    const role = c.get ? c.get("role") : undefined;
    if (role !== "super_admin" && role !== "admin") return errorResponse("Forbidden", 403);
    const id = c.req.param("id");
    if (!id) return errorResponse("Missing id", 400);

    const db = getSupabaseForRequest(c);
    const { data, error } = await getStaffById(db, id);
    if (error) return errorResponse(error.message, 400);
    if (!data) return errorResponse("Staff not found", 404);
    const enc = (data as any).encrypted_national_id as string | null;
    if (!enc) return errorResponse("No national id stored", 404);

    // decrypt
    let value: string;
    try {
      value = decryptNationalId(enc);
    } catch (e: any) {
      return errorResponse("Failed to decrypt national id", 500);
    }

    return successResponse({ national_id: value }, "National ID revealed");
  } catch (e: any) {
    return errorResponse(e.message || "Unexpected error", 500);
  }
};
