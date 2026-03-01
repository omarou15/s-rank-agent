import { db } from "../db";
import { users, activityLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "../utils/crypto";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onDone: (info: { inputTokens: number; outputTokens: number; costUsd: number }) => void;
  onError: (error: string) => void;
}

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
};

export class ClaudeService {
  async getUserApiKey(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.apiKeyEncrypted) {
      throw new Error("NO_API_KEY");
    }

    if (!user.apiKeyValid) {
      throw new Error("INVALID_API_KEY");
    }

    return decrypt(user.apiKeyEncrypted);
  }

  async streamChat(
    userId: string,
    messages: ClaudeMessage[],
    systemPrompt: string,
    model: string = "claude-sonnet-4-20250514",
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const apiKey = await this.getUserApiKey(userId);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      callbacks.onError(`Claude API error (${response.status}): ${errBody}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError("No response stream");
      return;
    }

    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            if (event.type === "content_block_delta" && event.delta?.text) {
              callbacks.onText(event.delta.text);
            }

            if (event.type === "message_start" && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0;
            }

            if (event.type === "message_delta" && event.usage) {
              outputTokens = event.usage.output_tokens || 0;
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const pricing = PRICING[model] || PRICING["claude-sonnet-4-20250514"];
    const costUsd =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    // Log activity
    await db.insert(activityLogs).values({
      userId,
      action: "chat_message",
      status: "success",
      description: `Chat: ${inputTokens} in / ${outputTokens} out`,
      tokensUsed: inputTokens + outputTokens,
      costUsd,
    });

    callbacks.onDone({ inputTokens, outputTokens, costUsd });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 5,
          messages: [{ role: "user", content: "test" }],
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const claudeService = new ClaudeService();
