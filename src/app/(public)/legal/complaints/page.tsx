import { ComplaintsRoute } from "@/components/public/public-legal-routes";
import { createPublicMetadata } from "@/config/public-site";
export const metadata = createPublicMetadata("Claims Bridge complaints", "A transparent framework for raising a Claims Bridge service concern without inventing an unmonitored contact route.", "/complaints");

export default function ComplaintsPage() {
  return <ComplaintsRoute />;
}
