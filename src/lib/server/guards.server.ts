/**
 * Request guards shared by every API route:
 *  - same-origin check (CSRF defence for cookie-authenticated routes),
 *  - best-effort per-IP rate limiting (protects AI credits from abuse),
 *  - bounded body reading.
 *
 * NOTE: the rate limiter is in-memory, so on multi-instance / serverless
 * deployments it is per-instance. For strict limits put a shared limiter
 * (e.g. Cloudflare rate-limiting rules) in front of /api/*.
 */

type Buckets = Map<string, number[]>;
const g = globalThis as unknown as { __mediexBuckets?: Buckets };
const buckets: Buckets = (g.__mediexBuckets ??= new Map());

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

/** Browsers always send Sec-Fetch-Site; reject anything that is not same-origin. Non-browser clients omit it. */
export function isCrossSiteBrowserRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

export function guard(
  request: Request,
  opts: { name: string; limit: number; windowMs?: number },
): Response | null {
  if (isCrossSiteBrowserRequest(request)) return json({ error: "forbidden" }, 403);
  const ok = rateLimit(`${opts.name}:${clientIp(request)}`, opts.limit, opts.windowMs ?? 60_000);
  if (!ok) return json({ error: "rate_limited" }, 429, { "Retry-After": "30" });
  return null;
}

export async function readJson(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, response: json({ error: "too_large" }, 413) };
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: json({ error: "invalid_request" }, 400) };
  }
  if (text.length > maxBytes) return { ok: false, response: json({ error: "too_large" }, 413) };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: json({ error: "invalid_request" }, 400) };
  }
}
