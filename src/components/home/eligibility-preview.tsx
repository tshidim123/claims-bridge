"use client";

import { useId, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import styles from "./homepage.module.css";

const previewSteps = [
  {
    id: "location",
    legend: "Where was the property?",
    hint: "The legal framework can depend on where the tenancy was located.",
    options: ["England", "Wales", "Scotland", "Northern Ireland", "Not sure"],
  },
  {
    id: "deposit",
    legend: "Did you pay a tenancy deposit?",
    hint: "This preview does not assess what kind of payment was made.",
    options: ["Yes", "No", "Not sure"],
  },
  {
    id: "scheme",
    legend: "Do you know whether it was placed in a deposit protection scheme?",
    hint: "It is fine if you cannot find the paperwork or do not know yet.",
    options: ["Yes", "No", "Not sure"],
  },
] as const;

export function EligibilityPreview() {
  const groupId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const step = previewSteps[stepIndex];
  const selectedAnswer = answers[step.id];
  const isLastStep = stepIndex === previewSteps.length - 1;

  return (
    <div className={styles.eligibilityPreview}>
      <div className={styles.eligibilityPreviewHeader}>
        <div>
          <span className={styles.demoFlag}>Homepage preview</span>
          <p aria-live="polite" className={styles.stepCount}>
            Step {stepIndex + 1} of {previewSteps.length}
          </p>
        </div>
        <div className={styles.stepDots} aria-hidden="true">
          {previewSteps.map((item, index) => (
            <span
              className={index <= stepIndex ? styles.stepDotActive : undefined}
              key={item.id}
            />
          ))}
        </div>
      </div>

      <fieldset className={styles.eligibilityFieldset}>
        <legend>{step.legend}</legend>
        <p id={`${groupId}-${step.id}-hint`}>{step.hint}</p>
        <div className={styles.eligibilityOptions} aria-describedby={`${groupId}-${step.id}-hint`}>
          {step.options.map((option) => {
            const id = `${groupId}-${step.id}-${option.toLowerCase().replaceAll(" ", "-")}`;
            return (
              <label className={styles.eligibilityOption} htmlFor={id} key={option}>
                <input
                  checked={selectedAnswer === option}
                  id={id}
                  name={`${groupId}-${step.id}`}
                  onChange={() => setAnswers((current) => ({ ...current, [step.id]: option }))}
                  type="radio"
                  value={option}
                />
                <span>
                  <i aria-hidden="true" />
                  {option}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.eligibilityPreviewFooter}>
        <p>No eligibility result is calculated in this preview.</p>
        <div className={styles.eligibilityPreviewActions}>
          {stepIndex > 0 && (
            <Button variant="quiet" onClick={() => setStepIndex((current) => current - 1)}>
              Back
            </Button>
          )}
          {isLastStep ? (
            <ButtonLink
              aria-disabled={!selectedAnswer}
              className={!selectedAnswer ? styles.disabledLink : undefined}
              href="/check-eligibility"
              onClick={(event) => {
                if (!selectedAnswer) event.preventDefault();
              }}
            >
              Continue to the initial check <Icon name="arrow" />
            </ButtonLink>
          ) : (
            <Button
              disabled={!selectedAnswer}
              onClick={() => setStepIndex((current) => current + 1)}
            >
              Continue <Icon name="arrow" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
