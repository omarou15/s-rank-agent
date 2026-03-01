import { Hono } from "hono";
import { db } from "../db";
import { activityLogs, messages, connectors, userSkills, servers } from "../db/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";

export const monitoringRoutes = new Hono();

// ── Activity Logs ──
monitoringRoutes.get("/logs", async (c) => {
  const userId = c.get("userId");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const logs = await db.query.activityLogs.findMany({
    where: eq(activityLogs.userId, userId),
    orderBy: [desc(activityLogs.createdAt)],
    limit,
    offset,
  });

  return c.json({ logs });
});

// ── Usage Stats ──
monitoringRoutes.get("/usage", async (c) => {
  const userId = c.get("userId");
  const period = c.req.query("period") || "month";

  const daysBack = period === "day" ? 1 : period === "week" ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Get token usage from messages
  const usage = await db
    .select({
      totalInput: sql<number>`COALESCE(SUM(${messages.tokensInput}), 0)`,
      totalOutput: sql<number>`COALESCE(SUM(${messages.tokensOutput}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${messages.costUsd}), 0)`,
      messageCount: sql<number>`COUNT(*)`,
    })
    .from(messages)
    .innerJoin(
      sql`conversations ON ${messages.conversationId} = conversations.id`
    )
    .where(
      and(
        sql`conversations.user_id = ${userId}`,
        gte(messages.createdAt, since)
      )
    );

  return c.json({
    period,
    usage: usage[0] || {
      totalInput: 0,
      totalOutput: 0,
      totalCost: 0,
      messageCount: 0,
    },
  });
});

// ── Dashboard Summary ──
monitoringRoutes.get("/dashboard", async (c) => {
  const userId = c.get("userId");

  // Get server status
  const server = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  // Count connectors
  const activeConnectors = await db.query.connectors.findMany({
    where: eq(connectors.userId, userId),
  });

  // Count skills
  const installedSkills = await db.query.userSkills.findMany({
    where: eq(userSkills.userId, userId),
  });

  return c.json({
    server: server
      ? { status: server.status, size: server.size, ip: server.ipv4 }
      : null,
    connectors: {
      total: activeConnectors.length,
      active: activeConnectors.filter((c) => c.status === "connected").length,
      errors: activeConnectors.filter((c) => c.status === "error").length,
    },
    skills: {
      installed: installedSkills.length,
      active: installedSkills.filter((s) => s.active).length,
    },
  });
});
