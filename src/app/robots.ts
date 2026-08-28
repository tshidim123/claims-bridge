import type { MetadataRoute } from "next";

import { getConfiguredSiteUrl } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getConfiguredSiteUrl();

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/api", "/sign-in", "/sign-up"] }],
    sitemap: siteUrl ? new URL("/sitemap.xml", siteUrl).toString() : undefined,
  };
}
