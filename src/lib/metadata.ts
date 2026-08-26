import type { Metadata } from "next";

export const siteDescription =
  "Clear, evidence-led support for private renters navigating tenancy deposit protection issues.";

export function getConfiguredSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) return undefined;

  try {
    return new URL(configuredUrl);
  } catch {
    return undefined;
  }
}

type PageMetadataOptions = {
  canonicalPath?: `/${string}`;
};

export function createPageMetadata(
  title: string,
  description: string,
  options: PageMetadataOptions = {},
): Metadata {
  const siteUrl = getConfiguredSiteUrl();
  const canonical = options.canonicalPath && siteUrl
    ? new URL(options.canonicalPath, siteUrl).toString()
    : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      siteName: "Claims Bridge",
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
