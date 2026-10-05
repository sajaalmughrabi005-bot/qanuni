import "server-only";
import { createHash } from "node:crypto";

// Bounded per-worker abuse control. Distributed deployments should place a
// shared rate limiter in front of these actions; this is not a global quota.
const windows = new Map<string, { start: number; count: number }>();
export function consumeRateLimit(key: string, limit: number, interval = 60_000, now = Date.now()) {
  if (windows.size >= 10_000) {
    for (const [id, entry] of windows) if (now - entry.start >= interval) windows.delete(id);
    if (windows.size >= 10_000 && !windows.has(key)) throw new Error("ai_rate_limit");
  }
  const entry = windows.get(key);
  if (!entry || now - entry.start >= interval) { windows.set(key, { start: now, count: 1 }); return; }
  if (entry.count >= limit) throw new Error("ai_rate_limit");
  entry.count++;
}
export function privateRateKey(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function validateTextSize(value: string, max = 240_000) {
  if (typeof value !== "string" || !value.trim()) throw new Error("ai_invalid_input");
  if (value.length > max) throw new Error("ai_input_too_large");
}
