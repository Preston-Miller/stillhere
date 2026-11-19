import type { MetadataRoute } from "next";

const SITE = "https://www.stillhereoffline.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/install`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
