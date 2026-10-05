"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Keeps results within their identity/filter and ignores superseded responses. */
export function useScopedQuery<T>(key: string, read: (() => Promise<T>) | null, empty: T, pollMs?: number) {
  const [result, setResult] = useState<{ key: string; data: T; loading: boolean; error: string | null }>();
  const generation = useRef(0);
  const invalidate=useCallback(()=>{generation.current++;},[]);

  const run = useCallback(async (showLoading = true) => {
    if (!read) return false;
    const request = ++generation.current;
    setResult(previous => ({ key, data: previous?.key === key ? previous.data : empty, loading: showLoading || previous?.key !== key, error: null }));
    try {
      const data = await read();
      if (request !== generation.current) return false;
      setResult({ key, data, loading: false, error: null });
      return true;
    } catch {
      if (request === generation.current) setResult(previous => ({ key, data: previous?.key === key ? previous.data : empty, loading: false, error: "query_failed" }));
      return false;
    }
    // Each caller supplies a stable read function for the serialized query key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, read]);

  useEffect(() => {
    let cancelled=false;
    void Promise.resolve().then(()=>{if(!cancelled)void run();});
    const timer = read && pollMs ? setInterval(() => void run(false), pollMs) : undefined;
    return () => {
      cancelled=true;
      invalidate();
      if (timer) clearInterval(timer);
    };
  }, [run, read, pollMs, invalidate]);

  // A changed key hides the old data synchronously, before its effect runs.
  return {
    data: read && result?.key === key ? result.data : empty,
    loading: !!read && (result?.key !== key || result.loading),
    error: read && result?.key === key ? result.error : null,
    refetch: run,
  };
}
