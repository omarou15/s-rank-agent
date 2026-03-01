import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "../db";
import { conversations, messages, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { decrypt } from "../utils/crypto";
import { sendMessageSchema, createConversationSchema } from "@s-rank/shared";

export const chatRoutes = new Hono();

// ── List conversations ──
chatRoutes.get("/conversations", async (c) => {
  const userId = c.get("userId");

  const convos = await db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: [desc(conversations.updatedAt)],
    limit: 50,
  });

  return c.json({ conversations: convos });
});

// ── Create conversation ──
chatRoutes.post("/conversations", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = createConversationSchema.safeParse(body);

  const [convo] = await db
    .insert(conversations)
    .values({
      userId,
      title: parsed.success ? parsed.data.title || "New Conversation" : "New Conversation",
    })
    .returning();

  return c.json({ conversation: convo }, 201);
});

// ── Get messages for a conversation ──
chatRoutes.get("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");

  const msgs = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [messages.createdAt],
  });

  return c.json({ messages: msgs });
});

// ── Send message & stream Claude response ──
chatRoutes.post("/stream", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // Get user's API key
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.apiKeyEncrypted) {
    return c.json({ error: "No API key configured. Please add your Claude API key in Settings." }, 400);
  }

  const apiKey = decrypt(user.apiKeyEncrypted);

  // Create or get conversation
  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const [convo] = await db
      .insert(conversations)
      .values({ userId, title: parsed.data.content.slice(0, 50) })
      .returning();
    conversationId = convo.id;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: parsed.data.content,
    status: "complete",
  });

  // Get conversation history
  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [messages.createdAt],
    limit: 50,
  });

  // Build Claude messages
  const claudeMessages = history.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Stream response
  return streamSSE(c, async (stream) => {
    try {
      // Build dynamic system prompt with full context
      const { buildSystemPrompt } = await import("../services/system-prompt");
      const userConnectors = await db.query.connectors.findMany({
        where: eq(conversations.userId, userId),
      });
      const activeConnectors = userConnectors
        .filter((c: any) => c.status === "connected")
        .map((c: any) => c.type);

      const server = await db.query.servers.findFirst({
        where: eq(conversations.userId, userId),
      });

      const systemPrompt = buildSystemPrompt({
        trustLevel: user.trustLevel as any,
        connectors: activeConnectors,
        skills: [],
        serverStatus: (server?.status as any) || "stopped",
        cwd: "/home/agent/workspace",
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: parsed.data.model || "claude-sonnet-4-20250514",
          max_tokens: 8192,
          stream: true,
          system: systemPrompt,
          messages: claudeMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        await stream.writeSSE({ data: JSON.stringify({ type: "error", data: error }), event: "error" });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullResponse = "";
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            if (event.type === "content_block_delta" && event.delta?.text) {
              fullResponse += event.delta.text;
              await stream.writeSSE({
                data: JSON.stringify({ type: "text_delta", data: event.delta.text }),
                event: "message",
              });
            }

            if (event.type === "message_delta" && event.usage) {
              outputTokens = event.usage.output_tokens || 0;
            }

            if (event.type === "message_start" && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Calculate cost
      const costUsd =
        (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;

      // Save assistant message
      await db.insert(messages).values({
        conversationId: conversationId!,
        role: "assistant",
        content: fullResponse,
        status: "complete",
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        costUsd,
      });

      // Send done event
      await stream.writeSSE({
        data: JSON.stringify({
          type: "done",
          conversationId,
          tokensInput: inputTokens,
          tokensOutput: outputTokens,
          costUsd,
        }),
        event: "done",
      });
    } catch (error: any) {
      console.error("[CHAT] Stream error:", error);
      await stream.writeSSE({
        data: JSON.stringify({ type: "error", data: error.message }),
        event: "error",
      });
    }
  });
});

// ── Rename conversation ──
chatRoutes.patch("/conversations/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { title } = await c.req.json();

  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));

  return c.json({ success: true });
});

// ── Delete conversation ──
chatRoutes.delete("/conversations/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));

  return c.json({ success: true });
});

// ── Execute code from chat ──
chatRoutes.post("/execute", async (c) => {
  const userId = c.get("userId");
  const { code, language } = await c.req.json();

  if (!code) return c.json({ error: "Code required" }, 400);

  try {
    const { executionService } = await import("../services/execution");
    const lang = language || executionService.detectLanguage(code);
    const result = await executionService.execute({ userId, code, language: lang });

    return c.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration: result.duration,
      language: lang,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});