import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer, Nav } from "../components";
import { SUPPORT_EMAIL } from "@/lib/content";

export const metadata: Metadata = {
  title: "How to open stillhere — stillhere",
  description: "Install stillhere on a Mac or Windows PC and get past the one-time security warning.",
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
        <p className="label mb-3 text-amber">● Setup</p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">How to open stillhere</h1>
        <p className="mt-4 text-muted">
          About five minutes, plus the AI download. Do it now, while you have internet. Stuck at any step?{" "}
          <a href={HELP_MAILTO} className="text-amber hover:brightness-110">
            Email us
          </a>
          .
        </p>
        <nav className="mt-6 flex gap-3 text-sm">
          <a href="#mac" className="border border-line px-4 py-2 font-mono uppercase tracking-wider hover:border-amber">
            Mac
          </a>
          <a href="#windows" className="border border-line px-4 py-2 font-mono uppercase tracking-wider hover:border-amber">
            Windows
          </a>
        </nav>

        <h2 id="mac" className="mt-12 scroll-mt-4 font-brand text-2xl font-semibold">On a Mac</h2>
        <ol className="mt-6 space-y-8">
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
              stillhere opens to a welcome screen. Pick an AI size (the one that fits your Mac is marked{" "}
              <Key>Recommended</Key>) and start the download, 3 to 7 GB. Keep the Mac awake and online until it
              says you&apos;re set. Then add maps for your state from the Map tab.
            </p>
          </Step>
        </ol>

        <h2 id="windows" className="mt-16 scroll-mt-4 font-brand text-2xl font-semibold">On Windows</h2>
        <ol className="mt-6 space-y-8">
          <Step n={1} title="Run the installer">
            <p>
              Open <Key>Stillhere-Setup-0.1.0.exe</Key> from your Downloads folder.
            </p>
            <p>
              If your browser says the file isn&apos;t commonly downloaded, choose <Key>Keep</Key> (in Edge:
              the <Key>…</Key> menu → <Key>Keep</Key> → <Key>Show more</Key> → <Key>Keep anyway</Key>).
            </p>
          </Step>
          <Step n={2} title="Windows will say it protected your PC">
            <p>
              A blue window says <Key>Windows protected your PC</Key>. Click <Key>More info</Key>, then{" "}
              <Key>Run anyway</Key>.
            </p>
            <p>
              This is normal for a new app that Microsoft hasn&apos;t seen many downloads of yet. You only do
              it once.
            </p>
          </Step>
          <Step n={3} title="Install">
            <p>
              Click <Key>Next</Key>, then <Key>Install</Key>. It installs just for you, so it won&apos;t ask for an administrator
              password. Leave <Key>Open stillhere</Key> ticked and click <Key>Finish</Key>.
            </p>
          </Step>
          <Step n={4} title="Download the AI">
            <p>
              Pick an AI size. The one that fits your PC is marked <Key>Recommended</Key>: without an NVIDIA
              graphics card that&apos;s the small one, which still takes a few minutes per answer. Keep the PC
              awake and online until it says you&apos;re set, then add maps for your state from the Map tab.
            </p>
            <p>
              Later, open stillhere from the Start menu or the desktop shortcut.
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
            <Key>Mac: no Open Anyway button?</Key> It only shows for about an hour after you try to open stillhere.
            Double-click stillhere again, then go back to Privacy &amp; Security.
          </p>
          <p>
            <Key>Mac: &ldquo;stillhere is damaged&rdquo;?</Key> The download was cut short. Delete it and download
            again from your purchase page.
          </p>
          <p>
            <Key>Requirements:</Key> a Mac with Apple silicon (M1 or newer) and macOS 14 or later, or a 64-bit
            Windows 10 or 11 PC. Either way, at least 8 GB of memory (16 GB recommended) and about 15 GB of free space.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
