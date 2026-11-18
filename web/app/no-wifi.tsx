// Wi-Fi symbol with an X: "no connection". Scales with the surrounding font size.
export function NoWifiIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} role="img" aria-label="No Wi-Fi">
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.75">
        <path d="M4 14 A28 28 0 0 1 44 14" />
        <path d="M11 21 A18 18 0 0 1 37 21" />
        <path d="M18 28 A8.5 8.5 0 0 1 30 28" />
      </g>
      <circle cx="24" cy="34" r="3" fill="currentColor" opacity="0.75" />
      <g>
        <circle cx="38" cy="30" r="9" fill="#d0563f" />
        <path d="M34.5 26.5 L41.5 33.5 M41.5 26.5 L34.5 33.5" stroke="#0c0e0b" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
