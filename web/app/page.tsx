import Image from "next/image";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { CanceledBanner } from "./canceled-banner";
import { BuyButton, Footer, Nav } from "./components";
import { DemoVideo } from "./demo-video";
import { DownloadButtons } from "./download-buttons";
import { LOGO_CREAM, LogoMark } from "./logo";
import { COMPATIBILITY, FAQ, INCLUDED, PRICE_DISPLAY, REVIEW_TOPICS, TOPIC_CARDS } from "@/lib/content";
import mapShot from "@/public/app-map.jpg";
import heroPhoto from "@/public/hero-photo.jpg";

const CDC_URL = "https://www.cdc.gov/drinking-water/about/collecting-rainwater-and-your-health-an-overview.html";

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

function Feature({
  title,
  tagline,
  stat,
  caption,
  children,
}: {
  title: string;
  tagline: string;
  stat: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col px-6 py-8 text-center">
      <h3 className="font-brand text-2xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{tagline}</p>
      <p className="mt-5 font-brand text-4xl font-semibold text-amber">{stat}</p>
      <p className="mt-1 text-sm text-muted">{caption}</p>
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

        {/* Demo: the "works offline" heading, then a real screen recording of the app */}
        <section id="demo" className="scroll-mt-4">
          <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
            <SectionTitle sub="Set it up once. There when you need it.">
              Everything works offline.
            </SectionTitle>
            <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/50">
              <div className="flex items-center gap-1.5 border-b border-line px-3 py-2" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-xs text-muted">stillhere</span>
              </div>
              <DemoVideo src="/demo.mp4" poster="/demo-poster.jpg" label="stillhere answering whether rainwater from a roof is safe to drink, citing a CDC guide, then zooming into Provo on the offline map and saving a pin named Home as a shelter" />
            </div>
            <p className="mt-3 text-center text-xs text-muted">
              Real recording of stillhere on a Mac. The wait for the answer is sped up.
            </p>
          </div>
        </section>

        {/* Three things, side by side */}
        <section id="features" className="scroll-mt-4 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
              <Feature title="AI" tagline="Ask in plain words." stat="On your computer" caption="no cloud, no account">
                <div className="space-y-3 p-4 text-sm">
                  <p className="font-mono text-xs text-muted">
                    <span className="text-amber">&gt;</span> can i drink rainwater off my roof?
                  </p>
                  <p className="leading-relaxed text-fg/90">
                    Not without treating it first. Rainwater can carry germs and chemicals from the air, your roof
                    and gutters, even when it looks clean.
                  </p>
                  <a
                    href={CDC_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-olive/50 px-2.5 py-1 text-xs text-olive hover:bg-olive/10"
                  >
                    Source: CDC <span aria-hidden>↗</span>
                  </a>
                </div>
              </Feature>
              <Feature title="Guides" tagline="Public emergency guides." stat="6 topics" caption="12 common questions ready today">
                <ul className="divide-y divide-line text-sm">
                  {TOPIC_CARDS.slice(0, 5).map((t) => (
                    <li key={t.title} className="flex items-start gap-2 px-4 py-2.5 text-fg/90">
                      <span className="text-olive" aria-hidden>
                        ✓
                      </span>
                      {t.examples[0]}
                    </li>
                  ))}
                </ul>
              </Feature>
              <Feature title="Maps" tagline="Search with no signal." stat="Every state" caption="U.S. street maps you choose">
                <a href="/app-map.jpg" target="_blank" className="relative block aspect-[4/3]">
                  <Image
                    src={mapShot}
                    alt="stillhere's offline map, showing a search result for Sanpete Valley Hospital in Utah"
                    fill
                    sizes="(min-width: 768px) 360px, 100vw"
                    className="object-cover object-[60%_40%]"
                    placeholder="blur"
                  />
                </a>
              </Feature>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              AI answer is an illustration; real answers vary. CDC does not endorse stillhere. Map: real app
              screenshot, data © OpenStreetMap contributors, basemap by Protomaps.
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
