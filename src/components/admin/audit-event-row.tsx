import { staffRoleLabels, staffStatusLabels } from "@/config/staff";

type AuditEvent = { action: string; actor: string; actorReference: string | null; targetType: string | null; targetReference: string | null; metadata: Record<string, string | number | boolean | string[]> | null; createdAt: string };

export function AuditEventRow({ event }: { event: AuditEvent }) {
  const metadata = event.metadata ? Object.entries(event.metadata).map(([key, value]) => { const display = Array.isArray(value) ? value.join(", ") : String(value); if (key === "previousRole" || key === "newRole") return staffRoleLabels[display as keyof typeof staffRoleLabels] ?? display; if (key === "previousStatus" || key === "newStatus") return staffStatusLabels[display as keyof typeof staffStatusLabels] ?? display; return `${key}: ${display}`; }).join(" · ") : null;
  return <li className="admin-audit-row"><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><div><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor}{event.actorReference ? ` · ${event.actorReference}` : ""}</span>{event.targetType && <span>Target type: {event.targetType}</span>}{event.targetReference && <span>Target: {event.targetReference}</span>}{metadata && <span>Details: {metadata}</span>}</div></li>;
}
