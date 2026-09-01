import type { EligibilityAnswers, EligibilityQuestion, EligibilityQuestionId } from "@/lib/eligibility/types";
import { getReviewQuestions } from "@/lib/eligibility/flow";
import { eligibilitySections } from "@/content/eligibility/copy";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import styles from "./eligibility.module.css";

function answerLabel(question: EligibilityQuestion, value: EligibilityAnswers[EligibilityQuestionId]) {
  const options = "options" in question ? question.options : undefined;
  if (Array.isArray(value)) return value.map((item) => options?.find((option) => option.value === item)?.label ?? item).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return options?.find((option) => option.value === value)?.label ?? String(value ?? "");
}

export function EligibilityReview({ answers, completedQuestionIds, onEdit, onContinue }: { answers: EligibilityAnswers; completedQuestionIds: EligibilityQuestionId[]; onEdit: (id: EligibilityQuestionId) => void; onContinue: () => void }) {
  const questions = getReviewQuestions(answers, completedQuestionIds);
  const value = (question: EligibilityQuestion) => question.id === "jurisdiction" && answers.jurisdiction === "custom" ? `Custom — ${String(answers.custom_location ?? "")}` : answerLabel(question, answers[question.id]);

  return <section className={styles.reviewPanel} aria-labelledby="eligibility-step-title">
    <header className={styles.reviewHeader}>
      <p className="eyebrow">Assessment complete</p>
      <h2 id="eligibility-step-title" tabIndex={-1}>Review the picture before seeing your preliminary route.</h2>
      <p>Your answers are grouped below so you can check the details that shape this preliminary assessment.</p>
    </header>
    <div className={styles.reviewProgress} aria-label="Assessment progression"><span>Assessment complete</span><i aria-hidden="true" /><strong>Preliminary route next</strong></div>
    <div className={styles.reviewSections}>{eligibilitySections.filter((section) => questions.some((question) => question.section === section.id)).map((section) => <section className={styles.reviewSection} key={section.id}>
      <header><span>{section.index}</span><div><p className="eyebrow">{section.label}</p><h3>{section.description}</h3></div></header>
      <dl>{questions.filter((question) => question.section === section.id && question.id !== "custom_location").map((question) => <div className={styles.reviewRow} key={question.id}>
        <div><dt>{question.reviewLabel ?? question.title}</dt><dd>{value(question)}</dd></div>
        <Button aria-label={`Edit ${question.reviewLabel ?? question.title}`} className={styles.editAnswer} onClick={() => onEdit(question.id)} size="small" variant="quiet">Edit <Icon name="arrow" /></Button>
      </div>)}</dl>
    </section>)}</div>
    <div className={styles.reviewActions}><div><p className="eyebrow">Ready when you are</p><p>We’ll show a preliminary route, not a legal conclusion.</p></div><Button onClick={onContinue} size="large">See preliminary route <Icon name="arrow" /></Button></div>
  </section>;
}
