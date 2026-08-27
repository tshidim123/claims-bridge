import { eligibilityOutcomeContent } from "@/content/eligibility/outcomes";
import type { AssessmentOutcome, EligibilityAnswers, EvidenceRecommendation } from "@/lib/eligibility/types";
const evidence = (answers: EligibilityAnswers): EvidenceRecommendation[] => {
  const out: EvidenceRecommendation[] = [];
  const add = (id: EvidenceRecommendation["id"], label: string, description: string) => out.push({ id, label, description, status: "helpful" });
  if (answers.deposit_paid === "yes" || answers.deposit_paid === "not_sure") add("deposit_payment", "Proof of deposit payment", "Bank or payment records showing the amount and date.");
  if (answers.protection_scheme && answers.protection_scheme !== "unsure") add("protection_certificate", "Protection certificate or scheme record", "Any certificate, reference or scheme correspondence.");
  if (answers.deposit_information === "yes") add("prescribed_information", "Deposit-protection information", "Keep the information you remember receiving.");
  add("tenancy_agreement", "Tenancy agreement", "The agreement and any renewals or amendments.");
  if (answers.tenancy_party) add("landlord_agent_messages", "Landlord or agent messages", "Emails, letters or messages about the tenancy or deposit.");
  return out;
};
export function buildAssessmentOutcome(answers: EligibilityAnswers): AssessmentOutcome {
  const type = answers.jurisdiction && ["scotland", "northern_ireland", "outside_uk", "not_sure"].includes(String(answers.jurisdiction)) ? "OUTSIDE_CURRENT_SCOPE" : answers.deposit_paid === "no" ? "NO_DEPOSIT_PATH" : answers.protected_told === "not_sure" || answers.deposit_information === "not_sure" || answers.protection_scheme === "unsure" ? "MORE_INFORMATION_NEEDED" : answers.protected_told === "no" ? "REVIEW_RECOMMENDED" : "INDIVIDUAL_REVIEW";
  const reasons = Object.entries(answers).slice(0, 4).map(([key, value]) => `You told us that ${key.replaceAll("_", " ")} was ${Array.isArray(value) ? value.join(", ") : String(value)}.`);
  return { ...eligibilityOutcomeContent[type], reasons, evidence: evidence(answers) };
}
