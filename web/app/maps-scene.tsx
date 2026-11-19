"use client";

import Image from "next/image";
import mapImg from "@/public/scene-map.jpg";
import wideImg from "@/public/scene-map-wide.jpg";
import { Caret, SceneFrame, useSceneLoop, type Next } from "./scene-kit";

/*
 * Animated walkthrough of stillhere's offline map: the map zooms from Utah Valley down into
 * Provo, Utah, "hospitals near me" is searched, and the nearest one is saved as a pin and opened. Both
 * pictures are real screenshots of the app (dark theme, centered on Utah Valley Hospital, map
 * zoom 10.5 and 13.4), and the results are what the app's offline search returns for
 * "hospitals" there. The zoom is the wide picture scaling up and fading into the close one,
 * not live map tiles.
 */

const QUERY = "hospitals near me";
const RESULTS = [
  { name: "Utah Valley Hospital", sub: "Hospital · Provo" },
  { name: "Revere Health", sub: "Hospital · Provo" },
  { name: "Utah State Hospital", sub: "Hospital · Provo" },
];
// Utah Valley Hospital: the center of the picture, which is also where the zoom goes.
const SPOT = { x: 50, y: 50 };
// Once zoomed, the map is shifted up this much (percent of the frame) to leave room for the pin's popup.
const LIFT = 15;
const COORDS = "40.24863, −111.66565";
// The app's color for medical pins (hospital, clinic, pharmacy…).
const MEDICAL = "#c0392b";
// The close picture is 2^(13.4 - 10.5) times the wide one's scale; the zoom ends at 1.5x the
// close picture. Both scale about the same center with the same timing, so they stay lined up.
const RATIO = 2 ** (13.4 - 10.5);
const END = 1.5;

type Stage = "idle" | "zoom" | "typing" | "results" | "pick" | "pin" | "done" | "open";
type State = { stage: Stage; n: number };
const START: State = { stage: "idle", n: 0 };
const FINAL: State = { stage: "open", n: 0 }; // the still: the pin saved and open

const next: Next<State> = ({ stage, n }) => {
  switch (stage) {
    case "idle":
      return [{ stage: "zoom", n: 0 }, 1600];
    case "zoom":
      return [{ stage: "typing", n: 0 }, 2500];
    case "typing":
      return n < QUERY.length ? [{ stage, n: n + 1 }, 80] : [{ stage: "results", n: 0 }, 300];
    case "results":
      return [{ stage: "pick", n: 0 }, 1300];
    case "pick":
      return [{ stage: "pin", n: 0 }, 450];
    case "pin":
      return [{ stage: "done", n: 0 }, 900];
    case "done":
      return [FINAL, 1400];
    case "open":
      return [START, 4500];
  }
};

export function MapsScene() {
  const [{ stage, n }, ref] = useSceneLoop(START, FINAL, next);
  const query = stage === "typing" ? QUERY.slice(0, n) : stage === "idle" || stage === "zoom" ? "" : QUERY;
  const zoomed = stage !== "idle";
  const listOpen = stage === "results" || stage === "pick";
  const pinned = stage === "pin" || stage === "done" || stage === "open";
  const open = stage === "open";
  const lift = zoomed ? `translateY(-${LIFT}%) ` : "";
  const pinTop = SPOT.y - (zoomed ? LIFT : 0);

  return (
    <SceneFrame
      sceneRef={ref}
      label="Picture: stillhere's offline map of Provo, Utah, with no internet. The search box says hospitals near me, and Utah Valley Hospital is saved as a medical pin, open with its label, notes and coordinates."
    >
      <div className="relative flex-1 overflow-hidden">
        <Image
          src={wideImg}
          alt=""
          fill
          sizes="(min-width: 768px) 360px, 100vw"
          placeholder="blur"
          className={`object-cover ${zoomed ? "transition-transform duration-[2200ms] ease-in-out" : ""}`}
          style={{ transform: `${lift}scale(${zoomed ? END * RATIO : 1})`, transformOrigin: `${SPOT.x}% ${SPOT.y}%` }}
        />
        <Image
          src={mapImg}
          alt=""
          fill
          sizes="(min-width: 768px) 360px, 100vw"
          className={`object-cover ${
            zoomed ? "transition-[transform,opacity] duration-[2200ms,900ms] delay-[0ms,600ms] ease-in-out" : ""
          }`}
          style={{
            transform: `${lift}scale(${zoomed ? END : 1 / RATIO})`,
            transformOrigin: `${SPOT.x}% ${SPOT.y}%`,
            opacity: zoomed ? 1 : 0,
          }}
        />

        {/* Search box and results */}
        <div className="absolute inset-x-2.5 top-2.5">
          <div className="rounded-md border border-line bg-panel/95 px-2.5 py-1.5 text-xs shadow-lg">
            <span className={query ? "text-fg" : "text-muted"}>{query || "Search places, coordinates…"}</span>
            {stage === "typing" && query && <Caret />}
          </div>
          {listOpen && (
            <ul className="mt-1 overflow-hidden rounded-md border border-line bg-panel/95 shadow-lg">
              {RESULTS.map((r, i) => (
                <li
                  key={r.name}
                  className={`px-2.5 py-1.5 transition-colors ${i > 0 ? "border-t border-line" : ""} ${
                    stage === "pick" && i === 0 ? "bg-fg/15" : ""
                  }`}
                >
                  <p className="text-xs font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted">{r.sub}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Saved pin */}
        {pinned && (
          <div
            className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
            style={{ left: `${SPOT.x}%`, top: `${pinTop}%` }}
          >
            <svg viewBox="0 0 24 32" className="h-7 w-auto drop-shadow-md" aria-hidden>
              <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0Z" fill={MEDICAL} />
              <circle cx="12" cy="12" r="4.5" fill="#fff" />
            </svg>
            {!open && (
              <span className="mt-0.5 whitespace-nowrap rounded bg-bg/70 px-1 text-[11px] font-medium">
                Utah Valley Hospital
              </span>
            )}
          </div>
        )}

        {/* The open pin: the app's pin popup (white, like MapLibre's), anchored under the pin */}
        {open && (
          <div className="absolute w-[218px] -translate-x-1/2" style={{ left: `${SPOT.x}%`, top: `${pinTop + 1}%` }}>
            <div className="mx-auto h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-white" />
            <div className="relative flex flex-col gap-1.5 rounded-md bg-white p-2.5 text-[11.5px] leading-snug text-[#1d1f1c] shadow-xl">
              <span className="absolute right-2 top-1 text-[15px] leading-none text-[#6a6d66]">×</span>
              <span className="mr-4 rounded border border-[#d6d4cc] px-1.5 py-1">Utah Valley Hospital</span>
              <span className="flex justify-between rounded border border-[#d6d4cc] px-1.5 py-1">
                Medical <span className="text-[#6a6d66]">⌄</span>
              </span>
              <span className="rounded border border-[#d6d4cc] px-1.5 pb-4 pt-1 text-[#6a6d66]">Notes (optional)</span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="h-3 w-3 rounded-[3px] border border-[#9a9c95]" />
                My location
              </span>
              <span className="text-[10.5px] text-[#6a6d66]">{COORDS}</span>
              <span className="flex justify-between">
                <span className="rounded border border-[#d6d4cc] px-2 py-0.5 text-[#b3261e]">Delete</span>
                <span className="rounded border border-[#2f6f4f] bg-[#2f6f4f] px-2 py-0.5 text-white">Save</span>
              </span>
            </div>
          </div>
        )}

        {/* Bottom readouts */}
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          <span className="rounded border border-line bg-panel/90 px-1.5 py-0.5 font-mono text-[10px] text-fg/80">
            {COORDS}
          </span>
          {stage === "done" && (
            <span className="rounded-md border border-line bg-panel/95 px-2 py-1 text-[11px] shadow-lg">
              Pin saved · works offline
            </span>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}
