import * as crypto from "node:crypto";

// AES-256-GCM helpers for national_id encryption at rest
// Key is provided via env NATIONAL_ID_SECRET (32 bytes base64 or hex or utf-8 string)

function getKey(): Buffer {
  const raw = process.env.NATIONAL_ID_SECRET || process.env.NEXT_PUBLIC_NATIONAL_ID_SECRET;
  if (!raw) throw new Error("NATIONAL_ID_SECRET is not set");
  // Accept base64 or hex, else treat as utf-8; derive 32 bytes
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0) {
      const buf = Buffer.from(raw, "base64");
      if (buf.length === 32) return buf;
    }
  } catch {}
  try {
    if (/^[0-9a-fA-F]+$/.test(raw)) {
      const buf = Buffer.from(raw, "hex");
      if (buf.length === 32) return buf;
    }
  } catch {}
  // Fallback: hash to 32 bytes
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptNationalId(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64: iv:tag:ciphertext
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptNationalId(blob: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = blob.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function maskNationalId(plain: string): string {
  if (!plain) return "";
  const digits = plain.replace(/\D+/g, "");
  if (digits.length <= 4) return digits.padStart(4, "*");
  const last4 = digits.slice(-4);
  // Group like ****-****-1234 for readability
  return `****-****-${last4}`;
}
