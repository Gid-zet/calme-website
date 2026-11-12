import "server-only";
import { getDb } from "@/db";
import { files } from "@/db/schema";

const RULES = {
  avatar: { maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  credential_document: { maxBytes: 5 * 1024 * 1024, types: ["application/pdf", "image/jpeg", "image/png"] },
} as const;

/** Identify the real type from the file's first bytes; never trust the browser-supplied MIME type or extension. */
function sniff(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export class UploadError extends Error {}

export async function saveUpload(file: File, ownerId: string, kind: keyof typeof RULES) {
  const rule = RULES[kind];
  if (!file || typeof file === "string" || file.size === 0) throw new UploadError("Choose a file to upload.");
  if (file.size > rule.maxBytes) throw new UploadError(`Files must be ${rule.maxBytes / 1024 / 1024} MB or smaller.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !(rule.types as readonly string[]).includes(type)) {
    throw new UploadError(kind === "avatar" ? "Upload a JPG, PNG or WebP image." : "Upload a PDF, JPG or PNG file.");
  }
  const db = await getDb();
  const [row] = await db
    .insert(files)
    .values({ ownerId, kind, mimeType: type, size: buf.length, originalName: file.name.slice(0, 120).replace(/[^\w.\- ]/g, "_"), data: buf })
    .returning({ id: files.id });
  return row.id;
}
