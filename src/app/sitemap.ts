import type { MetadataRoute } from "next";

import { publicRoutePaths } from "@/config/public-site";
import { getConfiguredSiteUrl } from "@/lib/metadata";
import { getPopulatedCategories, getPublishedArticles } from "@/lib/knowledge-hub";

export function getPublicSitemapPaths() {
  return [
    ...publicRoutePaths,
    ...getPopulatedCategories().map((category) => `/knowledge-hub/category/${category.slug}`),
    ...getPublishedArticles().map((article) => `/knowledge-hub/${article.slug}`),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getConfiguredSiteUrl();

  return getPublicSitemapPaths().map((path) => ({
    url: siteUrl ? new URL(path, siteUrl).toString() : path,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
