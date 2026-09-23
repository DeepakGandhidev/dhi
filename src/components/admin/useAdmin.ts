"use client";

import { useCallback, useEffect, useState } from "react";

/** Fetch helper for admin panels: JSON in, JSON out, one error shape. */
export async function adminFetch<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? `Erreur ${res.status}`) as Error & { errors?: Record<string, string>; status?: number };
    err.errors = data.errors;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/** Loads `url` and reloads on demand; tracks loading and error states. */
export function useAdminData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetch<T>(url));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, loading, reload: load };
}
