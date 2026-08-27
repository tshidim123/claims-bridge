"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { BrandMark } from "@/components/brand/brand-mark";
import { Icon } from "@/components/ui/icon";
import { publicNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

function routeIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader() {
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedSection = publicNavigation.find(
    (section) => section.label === activePanel,
  );

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActivePanel(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function openMobileNavigation() {
    dialogRef.current?.showModal();
  }

  function closeMobileNavigation() {
    dialogRef.current?.close();
  }

  return (
    <header className="public-header" ref={headerRef} onKeyDown={(event) => {
      if (event.key === "Escape" && activePanel) {
        event.preventDefault();
        const label = activePanel;
        setActivePanel(null);
        triggerRefs.current[label]?.focus();
      }
    }}>
      <div className="application-container public-header__bar glass-surface glass-surface--strong">
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
            <Link className="public-header__sign-in" href="/sign-in">
              Sign in
            </Link>
            <Link className="button button--small button--primary header-eligibility" href="/check-eligibility">
              <span className="button__label">Check eligibility</span>
            </Link>
            <button
              className="mobile-navigation__trigger"
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
                  <Link className="mega-menu__link" href={item.href} key={item.href} onClick={() => setActivePanel(null)}>
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
                        <Link href={item.href} key={item.href} onClick={closeMobileNavigation}>
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
          </div>
          <div className="mobile-navigation__footer">
            <Link className="button button--secondary button--medium" href="/account" onClick={closeMobileNavigation}>
              <span className="button__label">Client sign in</span>
            </Link>
            <Link className="button button--primary button--medium" href="/check-eligibility" onClick={closeMobileNavigation}>
              <span className="button__label">Check eligibility</span>
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
