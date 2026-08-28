import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { AccountNavigation } from "@/components/navigation/account-navigation";
import { Icon } from "@/components/ui/icon";
import { AccountIdentity } from "@/components/auth/account-identity";
import { auth } from "@clerk/nextjs/server";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";

export async function AccountShell({ children }: { children: ReactNode }) {
  let notificationUnreadCount = 0;
  if (process.env.DATABASE_URL) {
    const { userId } = await auth();
    if (userId) {
      try { notificationUnreadCount = await getUnreadNotificationCount(userId); } catch { notificationUnreadCount = 0; }
    }
  }
  return (
    <div className="account-shell">
      <aside className="account-sidebar glass-surface glass-surface--strong">
        <div className="glass-surface__content account-sidebar__content">
          <div className="account-sidebar__brand">
            <BrandMark />
            <span>Client portal</span>
          </div>
          <AccountNavigation notificationUnreadCount={notificationUnreadCount} />
          <div className="account-sidebar__footer">
            <span className="account-sidebar__security"><Icon name="shield" /> Secure area foundation</span>
            <Link href="/">Return to public site</Link>
          </div>
        </div>
      </aside>
      <div className="account-shell__workspace">
        <header className="account-topbar">
          <div>
            <span className="eyebrow">Claims Bridge</span>
            <strong>Client workspace</strong>
          </div>
          <div className="account-topbar__actions">
            <AccountIdentity />
            <Link href="/account/notifications" aria-label={notificationUnreadCount > 0 ? `Notifications, ${notificationUnreadCount} unread` : "Notifications"} className="account-topbar__notification-link">
              <Icon name="notification" />
              {notificationUnreadCount > 0 && <span className="account-topbar__notification-count" aria-hidden="true">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span>}
            </Link>
            <Link href="/account/profile" aria-label="Account profile">
              <Icon name="profile" />
            </Link>
          </div>
        </header>
        <div className="account-mobile-navigation">
          <AccountNavigation notificationUnreadCount={notificationUnreadCount} />
        </div>
        <main className="account-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
