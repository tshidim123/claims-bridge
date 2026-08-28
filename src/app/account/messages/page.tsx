import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { MessageIndex } from "@/components/messaging/message-index";
import { getMessageIndexForClient } from "@/lib/messaging/repository";

export const metadata = { title: "Messages" };

export default async function AccountMessagesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fmessages");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Messages" description="Your message centre is temporarily unavailable while database configuration is completed." /></div>;
  let conversations;
  try { conversations = await getMessageIndexForClient(userId); } catch { return <div className="account-page"><AccountPageHeader title="Messages" description="Your message centre is temporarily unavailable. Please try again shortly." /></div>; }
  return <div className="account-page"><AccountPageHeader title="Messages" description="Secure claim-specific correspondence in one calm, private workspace." /><MessageIndex conversations={conversations} /></div>;
}
