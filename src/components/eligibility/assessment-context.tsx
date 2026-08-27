import { ConceptIcon } from "@/components/brand/concept-icon";
import { Icon } from "@/components/ui/icon";
import { assessmentReassurance } from "@/content/eligibility/copy";
import type {
  EligibilityQuestion,
  EligibilitySectionId,
  SectionDefinition,
} from "@/lib/eligibility/types";

import styles from "./eligibility.module.css";

const sectionIcon = {
  property: "assessment",
  tenancy: "tenancy",
  deposit: "deposit",
  protection: "protection",
  information: "evidence",
  evidence: "evidence",
} as const;

type AssessmentContextProps = {
  currentQuestion?: EligibilityQuestion;
  currentSection: EligibilitySectionId;
  section: SectionDefinition;
};

export function AssessmentContextRail({ currentSection, section }: AssessmentContextProps) {
  return (
    <aside className={styles.contextRail}>
      <div className={styles.contextIndex} aria-hidden="true">
        <ConceptIcon name={sectionIcon[currentSection]} />
        <span>{section.index}</span>
      </div>
      <p className="eyebrow">{section.label}</p>
      <h2>{section.description}</h2>
      <div className={styles.contextLine} aria-hidden="true"><span /></div>
      <p>{assessmentReassurance.session}</p>
    </aside>
  );
}

export function AssessmentGuidancePanel({ currentQuestion, restartOpen, onCancelRestart, onConfirmRestart }: AssessmentContextProps & { restartOpen?: boolean; onCancelRestart?: () => void; onConfirmRestart?: () => void }) {
  return (
    <aside className={styles.guidancePanel} aria-label="Context for this assessment step">
      {currentQuestion ? (
        <>
          <p className="eyebrow">Why we ask</p>
          <h2>{currentQuestion.whyWeAsk}</h2>
          {currentQuestion.legalText && <p>{currentQuestion.legalText}</p>}
        </>
      ) : (
        <>
          <p className="eyebrow">Important context</p>
          <h2>{assessmentReassurance.heading}</h2>
          <p>{assessmentReassurance.body}</p>
        </>
      )}
      <div className={styles.privacyMarker}>
        <Icon name="shield" />
        <span><strong>No documents uploaded</strong><small>No account or claim is created in this phase.</small></span>
      </div>
      {restartOpen && <dialog open className={styles.restartDialog} aria-labelledby="restart-title" aria-describedby="restart-description"><p className="eyebrow">Restart assessment</p><h2 id="restart-title">Restart your assessment?</h2><p id="restart-description">Your current answers will be cleared and you will return to the beginning of the assessment.</p><div><button className="button button--quiet" onClick={onCancelRestart} type="button">Cancel</button><button className="button button--primary" onClick={onConfirmRestart} type="button">Restart assessment</button></div></dialog>}
    </aside>
  );
}
