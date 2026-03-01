import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "../utils/crypto";
import { updateApiKeySchema, updateTrustLevelSchema } from "@s-rank/shared";

export const settingsRoutes = new Hono();

// ── Get profile ──
settingsRoutes.get("/profile", async (c) => {
  const userId = c.get("userId");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
      plan: true,
      trustLevel: true,
      apiKeyValid: true,
      agentMode: true,
      createdAt: true,
    },
  });

  // Get server status
  const { servers } = await import("../db/schema");
  const server = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  return c.json({
    user,
    server: server ? { status: server.status, ipv4: server.ipv4, size: server.size } : null,
  });
});

// ── Set API Key ──
settingsRoutes.post("/api-key", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = updateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid API key format", details: parsed.error.flatten() }, 400);
  }

  // Validate the key by making a test call
  try {
    const testResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": parsed.data.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (!testResponse.ok) {
      const err = await testResponse.json().catch(() => ({}));
      return c.json({ error: "API key validation failed", details: err }, 400);
    }

    // Key is valid — encrypt and store
    await db
      .update(users)
      .set({
        apiKeyEncrypted: encrypt(parsed.data.apiKey),
        apiKeyValid: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return c.json({ success: true, message: "API key validated and saved" });
  } catch (error: any) {
    return c.json({ error: "Failed to validate API key", message: error.message }, 500);
  }
});

// ── Update Trust Level ──
settingsRoutes.post("/trust-level", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = updateTrustLevelSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid trust level" }, 400);
  }

  await db
    .update(users)
    .set({ trustLevel: parsed.data.level, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json({ success: true, trustLevel: parsed.data.level });
});

// ── Update Agent Mode ──
settingsRoutes.post("/agent-mode", async (c) => {
  const userId = c.get("userId");
  const { mode } = await c.req.json();

  if (!["on-demand", "always-on"].includes(mode)) {
    return c.json({ error: "Invalid mode" }, 400);
  }

  await db
    .update(users)
    .set({ agentMode: mode, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json({ success: true, agentMode: mode });
});
