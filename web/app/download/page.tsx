import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Footer, Nav } from "../components";
import { getPaidSession } from "@/lib/stripe";
import { SUPPORT_EMAIL } from "@/lib/content";

export const metadata: Metadata = {
  title: "Your download — stillhere",
  robots: { index: false },
};

const DOWNLOADS = [
  { os: "mac", label: "Download for Mac", note: "Apple Silicon, macOS 14+ · 0.25 GB" },
  { os: "windows", label: "Download for Windows", note: "Windows 10 or 11, 64-bit · 0.85 GB" },
];

export default function DownloadPage({ searchParams }: PageProps<"/download">) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-20 sm:px-6">
        <Suspense fallback={<p className="label">Checking your purchase…</p>}>
          <Receipt searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function Receipt({
  searchParams,
}: {
  searchParams: PageProps<"/download">["searchParams"];
}) {
  const raw = (await searchParams).session_id;
  const sessionId = typeof raw === "string" ? raw : undefined;
  const session = await getPaidSession(sessionId);

  return session ? (
    <>
      <p className="label mb-3 text-olive">● Payment confirmed</p>
      <h1 className="font-display text-5xl font-bold uppercase leading-none">
        You&apos;re set.
      </h1>
      <p className="mt-4 text-muted">
        Thanks
        {session.customer_details?.name
          ? `, ${session.customer_details.name.split(" ")[0]}`
          : ""}
        . Download it and open it now, while you have a connection. The first
        launch downloads the AI (3 to 7 GB, depending on the size you pick) and lets you add offline maps.
        After that, stillhere never needs the internet again.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {DOWNLOADS.map((d) => (
          <a
            key={d.os}
            href={`/api/download?session_id=${encodeURIComponent(session.id)}&os=${d.os}`}
            className="flex flex-col bg-amber px-6 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:brightness-110"
          >
            {d.label}
            <span className="mt-1 text-xs font-normal normal-case tracking-normal text-bg/75">{d.note}</span>
          </a>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        The first time you open it, your computer will show a warning.{" "}
        <Link href="/install" className="text-amber hover:brightness-110">
          Here&apos;s the one-time fix
        </Link>
        .
      </p>

      <div className="mt-10 space-y-3 border border-line bg-panel p-5 text-sm">
        <p className="label">Keep this page</p>
        <p className="text-muted">
          Bookmark this URL. It&apos;s your receipt and re-download link.
          {session.customer_details?.email && (
            <>
              {" "}
              A Stripe receipt was sent to{" "}
              <span className="text-fg">{session.customer_details.email}</span>.
            </>
          )}
        </p>
        <p className="text-muted">
          Finish setup before you need it. Reinstalling later means
          downloading the AI again, so don&apos;t wait for an emergency to open
          it the first time.
        </p>
        <p className="text-muted">
          Need help? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber hover:brightness-110">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </>
  ) : (
    <>
      <p className="label mb-3 text-amber">● No purchase found</p>
      <h1 className="font-display text-5xl font-bold uppercase leading-none">
        Link not valid.
      </h1>
      <p className="mt-4 text-muted">
        We couldn&apos;t find a completed payment for this link. If you just
        paid, refresh in a moment. Otherwise, use the link from your purchase
        confirmation.
      </p>
      <Link
        href="/#buy"
        className="mt-8 inline-flex border border-line px-6 py-3 font-mono text-sm uppercase tracking-wider hover:border-amber"
      >
        Back to stillhere
      </Link>
    </>
  );
}
