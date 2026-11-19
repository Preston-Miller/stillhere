import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Nav } from "../components";
import { EmbeddedPay } from "./embedded";
import { COMPATIBILITY, PRICE_DISPLAY, SUPPORT_EMAIL } from "@/lib/content";

export const metadata: Metadata = {
  title: "Checkout — stillhere",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <>
      <Nav />
      {/* Phones: heading, payment form, then the details. Wider screens: details on the left, form on the right. */}
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.15fr] md:grid-rows-[auto_1fr] md:gap-x-10 md:py-16">
          <div className="md:col-start-1">
            <h1 className="font-brand text-3xl font-semibold tracking-tight sm:text-4xl">Get stillhere</h1>
            <p className="mt-2 text-muted">
              <span className="font-semibold text-fg">{PRICE_DISPLAY}</span> once. No subscription. 30-day money-back
              guarantee.
            </p>
            <p className="mt-3 text-sm text-muted md:hidden">
              Needs a Mac with Apple Silicon (M1 or newer) or a 64-bit Windows 10 or 11 PC, with 8 GB of memory.{" "}
              <a href="#requirements" className="text-amber">Full requirements</a>
            </p>
          </div>

        <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:sticky md:top-6 md:self-start">
          <EmbeddedPay />
        </div>

        <div className="space-y-8 md:col-start-1">

          <div id="requirements" className="scroll-mt-4 rounded-xl border border-line bg-panel p-5">
            <h2 className="font-brand text-lg font-semibold">Check your computer first</h2>
            <div className="mt-3 grid gap-x-6 gap-y-4 text-sm text-fg/85 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {COMPATIBILITY.map((os) => (
                <div key={os.name}>
                  <p className="label mb-2">{os.name}</p>
                  <ul className="space-y-1.5">
                    {os.items.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span className="text-muted" aria-hidden>
                          •
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              On a Mac: Apple menu → About This Mac. On Windows: Settings → System → About.
            </p>
          </div>

          <ol className="space-y-3 text-sm text-fg/85">
            <li className="flex gap-3">
              <span className="font-brand font-semibold text-amber">1</span>Pay with card, Apple Pay or Link.
            </li>
            <li className="flex gap-3">
              <span className="font-brand font-semibold text-amber">2</span>Download it on your computer from the page that
              opens next. Keep that page; it&apos;s your receipt and re-download link.
            </li>
            <li className="flex gap-3">
              <span className="font-brand font-semibold text-amber">3</span>Open it once while you have internet to download
              the AI. After that it works offline.
            </li>
          </ol>

          <p className="text-sm text-muted">
            Questions?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber hover:brightness-110">
              {SUPPORT_EMAIL}
            </a>{" "}
            · <Link href="/#faq" className="text-amber hover:brightness-110">FAQ</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
