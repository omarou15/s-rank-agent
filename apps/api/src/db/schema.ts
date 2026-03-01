import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  real,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──
export const planEnum = pgEnum("plan", ["starter", "pro", "business"]);
export const serverStatusEnum = pgEnum("server_status", [
  "provisioning", "running", "stopped", "error", "deleting",
]);
export const connectorStatusEnum = pgEnum("connector_status", [
  "connected", "error", "expired", "disconnected",
]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const messageStatusEnum = pgEnum("message_status", [
  "pending", "streaming", "complete", "error",
]);
export const activityStatusEnum = pgEnum("activity_status", [
  "success", "error", "pending", "cancelled",
]);
export const skillSourceEnum = pgEnum("skill_source", ["official", "community"]);

// ── Users ──
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: planEnum("plan").default("starter").notNull(),
  trustLevel: integer("trust_level").default(2).notNull(),
  apiKeyEncrypted: text("api_key_encrypted"),
  apiKeyValid: boolean("api_key_valid").default(false).notNull(),
  agentMode: text("agent_mode").default("on-demand").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Servers ──
export const servers = pgTable("servers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  hetznerId: integer("hetzner_id"),
  name: text("name").notNull(),
  status: serverStatusEnum("status").default("provisioning").notNull(),
  size: text("size").notNull(), // starter, pro, business
  ipv4: text("ipv4"),
  ipv6: text("ipv6"),
  sshKeyEncrypted: text("ssh_key_encrypted"),
  specs: jsonb("specs").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Conversations ──
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").default("New Conversation").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Messages ──
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  status: messageStatusEnum("status").default("complete").notNull(),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  costUsd: real("cost_usd"),
  codeBlocks: jsonb("code_blocks").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Connectors ──
export const connectors = pgTable("connectors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  status: connectorStatusEnum("status").default("connected").notNull(),
  config: jsonb("config").default({}),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Skills ──
export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  longDescription: text("long_description").notNull(),
  category: text("category").notNull(),
  source: skillSourceEnum("source").default("community").notNull(),
  authorId: uuid("author_id").references(() => users.id),
  authorName: text("author_name").notNull(),
  version: text("version").default("1.0.0").notNull(),
  icon: text("icon").default("zap").notNull(),
  installs: integer("installs").default(0).notNull(),
  rating: real("rating").default(0).notNull(),
  ratingCount: integer("rating_count").default(0).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  dependencies: jsonb("dependencies").default([]),
  requiredConnectors: jsonb("required_connectors").default([]),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── User Skills (installed) ──
export const userSkills = pgTable("user_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  skillId: uuid("skill_id").references(() => skills.id, { onDelete: "cascade" }).notNull(),
  active: boolean("active").default(true).notNull(),
  config: jsonb("config").default({}),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
});

// ── Activity Logs ──
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  status: activityStatusEnum("status").default("success").notNull(),
  description: text("description").notNull(),
  details: jsonb("details"),
  tokensUsed: integer("tokens_used"),
  costUsd: real("cost_usd"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ──
export const usersRelations = relations(users, ({ many, one }) => ({
  servers: many(servers),
  conversations: many(conversations),
  connectors: many(connectors),
  userSkills: many(userSkills),
  activityLogs: many(activityLogs),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
