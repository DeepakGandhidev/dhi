/**
 * The Divine Health International emblem. The artwork has a white ground,
 * so it always sits on a white disc; that keeps it clean on the navy
 * sidebar and footer as well as on light pages.
 */
export function Logo({ size = 34 }: { size?: number; tone?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/dhi-emblem.jpg"
      alt="Divine Health International"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        objectFit: "cover",
        flex: "none",
        boxShadow: "0 0 0 1px rgba(15, 21, 50, 0.08)",
      }}
    />
  );
}

/** Emblem plus name, for headers. `tone` colours the name on dark grounds. */
export function Wordmark({ size = 34, tone }: { size?: number; tone?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: tone }}>
      <Logo size={Math.round(size * 1.35)} />
      <span
        className="dhi-wordmark-text"
        style={{
          fontFamily: "var(--display)",
          fontWeight: 800,
          fontSize: size * 0.6,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        Divine Health
      </span>
    </span>
  );
}
