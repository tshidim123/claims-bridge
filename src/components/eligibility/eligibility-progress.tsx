import { eligibilitySections } from "@/content/eligibility/copy";
import type { EligibilitySectionId } from "@/lib/eligibility/types";

import styles from "./eligibility.module.css";

type EligibilityProgressProps = {
  currentSection: EligibilitySectionId;
  reachedSections: Set<EligibilitySectionId>;
};

export function EligibilityProgress({
  currentSection,
  reachedSections,
}: EligibilityProgressProps) {
  const currentIndex = eligibilitySections.findIndex((section) => section.id === currentSection);

  return (
    <>
      <nav className={styles.progressDesktop} aria-label="Assessment stages">
        <div className={styles.progressHeading}>
          <p className="eyebrow">Assessment path</p>
          <p>Seven clear stages. The route adapts to your answers.</p>
        </div>
        <ol className={styles.progressList}>
          {eligibilitySections.map((section, index) => {
            const isCurrent = section.id === currentSection;
            const isComplete = index < currentIndex || reachedSections.has(section.id) && !isCurrent;
            return (
              <li
                aria-current={isCurrent ? "step" : undefined}
                className={isCurrent ? styles.progressCurrent : isComplete ? styles.progressComplete : undefined}
                key={section.id}
              >
                <span className={styles.progressNode} aria-hidden="true">
                  <i />
                </span>
                <div>
                  <span>{section.index}</span>
                  <strong>{section.label}</strong>
                  <small>{isCurrent ? "Current stage" : isComplete ? "Complete" : "Upcoming"}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={styles.progressMobile} aria-label="Assessment stage" role="status">
        <div>
          <span>Stage {String(currentIndex + 1).padStart(2, "0")} / 07</span>
          <strong>{eligibilitySections[currentIndex]?.label}</strong>
        </div>
        <div className={styles.mobileSegments} aria-hidden="true">
          {eligibilitySections.map((section, index) => (
            <span
              className={index <= currentIndex ? styles.mobileSegmentActive : undefined}
              key={section.id}
            />
          ))}
        </div>
      </div>
    </>
  );
}
