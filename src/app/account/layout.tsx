import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccountShell } from "@/components/layout/account-shell";

export const metadata: Metadata = {
  title: {
    default: "Client workspace",
    template: "%s — Claims Bridge account",
  },
  description: "Claims Bridge client portal.",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
