import type { MetadataRoute } from "next";

const SITE_URL = "https://qanuni.site";
const PUBLIC_PATHS = ["", "/lawyers", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ["ar", "en"].flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    }))
  );
}
