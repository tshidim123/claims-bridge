import { eligibilityQuestionMap, eligibilityQuestions } from "@/content/eligibility/questions";
import type {
  AnswerCondition,
  AnswerValue,
  EligibilityAnswers,
  EligibilityQuestion,
  EligibilityQuestionId,
  EligibilitySectionId,
} from "@/lib/eligibility/types";

function hasAnswer(value: AnswerValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined;
}

function valuesEqual(left: AnswerValue | undefined, right: AnswerValue) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

export function conditionMatches(condition: AnswerCondition, answers: EligibilityAnswers) {
  const answer = answers[condition.questionId];

  switch (condition.operator) {
    case "answered":
      return hasAnswer(answer);
    case "not-answered":
      return !hasAnswer(answer);
    case "equals":
      return valuesEqual(answer, condition.value);
    case "not-equals":
      return !valuesEqual(answer, condition.value);
    case "in":
      return condition.values.some((value) => valuesEqual(answer, value));
    case "not-in":
      return !condition.values.some((value) => valuesEqual(answer, value));
  }
}

export function isQuestionVisible(question: EligibilityQuestion, answers: EligibilityAnswers) {
  if (!question.visibility) return true;
  const allMatch = question.visibility.all?.every((condition) => conditionMatches(condition, answers)) ?? true;
  const anyMatch = question.visibility.any?.some((condition) => conditionMatches(condition, answers)) ?? true;
  return allMatch && anyMatch;
}

export function getVisibleQuestions(answers: EligibilityAnswers) {
  return eligibilityQuestions.filter((question) => isQuestionVisible(question, answers));
}

export function getNextStepId(
  currentId: EligibilityQuestionId,
  answers: EligibilityAnswers,
): EligibilityQuestionId | "review" {
  const current = eligibilityQuestionMap.get(currentId);
  const directed = current?.nextStep?.find((rule) => conditionMatches(rule.when, answers));
  if (directed) return directed.next;

  const currentIndex = eligibilityQuestions.findIndex((question) => question.id === currentId);
  const nextQuestion = eligibilityQuestions
    .slice(currentIndex + 1)
    .find((question) => isQuestionVisible(question, answers));
  return nextQuestion?.id ?? "review";
}

export function pruneHiddenAnswers(answers: EligibilityAnswers) {
  const nextAnswers = { ...answers };

  for (let pass = 0; pass < eligibilityQuestions.length; pass += 1) {
    let changed = false;
    for (const question of eligibilityQuestions) {
      if (!isQuestionVisible(question, nextAnswers) && question.id in nextAnswers) {
        delete nextAnswers[question.id];
        changed = true;
      }
    }
    if (!changed) break;
  }

  return nextAnswers;
}

export function getReviewQuestions(answers: EligibilityAnswers, completedIds: EligibilityQuestionId[]) {
  const completed = new Set(completedIds);
  return eligibilityQuestions.filter(
    (question) =>
      completed.has(question.id) &&
      isQuestionVisible(question, answers) &&
      question.reviewLabel &&
      hasAnswer(answers[question.id]),
  );
}

export function getReachedSections(
  answers: EligibilityAnswers,
  completedIds: EligibilityQuestionId[],
  currentQuestion?: EligibilityQuestion,
) {
  const reached = new Set<EligibilitySectionId>();
  for (const id of completedIds) {
    const question = eligibilityQuestionMap.get(id);
    if (question && isQuestionVisible(question, answers)) reached.add(question.section);
  }
  if (currentQuestion) reached.add(currentQuestion.section);
  return reached;
}

export function getFirstQuestionId(): EligibilityQuestionId {
  return eligibilityQuestions[0].id;
}

export function getQuestionById(id: EligibilityQuestionId) {
  return eligibilityQuestionMap.get(id);
}
