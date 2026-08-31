"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import { accountNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

const iconByLabel: Record<string, IconName> = {
  Overview: "home",
  Assessments: "search",
  "My claims": "shield",
  Documents: "documents",
  Messages: "message",
  Notifications: "notification",
  Resources: "search",
  Support: "support",
  Account: "profile",
};

function isActive(pathname: string, href: string) {
  if (href === "/account") return pathname === href;
  if (href === "/account/profile") {
    return ["/account/profile", "/account/security", "/account/preferences"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNavigation({ notificationUnreadCount = 0 }: { notificationUnreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="account-navigation" aria-label="Client account">
      {accountNavigation.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            className={cn("account-navigation__item", active && "is-active")}
            href={item.href}
            key={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={item.label === "Notifications" && notificationUnreadCount > 0 ? `Notifications, ${notificationUnreadCount} unread` : undefined}
          >
            <Icon name={iconByLabel[item.label] ?? "arrow"} />
            <span>{item.label}</span>
            {item.label === "Notifications" && notificationUnreadCount > 0 && <span className="account-navigation__badge" aria-hidden="true">{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
