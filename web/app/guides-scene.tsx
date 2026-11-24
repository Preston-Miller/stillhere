"use client";

import Image from "next/image";
import woundImg from "@/public/scene-wound-care.jpg";
import { Caret, LIB_CHIP, LIB_GREEN, SceneFrame, useSceneLoop, type Next } from "./scene-kit";

/*
 * The site shows this scene as a still (STILL in scene-kit): the guide list. The animation below is off,
 * and its page (CDC wound care) is from the old library; replace it before turning the animation back on.
 *
 * Animated walkthrough of stillhere's offline library: the sources are searched for
 * "wound", CDC's wound care sheet opens as the real page, and the page scrolls down. Titles are real guides in the library; the page is the
 * CDC PDF itself (public domain), rendered to an image.
 */

// Twelve of the 18 guides in the app's library (Final_Sources), with the app's own file types.
const GUIDES = [
  { title: "Army First Aid (ATP 4-02.11)", from: "U.S. Army", kind: "PDF" },
  { title: "Army Survival (ATP 3-50.21)", from: "U.S. Army", kind: "PDF" },
  { title: "How to Make Water Safe", from: "CDC", kind: "TXT" },
  { title: "How to Find Clean Water", from: "CDC", kind: "TXT" },
  { title: "What to Do During a Power Outage", from: "CDC", kind: "TXT" },
  { title: "Food Safety During a Power Outage", from: "FoodSafety.gov", kind: "TXT" },
  { title: "Children's Ibuprofen Dosing Chart", from: "FDA label", kind: "TXT" },
  { title: "Safe Drug Use After a Disaster", from: "FDA", kind: "TXT" },
  { title: "During a Winter Storm", from: "National Weather Service", kind: "TXT" },
  { title: "Severe Weather Safety", from: "National Weather Service", kind: "TXT" },
  { title: "Generator Troubleshooting", from: "stillhere", kind: "TXT" },
  { title: "How to Create an Emergency Toilet", from: "Public Health Seattle & King County", kind: "TXT" },
];
const QUERY = "wound";

type Stage = "list" | "typing" | "filtered" | "page" | "scroll" | "done";
type State = { stage: Stage; n: number };
const START: State = { stage: "list", n: 0 };
const FINAL: State = START; // the still: every guide, nothing searched yet

const next: Next<State> = ({ stage, n }) => {
  switch (stage) {
    case "list":
      return [{ stage: "typing", n: 0 }, 1300];
    case "typing":
      return n < QUERY.length ? [{ stage, n: n + 1 }, 110] : [{ stage: "filtered", n: 0 }, 300];
    case "filtered":
      return [{ stage: "page", n: 0 }, 800];
    case "page":
      return [{ stage: "scroll", n: 0 }, 1400];
    case "scroll":
      return [{ stage: "done", n: 0 }, 2600];
    case "done":
      return [START, 4500];
  }
};

export function GuidesScene() {
  const [{ stage, n }, ref] = useSceneLoop(START, FINAL, next);
  const reading = stage === "page" || stage === "scroll" || stage === "done";
  const scrolled = stage === "scroll" || stage === "done";
  const query = stage === "typing" ? QUERY.slice(0, n) : stage === "filtered" ? QUERY : "";
  const list = GUIDES.filter((g) => g.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <SceneFrame
      sceneRef={ref}
      label="Picture: stillhere's library of emergency guides saved offline, with a search box above a grid of guides from the CDC, the U.S. Army, the FDA, the National Weather Service and others."
    >
      {!reading ? (
        <div className="flex flex-1 flex-col overflow-hidden p-3">
          <p className="mb-2 flex items-baseline justify-between">
            <span className="font-semibold">Sources</span>
            <span className="text-[11px] text-muted">18 guides saved offline</span>
          </p>
          <div className="mb-2.5 rounded-md border border-line px-2.5 py-1.5 text-xs">
            <span className={query ? "text-fg" : "text-muted"}>{query || "Search all sources"}</span>
            {stage === "typing" && query && <Caret />}
          </div>
          <ul className="grid grid-cols-2 gap-1.5">
            {list.map((g) => (
              <li
                key={g.title}
                className={`rounded-md border px-2 py-1.5 transition-colors ${
                  stage === "filtered" ? "border-fg/30 bg-fg/10" : "border-line bg-fg/[0.03]"
                }`}
              >
                <span
                  className="rounded-[3px] px-1 text-[9px] font-semibold tracking-wider text-white"
                  style={{ background: LIB_CHIP }}
                >
                  {g.kind}
                </span>
                <p className="mt-1 text-[12px] font-semibold leading-tight">{g.title}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-muted">{g.from}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
            <span className="text-[11px] text-muted">‹ Sources</span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">CDC Emergency Wound Care</span>
          </div>
          <div className="relative flex-1 overflow-hidden bg-white">
            {/* Scrolls from the top of the page to its bottom: top 0 → 100% while shifting up by its own
                height. The page is shown a little wider than the viewer (only blank margin is cut) so it
                is tall enough to scroll. */}
            <div
              className="absolute -left-[5%] w-[110%] transition-[top,transform] duration-[2400ms] ease-in-out"
              style={{ top: scrolled ? "100%" : "0%", transform: scrolled ? "translateY(-100%)" : "none" }}
            >
              <Image
                src={woundImg}
                alt=""
                sizes="(min-width: 768px) 400px, 110vw"
                placeholder="blur"
                className="block h-auto w-full"
              />
            </div>
            <span className="absolute bottom-2.5 right-2.5 rounded-md border border-line bg-panel/95 px-2 py-1 text-[11px] text-fg shadow-lg">
              <span style={{ color: LIB_GREEN }}>●</span> Page 1 of 1 · saved offline
            </span>
          </div>
        </div>
      )}
    </SceneFrame>
  );
}
