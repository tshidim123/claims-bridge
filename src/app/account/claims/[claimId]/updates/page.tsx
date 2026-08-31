import { redirect } from "next/navigation";

export const metadata = { title: "Claim updates" };

export default async function ClaimUpdatesPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  redirect(`/account/claims/${encodeURIComponent(claimId)}/timeline`);
}
