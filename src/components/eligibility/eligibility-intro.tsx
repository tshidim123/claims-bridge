import type { RefObject } from "react";

import { ConceptIcon } from "@/components/brand/concept-icon";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ApplicationContainer } from "@/components/layout/application-container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { eligibilityIntro, eligibilitySections } from "@/content/eligibility/copy";

import styles from "./eligibility.module.css";

type EligibilityIntroProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  hydrated: boolean;
  onStart: () => void;
};

export function EligibilityIntro({ headingRef, hydrated, onStart }: EligibilityIntroProps) {
  return (
    <div className={styles.eligibilityPage} data-hydrated={hydrated}>
      <section className={styles.intro} aria-labelledby="eligibility-title">
        <div className={styles.introArchitecture} aria-hidden="true">
          <i /><i /><i /><i /><i />
          <span /><span /><span />
        </div>
        <ApplicationContainer className={styles.introLayout}>
          <div className={styles.introCopy}>
            <p className="eyebrow">{eligibilityIntro.eyebrow}</p>
            <h1 id="eligibility-title" ref={headingRef} tabIndex={-1}>{eligibilityIntro.title}</h1>
            <p>{eligibilityIntro.description}</p>
            <div className={styles.introActions}>
              <Button disabled={!hydrated} onClick={onStart} size="large">
                {hydrated ? eligibilityIntro.startLabel : "Preparing assessment…"} <Icon name="arrow" />
              </Button>
              <span>{eligibilityIntro.timeLabel}</span>
            </div>
          </div>

          <GlassSurface className={styles.introGlass} strength="strong">
            <div className={styles.introPath} aria-hidden="true">
              {eligibilitySections.map((section) => (
                <span key={section.id}><i /><small>{section.index}</small></span>
              ))}
            </div>
            <div className={styles.introAssurances}>
              <div><ConceptIcon name="assessment" /><span><strong>Preliminary only</strong><small>No guarantee or case valuation</small></span></div>
              <div><ConceptIcon name="evidence" /><span><strong>No uploads yet</strong><small>Only a record inventory</small></span></div>
              <div><ConceptIcon name="protection" /><span><strong>Privacy-aware</strong><small>No identity or banking details</small></span></div>
            </div>
          </GlassSurface>

          <div className={styles.introPrivacy}>
            <span aria-hidden="true"><Icon name="shield" /></span>
            <div><strong>{eligibilityIntro.privacyTitle}</strong><p>{eligibilityIntro.privacyBody}</p></div>
          </div>
        </ApplicationContainer>
      </section>
    </div>
  );
}
