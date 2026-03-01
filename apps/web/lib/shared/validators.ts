import { z } from "zod";

// ── Auth ──
export const apiKeySchema = z.string().startsWith("sk-ant-").min(20, "Invalid API key format");

// ── Chat ──
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().min(1).max(100_000),
  model: z.string().optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

// ── Connectors ──
export const connectConnectorSchema = z.object({
  type: z.enum([
    "github", "gitlab", "slack", "discord", "google_drive", "dropbox",
    "postgresql", "mysql", "stripe", "twilio", "sendgrid", "vercel", "netlify",
  ]),
  credentials: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

// ── Files ──
export const filePathSchema = z.string()
  .min(1)
  .max(500)
  .refine((p) => !p.includes(".."), "Path traversal not allowed")
  .refine((p) => p.startsWith("/"), "Must be absolute path");

export const fileWriteSchema = z.object({
  path: filePathSchema,
  content: z.string().max(10_000_000), // 10MB max
});

export const fileMoveSchema = z.object({
  from: filePathSchema,
  to: filePathSchema,
});

// ── Server ──
export const provisionServerSchema = z.object({
  size: z.enum(["starter", "pro", "business"]),
});

// ── Settings ──
export const updateTrustLevelSchema = z.object({
  level: z.number().int().min(1).max(4),
});

export const updateApiKeySchema = z.object({
  apiKey: apiKeySchema,
});

// ── Skills ──
export const installSkillSchema = z.object({
  skillId: z.string().uuid(),
});

export const publishSkillSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  longDescription: z.string().min(50).max(5000),
  category: z.enum(["development", "data", "content", "devops", "marketing", "productivity", "custom"]),
  systemPrompt: z.string().min(10).max(10000),
  tags: z.array(z.string().max(30)).max(10),
  dependencies: z.array(z.object({
    name: z.string(),
    type: z.enum(["npm", "pip", "apt", "system"]),
    version: z.string().optional(),
  })).optional(),
  requiredConnectors: z.array(z.string()).optional(),
});
