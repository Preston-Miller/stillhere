"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { LogoMark } from "./logo";
import { NoWifiIcon } from "./no-wifi";

/*
 * Shared pieces for the animated feature scenes (AI, guides, maps): a looping timeline that
 * only runs while the scene is on screen, and the small app-window frame with the
 * "No internet" badge. People who prefer reduced motion get each scene's finished state.
 */

/** Show each scene's finished state as a still instead of playing it. */
export const STILL = true;

/** One step of a scene's timeline: the next state and how long to wait before showing it. */
export type Next<S> = (s: S) => [S, number];

const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function useSceneLoop<S>(start: S, final: S, next: Next<S>): [S, RefObject<HTMLDivElement | null>] {
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [state, setState] = useState<S>(start);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (STILL || reduced || !visible) return;
    const [nextState, wait] = next(state);
    const id = setTimeout(() => setState(nextState), wait);
    return () => clearTimeout(id);
  }, [state, visible, reduced, next]);

  return [STILL || reduced ? final : state, ref];
}

export function SceneFrame({
  sceneRef,
  label,
  children,
}: {
  sceneRef: RefObject<HTMLDivElement | null>;
  /** What the animation shows, for screen readers. */
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={sceneRef}
      className="flex h-[420px] flex-col bg-bg/60 text-[13px] leading-snug"
      role="img"
      aria-label={label}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2" aria-hidden>
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <LogoMark className="h-3 w-auto" /> stillhere
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
          <NoWifiIcon className="h-3 w-auto" />
          No internet
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col" aria-hidden>
        {children}
      </div>
    </div>
  );
}

/** Blinking text cursor for typed input. */
export function Caret() {
  return <span className="ml-px inline-block h-3 w-px animate-pulse bg-fg align-middle" />;
}

// The real app's green for things that come from the offline library.
export const LIB_GREEN = "#5fb07f";
export const LIB_CHIP = "#3f7d58";
