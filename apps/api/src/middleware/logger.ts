import { createMiddleware } from "hono/factory";

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;
  const icon = status >= 500 ? "❌" : status >= 400 ? "⚠️" : "✅";

  console.log(`${icon} ${method} ${path} → ${status} (${duration}ms)`);
});
