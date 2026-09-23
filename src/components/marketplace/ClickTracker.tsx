"use client";

import { useEffect } from "react";

/**
 * Reports an affiliate visit once per page view. The server validates the
 * code, deduplicates the visitor and sets the attribution cookie; nothing
 * here decides who is credited.
 */
export function ClickTracker({ refCode, slug }: { refCode: string; slug: string }) {
  useEffect(() => {
    const key = `dhi-click:${refCode}:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: the server deduplicates anyway */
    }
    fetch("/api/marketplace/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: refCode, slug }),
      keepalive: true,
    }).catch(() => {});
  }, [refCode, slug]);
  return null;
}
