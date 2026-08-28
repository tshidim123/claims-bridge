import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimReference, ClaimStatus } from "@/components/claims/claim-status";
import { ClaimTimeline } from "@/components/claims/claim-timeline";
import { getClaimForClient, getClaimTimelineEvents } from "@/lib/claims/repository";

export const metadata = { title: "Claim timeline" };

export default async function ClaimTimelinePage({ params }: { params: Promise<{ claimId: string }> }) {
  const { userId } = await auth();
  const { claimId } = await params;
  if (!userId || !process.env.DATABASE_URL) notFound();
  let owned;
  let events;
  try {
    owned = await getClaimForClient(userId, claimId);
    if (!owned) notFound();
    events = await getClaimTimelineEvents(userId, claimId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Timeline unavailable" description="This claim timeline is temporarily unavailable. Please try again shortly." /></div>;
  }

  return (
    <div className="account-page claim-page">
      <AccountPageHeader eyebrow="Claim timeline" title="A clear record of progress" description="Client-visible workflow events will collect here over time. They describe Claims Bridge activity and do not imply a legal outcome." />
      <section className="timeline-panel" aria-labelledby="timeline-title"><div className="timeline-panel__header"><div><ClaimReference reference={owned.claim.claimReference} /><h2 id="timeline-title">Timeline</h2></div><ClaimStatus status={owned.claim.status} /></div>{events.length === 0 ? <p>No client-visible timeline events are available yet.</p> : <ClaimTimeline events={events} />}</section>
    </div>
  );
}
