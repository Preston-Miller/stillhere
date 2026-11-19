import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { SUPPORT_EMAIL } from "@/lib/content";

export function BuyButton({
  children,
  className = "",
  tone = "amber",
}: {
  children?: ReactNode;
  className?: string;
  /** "dark" for use on an amber background */
  tone?: "amber" | "dark";
}) {
  const colors = tone === "dark" ? "bg-bg text-fg hover:bg-panel" : "bg-amber text-bg hover:brightness-110";
  return (
    <Link
      href="/checkout"
      className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${colors} ${className}`}
    >
      {children ?? "Get stillhere"}
    </Link>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-line">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        {eyebrow && <p className="font-mono text-xs text-amber">{eyebrow}</p>}
        <h2 className="mb-8 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function Nav() {
  return (
    <header className="border-b border-line">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-2xl" aria-label="stillhere home">
          <Logo />
        </Link>
        <nav className="flex shrink-0 items-center gap-4 whitespace-nowrap text-sm sm:gap-5">
          <Link href="/install" className="text-muted hover:text-fg">
            Get help
          </Link>
          <Link href="/checkout" className="text-amber hover:brightness-110">
            Get it
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted sm:px-6">
        <p>
          stillhere is not a doctor and doesn&apos;t replace one. If you can call for help, do that first.
        </p>
        <p className="mt-3">
          Questions or trouble installing?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber hover:brightness-110">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
