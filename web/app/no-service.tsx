// "No Service" contrast illustration: cloud AI on a dead phone vs Stillhere on a laptop.
// Pure HTML/CSS so it stays crisp, themeable and responsive.

const QUESTION = "can i drink rainwater i collected off my roof?";
const SOURCE_URL =
  "https://www.cdc.gov/drinking-water/about/collecting-rainwater-and-your-health-an-overview.html";

function SignalBars() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[4, 6, 8, 10].map((h) => (
        <span key={h} className="w-[3px] rounded-[1px] bg-fg/20" style={{ height: h }} />
      ))}
    </span>
  );
}

function Phone() {
  return (
    <div className="relative mx-auto w-[220px] rounded-[34px] border-[6px] border-[#26291f] bg-[#0f110d] p-2 shadow-2xl shadow-black/60">
      <div className="mx-auto mb-2 h-4 w-20 rounded-full bg-[#26291f]" aria-hidden />
      {/* status bar */}
      <div className="flex items-center justify-between px-3 pb-3 font-mono text-[10px] text-fg/70">
        <span>9:41</span>
        <span className="flex items-center gap-1.5">
          <SignalBars />
          <span className="text-[#d0563f]">No Service</span>
        </span>
      </div>
      {/* app */}
      <div className="flex h-[340px] flex-col rounded-[22px] bg-[#181b15] p-3">
        <p className="mb-3 text-center text-[11px] font-medium text-fg/60">Cloud AI</p>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#2b3024] px-3 py-2 text-[12px] leading-snug text-fg/90">
          {QUESTION}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[12px] text-muted">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
          Thinking…
        </div>
        <div className="mt-auto rounded-xl border border-[#d0563f]/40 bg-[#d0563f]/10 p-3 text-center">
          <p className="text-[12px] font-medium text-[#e9806b]">Unable to connect</p>
          <p className="mt-1 text-[11px] leading-snug text-fg/50">Check your internet connection and try again.</p>
          <p className="mt-2 text-[11px] font-medium text-fg/40">Retry</p>
        </div>
      </div>
    </div>
  );
}

function Laptop() {
  return (
    <div className="mx-auto w-full max-w-[520px]">
      {/* lid */}
      <div className="rounded-t-xl border-[8px] border-b-[14px] border-[#26291f] bg-panel shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-fg/15" />
            <span className="h-2 w-2 rounded-full bg-fg/15" />
            <span className="h-2 w-2 rounded-full bg-fg/15" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Stillhere</span>
          <span className="font-mono text-[10px] text-olive">● offline</span>
        </div>
        <div className="space-y-4 p-5 text-[13px] leading-relaxed sm:text-[15px]">
          <p className="font-mono text-[12px] text-muted sm:text-[13px]">
            <span className="text-amber">&gt;</span> {QUESTION}
          </p>
          <p className="text-fg">
            Not without treating it first. Rainwater can carry germs and chemicals from the air, your roof and gutters,
            even when it looks clean. Use bottled or treated water for drinking if you can.
          </p>
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-olive/50 px-3 py-1.5 text-[12px] text-olive hover:bg-olive/10 sm:text-[13px]"
          >
            Source: CDC, Collecting Rainwater and Your Health <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
      {/* base */}
      <div className="relative mx-[-6%] h-3 rounded-b-xl bg-[#34382c]">
        <div className="absolute left-1/2 top-0 h-1.5 w-20 -translate-x-1/2 rounded-b-md bg-[#26291f]" />
      </div>
    </div>
  );
}

export function NoServiceContrast() {
  return (
    <figure className="mb-14">
      <div className="grid items-end gap-12 lg:grid-cols-[auto_1fr] lg:gap-16">
        <div>
          <Phone />
          <figcaption className="mt-5 text-center">
            <span className="label text-[#e9806b]">Cloud AI · needs a signal</span>
          </figcaption>
        </div>
        <div>
          <Laptop />
          <p className="mt-8 text-center">
            <span className="label text-olive">Stillhere · runs on your Mac</span>
          </p>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-xl text-center text-muted">
        Same question, no signal. One needs a cell tower. The other searches guides already saved on your Mac and
        links its answer to the source.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted/70">
        Illustration; real answers vary. Answer based on a CDC web page. CDC does not endorse Stillhere; the original
        is free at cdc.gov.
      </p>
    </figure>
  );
}
