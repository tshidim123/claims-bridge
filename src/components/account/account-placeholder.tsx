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
            <p className="eyebrow">Foundation state</p>
            <h2 id="empty-state-title">No live account data is connected.</h2>
            <p>
              This route is ready for future authentication, case data and workflow services. It intentionally contains no invented client or claim information.
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
