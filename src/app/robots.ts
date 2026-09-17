import type { MetadataRoute } from "next";

// Keep private dashboards (per-user data) out of search indexes. Public
// marketing/directory pages (landing, lawyer directory, login, signup) stay
// crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/admin",
        "/*/admin/*",
        "/*/lawyer",
        "/*/lawyer/*",
        "/*/citizen",
        "/*/citizen/*",
        "/*/reset-password",
      ],
    },
    sitemap: "https://qanuni.site/sitemap.xml",
  };
}
