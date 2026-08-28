type RecentEvent = {
  id: string;
  title: string;
  description: string;
  occurredAt: Date;
};

export function ClaimRecentActivity({ events }: { events: RecentEvent[] }) {
  return (
    <section className="claim-recent-activity" aria-labelledby="recent-activity-title">
      <div className="claim-section-heading"><div><p className="eyebrow">Real client-visible events</p><h2 id="recent-activity-title">Recent activity</h2></div><span>{events.length ? `${events.length} ${events.length === 1 ? "event" : "events"}` : "Quiet for now"}</span></div>
      {events.length === 0 ? <p className="claim-sparse-copy">No client-visible activity has been recorded yet. New activity will appear here as the workflow develops.</p> : <ol className="recent-activity-list">{events.slice(0, 4).map((event, index) => <li key={event.id} data-current={index === 0 ? "true" : "false"}><span className="recent-activity-list__node" aria-hidden="true" /><div><div className="recent-activity-list__heading"><h3>{event.title}</h3><time dateTime={event.occurredAt.toISOString()}>{event.occurredAt.toLocaleDateString("en-GB")}</time></div><p>{event.description}</p></div></li>)}</ol>}
    </section>
  );
}
