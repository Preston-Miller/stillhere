// Stillhere logo: a roof over a light that's still on. Redrawn from the brand image as SVG.
export const LOGO_CREAM = "#f6eedc";
export const LOGO_ORANGE = "#f4a12c";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 330 165" className={className} aria-hidden>
      <path
        d="M18 138 L165 20 L312 138"
        fill="none"
        stroke={LOGO_CREAM}
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="165" cy="128" r="36" fill={LOGO_ORANGE} />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-[0.8em] w-auto" />
      <span className="font-brand font-semibold tracking-tight" style={{ color: LOGO_CREAM }}>
        stillhere
      </span>
    </span>
  );
}
