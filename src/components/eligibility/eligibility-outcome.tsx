import { useEffect, useRef } from "react";
import type { AssessmentOutcome } from "@/lib/eligibility/types";
import {
  assessmentEmailMessage,
  type AssessmentEmailState,
} from "@/lib/communications/assessment-receipt";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import styles from "./eligibility.module.css";

export function EligibilityOutcome({
  outcome,
  savedReference,
  emailState = "unavailable",
  signedIn = false,
  error,
  onReview,
  onContinue,
}: {
  outcome: AssessmentOutcome;
  savedReference?: string;
  emailState?: AssessmentEmailState;
  signedIn?: boolean;
  error?: string | null;
  onReview: () => void;
  onContinue: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      className={styles.outcomePanel}
      aria-labelledby="eligibility-step-title"
    >
      <header className={styles.completionSummary}>
        <p className="eyebrow">Your preliminary assessment</p>
        <h2 id="eligibility-step-title" ref={heading} tabIndex={-1}>
          Assessment completed
        </h2>
        {savedReference && (
          <p className={styles.completionReference}>
            Assessment reference: <strong>{savedReference}</strong>
          </p>
        )}
        <p className={styles.completionResult}>{outcome.headline}</p>
        {savedReference && (
          <p className={styles.completionReceipt} role="status">
            {assessmentEmailMessage(emailState)}
          </p>
        )}
      </header>
      <div className={styles.outcomeStickyCta} aria-label="Start your claim">
        <Button onClick={onContinue} size="large">
          Start claim <Icon name="arrow" />
        </Button>
        <p>
          {signedIn
            ? "Review your saved assessment and choose whether to create a claim."
            : "Create or sign in to your secure account first. You choose separately whether to create a claim."}
        </p>
      </div>
      {error && (
        <p className={styles.completionError} role="alert">
          {error}
        </p>
      )}
      <section
        className={styles.outcomeReasons}
        aria-labelledby="why-route-title"
      >
        <p className="eyebrow">Why this route</p>
        <h3 id="why-route-title">What Claims Bridge reviewed</h3>
        <p>{outcome.explanation}</p>
        <p className={styles.legalQualifier}>
          <Icon name="shield" />
          This is a preliminary route based on the information provided, not a
          legal conclusion or a finding about a claim.
        </p>
        <Button onClick={onReview} variant="quiet">
          View full assessment
        </Button>
      </section>
      <section
        className={styles.evidencePreview}
        aria-labelledby="evidence-title"
      >
        <header>
          <div>
            <p className="eyebrow">Documents to prepare</p>
            <h3 id="evidence-title">Evidence that may help next</h3>
          </div>
          <span>Nothing is uploaded here</span>
        </header>
        <ul>
          {outcome.evidence.map((item, index) => (
            <li key={item.id}>
              <span
                className={
                  item.status === "available"
                    ? styles.evidenceAvailable
                    : undefined
                }
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
              <small>
                {item.status === "available"
                  ? "You have this"
                  : index === 0
                    ? "Useful"
                    : "May be helpful"}
              </small>
            </li>
          ))}
        </ul>
        <aside className={styles.evidenceReassurance}>
          <Icon name="documents" />
          <div>
            <strong>You don’t need every document before continuing.</strong>
            <p>
              Missing evidence does not necessarily prevent further review.
              Claims Bridge can help you understand what may be useful next.
            </p>
          </div>
        </aside>
      </section>
      <section className={styles.nextSteps} aria-labelledby="next-steps-title">
        <p className="eyebrow">What happens next</p>
        <h3 id="next-steps-title">Continue when you are ready</h3>
        <ol>
          {outcome.nextSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
