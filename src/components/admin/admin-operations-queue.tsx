import Link from "next/link";
import type { ReactNode } from "react";

import type { QueuePage } from "@/lib/admin/operations/repository";

export function AdminQueueEmpty({ title, description }: { title: string; description: string }) {
  return <div className="admin-empty admin-empty--large"><p className="eyebrow">No matching records</p><h2>{title}</h2><p>{description}</p></div>;
}

export function AdminQueueShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`admin-operations-queue ${className}`} aria-label="Operations queue">{children}</section>;
}

export function AdminQueuePagination<T>({ result, pathname, params }: { result: QueuePage<T>; pathname: string; params: Record<string, string | undefined> }) {
  if (!result.hasPreviousPage && !result.hasNextPage) return null;
  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, page: String(page) })) if (value) query.set(key, value);
    return `${pathname}?${query.toString()}`;
  };
  return <nav className="admin-queue-pagination" aria-label="Queue pages"><span>Showing page {result.page} · {result.total} record{result.total === 1 ? "" : "s"}</span><div>{result.hasPreviousPage && <Link className="button button--small button--quiet" href={href(result.page - 1)}>Previous</Link>}{result.hasNextPage && <Link className="button button--small button--quiet" href={href(result.page + 1)}>Next</Link>}</div></nav>;
}

export function AdminQueueMeta({ children }: { children: ReactNode }) {
  return <div className="admin-queue-item__meta">{children}</div>;
}

export function AdminQueueLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="admin-queue-item__link" href={href}>{children}<span aria-hidden="true">↗</span></Link>;
}
