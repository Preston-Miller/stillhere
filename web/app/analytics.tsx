"use client";

import { Analytics } from "@vercel/analytics/next";

/** Vercel Web Analytics (no cookies). Query strings are dropped so purchase IDs on /download never get recorded. */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (url.pathname === "/ads-purchase") return null; // the hidden frame on /download, not a visit
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
