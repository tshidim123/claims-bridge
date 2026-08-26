import type { ReactNode } from "react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/navigation/public-header";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <PublicFooter />
    </div>
  );
}
