import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { communicationPreviewEnabled } from "@/lib/communications/preview";
const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const configuredMiddleware = clerkMiddleware(async (auth, req) => {
  if (isAccountRoute(req) || isAdminRoute(req)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
  }
});
const applicationMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  ? configuredMiddleware
  : () => NextResponse.next();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith("/dev/") && !communicationPreviewEnabled(process.env)) {
    return new NextResponse("Not found", { status: 404 });
  }
  // Fabricated local previews do not need an identity-provider handshake.
  if (request.nextUrl.pathname === "/dev/communications" && communicationPreviewEnabled(process.env)) {
    const headers = new Headers(request.headers);
    headers.set("x-claims-bridge-preview", "1");
    return NextResponse.next({ request: { headers } });
  }
  // Service endpoints have their own dedicated authorization; they never require a Clerk session.
  if (request.nextUrl.pathname === "/api/internal/communications/process" || request.nextUrl.pathname === "/api/webhooks/resend") return NextResponse.next();
  return applicationMiddleware(request, event);
}
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',

    // Always run for API routes
    '/(api|trpc)(.*)',

    // Always run for Clerk frontend API routes
    '/__clerk/(.*)',
  ],
}
