"use client";

import { useState } from "react";
import { photoUrl } from "@/lib/images";
import styles from "./Photo.module.css";

type Props = {
  src: string;
  alt: string;
  width: number;
  height?: number;
  /** Duotone pushes the photo toward the indigo/marigold palette. */
  tone?: "none" | "indigo" | "warm";
  className?: string;
  priority?: boolean;
};

export function Photo({ src, alt, width, height, tone = "none", className = "", priority }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Never show a broken image: fall back to a palette panel with the mark.
    return (
      <div className={`${styles.frame} ${styles.fallback} ${className}`} role="img" aria-label={alt}>
        <svg viewBox="0 0 48 48" width="56" height="56" fill="none" aria-hidden="true">
          <g stroke="var(--marigold)" strokeWidth="3.4" strokeLinecap="round">
            <path d="M14 30V17" /><path d="M21 30V10" /><path d="M28 30V12" /><path d="M35 30V20" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`${styles.frame} ${className}`} data-tone={tone}>
      <img
        src={photoUrl(src, width, height)}
        srcSet={`${photoUrl(src, width, height)} 1x, ${photoUrl(src, width * 2, height ? height * 2 : undefined)} 2x`}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className={styles.img}
      />
      <span className={styles.wash} aria-hidden="true" />
    </div>
  );
}
