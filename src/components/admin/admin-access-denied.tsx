import Link from "next/link";

export function AdminAccessDenied({ forbidden = false }: { forbidden?: boolean }) {
  return <main className="admin-access-denied" id="main-content"><div className="admin-access-denied__rail" aria-hidden="true"><span /></div><p className="eyebrow">Claims Bridge operations</p><h1>{forbidden ? "This area is not available to this account." : "Operations access is restricted."}</h1><p>{forbidden ? "Your staff access does not include this area. Return to the operations overview or choose another authorised destination." : "This account does not have access to the Claims Bridge operations workspace."}</p><div className="admin-access-denied__actions"><Link className="button button--medium button--primary" href="/">Return to Claims Bridge</Link><Link className="button button--medium button--secondary" href="/account">Go to client account</Link></div></main>;
}
