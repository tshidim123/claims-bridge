import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DocumentServiceError, finalizeDocumentUpload } from "@/lib/documents/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ claimReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Please sign in to complete this upload." }, { status: 401 });
  const { claimReference } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "We couldn't complete this upload." }, { status: 400 }); }
  const uploadId = body && typeof body === "object" && typeof (body as Record<string, unknown>).uploadId === "string" ? (body as Record<string, string>).uploadId : "";
  if (!uploadId) return NextResponse.json({ error: "We couldn't complete this upload." }, { status: 400 });
  try {
    const document = await finalizeDocumentUpload(userId, claimReference, uploadId);
    return NextResponse.json({ document }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof DocumentServiceError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ error: "We couldn't complete this upload. Your claim has not been affected." }, { status: 503 });
  }
}
