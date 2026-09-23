/**
 * DHI mark: a hand abstracted to five strokes — the five packages —
 * with the thumb set apart. Used at every size, so it is stroke-based.
 */
export function Logo({ size = 34, tone = "currentColor", accent = "var(--marigold)" }: {
  size?: number;
  tone?: string;
  accent?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g stroke={tone} strokeWidth="3.4" strokeLinecap="round">
        <path d="M14 30V17" />
        <path d="M21 30V10" />
        <path d="M28 30V12" />
        <path d="M35 30V20" />
      </g>
      <path
        d="M11 30c-3-4-6-7-7.5-9.5C2 18 4.5 15 7 17l4 4"
        stroke={tone}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 29h27v5a8 8 0 0 1-8 8H19a8 8 0 0 1-8-8v-5Z"
        fill={accent}
      />
    </svg>
  );
}

export function Wordmark({ size = 34, tone }: { size?: number; tone?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: tone }}>
      <Logo size={size} tone={tone} />
      <span
        style={{
          fontFamily: "var(--display)",
          fontWeight: 800,
          fontSize: size * 0.72,
          letterSpacing: "-0.04em",
          fontStretch: "condensed",
        }}
      >
        DHI
      </span>
    </span>
  );
}
