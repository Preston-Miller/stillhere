"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Muted, looping demo that autoplays on phones too.
 * Some phones still block autoplay (e.g. iPhone Low Power Mode). When that happens we start it
 * on the visitor's first tap anywhere, and show a play button over the poster in the meantime.
 */
export function DemoVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Set muted as a property too; mobile browsers only autoplay videos they know are muted.
    v.muted = true;
    v.defaultMuted = true;

    const tryPlay = () =>
      v.play().then(
        () => setBlocked(false),
        // Only offer the play button when the browser blocked autoplay, not when the video itself failed.
        (err: unknown) => setBlocked(err instanceof DOMException && err.name === "NotAllowedError"),
      );

    // Play while on screen, pause when scrolled away (saves battery and data on phones).
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? tryPlay() : v.pause()),
      { threshold: 0.25 },
    );
    io.observe(v);

    // Fallback: any tap on the page counts as permission to play.
    const onTap = () => {
      tryPlay();
    };
    document.addEventListener("touchend", onTap, { once: true, passive: true });
    document.addEventListener("click", onTap, { once: true });

    return () => {
      io.disconnect();
      document.removeEventListener("touchend", onTap);
      document.removeEventListener("click", onTap);
    };
  }, []);

  return (
    <div className="relative">
      <video
        ref={ref}
        className="block aspect-[8/5] w-full bg-bg"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
      {blocked && (
        <button
          type="button"
          onClick={() => ref.current?.play().then(() => setBlocked(false), () => {})}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          aria-label="Play the demo video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber text-bg shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
