"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clientActionConfig, clientActionTypes } from "@/config/client-actions";
import {
  evidenceRequirementConfig,
  evidenceRequirementTypes,
} from "@/config/evidence";
import { sendClientCommunication } from "@/app/admin/communications/manual-actions";
import {
  actionPresets,
  assessmentPresets,
  communicationPresets,
  evidenceSummary,
  manualDestination,
  manualSubject,
  type CommunicationPreset,
  type ManualCommunicationInput,
} from "@/lib/communications/manual-policy";

export function CommunicationActions({
  clientReference,
  identity,
  claims = [],
  assessments = [],
}: {
  clientReference?: string;
  identity: string;
  claims?: { claimReference: string; statusLabel: string }[];
  assessments?: { assessmentReference: string }[];
}) {
  const router = useRouter();
  const [preset, setPreset] = useState<CommunicationPreset>(
    clientReference ? "GENERAL_SERVICE_UPDATE" : "ASSESSMENT_FOLLOW_UP",
  );
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [claimReference, setClaim] = useState(claims[0]?.claimReference ?? "");
  const [assessmentReference, setAssessment] = useState(
    assessments[0]?.assessmentReference ?? "",
  );
  const [evidenceType, setEvidence] =
    useState<ManualCommunicationInput["evidenceType"]>("TENANCY_AGREEMENT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [destination, setDestination] =
    useState<ManualCommunicationInput["destination"]>("ACCOUNT");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    emailReference?: string;
  }>();
  const [pending, startTransition] = useTransition();
  const needsClaim =
    actionPresets.includes(preset) ||
    ["REQUEST_DOCUMENTS", "CLAIM_UPDATE"].includes(preset) ||
    destination === "CLAIM";
  const needsAssessment =
    assessmentPresets.includes(preset) || destination === "ASSESSMENT";
  const hasBody =
    actionPresets.includes(preset) || preset === "GENERAL_SERVICE_UPDATE";
  const preview = {
    preset,
    title,
    destination,
    claimReference: needsClaim ? claimReference : undefined,
    assessmentReference: needsAssessment ? assessmentReference : undefined,
  };
  const available = (
    Object.keys(communicationPresets) as CommunicationPreset[]
  ).filter((key) =>
    clientReference
      ? (!assessmentPresets.includes(key) || assessments.length) &&
        (!(
          actionPresets.includes(key) ||
          ["REQUEST_DOCUMENTS", "CLAIM_UPDATE"].includes(key)
        ) ||
          claims.length)
      : assessmentPresets.includes(key),
  );
  return (
    <section
      className="admin-section"
      aria-labelledby="communication-actions-title"
    >
      <div className="admin-section__heading">
        <div>
          <p className="eyebrow">Client communications</p>
          <h2 id="communication-actions-title">Communication actions</h2>
        </div>
      </div>
      <p>
        <strong>{identity}</strong>
        {clientReference && ` · ${clientReference}`}
      </p>
      {result?.ok ? (
        <div role="status" className="admin-command-panel">
          <p>{result.message}</p>
          <Link href={`/admin/communications/${result.emailReference}`}>
            {result.emailReference}
          </Link>
          <p>
            <button
              className="button button--small button--secondary"
              onClick={() => {
                setResult(undefined);
                setRequestId(crypto.randomUUID());
              }}
            >
              Prepare another communication
            </button>
          </p>
        </div>
      ) : (
        <form
          className="admin-action-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const input = {
                ...preview,
                title: hasBody ? title : undefined,
                clientReference,
                requestId,
                ...(preset === "REQUEST_DOCUMENTS" ? { evidenceType } : {}),
                ...(hasBody ? { title, body } : {}),
                ...(actionPresets.includes(preset)
                  ? {
                      actionType:
                        preset === "MISSING_INFORMATION"
                          ? "CONFIRM_INFORMATION"
                          : form.get("actionType"),
                    }
                  : {}),
                ...(preset === "GENERAL_SERVICE_UPDATE" ? { nextStep } : {}),
                ...(form.get("dueDate")
                  ? { dueDate: form.get("dueDate") }
                  : {}),
              };
              try {
                const response = await sendClientCommunication(input);
                setResult(response);
                if (response.ok) router.refresh();
              } catch {
                setResult({
                  ok: false,
                  message:
                    "Connection interrupted. Try again; the same request will not be recorded twice.",
                });
              }
            });
          }}
        >
          <fieldset disabled={pending} className="grid gap-5 border-0 p-0">
            <legend className="sr-only">Prepare a client communication</legend>
            <label>
              Communication type
              <select
                value={preset}
                onChange={(event) => {
                  setPreset(event.target.value as CommunicationPreset);
                  setDestination("ACCOUNT");
                  setResult(undefined);
                }}
              >
                {available.map((key) => (
                  <option key={key} value={key}>
                    {communicationPresets[key].label}
                  </option>
                ))}
              </select>
            </label>
            <p>{communicationPresets[preset].effect}</p>
            {needsClaim && (
              <label>
                Claim
                <select
                  required
                  value={claimReference}
                  onChange={(event) => setClaim(event.target.value)}
                >
                  {claims.map((claim) => (
                    <option
                      key={claim.claimReference}
                      value={claim.claimReference}
                    >
                      {claim.claimReference} · {claim.statusLabel}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {needsAssessment && (
              <label>
                Assessment
                <select
                  required
                  value={assessmentReference}
                  onChange={(event) => setAssessment(event.target.value)}
                >
                  {assessments.map((assessment) => (
                    <option
                      key={assessment.assessmentReference}
                      value={assessment.assessmentReference}
                    >
                      {assessment.assessmentReference}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {preset === "REQUEST_DOCUMENTS" && (
              <label>
                Requested document
                <select
                  value={evidenceType}
                  onChange={(event) =>
                    setEvidence(
                      event.target
                        .value as ManualCommunicationInput["evidenceType"],
                    )
                  }
                >
                  {evidenceRequirementTypes.map((type) => (
                    <option key={type} value={type}>
                      {evidenceRequirementConfig[type].label}
                    </option>
                  ))}
                </select>
                <span>{evidenceSummary(evidenceType)}</span>
              </label>
            )}
            {actionPresets.includes(preset) && (
              <label>
                Action type
                <select
                  name="actionType"
                  defaultValue="CONFIRM_INFORMATION"
                  disabled={preset === "MISSING_INFORMATION"}
                >
                  {clientActionTypes.map((type) => (
                    <option key={type} value={type}>
                      {clientActionConfig[type].label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {hasBody && (
              <>
                <label>
                  Client-facing title
                  <input
                    required
                    maxLength={120}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label>
                  {preset === "GENERAL_SERVICE_UPDATE"
                    ? "Service notice (plain text)"
                    : "Client instructions (plain text)"}
                  <textarea
                    required
                    maxLength={2000}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </label>
              </>
            )}
            {preset === "GENERAL_SERVICE_UPDATE" && (
              <>
                <label>
                  Next-step guidance
                  <textarea
                    required
                    maxLength={300}
                    value={nextStep}
                    onChange={(event) => setNextStep(event.target.value)}
                  />
                </label>
                <label>
                  Portal destination
                  <select
                    value={destination}
                    onChange={(event) =>
                      setDestination(
                        event.target
                          .value as ManualCommunicationInput["destination"],
                      )
                    }
                  >
                    <option value="ACCOUNT">Account overview</option>
                    {claims.length > 0 && (
                      <option value="CLAIM">Selected claim</option>
                    )}
                    {assessments.length > 0 && (
                      <option value="ASSESSMENT">Selected assessment</option>
                    )}
                  </select>
                </label>
              </>
            )}
            {(actionPresets.includes(preset) ||
              preset === "REQUEST_DOCUMENTS") && (
              <label>
                Actual due date (optional)
                <input type="date" name="dueDate" />
              </label>
            )}
            <div
              className="admin-command-panel"
              aria-label="Communication preview"
            >
              <p className="eyebrow">Before you send</p>
              <dl className="admin-detail-list">
                <div>
                  <dt>Email subject</dt>
                  <dd>{manualSubject(preview)}</dd>
                </div>
                <div>
                  <dt>Content summary</dt>
                  <dd>
                    {hasBody
                      ? body || "Enter the client-facing content above."
                      : preset === "REQUEST_DOCUMENTS"
                        ? evidenceSummary(evidenceType)
                        : communicationPresets[preset].effect}
                  </dd>
                </div>
                <div>
                  <dt>Secure destination</dt>
                  <dd>
                    {!clientReference
                      ? "Create or sign into an account → securely link and review this assessment"
                      : manualDestination(preview)}
                  </dd>
                </div>
              </dl>
              {preset === "REQUEST_DOCUMENTS" && (
                <p>
                  Secure uploads are not yet available. The email asks the
                  client to prepare records and follow portal guidance.
                </p>
              )}
              {preset === "START_CLAIM_REMINDER" && (
                <p>
                  Available only for a complete assessment within the service
                  route with no existing claim. Clicking the email does not
                  create a claim.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="button button--secondary"
              disabled={pending}
            >
              {pending
                ? "Recording communication…"
                : "Confirm and queue communication"}
            </button>
          </fieldset>
          {result && !result.ok && (
            <p
              role="alert"
              className="admin-form-feedback admin-form-feedback--error"
            >
              {result.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
