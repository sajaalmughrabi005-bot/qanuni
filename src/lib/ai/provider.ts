import "server-only";

export function hasOpenAI() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Thin server-only wrapper around the OpenAI Chat Completions API.
 * Never imported from client components — API key stays on the server.
 * Returns null on any failure so callers can fall back to the local
 * heuristic engine (lib/ai/engine.ts) and keep the demo working offline.
 */
export async function completeJSON(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<Record<string, unknown> | null> {
  if (!hasOpenAI()) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: params.temperature ?? 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
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
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: params.temperature ?? 0.4,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
