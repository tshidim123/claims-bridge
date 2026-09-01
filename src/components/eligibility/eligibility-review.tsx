import type { EligibilityAnswers, EligibilityQuestionId } from "@/lib/eligibility/types";
import { getReviewQuestions } from "@/lib/eligibility/flow";
import { eligibilitySections } from "@/content/eligibility/copy";
import { Button } from "@/components/ui/button";
import styles from "./eligibility.module.css";
export function EligibilityReview({ answers, completedQuestionIds, onEdit, onContinue }: { answers: EligibilityAnswers; completedQuestionIds: EligibilityQuestionId[]; onEdit: (id: EligibilityQuestionId) => void; onContinue: () => void }) {
 const questions = getReviewQuestions(answers, completedQuestionIds);
 const value = (id: EligibilityQuestionId) => id === "jurisdiction" && answers.jurisdiction === "custom" ? `Custom — ${String(answers.custom_location ?? "")}` : Array.isArray(answers[id]) ? (answers[id] as string[]).join(", ") : String(answers[id]);
 return <section className={styles.reviewPanel} aria-labelledby="eligibility-step-title"><header className={styles.reviewHeader}><p className="eyebrow">Review your answers</p><h2 id="eligibility-step-title" tabIndex={-1}>Check the picture before continuing.</h2><p>Only questions relevant to your route are shown. Editing an answer may change later questions.</p></header><div className={styles.reviewSections}>{eligibilitySections.filter((section) => questions.some((q) => q.section === section.id)).map((section) => <section className={styles.reviewSection} key={section.id}><header><span>{section.index}</span><h3>{section.label}</h3></header><dl>{questions.filter((q) => q.section !== "property" || q.id !== "custom_location").map((q) => <div className={styles.reviewRow} key={q.id}><div><dt>{q.reviewLabel ?? q.title}</dt><dd>{value(q.id)}</dd></div><Button onClick={() => onEdit(q.id)} size="small" variant="quiet">Edit {q.reviewLabel ?? q.title}</Button></div>)}</dl></section>)}</div><div className={styles.reviewActions}><Button onClick={onContinue} size="large">See preliminary route</Button></div></section>;
}
