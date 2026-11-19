"use client";

import { Caret, LIB_CHIP, LIB_GREEN, SceneFrame, useSceneLoop, type Next } from "./scene-kit";

/*
 * Animated walkthrough of stillhere's chat: a question is typed, the app searches its
 * offline library, and the answer streams in with numbered source chips, the way the
 * real app shows it. The answer is shortened from a real stillhere session (2026-11-19,
 * qwen3.5:9b), which cited CDC's power outage and food safety pages and the CDC
 * preparedness guide.
 */

const QUESTION = "The power's been out two days. Is my freezer food OK?";

type Segment = { text: string; cite: number; step?: number };
const ANSWER: Segment[] = [
  {
    text: "After 48 hours, food in a full freezer is still safe if the doors stayed closed and it still has ice crystals.",
    cite: 1,
  },
  { text: "Throw out any perishable food from the freezer if it has thawed completely.", cite: 2, step: 1 },
  { text: "If the freezer was half-full, throw it out if the power has been out more than 24 hours.", cite: 3, step: 2 },
];
const WORDS = ANSWER.map((s) => s.text.split(" "));
const TOTAL_WORDS = WORDS.reduce((n, w) => n + w.length, 0);
// Index of each segment's first word in the whole answer.
const WORD_STARTS = WORDS.map((_, i) => WORDS.slice(0, i).reduce((n, w) => n + w.length, 0));

type Stage = "typing" | "sent" | "thinking" | "answer" | "done";
type State = { stage: Stage; n: number };
const START: State = { stage: "typing", n: 0 };
const FINAL: State = { stage: "done", n: TOTAL_WORDS };

const next: Next<State> = ({ stage, n }) => {
  switch (stage) {
    case "typing":
      return n < QUESTION.length ? [{ stage, n: n + 1 }, 45] : [{ stage: "sent", n: 0 }, 350];
    case "sent":
      return [{ stage: "thinking", n: 0 }, 250];
    case "thinking":
      return [{ stage: "answer", n: 0 }, 1100];
    case "answer":
      return n < TOTAL_WORDS ? [{ stage, n: n + 1 }, 55] : [FINAL, 0];
    case "done":
      return [START, 4500];
  }
};

export function AiScene() {
  const [{ stage, n }, ref] = useSceneLoop(START, FINAL, next);
  const typed = stage === "typing" ? QUESTION.slice(0, n) : "";
  const asked = stage !== "typing";
  const words = stage === "answer" ? n : stage === "done" ? TOTAL_WORDS : 0;

  // Reveal answer words in order across the segments.
  const shown = WORDS.map((w, i) => {
    const take = Math.max(0, Math.min(w.length, words - WORD_STARTS[i]));
    return { text: w.slice(0, take).join(" "), complete: take === w.length };
  });
  const steps = ANSWER.map((s, i) => ({ ...s, ...shown[i] })).filter((s) => s.step && s.text);
  const lead = { ...ANSWER[0], ...shown[0] };

  return (
    <SceneFrame
      sceneRef={ref}
      label={`Picture: with no internet, someone has asked stillhere "${QUESTION}" and it has answered from its offline library, citing saved CDC guides.`}
    >
      {/* Conversation */}
      <div className="flex-1 space-y-2.5 overflow-hidden p-3">
        {asked && (
          <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-fg/10 px-2.5 py-1.5 font-semibold">
            {QUESTION}
          </p>
        )}
        {stage === "thinking" && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: LIB_GREEN }} />
            Searching your library (227 passages)…
          </p>
        )}
        {words > 0 && (
          <div
            className="rounded-r-md border-l-2 px-2.5 py-2"
            style={{ borderColor: LIB_GREEN, background: "rgba(95,176,127,0.08)" }}
          >
            <p className="mb-1 text-[10px] font-semibold tracking-wider" style={{ color: LIB_GREEN }}>
              FROM YOUR LIBRARY
            </p>
            <p className="text-fg/90">
              {lead.text}
              {lead.complete && <Cite n={lead.cite} />}
            </p>
            {steps.length > 0 && (
              <ol className="mt-1.5 space-y-1 text-fg/90">
                {steps.map((s) => (
                  <li key={s.step} className="flex gap-1.5">
                    <span className="font-semibold">{s.step}.</span>
                    <span>
                      {s.text}
                      {s.complete && <Cite n={s.cite} />}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {stage === "done" && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Cite n={1} /> CDC: Protect Yourself During a Power Outage · saved offline
          </p>
        )}
      </div>

      {/* Input box */}
      <div className="border-t border-line p-2.5">
        <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
          <span className={`flex-1 truncate text-xs ${typed ? "text-fg" : "text-muted"}`}>
            {typed || "Ask a question…"}
            {stage === "typing" && typed && <Caret />}
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fg/90 text-[10px] text-bg">↑</span>
        </div>
      </div>
    </SceneFrame>
  );
}

function Cite({ n }: { n: number }) {
  return (
    <span
      className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-1 align-[1px] text-[10px] font-semibold text-white"
      style={{ background: LIB_CHIP }}
    >
      {n}
    </span>
  );
}
