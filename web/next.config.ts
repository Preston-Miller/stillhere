import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {
        // Send visitors on the default Vercel address to the real domain (one site for search
        // engines). /api/ is left alone so anything posting there, like a webhook, keeps working.
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "offgridai.vercel.app" }],
        destination: "https://www.stillhereoffline.com/:path",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No other site may frame these pages (clickjacking the buy button or admin).
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Never send /download?session_id=... (the receipt) to another site.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/api/admin", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      {
        // Framed by /download (same site only) to report a purchase to Google Ads. Overrides the rule above.
        source: "/ads-purchase",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
