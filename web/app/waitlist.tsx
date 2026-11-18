"use client";

import { useState, type FormEvent } from "react";

type State = "closed" | "open" | "sending" | "done" | "error";

/** Price button that reveals an email form. Logs the click so we can measure intent. */
export function Waitlist({
  label,
  location,
  align = "center",
  tone = "amber",
}: {
  label: string;
  location: string;
  align?: "center" | "left";
  /** "dark" for use on an amber background */
  tone?: "amber" | "dark";
}) {
  const btn = tone === "dark" ? "bg-bg text-fg hover:bg-panel" : "bg-amber text-bg hover:brightness-110";
  const textCls = tone === "dark" ? "text-bg" : "text-fg";
  const [state, setState] = useState<State>("closed");
  const [error, setError] = useState("");

  function open() {
    setState("open");
    fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
      keepalive: true,
    }).catch(() => {});
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website"), source: location }),
      });
      if (res.ok) return setState("done");
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Something went wrong. Please try again.");
      setState("error");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setState("error");
    }
  }

  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";

  if (state === "closed") {
    return (
      <div className={`flex flex-col gap-3 ${alignCls}`}>
        <button
          type="button"
          onClick={open}
          className={`inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold transition ${btn} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber`}
        >
          {label}
        </button>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className={`flex flex-col gap-1 ${alignCls}`} role="status">
        <p className={`text-lg font-semibold ${tone === "dark" ? "text-bg" : "text-olive"}`}>You&apos;re on the list.</p>
        <p className={tone === "dark" ? "text-bg/80" : "text-muted"}>We&apos;ll email you as soon as stillhere is ready.</p>
      </div>
    );
  }

  return (
    <div className={`flex w-full flex-col gap-3 ${alignCls}`}>
      <p className={`max-w-md ${textCls}`}>
        stillhere isn&apos;t out yet. Leave your email and you&apos;ll be the first to get it.
      </p>
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <label htmlFor={`email-${location}`} className="sr-only">Email</label>
        <input
          id={`email-${location}`}
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-4 py-3 text-fg placeholder:text-muted/60 focus:border-amber focus:outline-none"
        />
        {/* honeypot */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          disabled={state === "sending"}
          className={`rounded-md px-5 py-3 font-semibold transition disabled:opacity-60 ${btn}`}
        >
          {state === "sending" ? "Adding…" : "Notify me"}
        </button>
      </form>
      {state === "error" && <p className={`text-sm ${tone === "dark" ? "text-[#7a1f10]" : "text-[#e9806b]"}`}>{error}</p>}
    </div>
  );
}
