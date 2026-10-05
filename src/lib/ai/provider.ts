import "server-only";
import { z } from "zod";

export type AIErrorCode = "not_configured" | "authentication" | "quota" | "rate_limit" | "timeout" | "network" | "invalid_request" | "model_unavailable" | "provider" | "malformed_output" | "refusal";
export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;
  constructor(code: AIErrorCode, status?: number) {
    super(`ai_${code}`);
    this.name = "AIError";
    this.code = code;
    this.status = status;
  }
}
export const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY?.trim());
export const configuredModel = () => process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

// Only operational metadata: never log keys, document text, provider error
// bodies or signed URLs, and never write demo errors into production records.
function diagnose(error: AIError, attempt: number) {
  console.warn("HAQ AI request failed", { code: error.code, status: error.status, attempt });
}
function httpError(status: number, data: unknown): AIError {
  const body = data as { error?: { code?: string; type?: string } };
  const code = body?.error?.code || body?.error?.type;
  if (status === 401 || status === 403) return new AIError("authentication", status);
  if (status === 429) return new AIError(code === "insufficient_quota" || code === "billing_hard_limit_reached" ? "quota" : "rate_limit", status);
  if (code === "model_not_found" || status === 404) return new AIError("model_unavailable", status);
  return new AIError(status >= 500 ? "provider" : "invalid_request", status);
}
export async function requestOpenAI(body: Record<string, unknown>, endpoint: "chat/completions" | "responses" | "embeddings" = "chat/completions"): Promise<unknown> {
  if (!hasOpenAI()) throw new AIError("not_configured");
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: configuredModel(), ...(endpoint === "embeddings" ? {} : {store:false}), ...body }),
        signal: controller.signal,
      });
      // The timeout also covers receipt and decoding of the response body.
      const data = await response.json().catch(() => {
        if (controller.signal.aborted) throw new AIError("timeout");
        if (response.ok) throw new AIError("malformed_output");
        return {};
      });
      if (!response.ok) throw httpError(response.status, data);
      return data;
    } catch (cause) {
      const error = cause instanceof AIError ? cause : new AIError(controller.signal.aborted ? "timeout" : "network");
      diagnose(error, attempt);
      if (!["rate_limit", "timeout", "network", "provider"].includes(error.code) || attempt === 2) throw error;
    } finally { clearTimeout(timeout); }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new AIError("provider");
}

type CompletionParams = { system: string; user: string; temperature?: number };
function chatContent(data: unknown): string {
  const parsed = z.object({ choices: z.array(z.object({
    finish_reason: z.string().optional(),
    message: z.object({ content: z.string().nullable().optional(), refusal: z.string().nullable().optional() }),
  })).min(1) }).safeParse(data);
  if (!parsed.success) throw new AIError("malformed_output");
  const choice = parsed.data.choices[0];
  if (choice.message.refusal) throw new AIError("refusal");
  if (choice.finish_reason && choice.finish_reason !== "stop") throw new AIError("malformed_output");
  if (!choice.message.content?.trim()) throw new AIError("malformed_output");
  return choice.message.content;
}
export async function requestText(params: CompletionParams): Promise<string> {
  return chatContent(await requestOpenAI({
    temperature: params.temperature ?? 0.3,
    messages: [{ role: "system", content: params.system }, { role: "user", content: params.user }],
  }));
}
export async function requestJSON<T>(params: CompletionParams & { schema: z.ZodType<T>; name: string }): Promise<T> {
  const schema = z.toJSONSchema(params.schema, { target: "draft-7" });
  const content = chatContent(await requestOpenAI({
    temperature: params.temperature ?? 0.2,
    response_format: { type: "json_schema", json_schema: { name: params.name, strict: true, schema } },
    messages: [{ role: "system", content: params.system }, { role: "user", content: params.user }],
  }));
  try { return params.schema.parse(JSON.parse(content)); }
  catch { throw new AIError("malformed_output"); }
}
// Compatibility for the fail-open prefilter only. Main operations must use
// throwing requests and surface failures instead of returning heuristic output.
export async function completeJSON(params: CompletionParams): Promise<Record<string, unknown> | null> {
  try {
    const content = chatContent(await requestOpenAI({
      temperature: params.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: params.system }, { role: "user", content: params.user }],
    }));
    return z.record(z.string(), z.unknown()).parse(JSON.parse(content));
  } catch { return null; }
}
export async function completeText(params: CompletionParams): Promise<string | null> {
  try { return await requestText(params); } catch { return null; }
}
let health: { connected: boolean; code?: AIErrorCode; checkedAt: number } | undefined;
let healthPending: Promise<NonNullable<typeof health>> | undefined;
export async function checkProviderHealth() {
  if (health && Date.now() - health.checkedAt < 60_000) return health;
  if (healthPending) return healthPending;
  healthPending = (async () => {
    try {
      await requestText({ system: "Reply with OK only.", user: "Connectivity check.", temperature: 0 });
      health = { connected: true, checkedAt: Date.now() };
    } catch (cause) {
      health = { connected: false, code: cause instanceof AIError ? cause.code : "provider", checkedAt: Date.now() };
    }
    return health;
  })();
  try { return await healthPending; } finally { healthPending = undefined; }
}
