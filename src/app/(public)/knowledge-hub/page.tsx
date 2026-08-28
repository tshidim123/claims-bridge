import type { Metadata } from "next";

import { KnowledgeHubIndex } from "@/components/knowledge-hub/knowledge-hub-index";
import { createPublicMetadata } from "@/config/public-site";

export const metadata: Metadata = createPublicMetadata("Knowledge Hub", "Clear, qualified guidance about deposit protection, evidence, eligibility and the Claims Bridge process.", "/knowledge-hub");

export default async function KnowledgeHubPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const params = await searchParams;
  return <KnowledgeHubIndex query={typeof params.query === "string" ? params.query : ""} />;
}
