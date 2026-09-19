import "server-only";
import { logSystemEvent } from "@/lib/system-events";

export function hasOpenAI() {
  return !!process.env.OPENAI_API_KEY;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

async function callChatCompletions(body: Record<string, unknown>): Promise<Response | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // Retry once on transient server-side/rate-limit errors; a real client
      // error (bad key, bad request) is returned as-is so the caller can
      // surface a genuine failure instead of masking it with a retry loop.
      if (!res.ok && (res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      return res;
    } catch {
      clearTimeout(timeout);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Thin server-only wrapper around the OpenAI Chat Completions API.
 * Never imported from client components — API key stays on the server.
 * Returns null on ANY failure (not configured, network error, non-2xx
 * response, malformed JSON). Callers MUST NOT treat a null result as if it
 * were a successful AI response — see lib/ai/actions.ts, which distinguishes
 * "no provider configured" (local heuristic engine, clearly labeled) from
 * "provider configured but the request failed" (a real user-facing error,
 * never silently swapped for a fabricated result).
 */
export async function completeJSON(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<Record<string, unknown> | null> {
  if (!hasOpenAI()) return null;

  try {
    const res = await callChatCompletions({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: params.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    });
    if (!res || !res.ok) {
      await logSystemEvent("ai_error", res ? `OpenAI responded with HTTP ${res.status}` : "OpenAI request failed (network/timeout)");
      return null;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) {
    await logSystemEvent("ai_error", `OpenAI response could not be processed: ${e instanceof Error ? e.name : "error"}`);
    return null;
  }
}

export async function completeText(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string | null> {
  if (!hasOpenAI()) return null;
  try {
    const res = await callChatCompletions({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: params.temperature ?? 0.4,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    });
    if (!res || !res.ok) {
      await logSystemEvent("ai_error", res ? `OpenAI responded with HTTP ${res.status}` : "OpenAI request failed (network/timeout)");
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    await logSystemEvent("ai_error", `OpenAI response could not be processed: ${e instanceof Error ? e.name : "error"}`);
    return null;
  }
}
