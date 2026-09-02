"use client";

/* eslint-disable @next/next/no-img-element -- Clerk-hosted avatar URLs are runtime-controlled and intentionally avoid broad remote image configuration. */

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { BrandMark } from "@/components/brand/brand-mark";
import { Icon } from "@/components/ui/icon";
import { publicNavigation } from "@/config/navigation";
import type { PublicHeaderIdentity } from "@/lib/auth/public-header-identity";
import { cn } from "@/lib/utils";

function routeIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderAvatar({ identity }: { identity: PublicHeaderIdentity }) {
  return <span className="public-account__avatar" aria-hidden="true">{identity.imageUrl ? <img src={identity.imageUrl} alt="" /> : identity.initials}</span>;
}

function accountLabel(identity: PublicHeaderIdentity) {
  return identity.profileComplete ? identity.displayName ?? "My account" : identity.email ?? "My account";
}

const accountLinks = [
  ["Account dashboard", "/account"],
  ["Profile", "/account/profile"],
  ["Assessments", "/account/assessments"],
  ["Claims", "/account/claims"],
  ["Messages", "/account/messages"],
  ["Notifications", "/account/notifications"],
] as const;

export function PublicHeader({ identity }: { identity: PublicHeaderIdentity }) {
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [accountPanel, setAccountPanel] = useState(false);

  const selectedSection = publicNavigation.find(
    (section) => section.label === activePanel,
  );

  useEffect(() => {
    if (!accountPanel) return;
    accountMenuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [accountPanel]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActivePanel(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    function updateScrollState() {
      setIsScrolled(window.scrollY > 24);
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  function openMobileNavigation() {
    dialogRef.current?.showModal();
  }

  function closeMobileNavigation() {
    dialogRef.current?.close();
  }

  return (
    <header className="public-header" ref={headerRef} onKeyDown={(event) => {
      if (event.key === "Escape" && accountPanel) {
        event.preventDefault();
        setAccountPanel(false);
        accountTriggerRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && activePanel) {
        event.preventDefault();
        const label = activePanel;
        setActivePanel(null);
        triggerRefs.current[label]?.focus();
      }
    }}>
      <div className={cn("application-container public-header__bar glass-surface glass-surface--strong", isScrolled && "public-header__bar--scrolled")}>
        <div className="glass-surface__content public-header__bar-content">
          <BrandMark />

          <nav className="desktop-navigation" aria-label="Primary navigation">
            {publicNavigation.map((section) => {
              const hasPanel = Boolean(section.items?.length);
              const isActive = routeIsActive(pathname, section.href);
              const isExpanded = activePanel === section.label;

              return hasPanel ? (
                <button
                  className={cn("desktop-navigation__item", isActive && "is-active")}
                  type="button"
                  key={section.label}
                  ref={(node) => { triggerRefs.current[section.label] = node; }}
                  aria-expanded={isExpanded}
                  aria-controls="public-mega-menu"
                  onClick={() => {
                    setActivePanel(isExpanded ? null : section.label);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      if (isExpanded) {
                        megaMenuRef.current?.focus({ preventScroll: true });
                      } else {
                        flushSync(() => setActivePanel(section.label));
                        megaMenuRef.current?.focus({ preventScroll: true });
                      }
                    }
                  }}
                >
                  {section.label}
                  <Icon className={cn("desktop-navigation__chevron", isExpanded && "is-open")} name="chevron" />
                </button>
              ) : (
                <Link
                  className={cn("desktop-navigation__item", isActive && "is-active")}
                  href={section.href}
                  key={section.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setActivePanel(null)}
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>

          <div className="public-header__actions">
            {identity.isAuthenticated ? <div className="public-account">
              <button className="public-account__trigger" ref={accountTriggerRef} type="button" aria-haspopup="menu" aria-expanded={accountPanel} aria-controls="public-account-menu" aria-label={`Open account menu for ${accountLabel(identity)}`} onClick={() => setAccountPanel((open) => !open)}>
                <HeaderAvatar identity={identity} /><span className="public-account__label">{accountLabel(identity)}</span><Icon name="chevron" className={cn("public-account__chevron", accountPanel && "is-open")} />
              </button>
              {accountPanel && <div className="public-account__menu glass-surface glass-surface--strong" id="public-account-menu" ref={accountMenuRef} role="menu" aria-label="Account menu">
                <div className="public-account__summary"><HeaderAvatar identity={identity} /><div><strong>{accountLabel(identity)}</strong>{identity.email && <span>{identity.email}</span>}{!identity.profileComplete && <small>Account setup incomplete</small>}</div></div>
                {!identity.profileComplete && <Link className="public-account__setup" href="/account/onboarding" role="menuitem" onClick={() => setAccountPanel(false)}>Complete account setup <Icon name="arrow" /></Link>}
                <nav className="public-account__links" aria-label="Account navigation">{accountLinks.map(([label, href]) => <Link key={href} href={href} role="menuitem" onClick={() => setAccountPanel(false)}>{label}</Link>)}</nav>
                <SignOutButton><button className="public-account__sign-out" type="button" role="menuitem">Sign out</button></SignOutButton>
              </div>}
            </div> : <Link className="public-header__sign-in" href="/sign-in">Sign in</Link>}
            <Link className="button button--small button--primary header-eligibility" href="/check-eligibility">
              <span className="button__label">Check eligibility</span>
            </Link>
            <button
              className="mobile-navigation__trigger"
              ref={mobileTriggerRef}
              type="button"
              aria-label="Open navigation"
              onClick={openMobileNavigation}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>

        <div
          className={cn("mega-menu", selectedSection && "is-open")}
          id="public-mega-menu"
          ref={megaMenuRef}
          tabIndex={-1}
          aria-label={selectedSection ? `${selectedSection.label} navigation` : "Expanded navigation"}
          aria-hidden={!selectedSection}
          data-panel={selectedSection?.label}
        >
          {selectedSection && (
            <div className="mega-menu__inner">
              <div className="mega-menu__context">
                <span className="eyebrow">Explore {selectedSection.label}</span>
                <h2>{selectedSection.featured?.label}</h2>
                <p>{selectedSection.featured?.description ?? selectedSection.supportingText}</p>
                <Link className="text-link" href={selectedSection.featured?.href ?? selectedSection.href} onClick={() => setActivePanel(null)}>
                  View overview <Icon name="arrow" />
                </Link>
              </div>
              <div className="mega-menu__links">
                {selectedSection.items?.map((item, index) => (
                  <Link className="mega-menu__link" href={item.href} key={item.id} onClick={() => setActivePanel(null)}>
                    <span className="mega-menu__index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <Icon name="arrow" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <dialog
        className="mobile-navigation"
        ref={dialogRef}
        aria-labelledby="mobile-navigation-title"
        onClose={() => mobileTriggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeMobileNavigation();
        }}
      >
        <div className="mobile-navigation__sheet">
          <div className="mobile-navigation__header">
            <BrandMark />
            <button
              className="mobile-navigation__close"
              type="button"
              aria-label="Close navigation"
              onClick={closeMobileNavigation}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="mobile-navigation__body">
            <p className="eyebrow" id="mobile-navigation-title">Navigate Claims Bridge</p>
            <nav aria-label="Mobile primary navigation">
              {publicNavigation.map((section) =>
                section.items?.length ? (
                  <details className="mobile-navigation__group" key={section.label}>
                    <summary>
                      <span>{section.label}</span>
                      <Icon name="chevron" />
                    </summary>
                    <div className="mobile-navigation__subnav">
                      <Link href={section.href} onClick={closeMobileNavigation}>
                        <strong>{section.label} overview</strong>
                        <small>{section.supportingText}</small>
                      </Link>
                      {section.items.map((item) => (
                        <Link href={item.href} key={item.id} onClick={closeMobileNavigation}>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </Link>
                      ))}
                    </div>
                  </details>
                ) : (
                  <Link
                    className="mobile-navigation__direct"
                    href={section.href}
                    key={section.href}
                    onClick={closeMobileNavigation}
                  >
                    <span>{section.label}</span>
                    <Icon name="arrow" />
                  </Link>
                ),
              )}
            </nav>
            {identity.isAuthenticated && <nav className="mobile-navigation__account-links" aria-label="Mobile account navigation">{!identity.profileComplete && <Link href="/account/onboarding" onClick={closeMobileNavigation}>Complete account setup</Link>}{accountLinks.map(([label, href]) => <Link href={href} key={href} onClick={closeMobileNavigation}>{label}</Link>)}<SignOutButton><button type="button">Sign out</button></SignOutButton></nav>}
          </div>
          <div className="mobile-navigation__footer">
            {identity.isAuthenticated ? <div className="mobile-navigation__account"><HeaderAvatar identity={identity} /><div><strong>{accountLabel(identity)}</strong><small>{identity.profileComplete ? "My account" : "Complete account setup"}</small></div></div> : <Link className="button button--secondary button--medium" href="/sign-in" onClick={closeMobileNavigation}><span className="button__label">Sign in</span></Link>}
            <Link className="button button--primary button--medium" href="/check-eligibility" onClick={closeMobileNavigation}>
              <span className="button__label">Check eligibility</span>
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
