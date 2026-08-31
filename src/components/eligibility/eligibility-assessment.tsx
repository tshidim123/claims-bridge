"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AssessmentContextRail, AssessmentGuidancePanel } from "@/components/eligibility/assessment-context";
import { EligibilityIntro } from "@/components/eligibility/eligibility-intro";
import { EligibilityProgress } from "@/components/eligibility/eligibility-progress";
import { EligibilityReview } from "@/components/eligibility/eligibility-review";
import { EligibilityOutcome } from "@/components/eligibility/eligibility-outcome";
import { QuestionRenderer } from "@/components/eligibility/question-renderer";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ApplicationContainer } from "@/components/layout/application-container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { eligibilitySections } from "@/content/eligibility/copy";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { getNextStepId, getQuestionById, getReachedSections, pruneHiddenAnswers } from "@/lib/eligibility/flow";
import { createInitialAssessmentState, startAssessmentState } from "@/lib/eligibility/state";
import type { AnswerValue, AssessmentDirection, AssessmentState, EligibilityQuestionId, EligibilitySectionId } from "@/lib/eligibility/types";
import { normaliseMoneyInput, validateQuestionAnswer } from "@/lib/eligibility/validation";
import { secureAssessmentHandoff } from "@/lib/eligibility/persistence/actions";
import styles from "./eligibility.module.css";

export function EligibilityAssessment() {
  const [assessment, setAssessment] = useState<AssessmentState>(createInitialAssessmentState);
  const router = useRouter();
  const [direction, setDirection] = useState<AssessmentDirection>("forward");
  const [error, setError] = useState<string | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusNext = useRef(false);
  const currentQuestion = !["intro", "review", "outcome"].includes(assessment.currentStepId)
    ? getQuestionById(assessment.currentStepId as EligibilityQuestionId) : undefined;
  const currentSection: EligibilitySectionId = currentQuestion?.section ?? "evidence";
  const section = eligibilitySections.find((item) => item.id === currentSection) ?? eligibilitySections[0];
  const reachedSections = useMemo(() => getReachedSections(assessment.answers, assessment.completedQuestionIds, currentQuestion), [assessment.answers, assessment.completedQuestionIds, currentQuestion]);

  useEffect(() => {
    if (restartOpen) { dialogRef.current?.showModal(); requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>("[data-cancel]")?.focus()); }
    else if (dialogRef.current?.open) { dialogRef.current.close(); requestAnimationFrame(() => restartRef.current?.focus()); }
  }, [restartOpen]);
  useEffect(() => { if (!focusNext.current) return; focusNext.current = false; requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true })); }, [assessment.currentStepId]);
  const move = (next: AssessmentState, d: AssessmentDirection) => { setError(null); setDirection(d); focusNext.current = true; setAssessment(next); };
  const handleAnswer = (value: AnswerValue | undefined) => { if (!currentQuestion) return; setError(null); setAssessment((current) => { const answers = { ...current.answers }; if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete answers[currentQuestion.id]; else answers[currentQuestion.id] = value; return { ...current, answers: pruneHiddenAnswers(answers), outcomeId: undefined, updatedAt: new Date().toISOString() }; }); };
  const handleContinue = () => { if (!currentQuestion) return; let answers = assessment.answers; const result = validateQuestionAnswer(currentQuestion, answers[currentQuestion.id], answers); if (!result.valid) { setError(result.error); requestAnimationFrame(() => errorRef.current?.focus()); return; } if (currentQuestion.fieldType === "money" && typeof answers[currentQuestion.id] === "string") answers = { ...answers, [currentQuestion.id]: normaliseMoneyInput(answers[currentQuestion.id] as string) }; answers = pruneHiddenAnswers(answers); const next = getNextStepId(currentQuestion.id, answers); const completedQuestionIds = Array.from(new Set([...assessment.completedQuestionIds, currentQuestion.id])); const completedSectionIds = Array.from(new Set([...assessment.completedSectionIds, currentQuestion.section])); move({ ...assessment, answers, completedQuestionIds, completedSectionIds, currentStepId: next, history: [...assessment.history, currentQuestion.id], status: next === "review" ? "review" : "in-progress", editingFromReview: false, outcomeId: undefined, updatedAt: new Date().toISOString() }, "forward"); };
  const handleBack = () => { const history = [...assessment.history]; const previous = history.pop(); if (!previous) return; move({ ...assessment, currentStepId: previous, history, status: "in-progress", outcomeId: undefined, updatedAt: new Date().toISOString() }, "backward"); };
  const handleHandoff = async () => { const result = await secureAssessmentHandoff(assessment); if (result.kind === "handoff") router.push(`/sign-up?handoff=${encodeURIComponent(result.token)}&redirect_url=%2Faccount%2Fonboarding`); else if (result.kind === "saved") router.push("/account/assessment"); else setError(result.message); };
  const restart = () => { setRestartOpen(false); move(startAssessmentState(), "backward"); };
  if (assessment.status === "intro") return <EligibilityIntro headingRef={headingRef} hydrated onStart={() => move(startAssessmentState(), "forward")} />;
  if (assessment.currentStepId === "review") return <AssessmentShell><EligibilityReview answers={assessment.answers} completedQuestionIds={assessment.completedQuestionIds} onEdit={(id) => move({ ...assessment, currentStepId: id, editingFromReview: true, status: "in-progress" }, "backward")} onContinue={() => move({ ...assessment, currentStepId: "outcome", status: "complete", outcomeId: buildAssessmentOutcome(assessment.answers).type }, "forward")} /></AssessmentShell>;
  if (assessment.currentStepId === "outcome") return <AssessmentShell><EligibilityOutcome outcome={buildAssessmentOutcome(assessment.answers)} assessment={assessment} onContinue={handleHandoff} onReview={() => move({ ...assessment, currentStepId: "review", status: "review" }, "backward")} /></AssessmentShell>;
  if (!currentQuestion) return null;
  return <div className={styles.eligibilityPage} data-direction={direction}><div className={styles.assessmentAtmosphere} aria-hidden="true"><span /><span /><span /></div><ApplicationContainer className={styles.activeContainer}><header className={styles.assessmentHeader}><div><p className="eyebrow">Preliminary assessment</p><h1>Check your tenancy deposit circumstances.</h1></div><div className={styles.assessmentUtilities}><span>No account or uploads required</span><Button onClick={() => setRestartOpen(true)} size="small" variant="quiet" ref={restartRef}>Restart</Button></div></header><p className={styles.visuallyHidden} aria-live="polite">Stage {section.index} of 06: {section.label}. {currentQuestion.title}</p><EligibilityProgress currentSection={currentSection} reachedSections={reachedSections} /><div className={styles.workspace}><AssessmentContextRail currentSection={currentSection} section={section} /><GlassSurface className={styles.assessmentGlass} strength="strong"><div className={styles.panelTransition} data-step={assessment.currentStepId}><form className={styles.questionPanel} noValidate onSubmit={(event) => { event.preventDefault(); handleContinue(); }}><header className={styles.questionHeader}><div className={styles.questionMeta}><span>{section.index}</span><p>{section.label}</p><small>{currentQuestion.required ? "Answer required" : "Optional answer"}</small></div><h2 id="eligibility-step-title" ref={headingRef} tabIndex={-1}>{currentQuestion.title}</h2><p id={`${currentQuestion.id}-description`}>{currentQuestion.description}</p></header>{error && <div className={styles.questionError} id={`${currentQuestion.id}-error`} ref={errorRef} role="alert" tabIndex={-1}><p><strong>Check this answer</strong>{error}</p></div>}<QuestionRenderer answer={assessment.answers[currentQuestion.id]} descriptionId={`${currentQuestion.id}-description`} errorId={error ? `${currentQuestion.id}-error` : undefined} onAnswer={handleAnswer} question={currentQuestion} /><details className={styles.mobileContext}><summary>Why we ask this <Icon name="chevron" /></summary><p>{currentQuestion.whyWeAsk}</p></details><div className={styles.questionActions}><div>{assessment.history.length > 0 && <Button onClick={handleBack} variant="quiet">Back</Button>}</div><Button size="large" type="submit">Continue <Icon name="arrow" /></Button></div></form></div></GlassSurface><AssessmentGuidancePanel currentQuestion={currentQuestion} currentSection={currentSection} section={section} /></div><dialog ref={dialogRef} className={styles.restartDialog} aria-modal="true" aria-labelledby="restart-title" aria-describedby="restart-description" onCancel={() => setRestartOpen(false)}><p className="eyebrow">Restart assessment</p><h2 id="restart-title">Restart your assessment?</h2><p id="restart-description">Your current answers will be cleared and you will return to the beginning of the assessment.</p><div><Button data-cancel onClick={() => setRestartOpen(false)} variant="quiet">Cancel</Button><Button onClick={restart}>Restart assessment</Button></div></dialog></ApplicationContainer></div>;
}
function AssessmentShell({ children }: { children: React.ReactNode }) { return <div className={styles.eligibilityPage}><ApplicationContainer className={styles.activeContainer}><GlassSurface className={styles.assessmentGlass} strength="strong"><div className={styles.panelTransition}>{children}</div></GlassSurface></ApplicationContainer></div>; }
