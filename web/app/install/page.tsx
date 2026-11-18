import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer, Nav } from "../components";
import { SUPPORT_EMAIL } from "@/lib/content";

export const metadata: Metadata = {
  title: "How to open stillhere — stillhere",
  description: "Install stillhere on your Mac and get past the one-time macOS warning.",
};

const HELP_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Help%20opening%20stillhere`;

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line font-mono text-xs text-amber">
        {n}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-1 space-y-2 text-muted">{children}</div>
      </div>
    </li>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-fg">{children}</span>;
}

export default function InstallPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <p className="label mb-3 text-amber">● Mac setup</p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">How to open stillhere</h1>
        <p className="mt-4 text-muted">
          About five minutes, plus the AI download. Do it now, while you have internet. Stuck at any step?{" "}
          <a href={HELP_MAILTO} className="text-amber hover:brightness-110">
            Email us
          </a>
          .
        </p>

        <ol className="mt-10 space-y-8">
          <Step n={1} title="Open the download">
            <p>
              Double-click <Key>Stillhere-0.1.0.dmg</Key> in your Downloads folder.
            </p>
          </Step>
          <Step n={2} title="Drag stillhere into Applications">
            <p>In the window that opens, drag the stillhere icon onto the Applications folder.</p>
          </Step>
          <Step n={3} title="Open it once. Your Mac will block it.">
            <p>
              Open your Applications folder and double-click stillhere. Your Mac shows a warning that it
              can&apos;t check stillhere for malicious software. Click <Key>Done</Key> (or <Key>OK</Key>).
            </p>
            <p>
              This is normal. It shows for any app that isn&apos;t registered with Apple yet, and you only
              do this once.
            </p>
          </Step>
          <Step n={4} title="Allow it in System Settings">
            <p>
              Click the Apple menu in the top-left corner → <Key>System Settings</Key> →{" "}
              <Key>Privacy &amp; Security</Key>.
            </p>
            <p>
              Scroll down to the line that says stillhere was blocked, and click <Key>Open Anyway</Key>.
              Enter your Mac password if asked, then click <Key>Open Anyway</Key> (or <Key>Open</Key>) once
              more.
            </p>
          </Step>
          <Step n={5} title="Download the AI">
            <p>
              stillhere opens to a welcome screen. Click <Key>Download the AI</Key> (about 7 GB) and keep the
              Mac awake and online until it says you&apos;re set. Then add maps for your state from the Map tab.
            </p>
          </Step>
        </ol>

        <div className="mt-12 rounded-2xl border border-amber/40 bg-panel p-6">
          <p className="font-brand text-xl font-semibold">Something not working?</p>
          <p className="mt-2 text-muted">
            Email{" "}
            <a href={HELP_MAILTO} className="text-amber hover:brightness-110">
              {SUPPORT_EMAIL}
            </a>{" "}
            and tell us which step you&apos;re on. A real person answers and will walk you through it.
          </p>
        </div>

        <div className="mt-8 space-y-3 text-sm text-muted">
          <p>
            <Key>No Open Anyway button?</Key> It only shows for about an hour after you try to open stillhere.
            Double-click stillhere again, then go back to Privacy &amp; Security.
          </p>
          <p>
            <Key>&ldquo;stillhere is damaged&rdquo;?</Key> The download was cut short. Delete it and download
            again from your purchase page.
          </p>
          <p>
            <Key>Requirements:</Key> a Mac with Apple silicon (M1 or newer), macOS 14 or later, 16 GB of
            memory, and about 15 GB of free space.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
