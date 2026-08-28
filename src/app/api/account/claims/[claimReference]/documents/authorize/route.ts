import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DocumentServiceError, authorizeDocumentUpload } from "@/lib/documents/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ claimReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to upload a document." }, { status: 401 });
  const { claimReference } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "We couldn't read the upload request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "We couldn't read the upload request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  try {
    const result = await authorizeDocumentUpload(userId, claimReference, { category: String(input.category ?? ""), evidenceRequirementType: typeof input.evidenceRequirementType === "string" ? input.evidenceRequirementType : undefined, filename: String(input.filename ?? ""), mimeType: String(input.mimeType ?? ""), sizeBytes: typeof input.sizeBytes === "number" ? input.sizeBytes : Number.NaN });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof DocumentServiceError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ error: "We couldn't start this upload. Your claim has not been affected." }, { status: 503 });
  }
}
