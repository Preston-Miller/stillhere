import type { ReactNode } from "react";
import { Footer, Nav } from "./components";

/** Shared layout for the privacy policy and terms pages. */
export const LEGAL_UPDATED = "November 23, 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <p className="label mb-3 text-amber">● Last updated {LEGAL_UPDATED}</p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <div className="mt-8 space-y-4 text-fg/85 [&_a]:text-amber [&_h2]:mt-10 [&_h2]:font-brand [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
