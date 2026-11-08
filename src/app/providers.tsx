"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key || pathname === "/delivery-confirmation") return <>{children}</>;
  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}
