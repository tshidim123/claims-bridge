"use client";
import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
export function Providers({ children }: { children: ReactNode }) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return key ? <ClerkProvider publishableKey={key}>{children}</ClerkProvider> : <>{children}</>;
}
