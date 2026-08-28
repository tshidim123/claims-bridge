import Link from "next/link";

import { EditorialSection } from "@/components/public/public-editorial";
import { verifiedTrustFacts } from "@/config/public-trust";

export function TrustModule({ compact = false }: { compact?: boolean }) {
  return <EditorialSection eyebrow="Product trust" title="Specific capabilities, clearly described." className={compact ? "public-trust-module public-trust-module--compact" : "public-trust-module"}><div className="public-trust-grid">{verifiedTrustFacts.map((fact, index) => <div key={fact.id}><span>{String(index + 1).padStart(2, "0")}</span><h3>{fact.label}</h3><p>{fact.description}</p></div>)}</div>{!compact && <Link className="text-link" href="/security">How security is approached <span aria-hidden="true">↗</span></Link>}</EditorialSection>;
}
