import crypto from "crypto";

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory fallback cache to survive live-demo network drops / rate limits
const memoryCache = new Map<string, CacheEntry>();

export function getCacheKey(model: string, input: any): string {
  const serialized = typeof input === "string" ? input : JSON.stringify(input);
  return crypto.createHash("md5").update(`${model}:${serialized}`).digest("hex");
}

export async function withCache<T>(
  model: string,
  input: any,
  fn: () => Promise<T>,
  ttlMs: number = 1000 * 60 * 60 * 24 // 24 hours
): Promise<T> {
  const key = getCacheKey(model, input);

  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key)!;
    if (Date.now() - entry.timestamp < ttlMs) {
      return entry.data as T;
    }
  }

  try {
    const result = await fn();
    memoryCache.set(key, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    // If live call fails and we have any stale cache entry, return it as emergency fallback
    if (memoryCache.has(key)) {
      console.warn(`[AI Cache] Using stale cache fallback for key ${key}`);
      return memoryCache.get(key)!.data as T;
    }
    throw error;
  }
}
