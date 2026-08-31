import { AccountPageHeader } from "@/components/account/account-page-header";
import { GlassSurface } from "@/components/glass/glass-surface";

export function ClaimCapabilityUnavailable({ title, description }: { title: string; description: string }) {
  return (
    <div className="account-page claim-page">
      <AccountPageHeader eyebrow="Claim workspace" title={title} description={description} />
      <GlassSurface className="claim-capability-unavailable" strength="medium">
        <div className="claim-capability-unavailable__content"><span className="eyebrow">Unavailable</span><h2>This claim capability is unavailable.</h2><p>Claims Bridge could not load this information in the current environment. No substitute claim data is shown.</p></div>
      </GlassSurface>
    </div>
  );
}
