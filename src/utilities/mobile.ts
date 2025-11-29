/**
 * Mobile API Utilities
 * Shared helper functions for mobile endpoints
 */

import { sign, verify } from "hono/jwt";
import { errorResponse } from "./responses";

// JWT Configuration - use SUPABASE_JWT_SECRET for consistency
export const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "your-secret-key-change-in-production";
export const TOKEN_EXPIRY = 60 * 24 * 60 * 60; // 60 days in seconds

/**
 * Verify JWT token from Authorization header
 * Returns the decoded payload or an error object
 */
export async function verifyMobileAuth(c: any): Promise<{ payload: any } | { error: string }> {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Not authenticated" };
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, JWT_SECRET);
    return { payload };
  } catch (err) {
    return { error: "Invalid or expired token" };
  }
}

/**
 * Middleware helper to require authentication
 * Returns the payload or sends an error response
 */
export async function requireMobileAuth(c: any): Promise<any | null> {
  const auth = await verifyMobileAuth(c);
  if ('error' in auth) {
    return null;
  }
  return auth.payload;
}

/**
 * Generate a JWT token for mobile authentication
 */
export async function generateMobileToken(payload: {
  id: string;
  staffId?: string | null;
  email: string;
  role?: string;
}): Promise<string> {
  const tokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY,
  };
  return sign(tokenPayload, JWT_SECRET);
}

/**
 * Sanitize a path segment for storage paths
 */
export function sanitizeSegment(s: string): string {
  return s
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "_")
    .trim();
}

/**
 * Build a storage path for documents
 */
export function buildDocumentPath({
  clientName,
  circuitNumber,
  jobType,
  fileBaseName,
  originalFileName,
}: {
  clientName: string;
  circuitNumber?: string;
  jobType: string;
  fileBaseName: string;
  originalFileName: string;
}): string {
  const cn = sanitizeSegment(clientName);
  const circ = circuitNumber ? sanitizeSegment(circuitNumber) : undefined;
  const jt = sanitizeSegment(jobType);
  
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

  const rawName = originalFileName || "document.pdf";
  const dotIdx = rawName.lastIndexOf(".");
  const ext = dotIdx >= 0 ? rawName.slice(dotIdx) : "";
  const base = sanitizeSegment(fileBaseName || "document");
  const safeFileName = `${base}${ext || ".pdf"}`;

  const circuitSegment = circ ? `${circ}/` : "";
  const basePath = `${cn}`;
  return `${basePath}/${jobTypeSegment}/${circuitSegment}${safeFileName}`;
}
