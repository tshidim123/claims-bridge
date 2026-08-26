"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { claimNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function ClaimNavigation({ claimId }: { claimId: string }) {
  const pathname = usePathname();

  return (
    <nav className="claim-navigation" aria-label="Claim workspace">
      {claimNavigation(claimId).map((item) => {
        const hrefPath = item.href.split("#")[0];
        const active = !item.href.includes("#") && pathname === hrefPath;

        return (
          <Link
            className={cn("claim-navigation__item", active && "is-active")}
            href={item.href}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
