import Link from "next/link";
import type { ReactNode } from "react";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { Icon } from "@/components/ui/icon";

type AccountPlaceholderProps = {
  children?: ReactNode;
  description: string;
  title: string;
};

export function AccountPlaceholder({ children, description, title }: AccountPlaceholderProps) {
  return (
    <div className="account-page">
      <AccountPageHeader title={title} description={description} />
      <section className="account-empty glass-surface glass-surface--medium" aria-labelledby="empty-state-title">
        <div className="glass-surface__content account-empty__content">
          <span className="account-empty__symbol" aria-hidden="true"><Icon name="shield" /></span>
          <div>
            <p className="eyebrow">Service unavailable</p>
            <h2 id="empty-state-title">This account area is temporarily unavailable.</h2>
            <p>
              Claims Bridge could not load this account data right now. No client or claim information has been substituted while it is unavailable.
            </p>
          </div>
          <Link className="text-link" href="/support">
            Visit support <Icon name="arrow" />
          </Link>
        </div>
      </section>
      {children}
    </div>
  );
}
