"use client";

import { Analytics } from "@vercel/analytics/next";

/** Vercel Web Analytics (no cookies). Query strings are dropped so purchase IDs on /download never get recorded. */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
