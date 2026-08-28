import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DocumentServiceError, getDocumentDownloadUrlForClient } from "@/lib/documents/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ claimReference: string; documentReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const { claimReference, documentReference } = await params;
  try {
    const url = await getDocumentDownloadUrlForClient(userId, claimReference, documentReference);
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof DocumentServiceError) return new NextResponse(error.message, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return new NextResponse("This document is not available.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
