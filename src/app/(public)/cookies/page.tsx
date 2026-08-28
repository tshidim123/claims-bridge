import { CookiesRoute } from "@/components/public/public-legal-routes";
import { createPublicMetadata } from "@/config/public-site";
export const metadata = createPublicMetadata("Cookies at Claims Bridge", "A truthful cookie architecture based on the technologies actually enabled by the Claims Bridge website and account.", "/cookies");
export default function CookiesPage() { return <CookiesRoute />; }
