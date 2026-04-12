import type { MetadataRoute } from "next";

const SITE_URL = "https://sinai-dashboard-production.up.railway.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Dashboard pages are auth-gated and noindex'd, but we list public landing
    // and any future public surfaces here. Add /permits/[city] entries when
    // the SEO Factory module ships.
  ];
}
