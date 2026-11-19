import type { MetadataRoute } from "next";

const SITE = "https://www.stillhereoffline.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Purchase flow and APIs: nothing useful for search, and /download URLs carry receipts.
      disallow: ["/api/", "/checkout", "/download"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
