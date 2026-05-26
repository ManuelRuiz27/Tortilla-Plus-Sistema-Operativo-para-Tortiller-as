import { DomainError } from "./domain-error.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  message: string;
}) {
  const now = Date.now();
  const current = buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return;
  }

  if (current.count >= input.limit) {
    throw new DomainError(429, "RATE_LIMIT_EXCEEDED", input.message, {
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    });
  }

  current.count += 1;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
