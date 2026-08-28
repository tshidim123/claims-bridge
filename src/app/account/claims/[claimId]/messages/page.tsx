import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimReference, ClaimStatus } from "@/components/claims/claim-status";
import { MessageCenter } from "@/components/messaging/message-center";
import { getClaimMessagesForClient, markClaimConversationReadForClient, getOrCreateClaimConversationForClient, serializeMessage } from "@/lib/messaging/repository";

export const metadata = { title: "Claim messages" };

export default async function ClaimMessagesPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { userId } = await auth();
  const { claimId } = await params;
  if (!userId || !process.env.DATABASE_URL) notFound();
  let context;
  let result;
  try {
    context = await getOrCreateClaimConversationForClient(userId, claimId);
    await markClaimConversationReadForClient(userId, claimId);
    result = await getClaimMessagesForClient(userId, claimId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Messages unavailable" description="This claim conversation is temporarily unavailable. Please try again shortly." /></div>;
  }
  return (
    <div className="account-page claim-messages-page">
      <AccountPageHeader eyebrow="Your Claims Bridge claim" title="Messages" description="Secure correspondence about this claim, kept separate from the progress timeline. Please avoid sending urgent or time-sensitive legal notices here." />
      <div className="message-page__reference"><ClaimReference reference={context.claim.claimReference} /><ClaimStatus status={context.claim.status} /></div>
      <MessageCenter claimReference={context.claim.claimReference} conversationStatus={result.conversation?.status ?? "OPEN"} initialMessages={result.messages.map(serializeMessage)} initialNextCursor={result.nextCursor} />
    </div>
  );
}
