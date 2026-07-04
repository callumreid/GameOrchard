import { NextRequest } from "next/server";

// Origins allowed to call the API routes that spend OpenAI money.
const ALLOWED_ORIGINS = new Set([
  "https://gameorchard.beer",
  "https://www.gameorchard.beer",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function corsHeadersFor(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  // Same-origin requests send no Origin header on GET; allow those.
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

/**
 * Best-effort per-IP rate limiter (in-memory, per lambda instance).
 * Not bulletproof, but stops casual abuse of the OpenAI-backed routes.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  req: NextRequest,
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count++;
  if (bucket.count > max) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Keep the map from growing without bound on long-lived instances.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref?.();
