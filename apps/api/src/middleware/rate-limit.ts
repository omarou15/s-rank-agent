import { createMiddleware } from "hono/factory";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 requests per minute
  analytics: true,
  prefix: "s-rank:ratelimit",
});

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const userId = c.get("userId") as string | undefined;
  const identifier = userId || c.req.header("x-forwarded-for") || "anonymous";

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  c.header("X-RateLimit-Limit", limit.toString());
  c.header("X-RateLimit-Remaining", remaining.toString());
  c.header("X-RateLimit-Reset", reset.toString());

  if (!success) {
    return c.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      },
      429
    );
  }

  await next();
});
