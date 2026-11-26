/**
 * Simple in-memory rate limiter for sign-in and cancel endpoints.
 *
 * Good enough for a single server. If the app is ever run on several
 * instances, move this to a shared store (e.g. Redis).
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
