"use client";

import { useSearchParams } from "next/navigation";

export function CanceledBanner() {
  if (!useSearchParams().get("canceled")) return null;
  return (
    <div className="border-b border-line bg-panel px-4 py-3 text-center text-sm text-muted">
      Checkout canceled. Nothing was charged.
    </div>
  );
}
