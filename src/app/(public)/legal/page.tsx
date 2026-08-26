import { PageFoundation } from "@/components/layout/page-foundation";
import { createPageMetadata } from "@/lib/metadata";

const description = "A foundation for verified company, service, legal and regulatory information before Claims Bridge becomes operational.";

export const metadata = createPageMetadata("Legal and regulatory information", description);

export default function LegalInformationPage() {
  return (
    <PageFoundation
      eyebrow="Legal information"
      title="Legal and regulatory information"
      description={description}
      plannedSections={["Company information", "Service status", "Regulatory position", "Client terms", "Privacy and cookies", "Complaints", "Accessibility", "Contact"]}
      links={[{ label: "Privacy", href: "/legal/privacy" }, { label: "Terms", href: "/legal/terms" }, { label: "Complaints", href: "/legal/complaints" }, { label: "Accessibility", href: "/legal/accessibility" }]}
    />
  );
}
