import { AccountPageHeader } from "@/components/account/account-page-header";
import { GlassSurface } from "@/components/glass/glass-surface";

export const metadata = { title: "Security" };

export default function AccountSecurityPage() {
  return <div className="account-page"><AccountPageHeader title="Account security" description="Claims Bridge uses Clerk for sign-in and account security. Use the account menu in the workspace header to manage the authentication options available to your account." /><GlassSurface strength="medium"><div className="account-profile-panel"><p className="eyebrow">Authentication</p><h2>Your Claims Bridge records remain separate from your sign-in identity.</h2><p>Claims Bridge does not store passwords or authentication tokens in your client profile. Keep your Clerk account secure and sign out when using a shared device.</p></div></GlassSurface></div>;
}
