import { rateLimit } from "./rateLimit";

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function rateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  if (!REST_URL || !REST_TOKEN) return rateLimit(key, limit, windowMs);

  const windowId = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${windowId}`;

  try {
    const response = await fetch(`${REST_URL.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, windowMs],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`);

    const data = (await response.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result);
    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("Upstash returned no counter");
    }

    if (count > limit) {
      const msLeft = windowMs - (Date.now() % windowMs);
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil(msLeft / 1000)),
      };
    }
    return { ok: true, retryAfterSec: 0 };
  } catch (error) {
    console.warn(
      "Distributed rate limit unavailable; using local fallback:",
      error,
    );
    return rateLimit(key, limit, windowMs);
  }
}
