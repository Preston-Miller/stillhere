"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BuyButton } from "./components";

type Platform = "mac" | "windows" | "other";

/* Best guess at the visitor's OS. Reliable for Mac vs Windows; it cannot tell
   Apple Silicon from Intel (browsers report "Intel Mac" on both on purpose). */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return "other";
  // iPads in desktop mode claim to be Macs; touch support gives them away.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "other";
  const hint =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    ua;
  if (/mac/i.test(hint)) return "mac";
  if (/win/i.test(hint)) return "windows";
  return "other";
}

const noSubscribe = () => () => {};

function usePlatform(): Platform {
  // Server and first client render say "other" (both buttons), then the real platform.
  return useSyncExternalStore(noSubscribe, detectPlatform, () => "other");
}

export function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function WindowsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <rect x="1" y="1" width="10.5" height="10.5" />
      <rect x="12.5" y="1" width="10.5" height="10.5" />
      <rect x="1" y="12.5" width="10.5" height="10.5" />
      <rect x="12.5" y="12.5" width="10.5" height="10.5" />
    </svg>
  );
}

const MAC = { label: "Mac", Icon: AppleIcon, iconClass: "-mt-0.5 h-5 w-5" };
const WINDOWS = { label: "Windows", Icon: WindowsIcon, iconClass: "h-4 w-4" };

/* Hero download buttons. Both buttons go to the same checkout: one purchase
   unlocks both installers. On a Mac or PC, that platform gets the big button and
   the other becomes a small link; phones and unknowns see both equally. */
export function DownloadButtons() {
  const platform = usePlatform();

  if (platform === "other") {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        {[MAC, WINDOWS].map(({ label, Icon, iconClass }) => (
          <BuyButton key={label} className="w-64 gap-2.5 whitespace-nowrap">
            <Icon className={iconClass} />
            Download for {label}
          </BuyButton>
        ))}
      </div>
    );
  }

  const [main, alt] = platform === "mac" ? [MAC, WINDOWS] : [WINDOWS, MAC];
  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <BuyButton className="w-64 gap-2.5 whitespace-nowrap">
        <main.Icon className={main.iconClass} />
        Download for {main.label}
      </BuyButton>
      <Link
        href="/checkout"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
      >
        <alt.Icon className="h-3.5 w-3.5" />
        Also on {alt.label}
      </Link>
    </div>
  );
}
