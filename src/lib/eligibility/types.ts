export type EligibilitySectionId =
  | "property"
  | "tenancy"
  | "deposit"
  | "protection"
  | "information"
  | "evidence"
  ;

export type EligibilityQuestionId =
  | "jurisdiction"
  | "custom_location"
  | "jurisdiction_route"
  | "main_home"
  | "tenancy_party"
  | "tenancy_start"
  | "deposit_paid"
  | "deposit_uncertain"
  | "deposit_amount"
  | "deposit_paid_date"
  | "deposit_recipient"
  | "protected_told"
  | "protection_scheme"
  | "registration_evidence"
  | "protection_timing"
  | "deposit_information"
  | "information_held"
  | "tenancy_ended"
  | "tenancy_end"
  | "evidence_available";

export type EligibilityStepId = "intro" | EligibilityQuestionId | "review" | "outcome";

export type AnswerValue = string | string[] | boolean;
export type EligibilityAnswers = Partial<Record<EligibilityQuestionId, AnswerValue>>;

export type AnswerCondition =
  | {
      questionId: EligibilityQuestionId;
      operator: "equals" | "not-equals";
      value: AnswerValue;
    }
  | {
      questionId: EligibilityQuestionId;
      operator: "in" | "not-in";
      values: AnswerValue[];
    }
  | {
      questionId: EligibilityQuestionId;
      operator: "answered" | "not-answered";
    };

export type VisibilityRule = {
  all?: AnswerCondition[];
  any?: AnswerCondition[];
};

export type NextStepRule = {
  when: AnswerCondition;
  next: EligibilityQuestionId | "review";
};

export type QuestionOption = {
  description?: string;
  label: string;
  value: string;
};

export type QuestionValidation = {
  allowFuture?: boolean;
  max?: number;
  message?: string;
  min?: number;
};

type QuestionBase = {
  analyticsEventId: string;
  description: string;
  evidenceImplications?: string[];
  id: EligibilityQuestionId;
  legalReview: boolean;
  legalText?: string;
  nextStep?: NextStepRule[];
  previousStepBehavior?: "history";
  required: boolean;
  reviewLabel?: string;
  section: EligibilitySectionId;
  title: string;
  validation?: QuestionValidation;
  visibility?: VisibilityRule;
  whyWeAsk: string;
};

export type ChoiceQuestion = QuestionBase & {
  fieldType: "single-choice" | "yes-no";
  options: QuestionOption[];
};

export type MultiChoiceQuestion = QuestionBase & {
  exclusiveOption?: string;
  fieldType: "multiple-choice";
  options: QuestionOption[];
};

export type InputQuestion = QuestionBase & {
  fieldType: "date" | "money" | "text" | "address";
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
};

export type InformationalQuestion = QuestionBase & {
  continueLabel?: string;
  fieldType: "informational";
  required: false;
};

export type ConfirmationQuestion = QuestionBase & {
  confirmationLabel: string;
  fieldType: "confirmation";
};

export type ReviewQuestion = QuestionBase & {
  fieldType: "review";
  required: false;
};

export type EligibilityQuestion =
  | ChoiceQuestion
  | MultiChoiceQuestion
  | InputQuestion
  | InformationalQuestion
  | ConfirmationQuestion
  | ReviewQuestion;

export type AssessmentStatus = "intro" | "in-progress" | "review" | "complete";

export type AssessmentState = {
  answers: EligibilityAnswers;
  completedSectionIds: EligibilitySectionId[];
  completedQuestionIds: EligibilityQuestionId[];
  currentStepId: EligibilityStepId;
  editingFromReview: boolean;
  outcomeId?: OutcomeType;
  history: EligibilityQuestionId[];
  startedAt: string | null;
  status: AssessmentStatus;
  updatedAt: string;
  version: 1;
};

export type AssessmentDirection = "backward" | "forward";

export type OutcomeType =
  | "REVIEW_RECOMMENDED"
  | "MORE_INFORMATION_NEEDED"
  | "OUTSIDE_CURRENT_SCOPE"
  | "NO_DEPOSIT_PATH"
  | "INDIVIDUAL_REVIEW";

export type EvidenceRecommendationId =
  | "tenancy_agreement"
  | "deposit_payment"
  | "protection_certificate"
  | "prescribed_information"
  | "landlord_agent_messages"
  | "scheme_correspondence"
  | "other_evidence";

export type EvidenceRecommendation = {
  description: string;
  id: EvidenceRecommendationId;
  label: string;
  status: "available" | "helpful";
};

export type OutcomeContent = {
  ctaLabel: string;
  eyebrow: string;
  explanation: string;
  headline: string;
  legalReview: boolean;
  nextSteps: string[];
  secondaryCtaLabel: string;
  type: OutcomeType;
};

export type AssessmentOutcome = OutcomeContent & {
  evidence: EvidenceRecommendation[];
  reasons: string[];
};

export type SectionDefinition = {
  description: string;
  id: EligibilitySectionId;
  index: string;
  label: string;
};
