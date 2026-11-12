import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { logActivity } from "@/lib/server/audit";
import { getSessionUser } from "@/lib/server/session";

/**
 * Serves uploaded files.
 *  - avatars: public profile photos.
 *  - credential documents: only the psychologist who uploaded them and administrators.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const db = await getDb();
  const [file] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!file) return new NextResponse("Not found", { status: 404 });

  if (file.kind === "credential_document") {
    const user = await getSessionUser();
    if (!user || (user.id !== file.ownerId && user.role !== "admin")) return new NextResponse("Not found", { status: 404 });
    if (user.role === "admin") await logActivity({ actorId: user.id, action: "admin.viewed_document", entityType: "file", entityId: file.id });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": file.kind === "avatar" ? "public, max-age=86400, immutable" : "private, no-store",
      "Content-Disposition": file.kind === "avatar" ? "inline" : `inline; filename="${(file.originalName ?? "document").replace(/"/g, "")}"`,
    },
  });
}
