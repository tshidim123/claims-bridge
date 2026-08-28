import { claimTimelineEventLabels } from "@/config/claim-tracking";

type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: Date;
};

export function ClaimTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="claim-timeline" aria-label="Client-visible claim timeline">
      {events.map((event, index) => <li key={event.id} data-current={index === events.length - 1 ? "true" : "false"}><span className="claim-timeline__rail" aria-hidden="true"><span className="claim-timeline__node" /></span><article className="claim-timeline__event"><div className="claim-timeline__event-heading"><div><span className="eyebrow">{claimTimelineEventLabels[event.eventType] ?? "Claim activity"}</span><h2>{event.title}</h2></div><time dateTime={event.occurredAt.toISOString()}>{event.occurredAt.toLocaleDateString("en-GB")}</time></div><p>{event.description}</p></article></li>)}
    </ol>
  );
}
