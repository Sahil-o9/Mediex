import { env } from "./env.server";

/**
 * Server-side AI gateway client. The API key is read from the environment and
 * never leaves the server. All AI features (interview, document analysis,
 * case summary) go through `callModel`.
 */

export interface AiConfig {
  url: string;
  key: string;
  model: string;
}

export function getAiConfig(): AiConfig | null {
  const key = env("LOVABLE_API_KEY");
  if (!key) return null;
  return {
    key,
    url: env("AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/responses",
    model: env("AI_MODEL") ?? "openai/gpt-6-astra",
  };
}

export type AiErrorCode = "not_configured" | "rate_limit" | "credits" | "blocked" | "timeout" | "ai_error" | "empty";

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export type AiPart =
  | { type: "input_text"; text: string }
  | { type: "output_text"; text: string }
  | { type: "input_image"; image_url: string };

export interface AiTurn {
  role: "user" | "assistant";
  content: AiPart[];
}

/** Reads a Server-Sent-Events stream from the gateway and returns the concatenated output text. */
async function readSse(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string | string[] };
        };
        if (event.type === "response.output_text.delta" && event.delta) {
          raw += event.delta;
        } else if (event.type === "response.completed" && !raw) {
          const out = event.response?.output_text;
          if (typeof out === "string") raw = out;
          else if (Array.isArray(out)) raw = out.join("");
        }
      } catch {
        /* ignore keep-alive / partial frames */
      }
    }
  }
  return raw;
}

export async function callModel(opts: {
  instructions: string;
  input: AiTurn[];
  timeoutMs?: number;
}): Promise<string> {
  const cfg = getAiConfig();
  if (!cfg) throw new AiError("not_configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
  try {
    const upstream = await fetch(cfg.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": cfg.key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: cfg.model,
        instructions: opts.instructions,
        input: opts.input,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const s = upstream.status;
      throw new AiError(s === 429 ? "rate_limit" : s === 402 ? "credits" : s === 403 ? "blocked" : "ai_error");
    }
    const raw = await readSse(upstream.body);
    if (!raw.trim()) throw new AiError("empty");
    return raw;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw new AiError("timeout");
    throw new AiError("ai_error");
  } finally {
    clearTimeout(timer);
  }
}

/** Extracts a JSON object from model output, tolerating code fences and stray text. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function userText(text: string): AiTurn {
  return { role: "user", content: [{ type: "input_text", text }] };
}
export function turnFrom(role: "user" | "assistant", text: string): AiTurn {
  return { role, content: [{ type: role === "assistant" ? "output_text" : "input_text", text }] };
}
