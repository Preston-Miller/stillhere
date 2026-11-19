"use client";

import Image from "next/image";
import woundImg from "@/public/scene-wound-care.jpg";
import { Caret, LIB_CHIP, LIB_GREEN, SceneFrame, useSceneLoop, type Next } from "./scene-kit";

/*
 * Animated walkthrough of stillhere's offline library: the sources are searched for
 * "wound", CDC's wound care sheet opens as the real page, and the page scrolls down. Titles are real guides in the library; the page is the
 * CDC PDF itself (public domain), rendered to an image.
 */

const GUIDES = [
  { title: "CDC Emergency Wound Care", from: "CDC" },
  { title: "NLM CPR Summary", from: "National Library of Medicine" },
  { title: "NHS Burns and Scalds", from: "NHS" },
  { title: "CDC Hypothermia", from: "CDC" },
  { title: "USFA Portable Generator Safety", from: "U.S. Fire Administration" },
  { title: "CDC Winter Storm Safety", from: "CDC" },
  { title: "NPS Ten Essentials", from: "National Park Service" },
  { title: "FDA Safe Drug Use After Disaster", from: "FDA" },
  { title: "CDC Heat Related Illness", from: "CDC" },
  { title: "NHS Broken Arm or Wrist", from: "NHS" },
  { title: "CDC Choosing Home Water Filters", from: "CDC" },
  { title: "What to do During a Tornado", from: "CDC" },
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
      label="Picture: stillhere's library of emergency guides saved offline, with a search box above a grid of guides from the CDC, NHS, National Park Service and others."
    >
      {!reading ? (
        <div className="flex flex-1 flex-col overflow-hidden p-3">
          <p className="mb-2 flex items-baseline justify-between">
            <span className="font-semibold">Sources</span>
            <span className="text-[11px] text-muted">42 guides saved offline</span>
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
                  PDF
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
