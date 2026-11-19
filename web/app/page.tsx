import Image from "next/image";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { CanceledBanner } from "./canceled-banner";
import { BuyButton, Footer, Nav } from "./components";
import { AiScene } from "./ai-scene";
import { GuidesScene } from "./guides-scene";
import { MapsScene } from "./maps-scene";
import { DownloadButtons } from "./download-buttons";
import { LOGO_CREAM, LogoMark } from "./logo";
import { COMPATIBILITY, FAQ, INCLUDED, PRICE_DISPLAY, REVIEW_TOPICS, TOPIC_CARDS } from "@/lib/content";
import heroPhoto from "@/public/hero-photo.jpg";

function PriceLine({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`space-y-1 text-sm text-center ${dark ? "text-bg/80" : "text-muted"}`}>
      <p>
        <span className={`font-semibold ${dark ? "text-bg" : "text-fg"}`}>{PRICE_DISPLAY}</span> · One-time purchase {" "}
        · 30-day money-back guarantee
      </p>
    </div>
  );
}

function SectionTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-12 text-center">
      <h2 className="font-brand text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-muted">{sub}</p>}
    </div>
  );
}

function Feature({ title, tagline, children }: { title: string; tagline: string; children: ReactNode }) {
  return (
    <div className="flex flex-col px-6 py-8 text-center">
      <h3 className="font-brand text-2xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{tagline}</p>
      <div className="mt-6 flex-1 overflow-hidden rounded-xl border border-line bg-panel text-left">{children}</div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <Suspense fallback={null}>
        <CanceledBanner />
      </Suspense>
      <main className="flex-1">
        {/* Hero: logo, headline, then buy. Centered */}
        <section className="relative overflow-hidden">
          <Image
            src={heroPhoto}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[30%_center] opacity-35 [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
            <div className="flex flex-col items-center text-center">
              <h1 className="flex items-center gap-3 sm:gap-4">
                <LogoMark className="h-12 w-auto sm:h-16" />
                <span
                  className="font-brand text-6xl font-semibold tracking-tight sm:text-7xl"
                  style={{ color: LOGO_CREAM }}
                >
                  stillhere
                </span>
              </h1>
              <p className="mt-6 text-balance font-brand text-2xl font-medium tracking-tight sm:text-4xl">
                AI, emergency guides, and maps that work offline.
              </p>
              <p className="mt-10 text-sm text-muted">
                <span className="font-semibold text-fg">{PRICE_DISPLAY}</span> · One-time purchase · No subscription
              </p>
              <DownloadButtons />
            </div>
          </div>
        </section>

        {/* Everything works offline: the three features, each with an animated walkthrough */}
        <section id="features" className="scroll-mt-4">
          <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <SectionTitle sub="Set it up once. There when you need it.">
              Everything works offline.
            </SectionTitle>
            <div className="grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
              <Feature title="AI" tagline="Ask in plain words.">
                <AiScene />
              </Feature>
              <Feature title="Guides" tagline="Public emergency guides.">
                <GuidesScene />
              </Feature>
              <Feature title="Maps" tagline="Search with no signal.">
                <MapsScene />
              </Feature>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Recreations of the real app: the AI answer is shortened from a real session, the guide titles
              are real, and the map is a real screenshot. CDC does not endorse stillhere.
              Map data © OpenStreetMap contributors, basemap by Protomaps.
            </p>
            <p className="mt-2 text-center text-xs">
              <a href="/demo.mp4" target="_blank" rel="noopener" className="text-amber hover:brightness-110">
                Watch a real recording of stillhere ↗
              </a>
            </p>
          </div>
        </section>

        {/* Topic cards */}
        <section id="guides" className="scroll-mt-4 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionTitle sub="Answers come from guides saved on your computer, with a link to the source. It can still be wrong, so check it.">
              What it can help with
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOPIC_CARDS.map((t) => (
                <div key={t.title} className="rounded-2xl border border-line bg-panel p-6">
                  <h3 className="font-brand text-xl font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted">{t.blurb}</p>
                  <ul className="mt-4 space-y-2 text-sm text-fg/85">
                    {t.examples.map((q) => (
                      <li key={q} className="flex gap-2">
                        <span className="text-amber" aria-hidden>
                          ›
                        </span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {REVIEW_TOPICS.length > 0 && (
            <details className="group mx-auto mt-8 max-w-3xl text-center">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm text-muted hover:text-fg">
                <span className="text-amber transition group-open:rotate-90" aria-hidden>
                  ›
                </span>
                Coverage before launch: {REVIEW_TOPICS.length} more topics still being checked
              </summary>
              <p className="mt-3 text-sm text-muted">
                We&apos;re confirming we can include the guides for these, or replacing them, before launch.
              </p>
              <p className="mt-2 text-sm text-fg/80">{REVIEW_TOPICS.join(" · ")}</p>
            </details>
            )}
          </div>
        </section>

        {/* What you get */}
        <section id="buy" className="scroll-mt-4 border-t border-line">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <SectionTitle sub="One payment. No subscription, and no later charges for the app or maps.">
              What {PRICE_DISPLAY} gets you
            </SectionTitle>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {INCLUDED.map((f) => (
                <li key={f} className="flex gap-2 text-fg/90">
                  <span className="text-amber" aria-hidden>
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div id="requirements" className="mt-10 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
              <h3 className="font-brand text-lg font-semibold">What your computer needs</h3>
              <div className="mt-3 grid gap-x-8 gap-y-4 text-sm text-fg/85 sm:grid-cols-2">
                {COMPATIBILITY.map((os) => (
                  <div key={os.name}>
                    <p className="label mb-2">{os.name}</p>
                    <ul className="space-y-2">
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
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-4 border-t border-line">
          <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
            <SectionTitle>Questions</SectionTitle>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span className="text-xl text-amber transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing band */}
        <section className="bg-amber text-bg">
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
            <h2 className="text-balance font-brand text-3xl font-semibold tracking-tight sm:text-5xl">
              Get it ready before the lights go out.
            </h2>
            <p className="mt-4 max-w-lg text-bg/80">
              Setup needs internet once. After that, stillhere works whenever you need it.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <BuyButton tone="dark">Get stillhere</BuyButton>
              <PriceLine dark />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
