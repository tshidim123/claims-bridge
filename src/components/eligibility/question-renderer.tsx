import type { AnswerValue, EligibilityQuestion } from "@/lib/eligibility/types";

import styles from "./eligibility.module.css";

type QuestionRendererProps = {
  answer: AnswerValue | undefined;
  descriptionId: string;
  errorId?: string;
  onAnswer: (value: AnswerValue | undefined) => void;
  question: EligibilityQuestion;
};

export function QuestionRenderer({
  answer,
  descriptionId,
  errorId,
  onAnswer,
  question,
}: QuestionRendererProps) {
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  if (question.fieldType === "informational") {
    return (
      <div className={styles.informationPath} aria-describedby={describedBy}>
        <div className={styles.informationArchitecture} aria-hidden="true">
          <span /><span /><span />
        </div>
        <p>{question.legalText}</p>
      </div>
    );
  }

  if (question.fieldType === "single-choice" || question.fieldType === "yes-no") {
    return (
      <fieldset className={styles.choiceFieldset} aria-describedby={describedBy}>
        <legend className={styles.visuallyHidden}>{question.title}</legend>
        <div className={styles.choiceGrid} data-option-count={question.options.length}>
          {question.options.map((option, index) => {
            const id = `${question.id}-${option.value}`;
            const checked = answer === option.value;
            return (
              <label className={styles.choiceOption} htmlFor={id} key={option.value}>
                <input
                  aria-describedby={option.description ? `${id}-description` : undefined}
                  aria-label={option.label}
                  checked={checked}
                  id={id}
                  name={question.id}
                  onChange={() => onAnswer(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span className={styles.choiceMaterial}>
                  <span className={styles.choiceIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.choiceCopy}>
                    <strong>{option.label}</strong>
                    {option.description && <small id={`${id}-description`}>{option.description}</small>}
                  </span>
                  <i className={styles.choiceIndicator} aria-hidden="true" />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (question.fieldType === "multiple-choice") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <fieldset className={styles.choiceFieldset} aria-describedby={describedBy}>
        <legend className={styles.visuallyHidden}>{question.title}</legend>
        <div className={styles.multiChoiceGrid}>
          {question.options.map((option, index) => {
            const id = `${question.id}-${option.value}`;
            const checked = selected.includes(option.value);
            return (
              <label className={styles.choiceOption} htmlFor={id} key={option.value}>
                <input
                  aria-label={option.label}
                  checked={checked}
                  id={id}
                  name={question.id}
                  onChange={() => {
                    if (question.exclusiveOption === option.value) {
                      onAnswer(checked ? [] : [option.value]);
                      return;
                    }
                    const withoutExclusive = selected.filter((item) => item !== question.exclusiveOption);
                    onAnswer(
                      checked
                        ? withoutExclusive.filter((item) => item !== option.value)
                        : [...withoutExclusive, option.value],
                    );
                  }}
                  type="checkbox"
                  value={option.value}
                />
                <span className={styles.choiceMaterial}>
                  <span className={styles.choiceIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.choiceCopy}><strong>{option.label}</strong></span>
                  <i className={styles.checkboxIndicator} aria-hidden="true" />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (
    question.fieldType === "date" ||
    question.fieldType === "money" ||
    question.fieldType === "text" ||
    question.fieldType === "address"
  ) {
    const inputType = question.fieldType === "date" ? "date" : "text";
    const inputValue = typeof answer === "string" ? answer : "";
    const today = new Date().toISOString().slice(0, 10);
    return (
      <div className={styles.inputField}>
        <label htmlFor={question.id}>
          {question.reviewLabel ?? question.title}
          {!question.required && <span>Optional</span>}
        </label>
        <div className={question.fieldType === "money" ? styles.moneyInput : undefined}>
          {question.fieldType === "money" && <span aria-hidden="true">£</span>}
          <input
            aria-describedby={describedBy}
            aria-invalid={errorId ? true : undefined}
            autoComplete="off"
            id={question.id}
            inputMode={question.inputMode}
            max={question.fieldType === "date" && !question.validation?.allowFuture ? today : undefined}
            onBlur={(event) => onAnswer(event.currentTarget.value || undefined)}
            onChange={(event) => onAnswer(event.currentTarget.value || undefined)}
            placeholder={question.placeholder}
            type={inputType}
            value={inputValue}
          />
        </div>
        {!question.required && <small>Leave blank if you do not know.</small>}
      </div>
    );
  }

  if (question.fieldType === "confirmation") {
    return (
      <label className={styles.confirmationField} htmlFor={question.id}>
        <input
          checked={answer === true}
          id={question.id}
          onChange={(event) => onAnswer(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>{question.confirmationLabel}</span>
      </label>
    );
  }

  return null;
}
