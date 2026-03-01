import type { TrustLevel, Plan } from "./types/user";

// ── Trust Levels ──
export const TRUST_LEVELS: Record<TrustLevel, {
  name: string;
  description: string;
  confirmDestructive: boolean;
  confirmAll: boolean;
  autoNotify: boolean;
}> = {
  1: {
    name: "Supervision totale",
    description: "Confirmation requise avant chaque action",
    confirmDestructive: true,
    confirmAll: true,
    autoNotify: true,
  },
  2: {
    name: "Prudent",
    description: "Confirmation pour les actions destructives uniquement",
    confirmDestructive: true,
    confirmAll: false,
    autoNotify: true,
  },
  3: {
    name: "Autonome",
    description: "L'agent agit librement, notifie après coup",
    confirmDestructive: false,
    confirmAll: false,
    autoNotify: true,
  },
  4: {
    name: "Full Auto",
    description: "Aucune interruption, tout est logé",
    confirmDestructive: false,
    confirmAll: false,
    autoNotify: false,
  },
};

// ── Plan Limits ──
export const PLAN_LIMITS: Record<Plan, {
  name: string;
  priceMonthly: number;
  maxConnectors: number;
  storageGb: number;
  historyDays: number;
  alwaysOn: boolean;
  alwaysOnHours: number;
  communitySkills: boolean;
  customSkills: boolean;
  support: string;
}> = {
  starter: {
    name: "Starter",
    priceMonthly: 15,
    maxConnectors: 3,
    storageGb: 10,
    historyDays: 7,
    alwaysOn: false,
    alwaysOnHours: 0,
    communitySkills: false,
    customSkills: false,
    support: "community",
  },
  pro: {
    name: "Pro",
    priceMonthly: 39,
    maxConnectors: 10,
    storageGb: 50,
    historyDays: 30,
    alwaysOn: true,
    alwaysOnHours: 8,
    communitySkills: true,
    customSkills: false,
    support: "email",
  },
  business: {
    name: "Business",
    priceMonthly: 79,
    maxConnectors: Infinity,
    storageGb: 100,
    historyDays: Infinity,
    alwaysOn: true,
    alwaysOnHours: 24,
    communitySkills: true,
    customSkills: true,
    support: "chat",
  },
};

// ── Claude API ──
export const CLAUDE_MODELS = {
  default: "claude-sonnet-4-20250514",
  advanced: "claude-opus-4-20250514",
} as const;

export const CLAUDE_PRICING = {
  "claude-sonnet-4-20250514": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-opus-4-20250514": { inputPer1M: 15.0, outputPer1M: 75.0 },
} as const;

// ── File Icons ──
export const FILE_ICONS: Record<string, string> = {
  ts: "file-code",
  tsx: "file-code",
  js: "file-code",
  jsx: "file-code",
  py: "file-code",
  rb: "file-code",
  go: "file-code",
  rs: "file-code",
  html: "file-code",
  css: "file-code",
  scss: "file-code",
  json: "file-json",
  yaml: "file-text",
  yml: "file-text",
  md: "file-text",
  txt: "file-text",
  pdf: "file-text",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "image",
  webp: "image",
  mp4: "film",
  mp3: "music",
  zip: "archive",
  tar: "archive",
  gz: "archive",
  dockerfile: "box",
  lock: "lock",
};

// ── API Routes ──
export const API_ROUTES = {
  health: "/health",
  auth: {
    webhook: "/auth/webhook",
  },
  chat: {
    conversations: "/chat/conversations",
    messages: "/chat/messages",
    stream: "/chat/stream",
  },
  files: {
    list: "/files/list",
    read: "/files/read",
    write: "/files/write",
    delete: "/files/delete",
    move: "/files/move",
    upload: "/files/upload",
    search: "/files/search",
  },
  connectors: {
    list: "/connectors",
    connect: "/connectors/connect",
    disconnect: "/connectors/disconnect",
    test: "/connectors/test",
  },
  skills: {
    marketplace: "/skills/marketplace",
    installed: "/skills/installed",
    install: "/skills/install",
    uninstall: "/skills/uninstall",
  },
  servers: {
    status: "/servers/status",
    provision: "/servers/provision",
    stop: "/servers/stop",
    start: "/servers/start",
    metrics: "/servers/metrics",
  },
  monitoring: {
    logs: "/monitoring/logs",
    usage: "/monitoring/usage",
    dashboard: "/monitoring/dashboard",
  },
  settings: {
    apiKey: "/settings/api-key",
    trustLevel: "/settings/trust-level",
    profile: "/settings/profile",
  },
  billing: {
    checkout: "/billing/checkout",
    portal: "/billing/portal",
    webhook: "/billing/webhook",
  },
} as const;
