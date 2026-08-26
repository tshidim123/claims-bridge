import type { ReactNode } from "react";

import { ClaimNavigation } from "@/components/navigation/claim-navigation";

type ClaimLayoutProps = {
  children: ReactNode;
  params: Promise<{ claimId: string }>;
};

export default async function ClaimLayout({ children, params }: ClaimLayoutProps) {
  const { claimId } = await params;

  return (
    <div className="claim-workspace">
      <ClaimNavigation claimId={claimId} />
      {children}
    </div>
  );
}
