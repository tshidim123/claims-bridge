import { claimStatusLabels, claimStatuses } from "@/config/claim-statuses";

export function StatusArchitecture() {
  return (
    <section className="status-architecture" aria-labelledby="status-architecture-title">
      <div className="status-architecture__intro">
        <p className="eyebrow">Configurable status architecture</p>
        <h2 id="status-architecture-title">A workflow vocabulary, not a hard-coded journey.</h2>
        <p>
          These labels are configuration foundations only. Exact legal and operational transitions will be defined with the claims workflow.
        </p>
      </div>
      <ol className="status-architecture__rail">
        {claimStatuses.map((status, index) => (
          <li key={status}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {claimStatusLabels[status]}
          </li>
        ))}
      </ol>
    </section>
  );
}
