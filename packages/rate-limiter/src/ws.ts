type RateBucket = {
  tokens: number;
  lastRefill: number;
};

const buckets: Record<string, RateBucket> = {};

export function checkRateLimit(userId: string, limitPerSec = 5): boolean {
  const now = Date.now();
  const bucket = buckets[userId] ?? {
    tokens: limitPerSec,
    lastRefill: now,
  };

  const elapsed = now - bucket.lastRefill;
  const refillCount = Math.floor(elapsed / 1000) * limitPerSec;

  if (refillCount > 0) {
    bucket.tokens = Math.min(bucket.tokens + refillCount, limitPerSec);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    buckets[userId] = bucket;
    return true;
  }

  return false;
}
