import { AccountPageHeader } from "@/components/account/account-page-header";
import { GlassSurface } from "@/components/glass/glass-surface";

export function ClaimCapabilityUnavailable({ title, description }: { title: string; description: string }) {
  return (
    <div className="account-page claim-page">
      <AccountPageHeader eyebrow="Claim workspace" title={title} description={description} />
      <GlassSurface className="claim-capability-unavailable" strength="medium">
        <div className="claim-capability-unavailable__content"><span className="eyebrow">Not activated yet</span><h2>This capability is being prepared.</h2><p>There is no client action or placeholder claim data here. When this workspace is activated, it will show information connected to this claim.</p></div>
      </GlassSurface>
    </div>
  );
}
