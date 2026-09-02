import type { ReactNode } from "react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/navigation/public-header";
import { resolvePublicHeaderIdentity } from "@/lib/auth/public-header-identity";

export async function PublicShell({ children }: { children: ReactNode }) {
  const identity = await resolvePublicHeaderIdentity();
  return (
    <div className="public-shell">
      <PublicHeader identity={identity} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <PublicFooter />
    </div>
  );
}
