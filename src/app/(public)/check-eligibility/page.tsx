import { EligibilityAssessment } from "@/components/eligibility/eligibility-assessment";
import { createPageMetadata } from "@/lib/metadata";

const description =
  "Use a guided preliminary assessment to organise what you know about your tenancy deposit, protection information and available evidence.";

export const metadata = createPageMetadata(
  "Check your tenancy deposit circumstances",
  description,
  { canonicalPath: "/check-eligibility" },
);

export default function CheckEligibilityPage() {
  return <EligibilityAssessment />;
}
