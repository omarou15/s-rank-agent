import { Hono } from "hono";
import { db } from "../db";
import { connectors } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../utils/crypto";
import { connectConnectorSchema, CONNECTORS } from "@s-rank/shared";

export const connectorRoutes = new Hono();

// ── List available connectors (with user status) ──
connectorRoutes.get("/", async (c) => {
  const userId = c.get("userId");

  const userConnectors = await db.query.connectors.findMany({
    where: eq(connectors.userId, userId),
  });

  const connectorMap = new Map(userConnectors.map((uc) => [uc.type, uc]));

  const result = CONNECTORS.map((meta) => ({
    ...meta,
    installed: connectorMap.has(meta.type),
    status: connectorMap.get(meta.type)?.status || "disconnected",
    connectorId: connectorMap.get(meta.type)?.id || null,
  }));

  return c.json({ connectors: result });
});

// ── Connect a service ──
connectorRoutes.post("/connect", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = connectConnectorSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // Check if already connected
  const existing = await db.query.connectors.findFirst({
    where: and(
      eq(connectors.userId, userId),
      eq(connectors.type, parsed.data.type)
    ),
  });

  if (existing) {
    // Update credentials
    await db
      .update(connectors)
      .set({
        credentialsEncrypted: encrypt(parsed.data.credentials),
        status: "connected",
        config: parsed.data.config || {},
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, existing.id));

    return c.json({ success: true, message: "Connector updated" });
  }

  // Create new connector
  const [connector] = await db
    .insert(connectors)
    .values({
      userId,
      type: parsed.data.type,
      credentialsEncrypted: encrypt(parsed.data.credentials),
      status: "connected",
      config: parsed.data.config || {},
    })
    .returning();

  return c.json({ success: true, connector }, 201);
});

// ── Disconnect a service ──
connectorRoutes.post("/disconnect", async (c) => {
  const userId = c.get("userId");
  const { connectorId } = await c.req.json();

  await db
    .update(connectors)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(and(eq(connectors.id, connectorId), eq(connectors.userId, userId)));

  return c.json({ success: true });
});

// ── Test connector credentials ──
connectorRoutes.post("/test", async (c) => {
  const userId = c.get("userId");
  const { connectorId } = await c.req.json();

  const connector = await db.query.connectors.findFirst({
    where: and(eq(connectors.id, connectorId), eq(connectors.userId, userId)),
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  // Test credentials by making a lightweight API call
  const creds = decrypt(connector.credentialsEncrypted);
  let testResult = false;

  try {
    switch (connector.type) {
      case "github": {
        const res = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${creds}` },
        });
        testResult = res.ok;
        break;
      }
      case "slack": {
        const res = await fetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${creds}` },
        });
        const data = await res.json();
        testResult = data.ok === true;
        break;
      }
      case "vercel": {
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${creds}` },
        });
        testResult = res.ok;
        break;
      }
      case "stripe": {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${creds}` },
        });
        testResult = res.ok;
        break;
      }
      default:
        testResult = true; // Can't test, assume ok
    }
  } catch {
    testResult = false;
  }

  const newStatus = testResult ? "connected" : "error";
  await db
    .update(connectors)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(connectors.id, connectorId));

  return c.json({ success: testResult, status: newStatus });
});

// ── Execute MCP action ──
connectorRoutes.post("/execute", async (c) => {
  const userId = c.get("userId");
  const { connector, action, params } = await c.req.json();

  if (!connector || !action) {
    return c.json({ error: "connector and action required" }, 400);
  }

  const { mcpService } = await import("../services/mcp");
  const result = await mcpService.execute(userId, { connector, action, params: params || {} });

  return c.json(result);
});

// ── List available actions for a connector ──
connectorRoutes.get("/actions/:type", async (c) => {
  const type = c.req.param("type");
  const { mcpService } = await import("../services/mcp");
  const actions = mcpService.getAvailableActions(type);
  return c.json({ connector: type, actions });
});
