import Link from "next/link";

import { ApplicationContainer } from "@/components/layout/application-container";
import { PublicShell } from "@/components/layout/public-shell";

export default function NotFound() {
  return <PublicShell><article className="public-not-found"><ApplicationContainer><p className="eyebrow">404 / Route not found</p><h1>That route is not part of the bridge.</h1><p>Use a clear starting point below, or return to the Claims Bridge home.</p><div className="public-not-found__actions"><Link className="button button--medium button--primary" href="/check-eligibility"><span className="button__label">Check eligibility</span></Link><Link className="button button--medium button--secondary" href="/deposit-claims"><span className="button__label">Explore deposit claims</span></Link><Link className="text-link" href="/support">View support <span aria-hidden="true">↗</span></Link></div></ApplicationContainer></article></PublicShell>;
}
