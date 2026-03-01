export type ConnectorType =
  | "github"
  | "gitlab"
  | "slack"
  | "discord"
  | "google_drive"
  | "dropbox"
  | "postgresql"
  | "mysql"
  | "stripe"
  | "twilio"
  | "sendgrid"
  | "vercel"
  | "netlify";

export type ConnectorStatus = "connected" | "error" | "expired" | "disconnected";

export interface Connector {
  id: string;
  userId: string;
  type: ConnectorType;
  status: ConnectorStatus;
  displayName: string;
  lastChecked: Date | null;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectorMeta {
  type: ConnectorType;
  name: string;
  description: string;
  icon: string;
  category: "code" | "communication" | "storage" | "database" | "api" | "deployment";
  authType: "token" | "oauth" | "connection_string";
  tokenGuide: {
    label: string;
    url: string;
    steps: string[];
  };
  capabilities: string[];
}

export const CONNECTORS: ConnectorMeta[] = [
  {
    type: "github",
    name: "GitHub",
    description: "Clone, commit, push, pull requests, issues, code review",
    icon: "github",
    category: "code",
    authType: "token",
    tokenGuide: {
      label: "Personal Access Token",
      url: "https://github.com/settings/tokens/new",
      steps: [
        "Go to GitHub Settings → Developer Settings → Personal Access Tokens",
        "Click 'Generate new token (classic)'",
        "Select scopes: repo, workflow, read:org",
        "Copy the generated token",
      ],
    },
    capabilities: ["clone", "commit", "push", "pull_request", "issues", "code_review"],
  },
  {
    type: "gitlab",
    name: "GitLab",
    description: "Clone, commit, push, merge requests, issues",
    icon: "gitlab",
    category: "code",
    authType: "token",
    tokenGuide: {
      label: "Personal Access Token",
      url: "https://gitlab.com/-/user_settings/personal_access_tokens",
      steps: [
        "Go to GitLab → Preferences → Access Tokens",
        "Create a new token with api, read_repository, write_repository scopes",
        "Copy the generated token",
      ],
    },
    capabilities: ["clone", "commit", "push", "merge_request", "issues"],
  },
  {
    type: "slack",
    name: "Slack",
    description: "Send/read messages, create channels, notifications",
    icon: "slack",
    category: "communication",
    authType: "token",
    tokenGuide: {
      label: "Bot Token",
      url: "https://api.slack.com/apps",
      steps: [
        "Create a new Slack App at api.slack.com/apps",
        "Go to OAuth & Permissions",
        "Add scopes: chat:write, channels:read, channels:history",
        "Install to workspace and copy the Bot Token (xoxb-...)",
      ],
    },
    capabilities: ["send_message", "read_messages", "create_channel", "notifications"],
  },
  {
    type: "discord",
    name: "Discord",
    description: "Send/read messages, manage channels",
    icon: "message-circle",
    category: "communication",
    authType: "token",
    tokenGuide: {
      label: "Bot Token",
      url: "https://discord.com/developers/applications",
      steps: [
        "Create a new Application at discord.com/developers",
        "Go to Bot section and create a bot",
        "Copy the Bot Token",
        "Invite the bot to your server with appropriate permissions",
      ],
    },
    capabilities: ["send_message", "read_messages", "manage_channels"],
  },
  {
    type: "google_drive",
    name: "Google Drive",
    description: "Sync files, upload/download, share",
    icon: "hard-drive",
    category: "storage",
    authType: "oauth",
    tokenGuide: {
      label: "Google OAuth",
      url: "https://console.cloud.google.com/apis/credentials",
      steps: [
        "Enable Google Drive API in Google Cloud Console",
        "Create OAuth 2.0 credentials",
        "Click 'Connect' and authorize access",
      ],
    },
    capabilities: ["upload", "download", "list", "share", "sync"],
  },
  {
    type: "dropbox",
    name: "Dropbox",
    description: "Sync files, upload/download",
    icon: "droplet",
    category: "storage",
    authType: "token",
    tokenGuide: {
      label: "Access Token",
      url: "https://www.dropbox.com/developers/apps",
      steps: [
        "Create a new app at dropbox.com/developers",
        "Go to Settings → OAuth 2 → Generate Access Token",
        "Copy the generated token",
      ],
    },
    capabilities: ["upload", "download", "list", "sync"],
  },
  {
    type: "postgresql",
    name: "PostgreSQL",
    description: "Queries, migrations, backups, monitoring",
    icon: "database",
    category: "database",
    authType: "connection_string",
    tokenGuide: {
      label: "Connection String",
      url: "https://www.postgresql.org/docs/current/libpq-connect.html",
      steps: [
        "Get your connection string from your database provider",
        "Format: postgresql://user:password@host:5432/dbname",
        "Make sure the database is accessible from external IPs",
      ],
    },
    capabilities: ["query", "migration", "backup", "monitoring", "schema"],
  },
  {
    type: "mysql",
    name: "MySQL",
    description: "Queries, migrations, backups",
    icon: "database",
    category: "database",
    authType: "connection_string",
    tokenGuide: {
      label: "Connection String",
      url: "https://dev.mysql.com/doc/refman/8.0/en/connecting.html",
      steps: [
        "Get your connection string from your database provider",
        "Format: mysql://user:password@host:3306/dbname",
        "Ensure remote access is enabled",
      ],
    },
    capabilities: ["query", "migration", "backup"],
  },
  {
    type: "stripe",
    name: "Stripe",
    description: "Payments, customers, subscriptions, webhooks",
    icon: "credit-card",
    category: "api",
    authType: "token",
    tokenGuide: {
      label: "Secret Key",
      url: "https://dashboard.stripe.com/apikeys",
      steps: [
        "Go to Stripe Dashboard → Developers → API Keys",
        "Copy your Secret Key (sk_live_... or sk_test_...)",
        "Use test keys for development",
      ],
    },
    capabilities: ["payments", "customers", "subscriptions", "webhooks"],
  },
  {
    type: "twilio",
    name: "Twilio",
    description: "SMS, voice calls, WhatsApp",
    icon: "phone",
    category: "api",
    authType: "token",
    tokenGuide: {
      label: "Account SID + Auth Token",
      url: "https://console.twilio.com/",
      steps: [
        "Go to Twilio Console",
        "Copy your Account SID and Auth Token from the dashboard",
        "Format: SID:TOKEN",
      ],
    },
    capabilities: ["sms", "voice", "whatsapp"],
  },
  {
    type: "sendgrid",
    name: "SendGrid",
    description: "Transactional emails, templates, analytics",
    icon: "mail",
    category: "api",
    authType: "token",
    tokenGuide: {
      label: "API Key",
      url: "https://app.sendgrid.com/settings/api_keys",
      steps: [
        "Go to SendGrid → Settings → API Keys",
        "Create a new API Key with Mail Send permissions",
        "Copy the generated key (shown only once)",
      ],
    },
    capabilities: ["send_email", "templates", "analytics"],
  },
  {
    type: "vercel",
    name: "Vercel",
    description: "Deploy sites/apps, preview, rollback",
    icon: "triangle",
    category: "deployment",
    authType: "token",
    tokenGuide: {
      label: "API Token",
      url: "https://vercel.com/account/tokens",
      steps: [
        "Go to Vercel → Settings → Tokens",
        "Create a new token",
        "Copy the generated token",
      ],
    },
    capabilities: ["deploy", "preview", "rollback", "logs", "domains"],
  },
  {
    type: "netlify",
    name: "Netlify",
    description: "Deploy sites, preview, serverless functions",
    icon: "globe",
    category: "deployment",
    authType: "token",
    tokenGuide: {
      label: "Personal Access Token",
      url: "https://app.netlify.com/user/applications#personal-access-tokens",
      steps: [
        "Go to Netlify → User Settings → Applications",
        "Create a new Personal Access Token",
        "Copy the generated token",
      ],
    },
    capabilities: ["deploy", "preview", "functions", "forms"],
  },
];
